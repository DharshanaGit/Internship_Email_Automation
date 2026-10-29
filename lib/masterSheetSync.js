import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { prisma } from './prisma.js';

const SPREADSHEET_PATH = path.join(process.cwd(), 'Shortfundly_Internship_Candidates_Dummy.xlsx');

/**
 * Builds the Master Sheet workbook buffer directly from SQLite
 */
export async function generateMasterSheetBuffer() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      tasks: { orderBy: { createdAt: 'desc' }, take: 1 },
      certificates: { take: 1 },
    },
  });

  const rows = candidates.map((c) => {
    const latestTask = c.tasks && c.tasks.length > 0 ? c.tasks[0] : null;
    return {
      'Candidate ID': c.candidateId,
      'Full Name': c.fullName,
      'Email ID': c.email,
      'Contact Phone': c.phone || 'N/A',
      'Internship Role': c.role,
      'Department': c.department,
      'College / University': c.collegeName || 'N/A',
      'Degree': c.degree || 'N/A',
      'Joining Date': c.joiningDate,
      'Ending Date': c.endDate,
      'Duration': c.duration,
      'Work Mode': c.workMode,
      'Offer Letter Status': c.offerLetterStatus,
      'Offer Accepted At': c.offerAcceptedAt ? new Date(c.offerAcceptedAt).toLocaleString('en-IN') : 'Pending',
      'Task Status': c.taskStatus,
      'No of tasks completed': c.tasksCompleted || 0,
      'Review Cycle': c.reviewCycle || 0,
      'Performance Score': c.score ? `${c.score}%` : '0%',
      'Current Sprint': latestTask ? latestTask.title : 'None',
      'Google Meet Room': c.googleMeetUrl || (latestTask ? latestTask.meetLink : 'Pending Assignment'),
      'Reporting Manager': c.reportingManager,
      'Assigned Mentor': c.assignedMentor,
      'Certificate Issued': c.certificates && c.certificates.length > 0 ? c.certificates[0].certificateNumber : 'No',
      'Last Updated (DB)': new Date(c.updatedAt).toLocaleString('en-IN'),
    };
  });

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Auto-fit column widths for clear presentation
  worksheet['!cols'] = [
    { wch: 18 }, // Candidate ID
    { wch: 22 }, // Full Name
    { wch: 30 }, // Email ID
    { wch: 16 }, // Phone
    { wch: 26 }, // Role
    { wch: 26 }, // Department
    { wch: 34 }, // College
    { wch: 28 }, // Degree
    { wch: 14 }, // Joining Date
    { wch: 14 }, // Ending Date
    { wch: 12 }, // Duration
    { wch: 18 }, // Work Mode
    { wch: 20 }, // Offer Status
    { wch: 22 }, // Accepted At
    { wch: 20 }, // Task Status
    { wch: 22 }, // Tasks Completed
    { wch: 14 }, // Review Cycle
    { wch: 18 }, // Score
    { wch: 32 }, // Sprint
    { wch: 22 }, // Manager
    { wch: 22 }, // Mentor
    { wch: 20 }, // Certificate
    { wch: 22 }, // Updated
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Master Intern Roster');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Atomically writes Master Sheet to disk to prevent file locking conflicts
 */
export async function syncMasterSheetToDisk() {
  try {
    const buffer = await generateMasterSheetBuffer();
    const tempPath = `${SPREADSHEET_PATH}.tmp`;
    fs.writeFileSync(tempPath, buffer);
    if (fs.existsSync(tempPath)) {
      fs.copyFileSync(tempPath, SPREADSHEET_PATH);
      fs.unlinkSync(tempPath);
    }
    console.log(`[Master Sheet Sync] Hourly master roster successfully synced to disk at ${new Date().toISOString()}`);
    return { success: true, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('[Master Sheet Sync Error]', err);
    return { success: false, error: err.message };
  }
}

// Scheduled hourly sync setup
let hourlyTimer = null;
export function startHourlyMasterSheetSync() {
  if (hourlyTimer) return;
  // Run once immediately on start, then every 60 minutes
  syncMasterSheetToDisk();
  hourlyTimer = setInterval(() => {
    syncMasterSheetToDisk();
  }, 60 * 60 * 1000);
}
