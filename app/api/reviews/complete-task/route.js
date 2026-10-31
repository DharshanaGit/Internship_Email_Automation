export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';
import { triggerNextAutomatedTask } from '@/lib/taskPipelineService.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, finalScoreMap = {}, customNotes } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select candidates to complete the milestone task.' }, { status: 400 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
        isLeaved: false,
      },
      include: {
        tasks: {
          include: {
            reviews: true,
          },
          orderBy: { taskNumber: 'desc' },
        },
      },
    });

    const results = [];

    for (const candidate of candidates) {
      const activeTask = candidate.tasks[0];
      const taskNumber = activeTask ? activeTask.taskNumber : 1;
      const taskTitle = activeTask ? activeTask.title : 'Milestone Task';

      // Override score if HR supplied one, otherwise use activeTask performance or candidate score
      let awardedScore = candidate.performancePercentage || 100.0;
      if (finalScoreMap[candidate.id] !== undefined) {
        awardedScore = parseFloat(finalScoreMap[candidate.id]);
      } else if (activeTask?.performanceScore) {
        awardedScore = activeTask.performanceScore;
      }

      // Mark active task completed
      if (activeTask) {
        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            status: 'Completed',
            performanceScore: awardedScore,
          },
        });
      }

      // Calculate cumulative average score across all candidate tasks
      const allTasks = await prisma.taskAssignment.findMany({
        where: { candidateId: candidate.id },
        select: { performanceScore: true },
      });

      const totalScores = allTasks.reduce((acc, t) => acc + (t.performanceScore || 100), 0);
      const overallAvg = allTasks.length > 0 ? (totalScores / allTasks.length) : awardedScore;

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          taskStatus: 'Task Completed',
          tasksCompleted: (candidate.tasksCompleted || 0) + 1,
          performancePercentage: awardedScore,
          averageTaskScore: Math.round(overallAvg * 10) / 10,
        },
      });

      const jinjaContent = `Dear ${candidate.fullName},

Congratulations! You have successfully completed **Task #${taskNumber}: ${taskTitle}**.

**Milestone Completion Certificate Record:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Milestone Task Number:** Task #${taskNumber}
- **Final Awarded Task Score:** **${awardedScore.toFixed(1)}%**
- **Cumulative Internship Average Score:** **${overallAvg.toFixed(1)}%**
- **Milestones Cleared:** ${(candidate.tasksCompleted || 0) + 1} Completed

${customNotes ? `**Mentor Evaluation Note:**\n${customNotes}\n` : ''}

You are now approved to proceed to your next technical sprint task. Your mentor will issue your next milestone assignment details shortly.

Keep up the outstanding engineering dedication!

Warm regards,
**Talent & Engineering Review Board**
Shortfundly Media Technologies Pvt. Ltd.`;

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = `Official Milestone Completion: Task #${taskNumber} Approved (${awardedScore.toFixed(1)}%) - ${candidate.fullName}`;

      const dispatch = await sendEmail({
        to: candidate.email,
        subject,
        text: jinjaContent,
        html: htmlBody,
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: candidate.email,
          recipientName: candidate.fullName,
          subject,
          emailType: 'TASK_COMPLETION_APPROVAL',
          body: jinjaContent,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      // Automatically trigger next automated task in sequence after task completion email
      let nextTaskTriggerResult = null;
      try {
        const baseUrl = getAppBaseUrl();
        nextTaskTriggerResult = await triggerNextAutomatedTask(candidate.id, taskNumber, baseUrl);
      } catch (triggerErr) {
        console.error(`Error triggering next task for ${candidate.fullName}:`, triggerErr);
      }

      results.push({
        candidateId: candidate.id,
        internId: candidate.internId || candidate.candidateId,
        fullName: candidate.fullName,
        awardedScore,
        overallAvg,
        success: dispatch.success,
        nextTaskTriggered: nextTaskTriggerResult?.triggered || false,
        nextTaskNumber: nextTaskTriggerResult?.nextTaskNumber || null,
        allMilestonesCompleted: nextTaskTriggerResult?.allCompleted || false,
      });
    }

    return NextResponse.json({
      success: true,
      completedCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Error completing milestone tasks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
