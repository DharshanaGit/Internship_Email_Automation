export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { saveCandidateTaskPipeline } from '@/lib/taskPipelineService.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      candidateId,
      candidateIds,
      tasks,
      autoSendFirstTask = true,
      customPipelineMap = {},
    } = body;

    const baseUrl = getAppBaseUrl();
    const results = [];

    // Case 1: Multiple candidates with shared tasks or customPipelineMap
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      for (const cid of candidateIds) {
        const candidateTasks = customPipelineMap[cid] || tasks;
        if (Array.isArray(candidateTasks) && candidateTasks.length > 0) {
          const res = await saveCandidateTaskPipeline({
            candidateId: cid,
            tasks: candidateTasks,
            autoSendFirstTask,
            baseUrl,
          });
          results.push(res);
        }
      }

      return NextResponse.json({
        success: true,
        savedCount: results.length,
        results,
      });
    }

    // Case 2: Single candidate with customized tasks array
    if (candidateId && Array.isArray(tasks) && tasks.length > 0) {
      const res = await saveCandidateTaskPipeline({
        candidateId,
        tasks,
        autoSendFirstTask,
        baseUrl,
      });

      return NextResponse.json({
        success: true,
        candidateId,
        tasksCount: res.tasksCount,
        task1Dispatched: res.task1Dispatched,
        message: res.task1Dispatched
          ? 'Automated task pipeline activated! First task dispatched immediately to candidate.'
          : 'Automated task pipeline activated! First task scheduled to automatically dispatch on joining date.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'candidateId and tasks array are required.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saving task pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
