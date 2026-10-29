import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { prisma } from './prisma.js';
import { generateGemmaTask } from './gemmaEngine';
import { getExplanationSchedule, getReviewOneSchedule } from './dateUtils';
import { generateGoogleMeetLink } from './googleCalendar';
import { syncMasterSheetToDisk } from './masterSheetSync';

const SPREADSHEET_PATH = path.join(process.cwd(), 'Shortfundly_Internship_Candidates_Dummy.xlsx');

/**
 * Updates the spreadsheet with the new column 'No of tasks completed'
 * and syncs candidate milestone in SQLite database
 */
export async function recordTaskCompletion(candidateId, feedbackNotes = 'Completed successfully') {
  // 1. Fetch candidate with existing tasks from DB
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { tasks: { orderBy: { createdAt: 'desc' } } },
  });

  if (!candidate) {
    throw new Error(`Candidate with ID ${candidateId} not found.`);
  }

  const newCompletedCount = (candidate.tasksCompleted || 0) + 1;
  const newScore = Math.min(100, 70 + newCompletedCount * 10);

  // 2. Mark latest task as Completed in DB
  if (candidate.tasks && candidate.tasks.length > 0) {
    const latestTask = candidate.tasks[0];
    await prisma.taskAssignment.update({
      where: { id: latestTask.id },
      data: {
        status: 'Completed',
        feedback: feedbackNotes,
      },
    });
  }

  // 3. Update candidate in SQLite
  const updatedCandidate = await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      tasksCompleted: newCompletedCount,
      score: newScore,
      taskStatus: 'Milestone Completed',
    },
  });

  // 4. Record update directly to SQLite; trigger non-blocking disk sync to prevent file-locking
  syncMasterSheetToDisk().catch((err) => console.error('Background sheet sync warning:', err));

  // 5. Check if candidate tenure has ended; if not, automatically prepare next task
  let nextTask = null;
  const isPastEndDate = new Date(candidate.endDate) < new Date();
  if (!isPastEndDate && newCompletedCount < 5) {
    const nextGemmaTask = generateGemmaTask(candidate.role, newCompletedCount);
    const expSchedule = getExplanationSchedule(new Date());
    const rev1Schedule = getReviewOneSchedule(expSchedule.dateStr);

    nextTask = await prisma.taskAssignment.create({
      data: {
        candidateId: candidate.id,
        taskNumber: newCompletedCount + 1,
        title: nextGemmaTask.title,
        description: nextGemmaTask.description,
        role: candidate.role,
        explanationDate: expSchedule.dateStr,
        explanationTime: expSchedule.timeStr,
        meetLink: candidate.tasks[0]?.meetLink || generateGoogleMeetLink(),
        reviewDate: rev1Schedule.callDateStr,
        reviewTime: rev1Schedule.timeStr,
        status: 'Assigned',
        reviewCount: 0,
      },
    });

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { taskStatus: `Task ${newCompletedCount + 1} Assigned` },
    });
  }

  return {
    candidate: updatedCandidate,
    tasksCompleted: newCompletedCount,
    nextTask,
  };
}
