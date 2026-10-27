export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { rows, batch, role, taskNumber } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No response data provided in the evaluation upload.' }, { status: 400 });
    }

    // Normalized map of submitted records by Intern ID and Email (lowercased)
    const submittedMap = new Map();
    for (const r of rows) {
      const email = (r.Email || r.email || r['Email Address'] || r['email address'] || '').toString().trim().toLowerCase();
      const internId = (r['Intern ID'] || r.internId || r.InternId || r['Candidate ID'] || r.candidateId || '').toString().trim();
      const githubUrl = r['GitHub Link'] || r['GitHub URL'] || r.githubUrl || r.github || '';
      const projectUrl = r['Project Link'] || r['Live URL'] || r.projectUrl || r.demo || '';

      if (email) {
        submittedMap.set(email, { githubUrl, projectUrl, raw: r });
      }
      if (internId) {
        submittedMap.set(internId.toUpperCase(), { githubUrl, projectUrl, raw: r });
      }
    }

    // Query active candidates in DB matching batch and role
    const where = { isLeaved: false };
    if (batch && batch !== 'ALL') where.batch = batch;
    if (role && role !== 'ALL') where.role = { contains: role, mode: 'insensitive' };

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        tasks: {
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
    });

    const submitted = [];
    const notSubmitted = [];

    for (const candidate of candidates) {
      const candidateEmail = candidate.email.toLowerCase();
      const candidateInternId = (candidate.internId || candidate.candidateId || '').toUpperCase();

      const match = submittedMap.get(candidateEmail) || submittedMap.get(candidateInternId);

      if (match) {
        // Mark submitted and advance to Review Pending
        const activeTask = candidate.tasks[0];
        if (activeTask) {
          await prisma.taskAssignment.update({
            where: { id: activeTask.id },
            data: {
              submissionStatus: 'SUBMITTED',
              isSent: true,
              githubUrl: match.githubUrl ? String(match.githubUrl) : activeTask.githubUrl,
              projectUrl: match.projectUrl ? String(match.projectUrl) : activeTask.projectUrl,
              submittedAt: new Date(),
              status: 'Review Pending',
            },
          });
        }

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            taskStatus: 'Review Pending',
          },
        });

        submitted.push({
          id: candidate.id,
          internId: candidate.internId || candidate.candidateId,
          fullName: candidate.fullName,
          email: candidate.email,
          role: candidate.role,
          batch: candidate.batch || 'Batch A',
          performancePercentage: candidate.performancePercentage,
          githubUrl: match.githubUrl,
          projectUrl: match.projectUrl,
          status: 'Review Pending',
        });
      } else {
        notSubmitted.push({
          id: candidate.id,
          internId: candidate.internId || candidate.candidateId,
          fullName: candidate.fullName,
          email: candidate.email,
          role: candidate.role,
          batch: candidate.batch || 'Batch A',
          performancePercentage: candidate.performancePercentage,
          warningsSent: candidate.tasks[0]?.warningsSent || 0,
          status: 'Not Submitted',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: candidates.length,
      submittedCount: submitted.length,
      notSubmittedCount: notSubmitted.length,
      submitted,
      notSubmitted,
    });
  } catch (error) {
    console.error('Error evaluating task submissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
