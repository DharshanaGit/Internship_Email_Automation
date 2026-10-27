import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';

/**
 * Calculates default review date (e.g. next day; if Sunday, advances to Monday)
 */
function getCalculatedReviewDate(baseDate = new Date()) {
  const target = new Date(baseDate);
  target.setDate(target.getDate() + 1);
  // If Sunday (0), move to Monday (+1)
  if (target.getDay() === 0) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString().split('T')[0];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get('batch');
    const role = searchParams.get('role');
    const taskNumber = searchParams.get('taskNumber');

    const where = {
      isLeaved: false,
    };

    if (batch && batch !== 'ALL') where.batch = batch;
    if (role && role !== 'ALL') where.role = { contains: role, mode: 'insensitive' };

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        tasks: {
          include: {
            reviews: {
              orderBy: { reviewNumber: 'asc' },
            },
          },
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const formatted = candidates.map(c => {
      const activeTask = c.tasks[0];
      return {
        id: c.id,
        internId: c.internId || c.candidateId,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        role: c.role,
        batch: c.batch || 'Batch A',
        taskStatus: c.taskStatus,
        performancePercentage: c.performancePercentage,
        activeTask: activeTask ? {
          id: activeTask.id,
          taskNumber: activeTask.taskNumber,
          taskId: activeTask.taskId,
          title: activeTask.title,
          meetLink: activeTask.meetLink || c.googleMeetUrl,
          deadline: activeTask.deadline,
          status: activeTask.status,
          submissionStatus: activeTask.submissionStatus,
          githubUrl: activeTask.githubUrl,
          projectUrl: activeTask.projectUrl,
          reviews: activeTask.reviews,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      candidates: formatted,
      suggestedReviewDate: getCalculatedReviewDate(),
    });
  } catch (error) {
    console.error('Error fetching review dashboard data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, reviewNumber = 1, reviewDate, reviewTime = '04:00 PM', customNotes } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select candidates for review scheduling.' }, { status: 400 });
    }

    const scheduledDate = reviewDate || getCalculatedReviewDate();

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
        isLeaved: false,
      },
      include: {
        tasks: {
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
    });

    const results = [];

    for (const candidate of candidates) {
      const activeTask = candidate.tasks[0];
      const meetLink = activeTask?.meetLink || candidate.googleMeetUrl || 'https://meet.google.com/new';
      const taskNumber = activeTask ? activeTask.taskNumber : 1;
      const taskTitle = activeTask ? activeTask.title : 'Milestone Task';

      // Create TaskReview record
      if (activeTask) {
        await prisma.taskReview.create({
          data: {
            taskAssignmentId: activeTask.id,
            reviewNumber: Number(reviewNumber),
            reviewDate: scheduledDate,
            reviewTime,
            feedback: customNotes || `Milestone review #${reviewNumber} session scheduled.`,
            scoreAwarded: candidate.performancePercentage || 100.0,
            meetLink,
            sentAt: new Date(),
          },
        });

        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            reviewCount: (activeTask.reviewCount || 0) + 1,
            status: `Review ${reviewNumber} Scheduled`,
          },
        });
      }

      const jinjaContent = `Dear ${candidate.fullName},

Your **Milestone Review #${reviewNumber}** for **Task #${taskNumber}: ${taskTitle}** has been scheduled.

**Review Session Details:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Role / Domain:** ${candidate.role}
- **Scheduled Date:** **${scheduledDate}**
- **Scheduled Time:** **${reviewTime}**
- **Google Meet Link (Same meeting room assigned to you):**
👉 **[Join Scheduled Review Meeting Room](${meetLink})**

${customNotes ? `**Reviewer Pre-Session Guidelines:**\n${customNotes}\n` : ''}
**Preparation Instructions:**
1. Please join the Google Meet room 5 minutes prior to the scheduled time.
2. Have your GitHub repository, commit history, and live demonstration ready for screen sharing.
3. Prepare a concise 5-minute technical walkthrough of your architecture and code implementation.

Warm regards,
**Technical Review Board & Engineering Mentorship**
Shortfundly Media Technologies Pvt. Ltd.`;

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = `Scheduled: Milestone Review #${reviewNumber} - Task #${taskNumber} | ${candidate.fullName}`;

      const dispatch = await sendEmail({
        to: candidate.email,
        subject,
        text: jinjaContent,
        html: htmlBody,
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: candidate.email,
          recipientName: candidate.fullName,
          subject,
          emailType: `REVIEW_${reviewNumber}_NOTIFICATION`,
          body: jinjaContent,
          meetLink,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      results.push({
        candidateId: candidate.id,
        email: candidate.email,
        scheduledDate,
        success: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      reviewNumber,
      scheduledDate,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error scheduling review sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
