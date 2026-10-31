export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { calculateTenureTaskTimeline } from '@/lib/taskPipelineService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, candidateIds, customTaskCount } = body;

    let targetIds = [];
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      targetIds = candidateIds;
    } else if (candidateId) {
      targetIds = [candidateId];
    }

    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'candidateId or candidateIds is required.' },
        { status: 400 }
      );
    }

    const candidates = await prisma.candidate.findMany({
      where: { id: { in: targetIds }, isLeaved: false },
      include: {
        tasks: {
          orderBy: { taskNumber: 'asc' },
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active candidates found.' },
        { status: 404 }
      );
    }

    const pipelines = candidates.map((cand) => {
      // Check if candidate already has active tasks in DB
      const existingTasks = cand.tasks || [];
      const calculated = calculateTenureTaskTimeline(cand, customTaskCount);

      // If candidate already has configured tasks, merge existing with calculated
      let finalTasks = calculated.tasks;
      if (existingTasks.length > 0) {
        finalTasks = calculated.tasks.map((genTask, idx) => {
          const matched = existingTasks.find(et => et.taskNumber === genTask.taskNumber);
          if (matched) {
            return {
              ...genTask,
              id: matched.id,
              taskId: matched.taskId || genTask.taskId,
              title: matched.title || genTask.title,
              objective: matched.objective || matched.description || genTask.objective,
              explanationDate: matched.explanationDate || genTask.explanationDate,
              explanationTime: matched.explanationTime || genTask.explanationTime,
              deadline: matched.deadline ? matched.deadline.toISOString().split('T')[0] : genTask.deadline,
              meetLink: matched.meetLink || genTask.meetLink,
              isSent: matched.isSent,
              status: matched.status,
            };
          }
          return genTask;
        });
      }

      return {
        ...calculated,
        tasks: finalTasks,
        existingCount: existingTasks.length,
      };
    });

    return NextResponse.json({
      success: true,
      pipelines,
      singlePipeline: pipelines[0],
    });
  } catch (error) {
    console.error('Error generating task pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
