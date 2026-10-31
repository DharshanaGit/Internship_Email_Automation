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
 * Automatically calculates and allocates tasks from joiningDate to endDate
 */
export function calculateTenureTaskTimeline(candidate, customTaskCount = null) {
  const start = parseFlexibleDate(candidate.joiningDate) || new Date();
  const end = parseFlexibleDate(candidate.endDate) || addDays(start, 90);

  const diffMs = Math.max(14 * 24 * 60 * 60 * 1000, end.getTime() - start.getTime());
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Determine number of tasks across tenure
  let taskCount = customTaskCount;
  if (!taskCount || taskCount < 1) {
    if (totalDays <= 35) taskCount = 2;       // 1 Month = 2 Sprints
    else if (totalDays <= 65) taskCount = 3;  // 2 Months = 3 Sprints
    else if (totalDays <= 110) taskCount = 4; // 3 Months = 4 Sprints
    else taskCount = 5;                       // 4-6 Months = 5 Sprints
  }

  const intervalDays = Math.max(7, Math.floor(totalDays / taskCount));
  const candidateRole = candidate.role || 'Web Developer Intern';
  
  // Resolve role presets
  const matchedRoleKey = Object.keys(ROLE_PROMPTS).find(k => 
    candidateRole.toLowerCase().includes(k.toLowerCase())
  ) || 'Web Developer';
  const rolePresets = ROLE_PROMPTS[matchedRoleKey]?.tasks || [];

  const persistentMeetLink = candidate.googleMeetUrl || generateValidGoogleMeetUrl();
  const roleCode = matchedRoleKey.split(' ').map(w => w[0]).join('').toUpperCase();

  const generatedTasks = [];

  for (let i = 1; i <= taskCount; i++) {
    const taskStart = i === 1 ? start : addDays(start, (i - 1) * intervalDays);
    const taskEnd = i === taskCount ? end : addDays(start, i * intervalDays - 1);
    const reviewDate = addDays(taskStart, Math.max(2, Math.floor(intervalDays / 2)));

    const preset = rolePresets[(i - 1) % rolePresets.length];
    const defaultTitle = preset?.title || `Milestone Sprint ${i}: ${candidateRole} Core Deliverables`;
    const defaultDesc = preset?.description || `Objective: Execute milestone deliverables for Sprint ${i}.\nDeliverables: Clean tested code, documentation, and demo.`;

    generatedTasks.push({
      taskNumber: i,
      taskId: `TSK-${roleCode}-${String(Math.floor(1000 + Math.random() * 9000))}-S${i}`,
      title: defaultTitle,
      objective: defaultDesc,
      role: candidateRole,
      explanationDate: formatToYyyyMmDd(taskStart),
      explanationTime: '11:00 AM IST',
      deadline: formatToYyyyMmDd(taskEnd),
      reviewDate: formatToYyyyMmDd(reviewDate),
      reviewTime: '04:00 PM IST',
      meetLink: persistentMeetLink,
      status: i === 1 ? 'Ready (Joining Date)' : 'Queued (Auto-Triggered)',
      isSent: false,
    });
  }

  return {
    candidateId: candidate.id,
    fullName: candidate.fullName,
    email: candidate.email,
    role: candidateRole,
    joiningDate: formatToYyyyMmDd(start),
    endDate: formatToYyyyMmDd(end),
    totalDays,
    taskCount,
    intervalDays,
    tasks: generatedTasks,
  };
}

/**
 * Saves candidate's task pipeline and dispatches Task 1 if joining date is arrived
 */
export async function saveCandidateTaskPipeline({ candidateId, tasks, autoSendFirstTask = true, baseUrl }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { tasks: true },
  });

  if (!candidate) {
    throw new Error(`Candidate ${candidateId} not found.`);
  }

  const appBaseUrl = baseUrl || getAppBaseUrl();

  // If candidate has existing tasks that are only queued and not sent, we can clean them
  await prisma.taskAssignment.deleteMany({
    where: {
      candidateId: candidate.id,
      isSent: false,
      submissionStatus: 'PENDING',
      reviews: { none: {} },
    },
  });

  const createdTasks = [];

  for (const t of tasks) {
    let parsedDeadline = null;
    if (t.deadline) {
      const d = parseFlexibleDate(t.deadline);
      if (d) {
        // Set deadline time to 11:59 PM IST
        d.setHours(23, 59, 59, 999);
        parsedDeadline = d;
      }
    }

    const scheduledDate = parseFlexibleDate(t.explanationDate) || new Date();

    const created = await prisma.taskAssignment.create({
      data: {
        candidateId: candidate.id,
        taskNumber: t.taskNumber,
        taskId: t.taskId || `TSK-${t.taskNumber}`,
        taskName: t.title,
        title: t.title,
        objective: t.objective || t.description || '',
        description: t.objective || t.description || '',
        role: candidate.role,
        explanationDate: t.explanationDate || formatToYyyyMmDd(scheduledDate),
        explanationTime: t.explanationTime || '11:00 AM IST',
        meetLink: t.meetLink || candidate.googleMeetUrl || generateValidGoogleMeetUrl(),
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

  // Ensure candidate has googleMeetUrl stored if not already
  if (!candidate.googleMeetUrl && tasks[0]?.meetLink) {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { googleMeetUrl: tasks[0].meetLink },
    });
  }

  let task1Dispatched = false;

  // Check if first task should be auto-dispatched now
  if (autoSendFirstTask && createdTasks.length > 0) {
    const task1 = createdTasks[0];
    const joining = parseFlexibleDate(candidate.joiningDate) || parseFlexibleDate(task1.explanationDate);
    
    // Check if joining date is today or already passed
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (joining <= todayEnd) {
      await dispatchSingleTaskEmail({
        candidateId: candidate.id,
        taskAssignmentId: task1.id,
        baseUrl: appBaseUrl,
      });
      task1Dispatched = true;
    } else {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { taskStatus: 'Pipeline Scheduled' },
      });
    }
  }

  return {
    success: true,
    candidateId: candidate.id,
    tasksCount: createdTasks.length,
    task1Dispatched,
  };
}

/**
 * Dispatches a single task assignment email to the candidate
 */
export async function dispatchSingleTaskEmail({ candidateId, taskAssignmentId, baseUrl, customCc }) {
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

  const jinjaContent = `Dear ${candidate.fullName},

Congratulations! Your technical sprint assignment (**Task #${task.taskNumber}: ${task.title}**) has been automatically dispatched according to your internship milestone roadmap.

**Sprint Briefing & Schedule:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Task ID:** ${task.taskId || `TSK-${task.taskNumber}`}
- **Milestone:** Task #${task.taskNumber}
- **Explanation Call Date:** ${task.explanationDate}
- **Explanation Call Time:** ${task.explanationTime}
- **Google Meet Briefing Room:** ${meetLink}
- **Submission Deadline:** **${formattedDeadline}**

**Deliverable Requirements & Instructions:**
${task.objective || task.description}

**Submission Instructions:**
Please join the synchronized Google Meet call at the scheduled time to discuss architecture guidelines with your mentor. When your work is complete, submit your deployed project demo URL and GitHub repository link via your secure candidate portal:

**[Open Secure Deliverable Submission Portal](${submissionUrl})**
Direct Link: ${submissionUrl}

Best regards,
**Engineering & Mentorship Operations**
Shortfundly Media Technologies Pvt. Ltd.`;

  const htmlBody = jinjaTextToEmailHtml(jinjaContent);
  const subject = `[Shortfundly] Milestone Task #${task.taskNumber} Assignment: ${task.title} - ${candidate.fullName}`;

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
 * Triggers the candidate's next automated task after task completion mail
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
    // If explanationDate is in the past, update to today
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

  // Tasks that are sent, pending submission, and past deadline with no warning sent yet
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

    // Update candidate performance
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        performancePercentage: newScore,
      },
    });

    // Update task
    await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        warningSentAt: now,
        warningDeadline: graceDeadline,
        penaltyApplied: (task.penaltyApplied || 0) + penaltyAmount,
        performanceScore: Math.max(0, (task.performanceScore || 100.0) - penaltyAmount),
        submissionStatus: 'WARNING_SENT',
        deadline: graceDeadline, // extend for grace period
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
