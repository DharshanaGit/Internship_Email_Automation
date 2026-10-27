import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Submission token is required.' }, { status: 400 });
    }

    const task = await prisma.taskAssignment.findFirst({
      where: {
        OR: [
          { submissionToken: token },
          { id: token },
        ],
      },
      include: {
        candidate: true,
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task submission link not found or invalid.' }, { status: 404 });
    }

    // Determine deadline
    let deadline = task.deadline;
    if (!deadline) {
      // Default to 7 days from creation if not explicitly set
      deadline = new Date(new Date(task.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const isExpired = Date.now() > new Date(deadline).getTime();

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        taskId: task.taskId || `TSK-${task.id.slice(-6).toUpperCase()}`,
        taskName: task.taskName || task.title,
        title: task.title,
        objective: task.objective || task.description,
        modules: task.modules || 'Core System Integration, Architecture & Testing',
        toolsAndTech: task.toolsAndTech || 'React, Node.js, Cloud APIs, Database Storage',
        clientRequirements: task.clientRequirements || 'Deliver clean production-ready code with GitHub repository documentation.',
        deadline: deadline,
        isExpired,
        submissionStatus: task.submissionStatus,
        alreadySubmitted: task.submissionStatus === 'SUBMITTED',
        projectUrl: task.projectUrl,
        githubUrl: task.githubUrl,
        submittedAt: task.submittedAt,
        penaltyApplied: task.penaltyApplied,
        warningSentAt: task.warningSentAt,
      },
      candidate: {
        id: task.candidate.id,
        internId: task.candidate.internId || task.candidate.candidateId,
        fullName: task.candidate.fullName,
        email: task.candidate.email,
        role: task.candidate.role,
        batch: task.candidate.batch || 'Batch A - June 2026',
        performancePercentage: task.candidate.performancePercentage ?? 100.0,
      },
    });
  } catch (error) {
    console.error('Error fetching task submission details:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, projectUrl, githubUrl, submissionDocs } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Submission token is required.' }, { status: 400 });
    }

    if (!projectUrl && !githubUrl) {
      return NextResponse.json({ success: false, error: 'Please provide at least a Project Demo URL or a GitHub Repository URL.' }, { status: 400 });
    }

    const task = await prisma.taskAssignment.findFirst({
      where: {
        OR: [
          { submissionToken: token },
          { id: token },
        ],
      },
      include: {
        candidate: true,
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task submission link not found.' }, { status: 404 });
    }

    // Check expiration strictly
    let deadline = task.deadline;
    if (!deadline) {
      deadline = new Date(new Date(task.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (Date.now() > new Date(deadline).getTime()) {
      await prisma.taskAssignment.update({
        where: { id: task.id },
        data: { submissionStatus: 'EXPIRED' },
      });

      return NextResponse.json({
        success: false,
        error: 'The submission deadline for this task has expired. The link is locked.',
      }, { status: 410 });
    }

    const now = new Date();

    const updatedTask = await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        projectUrl: projectUrl ? projectUrl.trim() : null,
        githubUrl: githubUrl ? githubUrl.trim() : null,
        submissionDocs: submissionDocs ? submissionDocs.trim() : null,
        submissionStatus: 'SUBMITTED',
        status: 'Submitted',
        submittedAt: now,
      },
    });

    await prisma.candidate.update({
      where: { id: task.candidateId },
      data: {
        taskStatus: 'Under Review',
        tasksCompleted: (task.candidate.tasksCompleted || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project and repository deliverables submitted successfully. Your submission is now queued for milestone review.',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error processing task submission:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
