export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'default',
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'dharshana.shortfundly@gmail.com',
          senderEmail: 'dharshana.shortfundly@gmail.com',
          senderName: 'Shortfundly Media Technologies',
          simulationMode: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        smtpHost: settings.smtpHost || 'smtp.gmail.com',
        smtpPort: settings.smtpPort || 465,
        smtpSecure: settings.smtpSecure !== undefined ? settings.smtpSecure : true,
        smtpUser: settings.smtpUser || 'dharshana.shortfundly@gmail.com',
        hasPassword: Boolean(settings.smtpPass),
        maskedPassword: settings.smtpPass ? '••••••••••••••••' : '',
        senderEmail: settings.senderEmail || settings.smtpUser || 'dharshana.shortfundly@gmail.com',
        senderName: settings.senderName || 'Shortfundly Media Technologies',
        googleCalendarConnected: settings.googleCalendarConnected,
        defaultMeetLinkPrefix: settings.defaultMeetLinkPrefix || 'https://meet.google.com',
        simulationMode: Boolean(settings.simulationMode),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const updateData = {};

    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) updateData.smtpPort = parseInt(body.smtpPort, 10);
    if (body.smtpSecure !== undefined) updateData.smtpSecure = Boolean(body.smtpSecure);
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;

    // Safely accept both smtpPass and smtpPassword without overwriting with mask
    const submittedPassword = body.smtpPass || body.smtpPassword;
    if (
      submittedPassword !== undefined &&
      typeof submittedPassword === 'string' &&
      submittedPassword.trim() !== '' &&
      !submittedPassword.includes('••••')
    ) {
      updateData.smtpPass = submittedPassword.trim();
    }

    if (body.senderEmail !== undefined) updateData.senderEmail = body.senderEmail;
    if (body.senderName !== undefined) updateData.senderName = body.senderName;
    if (body.googleCalendarConnected !== undefined) updateData.googleCalendarConnected = Boolean(body.googleCalendarConnected);
    if (body.defaultMeetLinkPrefix !== undefined) updateData.defaultMeetLinkPrefix = body.defaultMeetLinkPrefix;
    if (body.simulationMode !== undefined) updateData.simulationMode = Boolean(body.simulationMode);

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: updateData,
      create: { id: 'default', ...updateData },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        smtpSecure: updated.smtpSecure,
        smtpUser: updated.smtpUser,
        hasPassword: Boolean(updated.smtpPass),
        maskedPassword: updated.smtpPass ? '••••••••••••••••' : '',
        senderEmail: updated.senderEmail,
        senderName: updated.senderName,
        googleCalendarConnected: updated.googleCalendarConnected,
        defaultMeetLinkPrefix: updated.defaultMeetLinkPrefix,
        simulationMode: updated.simulationMode,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
