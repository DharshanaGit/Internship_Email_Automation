import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { generateCertificatePdf } from '@/lib/pdfEngine.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get('batch');
    const role = searchParams.get('role');

    const where = {
      isLeaved: false,
    };
    if (batch && batch !== 'ALL') where.batch = batch;
    if (role && role !== 'ALL') where.role = { contains: role, mode: 'insensitive' };

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        tasks: {
          select: {
            id: true,
            taskNumber: true,
            taskId: true,
            title: true,
            performanceScore: true,
            status: true,
          },
          orderBy: { taskNumber: 'asc' },
        },
        certificates: {
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const evaluated = candidates.map(c => {
      const taskScores = c.tasks.map(t => t.performanceScore || 100);
      const computedAverage = taskScores.length > 0
        ? Math.round((taskScores.reduce((a, b) => a + b, 0) / taskScores.length) * 10) / 10
        : (c.averageTaskScore || c.performancePercentage || 100.0);

      return {
        id: c.id,
        internId: c.internId || c.candidateId,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        role: c.role,
        collegeName: c.collegeName,
        degree: c.degree,
        batch: c.batch || 'Batch A',
        joiningDate: c.joiningDate,
        endDate: c.endDate,
        tasksCompleted: c.tasksCompleted || c.tasks.filter(t => t.status === 'Completed').length,
        taskHistory: c.tasks,
        overallAverageScore: computedAverage,
        certificateApproved: c.certificateApproved,
        certificateApprovedAt: c.certificateApprovedAt,
        certificateApprovedBy: c.certificateApprovedBy,
        certificateSent: c.certificates.length > 0,
        certificateNumber: c.certificates[0]?.certificateNumber || null,
      };
    });

    return NextResponse.json({
      success: true,
      candidates: evaluated,
    });
  } catch (error) {
    console.error('Error fetching certification evaluation candidates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, approvedBy = 'CEO' } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select candidates for certificate approval.' }, { status: 400 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
        isLeaved: false,
      },
      include: {
        tasks: true,
      },
    });

    const results = [];

    for (const candidate of candidates) {
      const taskScores = candidate.tasks.map(t => t.performanceScore || 100);
      const computedAverage = taskScores.length > 0
        ? Math.round((taskScores.reduce((a, b) => a + b, 0) / taskScores.length) * 10) / 10
        : (candidate.averageTaskScore || 100.0);

      // 1. Mark candidate approved in database
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          certificateApproved: true,
          certificateApprovedAt: new Date(),
          certificateApprovedBy: approvedBy,
          averageTaskScore: computedAverage,
        },
      });

      // 2. Generate certificate ID
      const certNumber = `SF-CERT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

      // 3. Generate high-resolution PDF certificate
      let pdfBuffer = null;
      try {
        pdfBuffer = await generateCertificatePdf({
          ...candidate,
          candidateName: candidate.fullName,
          certificateNumber: certNumber,
          issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          averageScore: `${computedAverage.toFixed(1)}%`,
        });
      } catch (pdfErr) {
        console.warn('PDF Certificate generation error, proceeding with email:', pdfErr.message);
      }

      // 4. Create Certificate DB record
      await prisma.certificate.upsert({
        where: { certificateNumber: certNumber },
        update: {
          issueDate: new Date().toISOString().split('T')[0],
          sentAt: new Date(),
        },
        create: {
          candidateId: candidate.id,
          certificateNumber: certNumber,
          issueDate: new Date().toISOString().split('T')[0],
          sentAt: new Date(),
        },
      });

      // 5. Send certificate email with attached PDF
      const emailText = `Dear ${candidate.fullName},

Congratulations on the exemplary completion of your Shortfundly Internship!

The Chief Executive Officer and Senior Leadership have evaluated your tenure deliverables and officially approved your Internship Completion Certificate.

Award & Performance Metrics:
- Intern ID: ${candidate.internId || candidate.candidateId}
- Certificate ID: ${certNumber}
- Assigned Role: ${candidate.role}
- Cumulative Performance Average: ${computedAverage.toFixed(1)}%
- Verification Status: Digitally Verified & Archived

Your official Shortfundly Completion Certificate is attached to this email. We commend your dedication and wish you the greatest success in your engineering career.

Warm regards,
Selvam M & Leadership Team
Shortfundly Media Technologies Pvt. Ltd.`;

      const attachments = [];
      if (pdfBuffer) {
        attachments.push({
          filename: `Shortfundly_Certificate_${candidate.fullName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      }

      const dispatch = await sendEmail({
        to: candidate.email,
        subject: `Official Internship Completion Certificate - ${candidate.fullName} | Shortfundly`,
        text: emailText,
        attachments,
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: candidate.email,
          recipientName: candidate.fullName,
          subject: `Official Internship Completion Certificate - ${candidate.fullName} | Shortfundly`,
          emailType: 'CERTIFICATE_ISSUED',
          body: emailText,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      results.push({
        candidateId: candidate.id,
        fullName: candidate.fullName,
        certNumber,
        averageScore: computedAverage,
        emailSent: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      approvedCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Error approving certificates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
