import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  assignTaskAndSendDocument,
  sendNextReviewEmail,
  sendCompletionCertificate,
} from '@/lib/automationEngine';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const logs = [];

    const pendingTasks = await prisma.candidate.findMany({
      where: {
        offerLetterStatus: 'Accepted',
        taskStatus: 'Not Assigned',
      },
      take: 5,
    });

    for (const cand of pendingTasks) {
      try {
        const expDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const res = await assignTaskAndSendDocument({
          candidateId: cand.id,
          explanationDate: expDate,
          explanationTime: '14:00',
        });
        logs.push(`Assigned task and scheduled explanation call for ${cand.fullName} (${cand.candidateId})`);
      } catch (err) {
        logs.push(`Error assigning task for ${cand.fullName}: ${err.message}`);
      }
    }

    const reviewTasks = await prisma.taskAssignment.findMany({
      where: {
        status: 'Assigned',
      },
      include: { candidate: true },
      take: 5,
    });

    for (const task of reviewTasks) {
      try {
        await sendNextReviewEmail(task.id);
        logs.push(`Scheduled review session and sent Google Meet invite for ${task.candidate.fullName}`);
      } catch (err) {
        logs.push(`Error sending review email for ${task.candidate.fullName}: ${err.message}`);
      }
    }

    const pendingCerts = await prisma.candidate.findMany({
      where: {
        taskStatus: 'Completed',
        certificates: {
          none: {},
        },
      },
      take: 5,
    });

    for (const cand of pendingCerts) {
      try {
        const certRes = await sendCompletionCertificate(cand.id);
        logs.push(`Generated and dispatched Completion Certificate (${certRes.certificateNumber}) to ${cand.fullName}`);
      } catch (err) {
        logs.push(`Error generating certificate for ${cand.fullName}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      actionsExecuted: logs.length,
      logs: logs.length > 0 ? logs : ['All candidates are up to date with their current internship lifecycle phase.'],
    });
  } catch (error) {
    console.error('Automation runner error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
