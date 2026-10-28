export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';
import { generateValidGoogleMeetUrl } from '@/lib/googleMeet.js';

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

    // ONLY fetch candidates who have had task mail dispatched (taskStatus !== 'Not Assigned' or tasks exist)
    const where = {
      isLeaved: false,
      OR: [
        { taskStatus: { not: 'Not Assigned' } },
        { tasks: { some: {} } },
      ],
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
      const reviews = activeTask?.reviews || [];
      const reviewCount = reviews.length;

      // Calculate genuine performance percentage dynamically:
      // - Task Assigned (no reviews yet): 25.0%
      // - Review 1 scheduled / completed: 50.0% (or score from evaluation)
      // - Review 2 completed: average of reviewer scores or 85%
      // - Task Completed: final certified score
      let calculatedPerf = c.performancePercentage;
      if (c.taskStatus === 'Task Completed' || c.taskStatus === 'Completed') {
        calculatedPerf = c.performancePercentage || 90.0;
      } else if (reviews.length > 0) {
        const scores = reviews.map(r => Number(r.score || 0)).filter(s => s > 0);
        if (scores.length > 0) {
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          calculatedPerf = Math.round(avgScore * 10) / 10;
        } else {
          calculatedPerf = reviews.length === 1 ? 50.0 : 75.0;
        }
      } else if (c.taskStatus === 'Assigned' || activeTask) {
        calculatedPerf = 25.0;
      }

      const reviewStage = reviews.length === 0
        ? 'Review 1 Pending'
        : reviews.length === 1
        ? 'Review 2 Pending'
        : 'Checkpoint Ready';

      return {
        id: c.id,
        internId: c.internId || c.candidateId,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        role: c.role,
        batch: c.batch || 'Batch A',
        taskStatus: c.taskStatus,
        performancePercentage: calculatedPerf,
        reviewStage,
        reviewCount,
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
    const {
      candidateIds,
      reviewNumber = 1,
      reviewDate,
      reviewTime = '04:00 PM',
      customNotes,
      meetMode = 'BATCH', // 'BATCH' | 'INDIVIDUAL'
      batchMeetLink = 'https://meet.google.com/sf-batch-eval',
    } = body;

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

    const scheduled = [];

    for (const cand of candidates) {
      const activeTask = cand.tasks[0];
      const taskId = activeTask?.taskId || `TSK-INT-${cand.internId || 'DEV'}`;

      // Resolve Google Meet Link based on selected mode (Original Google Meet format: https://meet.google.com/xxx-yyyy-zzz)
      let meetLink;
      if (meetMode === 'INDIVIDUAL') {
        meetLink = generateValidGoogleMeetUrl();
      } else {
        meetLink = (batchMeetLink && batchMeetLink.includes('meet.google.com'))
          ? batchMeetLink.trim()
          : generateValidGoogleMeetUrl();
      }

      // 1. Create or record review record
      if (activeTask) {
        await prisma.taskReview.create({
          data: {
            taskId: activeTask.id,
            reviewNumber: Number(reviewNumber),
            reviewDate: scheduledDate,
            reviewTime: reviewTime,
            meetLink: meetLink,
            feedback: customNotes || `Review #${reviewNumber} scheduled (${meetMode === 'BATCH' ? 'Batch-wise Session' : 'Individual 1-on-1'}). Please prepare demonstration and GitHub repository.`,
            score: 50.0,
            status: 'Scheduled',
          },
        });

        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            reviewDate: scheduledDate,
            reviewTime: reviewTime,
            meetLink: meetLink,
            reviewCount: { increment: 1 },
          },
        });
      }

      // Update candidate performance and googleMeetUrl
      await prisma.candidate.update({
        where: { id: cand.id },
        data: {
          performancePercentage: 50.0,
          googleMeetUrl: meetLink,
        },
      });

      // 2. Dispatch Review Notification Email
      const emailSubject = `Milestone Review #${reviewNumber} Scheduled: ${activeTask?.title || taskId} | Shortfundly`;
      const emailBody = `Dear ${cand.fullName},

Your Milestone Review #${reviewNumber} has been officially approved and scheduled.

Review Session Details:
- Intern ID: ${cand.internId || cand.candidateId}
- Role: ${cand.role}
- Review Session Mode: ${meetMode === 'BATCH' ? 'Batch-Wise Shared Session' : 'Unique Individual 1-on-1 Session'}
- Scheduled Date: ${scheduledDate}
- Scheduled Time: ${reviewTime} IST
- Google Meet Link: ${meetLink}

${customNotes ? `Important Guidelines:\n${customNotes}\n` : ''}
Please ensure your latest code is committed and pushed to your GitHub repository prior to joining the Google Meet call.

Best regards,
Engineering & Evaluation Committee
Shortfundly Media Technologies Pvt. Ltd.`;

      await sendEmail({
        candidateId: cand.id,
        to: cand.email,
        recipientName: cand.fullName,
        subject: emailSubject,
        html: jinjaTextToEmailHtml(emailBody),
        text: emailBody,
        emailType: `REVIEW_${reviewNumber}_SCHEDULED`,
        meetLink,
      });

      scheduled.push(cand.id);
    }

    return NextResponse.json({
      success: true,
      message: `Review #${reviewNumber} successfully scheduled for ${scheduled.length} candidates on ${scheduledDate}!`,
      count: scheduled.length,
      scheduledDate,
    });
  } catch (error) {
    console.error('Error scheduling review:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
