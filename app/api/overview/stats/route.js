export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startQueueWorker } from '@/lib/queueWorker';
import { startHourlyMasterSheetSync } from '@/lib/masterSheetSync';

export async function GET() {
  try {
    try {
      startQueueWorker();
      startHourlyMasterSheetSync();
    } catch (bgErr) {
      console.warn('Background worker startup non-blocking warning:', bgErr?.message);
    }

    const baseCandWhere = {
      NOT: [
        { candidateId: { startsWith: 'SF-MEET-' } },
        { candidateId: { startsWith: 'SF-LOAD-' } },
        { candidateId: { startsWith: 'TEST-' } },
        { email: { contains: 'candidate.1793' } },
      ],
    };

    const [
      totalCandidates,
      readyOffers,
      sentOffers,
      acceptedOffers,
      notAssignedTasks,
      inProgressTasks,
      underReviewTasks,
      completedTasks,
      totalEmails,
      deliveredEmails,
      failedEmails,
      offerSent,
      offerFailed,
      taskEmailsCount,
      reviewEmailsCount,
      certEmailsCount,
      recentEmailLogs,
    ] = await Promise.all([
      prisma.candidate.count({ where: baseCandWhere }),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: 'Ready to Send' } }),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: 'Sent' } }),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: { in: ['Accepted', 'ACCEPTED'] } } }),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'Not Assigned' } }),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'In Progress' } }),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'Under Review' } }),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: { in: ['Completed', 'Milestone Completed'] } } }),
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'Delivered' } }),
      prisma.emailLog.count({ where: { status: 'Failed' } }),
      prisma.emailLog.count({ where: { emailType: 'OFFER_LETTER', status: 'Delivered' } }),
      prisma.emailLog.count({ where: { emailType: 'OFFER_LETTER', status: 'Failed' } }),
      prisma.emailLog.count({ where: { emailType: { in: ['TASK_ASSIGNMENT', 'TASK_BRIEFING'] } } }),
      prisma.emailLog.count({ where: { emailType: { in: ['TASK_REVIEW_1', 'TASK_REVIEW_2', 'TASK_FEEDBACK'] } } }),
      prisma.emailLog.count({ where: { emailType: 'COMPLETION_CERTIFICATE' } }),
      prisma.emailLog.findMany({
        take: 12,
        orderBy: { sentAt: 'desc' },
        include: {
          candidate: {
            select: { candidateId: true, fullName: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCandidates,
        offerLetters: {
          sent: offerSent,
          failed: offerFailed,
          waiting: readyOffers,
          queued: Math.max(0, totalCandidates - (offerSent + offerFailed + readyOffers)),
          delivered: sentOffers + acceptedOffers,
          readyToSend: readyOffers,
          accepted: acceptedOffers,
          total: totalCandidates,
        },
        tasks: {
          notAssigned: notAssignedTasks,
          inProgress: inProgressTasks,
          underReview: underReviewTasks,
          completed: completedTasks,
          total: totalCandidates,
          dispatchedCount: taskEmailsCount,
        },
        reviews: {
          totalReviewsDispatched: reviewEmailsCount,
        },
        certificates: {
          totalCertificatesIssued: certEmailsCount,
        },
        emails: {
          total: totalEmails,
          delivered: deliveredEmails,
          failed: failedEmails,
          sent: totalEmails - failedEmails,
        },
        moduleBreakdown: {
          offerLetters: { sent: offerSent, failed: offerFailed },
          tasks: { sent: taskEmailsCount },
          reviews: { sent: reviewEmailsCount },
          certificates: { sent: certEmailsCount },
        },
        recentActivity: recentEmailLogs,
      },
    });
  } catch (error) {
    console.error('Error in /api/overview/stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
