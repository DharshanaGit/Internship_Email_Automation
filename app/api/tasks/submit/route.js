import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Submission token is required.' }, { status: 400 });
    }

    const task = await prisma.taskAssignment.findFirst({
      where: {
        OR: [
          { submissionToken: token },
          { id: token },
        ],
      },
      include: {
        candidate: true,
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task submission link not found or invalid.' }, { status: 404 });
    }

    // Determine deadline
    let deadline = task.deadline;
    if (!deadline) {
      deadline = new Date(new Date(task.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const isExpired = Date.now() > new Date(deadline).getTime();

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        taskId: task.taskId || `TSK-${task.id.slice(-6).toUpperCase()}`,
        taskName: task.taskName || task.title,
        title: task.title,
        objective: task.objective || task.description,
        modules: task.modules || 'Core System Integration, Architecture & Testing',
        toolsAndTech: task.toolsAndTech || 'React, Node.js, Cloud APIs, Database Storage',
        clientRequirements: task.clientRequirements || 'Deliver clean production-ready code with GitHub repository documentation.',
        deadline: deadline,
        isExpired,
        submissionStatus: task.submissionStatus,
        alreadySubmitted: task.submissionStatus === 'SUBMITTED',
        projectUrl: task.projectUrl,
        githubUrl: task.githubUrl,
        submittedAt: task.submittedAt,
        penaltyApplied: task.penaltyApplied,
        warningSentAt: task.warningSentAt,
      },
      candidate: {
        id: task.candidate.id,
        internId: task.candidate.internId || task.candidate.candidateId,
        fullName: task.candidate.fullName,
        email: task.candidate.email,
        role: task.candidate.role,
        batch: task.candidate.batch || 'Batch A - June 2026',
        performancePercentage: task.candidate.performancePercentage ?? 100.0,
      },
    });
  } catch (error) {
    console.error('Error fetching task submission details:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, projectUrl, githubUrl, submissionDocs } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Submission token is required.' }, { status: 400 });
    }

    if (!projectUrl && !githubUrl) {
      return NextResponse.json({ success: false, error: 'Please provide at least a Project Demo URL or a GitHub Repository URL.' }, { status: 400 });
    }

    const task = await prisma.taskAssignment.findFirst({
      where: {
        OR: [
          { submissionToken: token },
          { id: token },
        ],
      },
      include: {
        candidate: true,
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task submission link not found.' }, { status: 404 });
    }

    // Check expiration strictly
    let deadline = task.deadline;
    if (!deadline) {
      deadline = new Date(new Date(task.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (Date.now() > new Date(deadline).getTime()) {
      await prisma.taskAssignment.update({
        where: { id: task.id },
        data: { submissionStatus: 'EXPIRED' },
      });

      return NextResponse.json({
        success: false,
        error: 'The submission deadline for this task has expired. The link is locked.',
      }, { status: 410 });
    }

    const now = new Date();

    const updatedTask = await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        projectUrl: projectUrl ? projectUrl.trim() : null,
        githubUrl: githubUrl ? githubUrl.trim() : null,
        submissionDocs: submissionDocs ? submissionDocs.trim() : null,
        submissionStatus: 'SUBMITTED',
        status: 'Submitted',
        submittedAt: now,
      },
    });

    // Move candidate to 'Under Review' status
    await prisma.candidate.update({
      where: { id: task.candidateId },
      data: {
        taskStatus: 'Under Review',
        tasksCompleted: (task.candidate.tasksCompleted || 0) + 1,
      },
    });

    // Send confirmation & review notification email to candidate
    try {
      const emailSubject = `Project Deliverables Received & In Review: ${task.title || 'Milestone Task'} | Shortfundly`;
      const jinjaBody = `Dear ${task.candidate.fullName},

Congratulations! Your project deliverables have been successfully received and placed into the **Review Queue**.

**Submission Summary:**
- **Intern ID:** ${task.candidate.internId || task.candidate.candidateId}
- **Milestone:** ${task.title || 'Internship Task'}
- **Project Demo Link:** ${projectUrl || 'Not provided'}
- **GitHub Repository Link:** ${githubUrl || 'Not provided'}
- **Submission Time:** ${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}

**Next Steps:**
Our engineering mentorship and HR team have been notified. Your formal milestone evaluation will be scheduled and you will receive a calendar invite with the Google Meet link.

Best regards,
**Hiring & Engineering Mentorship Operations**
Shortfundly Media Technologies Pvt. Ltd.`;

      await sendEmail({
        candidateId: task.candidate.id,
        to: task.candidate.email,
        recipientName: task.candidate.fullName,
        subject: emailSubject,
        html: jinjaTextToEmailHtml(jinjaBody),
        text: jinjaBody,
        emailType: 'TASK_SUBMISSION_CONFIRMATION',
      });
    } catch (mailErr) {
      console.warn('Non-blocking error dispatching submission confirmation email:', mailErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Project and repository deliverables submitted successfully. Your submission is now queued for milestone review and a notification email has been dispatched.',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error processing task submission:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
