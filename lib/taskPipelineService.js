import crypto from 'crypto';
import { prisma } from './prisma.js';
import { parseFlexibleDate, addDays } from './dateUtils.js';
import { generateValidGoogleMeetUrl, getOrCreateCandidateMeetLink } from './googleMeet.js';
import { createIcsCalendarInvite } from './googleCalendar.js';
import { sendEmail } from './mailer.js';
import { jinjaTextToEmailHtml } from './jinjaEngine.js';
import { ROLE_TIERED_TASKS, ROLE_PROMPTS } from './gemmaEngine.js';
import { getAppBaseUrl } from './offerService.js';

export function formatToYyyyMmDd(dateInput) {
  if (!dateInput) return '';
  const d = parseFlexibleDate(dateInput) || new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates batch-wise, role-based task roadmap across the batch's joining and end date.
 * Example: 3 tasks per month for a 3-month duration = 9 tasks.
 */
export async function calculateBatchRoleTaskTimeline({ batchName, tasksPerMonth = 3, customTotalTasks = null }) {
  if (!batchName) throw new Error('batchName is required');

  // 1. Fetch batch metadata from InternshipBatch
  const batchRecord = await prisma.internshipBatch.findFirst({
    where: { batchName: { equals: batchName } },
  });

  // 2. Fetch all active candidates belonging to this batch
  const candidates = await prisma.candidate.findMany({
    where: {
      batch: { equals: batchName },
      isLeaved: false,
    },
    select: {
      id: true,
      candidateId: true,
      internId: true,
      fullName: true,
      email: true,
      role: true,
      joiningDate: true,
      endDate: true,
      duration: true,
      taskStatus: true,
      googleMeetUrl: true,
    },
  });

  // 3. Determine Batch Dates
  const rawStart = batchRecord?.joiningDate || candidates[0]?.joiningDate || new Date();
  const rawEnd = batchRecord?.endDate || candidates[0]?.endDate || addDays(new Date(), 90);

  const start = parseFlexibleDate(rawStart) || new Date();
  let end = parseFlexibleDate(rawEnd);
  if (!end || end.getTime() <= start.getTime()) {
    end = addDays(start, 90);
  }

  const diffMs = Math.max(14 * 24 * 60 * 60 * 1000, end.getTime() - start.getTime());
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const durationMonths = Math.max(1, Math.round(totalDays / 30));

  // Determine total tasks (e.g. 3 tasks per month * 3 months = 9 tasks)
  let totalTasks = customTotalTasks;
  if (!totalTasks || totalTasks < 1) {
    const rate = Math.max(1, parseInt(tasksPerMonth, 10) || 3);
    totalTasks = durationMonths * rate;
  }
  totalTasks = Math.max(1, Math.min(24, totalTasks));

  const intervalDays = Math.max(4, Math.floor(totalDays / totalTasks));

  // 4. Group candidates by role & collect unique roles
  const roleCounts = {};
  candidates.forEach(c => {
    const r = c.role || 'Web Developer Intern';
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });

  let uniqueRoles = Object.keys(roleCounts);
  if (uniqueRoles.length === 0) {
    uniqueRoles = ['Web Developer Intern', 'Digital Marketing Intern', 'Data Analytics Intern', 'UI/UX Design Intern'];
  }

  // 5. Build role-based plans
  const rolePlans = {};

  uniqueRoles.forEach(roleName => {
    const matchedRoleKey = Object.keys(ROLE_PROMPTS).find(k =>
      roleName.toLowerCase().includes(k.toLowerCase())
    ) || 'Web Developer';

    const rolePresets = ROLE_PROMPTS[matchedRoleKey]?.tasks || [];
    const roleCode = matchedRoleKey.split(' ').map(w => w[0]).join('').toUpperCase();
    const tasks = [];

    for (let i = 1; i <= totalTasks; i++) {
      const taskStart = i === 1 ? start : addDays(start, (i - 1) * intervalDays);
      const taskEnd = i === totalTasks ? end : addDays(start, i * intervalDays - 1);
      const reviewDate = addDays(taskStart, Math.max(2, Math.floor(intervalDays / 2)));

      const presetIndex = (i - 1) % (rolePresets.length || 1);
      const preset = rolePresets[presetIndex];

      const defaultTitle = preset?.title
        ? `Task #${i} - ${preset.title.replace(/^Sprint\s*\d*:\s*/i, '')}`
        : `Milestone Task #${i}: ${roleName} Core Sprint Deliverables`;

      const defaultDesc = preset?.description || `Objective: Complete technical milestone deliverables for Task #${i}.\nDeliverables: Clean tested source code, documentation, and live walkthrough.`;

      tasks.push({
        taskNumber: i,
        taskId: `TSK-${roleCode}-M${i}`,
        title: defaultTitle,
        objective: defaultDesc,
        role: roleName,
        explanationDate: formatToYyyyMmDd(taskStart),
        explanationTime: '11:00 AM IST',
        deadline: formatToYyyyMmDd(taskEnd),
        reviewDate: formatToYyyyMmDd(reviewDate),
        reviewTime: '04:00 PM IST',
        meetLink: generateValidGoogleMeetUrl(),
        customSubject: `[Shortfundly] Milestone Task #${i} Assignment - {{candidate_name}} ({{taskId}})`,
        customBody: `Dear {{candidate_name}},

Congratulations on progressing in your internship! Your technical milestone assignment (**Task #${i}: {{task_title}}**) has been scheduled.

**Sprint Briefing Details:**
- **Intern ID:** {{internId}}
- **Assigned Role:** {{role}}
- **Task ID:** {{taskId}}
- **Milestone:** Task #${i} of ${totalTasks}
- **Briefing Date:** {{explanationDate}} at {{explanationTime}}
- **Google Meet Link:** {{meetLink}}
- **Submission Deadline:** {{deadline}}

**Deliverable Requirements & Objectives:**
{{task_content}}

Please join the synchronized Google Meet call at the scheduled time to discuss architecture guidelines with your mentor. Submit your deliverables via the candidate portal:
{{submission_link}}

Best regards,
Engineering & Mentorship Operations
Shortfundly Media Technologies Pvt. Ltd.`,
        isSent: false,
      });
    }

    rolePlans[roleName] = tasks;
  });

  return {
    batchName,
    totalCandidates: candidates.length,
    rolesSummary: roleCounts,
    uniqueRoles,
    joiningDate: formatToYyyyMmDd(start),
    endDate: formatToYyyyMmDd(end),
    totalDays,
    durationMonths,
    tasksPerMonth: parseInt(tasksPerMonth, 10) || 3,
    totalTasks,
    intervalDays,
    rolePlans,
  };
}

/**
 * Saves and allocates task pipeline for ALL candidates in a batch based on their roles
 */
export async function saveAndAllocateBatchPipeline({ batchName, rolePlans, autoSendFirstTask = true, baseUrl }) {
  if (!batchName) throw new Error('batchName is required');

  const candidates = await prisma.candidate.findMany({
    where: {
      batch: { equals: batchName },
      isLeaved: false,
    },
    include: {
      tasks: true,
    },
  });

  if (candidates.length === 0) {
    throw new Error(`No active candidates found in ${batchName}.`);
  }

  const appBaseUrl = baseUrl || getAppBaseUrl();
  const candidateResults = [];
  let task1DispatchedTotal = 0;

  for (const candidate of candidates) {
    const candidateRole = candidate.role || 'Web Developer Intern';
    // Match best role plan
    const matchedPlanKey = Object.keys(rolePlans).find(k =>
      candidateRole.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(candidateRole.toLowerCase())
    ) || Object.keys(rolePlans)[0];

    const tasksToAssign = rolePlans[matchedPlanKey] || [];
    if (tasksToAssign.length === 0) continue;

    // Remove old un-sent queued tasks
    await prisma.taskAssignment.deleteMany({
      where: {
        candidateId: candidate.id,
        isSent: false,
        submissionStatus: 'PENDING',
        reviews: { none: {} },
      },
    });

    const createdTasks = [];
    for (const t of tasksToAssign) {
      let parsedDeadline = null;
      if (t.deadline) {
        const d = parseFlexibleDate(t.deadline);
        if (d) {
          d.setHours(23, 59, 59, 999);
          parsedDeadline = d;
        }
      }

      const scheduledDate = parseFlexibleDate(t.explanationDate) || new Date();
      const meet = t.meetLink || candidate.googleMeetUrl || generateValidGoogleMeetUrl();

      const created = await prisma.taskAssignment.create({
        data: {
          candidateId: candidate.id,
          taskNumber: t.taskNumber,
          taskId: `${t.taskId || `TSK-${t.taskNumber}`}-${candidate.internId ? candidate.internId.slice(-4) : Math.floor(100 + Math.random() * 900)}`,
          taskName: t.title,
          title: t.title,
          objective: t.objective || t.description || '',
          description: t.objective || t.description || '',
          role: candidate.role,
          explanationDate: t.explanationDate || formatToYyyyMmDd(scheduledDate),
          explanationTime: t.explanationTime || '11:00 AM IST',
          meetLink: meet,
          reviewDate: t.reviewDate || formatToYyyyMmDd(addDays(scheduledDate, 3)),
          reviewTime: t.reviewTime || '04:00 PM IST',
          deadline: parsedDeadline,
          scheduledSendAt: scheduledDate,
          isSent: false,
          status: 'Queued',
          submissionStatus: 'PENDING',
        },
      });

      createdTasks.push(created);
    }

    if (!candidate.googleMeetUrl && tasksToAssign[0]?.meetLink) {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { googleMeetUrl: tasksToAssign[0].meetLink },
      });
    }

    // Auto-dispatch Task 1 if joining date is arrived
    let task1Sent = false;
    if (autoSendFirstTask && createdTasks.length > 0) {
      const task1 = createdTasks[0];
      const joining = parseFlexibleDate(candidate.joiningDate) || parseFlexibleDate(task1.explanationDate);
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (joining <= todayEnd) {
        await dispatchSingleTaskEmail({
          candidateId: candidate.id,
          taskAssignmentId: task1.id,
          baseUrl: appBaseUrl,
          customSubject: tasksToAssign[0]?.customSubject,
          customBody: tasksToAssign[0]?.customBody,
        });
        task1Sent = true;
        task1DispatchedTotal++;
      } else {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { taskStatus: 'Pipeline Scheduled' },
        });
      }
    }

    candidateResults.push({
      candidateId: candidate.id,
      fullName: candidate.fullName,
      role: candidate.role,
      tasksCount: createdTasks.length,
      task1Sent,
    });
  }

  return {
    success: true,
    batchName,
    candidatesCount: candidateResults.length,
    task1DispatchedTotal,
    candidateResults,
  };
}

/**
 * Dispatches a single task assignment email to the candidate
 */
export async function dispatchSingleTaskEmail({ candidateId, taskAssignmentId, baseUrl, customCc, customSubject, customBody }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found');

  const task = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
  });
  if (!task) throw new Error('Task assignment not found');

  const appBaseUrl = baseUrl || getAppBaseUrl();
  const submissionToken = crypto.randomBytes(24).toString('hex');
  const submissionUrl = `${appBaseUrl}/tasks/submit?token=${submissionToken}`;

  const meetLink = task.meetLink || candidate.googleMeetUrl || generateValidGoogleMeetUrl();

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Before Sprint Conclusion';

  let jinjaContent = customBody;
  if (!jinjaContent) {
    jinjaContent = `Dear {{candidate_name}},

Congratulations! Your technical milestone assignment (**Task #${task.taskNumber}: {{task_title}}**) has been officially assigned according to your batch roadmap.

**Sprint Briefing & Schedule:**
- **Intern ID:** {{internId}}
- **Assigned Role:** {{role}}
- **Task ID:** {{taskId}}
- **Milestone:** Task #${task.taskNumber}
- **Explanation Call Date:** {{explanationDate}}
- **Explanation Call Time:** {{explanationTime}}
- **Google Meet Briefing Room:** {{meetLink}}
- **Submission Deadline:** **{{deadline}}**

**Deliverable Requirements & Instructions:**
{{task_content}}

**Submission Instructions:**
Please join the Google Meet call at the scheduled time to discuss architecture guidelines with your mentor. Submit your deployed project demo URL and GitHub repository link via your secure candidate portal:

**[Open Secure Deliverable Submission Portal]({{submission_link}})**
Direct Link: {{submission_link}}

Best regards,
**Engineering & Mentorship Operations**
Shortfundly Media Technologies Pvt. Ltd.`;
  }

  jinjaContent = jinjaContent
    .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
    .replace(/\{\{candidateName\}\}/g, candidate.fullName)
    .replace(/\{\{internId\}\}/g, candidate.internId || candidate.candidateId)
    .replace(/\{\{role\}\}/g, candidate.role)
    .replace(/\{\{taskId\}\}/g, task.taskId || `TSK-${task.taskNumber}`)
    .replace(/\{\{task_title\}\}/g, task.title)
    .replace(/\{\{task_content\}\}/g, (task.objective || task.description || '').replace(/\n/g, '<br>'))
    .replace(/\{\{explanationDate\}\}/g, task.explanationDate)
    .replace(/\{\{explanationTime\}\}/g, task.explanationTime)
    .replace(/\{\{meetLink\}\}/g, meetLink)
    .replace(/\{\{deadline\}\}/g, formattedDeadline)
    .replace(/\{\{submission_link\}\}/g, submissionUrl);

  const htmlBody = jinjaTextToEmailHtml(jinjaContent);
  const subject = customSubject
    ? customSubject
        .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
        .replace(/\{\{candidateName\}\}/g, candidate.fullName)
        .replace(/\{\{taskId\}\}/g, task.taskId || `TSK-${task.taskNumber}`)
    : `[Shortfundly] Milestone Task #${task.taskNumber} Assignment: ${task.title} - ${candidate.fullName}`;

  // Generate iCalendar (.ics) invite
  const icsInvite = createIcsCalendarInvite({
    uid: `sf-task-${task.id}@shortfundly.com`,
    title: `[Shortfundly] Sprint Briefing - Task #${task.taskNumber} (${candidate.fullName})`,
    description: `Task: ${task.title}\n\nJoin Google Meet: ${meetLink}\nSubmission Portal: ${submissionUrl}`,
    meetLink,
    startDateStr: task.explanationDate,
    startTimeStr: '11:00',
    durationMinutes: 45,
    attendeeEmail: candidate.email,
    attendeeName: candidate.fullName,
  });

  const dispatch = await sendEmail({
    candidateId: candidate.id,
    to: candidate.email,
    recipientName: candidate.fullName,
    cc: customCc || undefined,
    subject,
    text: jinjaContent,
    html: htmlBody,
    emailType: 'TASK_ASSIGNMENT',
    meetLink,
    attachments: [
      {
        filename: `task_${task.taskNumber}_briefing.ics`,
        content: icsInvite,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
      },
    ],
  });

  // Update Task record
  const updatedTask = await prisma.taskAssignment.update({
    where: { id: task.id },
    data: {
      isSent: true,
      status: 'Assigned',
      submissionToken,
      submissionStatus: 'PENDING',
    },
  });

  // Update Candidate record
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      taskStatus: 'Assigned',
      googleMeetUrl: meetLink,
    },
  });

  // Log in emailLog
  await prisma.emailLog.create({
    data: {
      candidateId: candidate.id,
      recipientEmail: candidate.email,
      recipientName: candidate.fullName,
      subject,
      emailType: 'TASK_ASSIGNMENT',
      body: jinjaContent,
      meetLink,
      status: dispatch.success ? 'Sent' : 'Failed',
      error: dispatch.error || null,
    },
  });

  return { success: true, task: updatedTask, dispatch };
}

/**
 * Triggers candidate's next automated task after task completion mail
 */
export async function triggerNextAutomatedTask(candidateId, completedTaskNumber, baseUrl) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      tasks: {
        orderBy: { taskNumber: 'asc' },
      },
    },
  });

  if (!candidate) return { triggered: false, error: 'Candidate not found' };

  // Look for next queued task in sequence
  const nextTask = await prisma.taskAssignment.findFirst({
    where: {
      candidateId: candidate.id,
      taskNumber: completedTaskNumber + 1,
      isSent: false,
    },
  });

  const appBaseUrl = baseUrl || getAppBaseUrl();

  if (nextTask) {
    const now = new Date();
    const taskExpDate = parseFlexibleDate(nextTask.explanationDate);
    if (!taskExpDate || taskExpDate < now) {
      await prisma.taskAssignment.update({
        where: { id: nextTask.id },
        data: {
          explanationDate: formatToYyyyMmDd(now),
        },
      });
    }

    const dispatchResult = await dispatchSingleTaskEmail({
      candidateId: candidate.id,
      taskAssignmentId: nextTask.id,
      baseUrl: appBaseUrl,
    });

    return {
      triggered: true,
      nextTaskNumber: completedTaskNumber + 1,
      nextTask: dispatchResult.task,
    };
  }

  // Check if candidate has completed all tasks of their tenure
  const remainingUnsent = await prisma.taskAssignment.count({
    where: { candidateId: candidate.id, isSent: false },
  });

  if (remainingUnsent === 0) {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        taskStatus: 'All Tasks Completed',
        certificateApproved: true,
        certificateApprovedAt: new Date(),
      },
    });

    return {
      triggered: false,
      allCompleted: true,
      message: 'All internship milestone tasks successfully completed! Eligible for Completion Certificate.',
    };
  }

  return { triggered: false, remainingUnsent };
}

/**
 * Checks all candidates with queued Task 1 whose joining date has arrived and dispatches them
 */
export async function checkAndDispatchDueJoiningTasks(baseUrl) {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const pendingTask1s = await prisma.taskAssignment.findMany({
    where: {
      taskNumber: 1,
      isSent: false,
      candidate: {
        isLeaved: false,
      },
    },
    include: {
      candidate: true,
    },
  });

  const appBaseUrl = baseUrl || getAppBaseUrl();
  const dispatched = [];

  for (const task of pendingTask1s) {
    const candidate = task.candidate;
    const joining = parseFlexibleDate(candidate.joiningDate) || parseFlexibleDate(task.explanationDate);

    if (joining && joining <= todayEnd) {
      try {
        await dispatchSingleTaskEmail({
          candidateId: candidate.id,
          taskAssignmentId: task.id,
          baseUrl: appBaseUrl,
        });
        dispatched.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          joiningDate: candidate.joiningDate,
          taskId: task.taskId,
        });
      } catch (err) {
        console.error(`Failed to auto-dispatch Task 1 for ${candidate.fullName}:`, err);
      }
    }
  }

  return {
    dispatchedCount: dispatched.length,
    dispatched,
  };
}

/**
 * Scans overdue tasks and dispatches formal warning with performance percentage deduction
 */
export async function checkAndDispatchOverdueWarnings({ baseUrl, penaltyAmount = 10, graceHours = 48 } = {}) {
  const now = new Date();

  const overdueTasks = await prisma.taskAssignment.findMany({
    where: {
      isSent: true,
      submissionStatus: 'PENDING',
      deadline: { lt: now },
      warningSentAt: null,
      candidate: {
        isLeaved: false,
      },
    },
    include: {
      candidate: true,
    },
  });

  const appBaseUrl = baseUrl || getAppBaseUrl();
  const dispatched = [];

  for (const task of overdueTasks) {
    const candidate = task.candidate;
    if (!candidate) continue;

    const currentScore = candidate.performancePercentage || 100.0;
    const newScore = Math.max(0, currentScore - penaltyAmount);
    const graceDeadline = new Date(now.getTime() + graceHours * 3600 * 1000);

    const submissionToken = task.submissionToken || crypto.randomBytes(24).toString('hex');
    const submissionUrl = `${appBaseUrl}/tasks/submit?token=${submissionToken}`;

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        performancePercentage: newScore,
      },
    });

    await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        warningSentAt: now,
        warningDeadline: graceDeadline,
        penaltyApplied: (task.penaltyApplied || 0) + penaltyAmount,
        performanceScore: Math.max(0, (task.performanceScore || 100.0) - penaltyAmount),
        submissionStatus: 'WARNING_SENT',
        deadline: graceDeadline,
      },
    });

    const jinjaContent = `Dear ${candidate.fullName},

This is an **Automated Formal Warning Notice** regarding your overdue submission for **Task #${task.taskNumber}: ${task.title}**.

**Audit & Infraction Details:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Original Deadline:** ${task.deadline ? new Date(task.deadline).toLocaleString() : 'Past Due'}
- **Infraction:** Task deliverables were not submitted prior to the stipulated deadline.
- **Performance Score Reduction:** **-${penaltyAmount}%**
- **Updated Performance Score:** **${newScore.toFixed(1)}%** (reduced from ${currentScore.toFixed(1)}%)
- **Grace Period Deadline:** **${graceDeadline.toLocaleString()}**

**Urgent Action Required:**
You have been granted a **${graceHours}-hour grace period** to complete and submit your project deliverables, repository URL, and live demo link:

**[Urgent Submission Portal Link](${submissionUrl})**
Direct URL: ${submissionUrl}

> **Strict Notice:** Failure to submit within this grace period will trigger compounding performance deductions and may result in internship termination.

Sincerely,
**Office of Academic Evaluation & Performance Review**
Shortfundly Media Technologies Pvt. Ltd.`;

    const htmlBody = jinjaTextToEmailHtml(jinjaContent);
    const subject = `Urgent Warning: Performance Score Deduction (-${penaltyAmount}%) for Overdue Task #${task.taskNumber} - ${candidate.fullName}`;

    const dispatch = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      subject,
      text: jinjaContent,
      html: htmlBody,
      emailType: 'FORMAL_WARNING_DEDUCTION',
    });

    await prisma.emailLog.create({
      data: {
        candidateId: candidate.id,
        recipientEmail: candidate.email,
        recipientName: candidate.fullName,
        subject,
        emailType: 'FORMAL_WARNING_DEDUCTION',
        body: jinjaContent,
        status: dispatch.success ? 'Sent' : 'Failed',
        error: dispatch.error || null,
      },
    });

    dispatched.push({
      candidateId: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      newScore,
      taskNumber: task.taskNumber,
    });
  }

  return {
    dispatchedCount: dispatched.length,
    dispatched,
  };
}
