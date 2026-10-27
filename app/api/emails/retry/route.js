export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendEmail } from '../../../../lib/mailer';
import { getAppBaseUrl } from '../../../../lib/offerService';

export async function POST(request) {
  try {
    const { emailId } = await request.json();

    const log = await prisma.emailLog.findUnique({
      where: { id: emailId },
    });

    if (!log) {
      return NextResponse.json({ success: false, error: 'Email record not found' }, { status: 404 });
    }

    let textBody = log.body || '';
    let htmlBody = `<div style="font-family: sans-serif; padding: 20px;">${textBody.replace(/\n/g, '<br>')}</div>`;

    // Ensure retries and resends never use localhost URLs
    if (log.emailType === 'OFFER_LETTER' || textBody.includes('/offers/respond')) {
      const baseUrl = getAppBaseUrl();
      textBody = textBody.replace(/https?:\/\/localhost:[0-9]+/g, baseUrl);
      htmlBody = htmlBody.replace(/https?:\/\/localhost:[0-9]+/g, baseUrl);
    }

    const res = await sendEmail({
      candidateId: log.candidateId,
      to: log.recipientEmail,
      recipientName: log.recipientName || '',
      subject: `[Resent] ${log.subject}`,
      html: htmlBody,
      text: textBody,
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
