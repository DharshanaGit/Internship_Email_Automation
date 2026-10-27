export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendEmail } from '../../../../lib/mailer';

export async function POST(request) {
  try {
    const { emailId } = await request.json();

    const log = await prisma.emailLog.findUnique({
      where: { id: emailId },
    });

    if (!log) {
      return NextResponse.json({ success: false, error: 'Email record not found' }, { status: 404 });
    }

    const res = await sendEmail({
      candidateId: log.candidateId,
      to: log.recipientEmail,
      recipientName: log.recipientName || '',
      subject: `[Resent] ${log.subject}`,
      html: `<div style="font-family: sans-serif; padding: 20px;">${log.body.replace(/\n/g, '<br>')}</div>`,
      text: log.body,
      emailType: log.emailType,
      meetLink: log.meetLink,
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: res.status,
        error: res.error,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, result: res });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
