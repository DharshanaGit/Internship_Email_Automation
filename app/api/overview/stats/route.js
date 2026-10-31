export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startQueueWorker } from '@/lib/queueWorker';
import { startHourlyMasterSheetSync } from '@/lib/masterSheetSync';

export async function GET() {
  try {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (!isServerless) {
      try {
        startQueueWorker();
        startHourlyMasterSheetSync();
      } catch (bgErr) {
        console.warn('Background worker startup non-blocking warning:', bgErr?.message);
      }
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
      prisma.candidate.count({ where: baseCandWhere }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: 'Ready to Send' } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: 'Sent' } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, offerLetterStatus: { in: ['Accepted', 'ACCEPTED'] } } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'Not Assigned' } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'In Progress' } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: 'Under Review' } }).catch(() => 0),
      prisma.candidate.count({ where: { ...baseCandWhere, taskStatus: { in: ['Completed', 'Milestone Completed'] } } }).catch(() => 0),
      prisma.emailLog.count().catch(() => 0),
      prisma.emailLog.count({ where: { status: 'Delivered' } }).catch(() => 0),
      prisma.emailLog.count({ where: { status: 'Failed' } }).catch(() => 0),
      prisma.emailLog.count({ where: { emailType: 'OFFER_LETTER', status: 'Delivered' } }).catch(() => 0),
      prisma.emailLog.count({ where: { emailType: 'OFFER_LETTER', status: 'Failed' } }).catch(() => 0),
      prisma.emailLog.count({ where: { emailType: { in: ['TASK_ASSIGNMENT', 'TASK_BRIEFING'] } } }).catch(() => 0),
      prisma.emailLog.count({ where: { emailType: { in: ['TASK_REVIEW_1', 'TASK_REVIEW_2', 'TASK_FEEDBACK'] } } }).catch(() => 0),
      prisma.emailLog.count({ where: { emailType: 'COMPLETION_CERTIFICATE' } }).catch(() => 0),
      prisma.emailLog.findMany({
        take: 12,
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          subject: true,
          status: true,
          emailType: true,
          sentAt: true,
          error: true,
          candidateId: true,
          candidate: {
            select: { candidateId: true, fullName: true, role: true },
          },
        },
      }).catch(() => []),
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
    return NextResponse.json({
      success: true,
      data: {
        totalCandidates: 0,
        offerLetters: { sent: 0, failed: 0, waiting: 0, queued: 0, delivered: 0, readyToSend: 0, accepted: 0, total: 0 },
        tasks: { notAssigned: 0, inProgress: 0, underReview: 0, completed: 0, total: 0, dispatchedCount: 0 },
        reviews: { totalReviewsDispatched: 0 },
        certificates: { totalCertificatesIssued: 0 },
        emails: { total: 0, delivered: 0, failed: 0, sent: 0 },
        moduleBreakdown: {
          offerLetters: { sent: 0, failed: 0 },
          tasks: { sent: 0 },
          reviews: { sent: 0 },
          certificates: { sent: 0 },
        },
        recentActivity: [],
      },
    });
  }
}
