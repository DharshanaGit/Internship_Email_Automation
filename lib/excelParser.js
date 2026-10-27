import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { generateSynchronousGemmaInternId } from './gemmaService.js';
import { generateSecureResponseToken, buildCandidateResponseUrl } from './offerService.js';

const candidateRowSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address format'),
  phone: z.string().optional().nullable(),
  role: z.string().min(1, 'Designation / Internship role is required'),
  department: z.string().min(1, 'Department is required'),
  collegeName: z.string().optional().nullable(),
  degree: z.string().optional().nullable(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  endDate: z.string().min(1, 'Internship end date is required'),
  duration: z.string().default('3 Months'),
  workMode: z.string().default('Online - Remote'),
  reportingManager: z.string().default('Priyanka Nair'),
  assignedMentor: z.string().default('Rahul Kapoor'),
  offerLetterStatus: z.string().default('Ready to Send'),
  taskStatus: z.string().default('Not Assigned'),
  remarks: z.string().optional().nullable(),
});

/**
 * Extracts raw candidate rows from an Excel buffer using ExcelJS with XLSX fallback
 */
async function extractRowsFromBuffer(buffer) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Workbook contains no worksheets.');
    }

    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim();
    });

    const headerMap = {};
    headers.forEach((h, col) => {
      if (!h) return;
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      headerMap[lower] = col;
    });

    const getColVal = (row, ...aliases) => {
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        const col = headerMap[cleanAlias];
        if (col) {
          const val = row.getCell(col).value;
          if (val === null || val === undefined) return '';
          if (typeof val === 'string') return val.trim();
          if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
          if (val instanceof Date) return val.toISOString().split('T')[0];
          if (typeof val === 'object') {
            if (val.text) return String(val.text).trim();
            if (val.result !== undefined && val.result !== null) return String(val.result).trim();
            if (Array.isArray(val.richText)) return val.richText.map(t => t.text || '').join('').trim();
            if (val.hyperlink && val.text) return String(val.text).trim();
            return '';
          }
          return String(val || '').trim();
        }
      }
      return '';
    };

    const rawRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawFullName = getColVal(row, 'Full Name', 'Candidate Name', 'Name', 'FullName');
      const rawEmail = getColVal(row, 'Email ID', 'Email', 'Candidate Email', 'EmailID');
      if (!rawFullName && !rawEmail) return;

      rawRows.push({
        candidateId: getColVal(row, 'Candidate ID', 'candidate_id', 'CandidateId', 'ID') || `SF-INT-2026-${String(rowNumber - 1).padStart(4, '0')}`,
        fullName: rawFullName,
        email: rawEmail,
        phone: getColVal(row, 'Phone Number', 'Phone', 'Mobile'),
        role: getColVal(row, 'Designation/Internship Role', 'Designation', 'Role', 'Internship Role') || 'Web Developer Intern',
        department: getColVal(row, 'Department', 'Dept') || 'Engineering',
        collegeName: getColVal(row, 'College Name', 'College', 'University') || 'Recognized University',
        degree: getColVal(row, 'Degree', 'Course') || 'B.Tech / B.E.',
        joiningDate: getColVal(row, 'Joining Date', 'JoiningDate') || '2026-06-01',
        endDate: getColVal(row, 'Internship End Date', 'EndDate', 'End Date') || '2026-08-31',
        duration: getColVal(row, 'Internship Duration', 'Duration') || '3 Months',
        workMode: getColVal(row, 'Work Mode', 'WorkMode') || 'Online - Remote',
        reportingManager: getColVal(row, 'Reporting Manager', 'Manager') || 'Priyanka Nair',
        assignedMentor: getColVal(row, 'Assigned Mentor', 'Mentor') || 'Rahul Kapoor',
        offerLetterStatus: getColVal(row, 'Offer Letter Status', 'Offer Status') || 'Ready to Send',
        taskStatus: getColVal(row, 'Task Status', 'TaskStatus') || 'Not Assigned',
        remarks: getColVal(row, 'Remarks', 'Notes'),
      });
    });

    return rawRows;
  } catch (excelJsError) {
    // Robust SheetJS fallback if ExcelJS encounters malformed drawings/anchors
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return rows.map((r, idx) => {
      const getVal = (...keys) => {
        for (const k of keys) {
          const found = Object.keys(r).find(
            (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (found && r[found] !== undefined && r[found] !== null && String(r[found]).trim() !== '') {
            return String(r[found]).trim();
          }
        }
        return '';
      };

      const rawFullName = getVal('Full Name', 'Candidate Name', 'Name', 'FullName');
      const rawEmail = getVal('Email ID', 'Email', 'Candidate Email', 'EmailID');

      return {
        candidateId: getVal('Candidate ID', 'candidate_id', 'CandidateId', 'ID') || `SF-INT-2026-${String(idx + 1).padStart(4, '0')}`,
        fullName: rawFullName,
        email: rawEmail,
        phone: getVal('Phone Number', 'Phone', 'Mobile'),
        role: getVal('Designation/Internship Role', 'Designation', 'Role', 'Internship Role') || 'Web Developer Intern',
        department: getVal('Department', 'Dept') || 'Engineering',
        collegeName: getVal('College Name', 'College', 'University') || 'Recognized University',
        degree: getVal('Degree', 'Course') || 'B.Tech / B.E.',
        joiningDate: getVal('Joining Date', 'JoiningDate') || '2026-06-01',
        endDate: getVal('Internship End Date', 'EndDate', 'End Date') || '2026-08-31',
        duration: getVal('Internship Duration', 'Duration') || '3 Months',
        workMode: getVal('Work Mode', 'WorkMode') || 'Online - Remote',
        reportingManager: getVal('Reporting Manager', 'Manager') || 'Priyanka Nair',
        assignedMentor: getVal('Assigned Mentor', 'Mentor') || 'Rahul Kapoor',
        offerLetterStatus: getVal('Offer Letter Status', 'Offer Status') || 'Ready to Send',
        taskStatus: getVal('Task Status', 'TaskStatus') || 'Not Assigned',
        remarks: getVal('Remarks', 'Notes'),
      };
    }).filter(r => r.fullName || r.email);
  }
}

/**
 * Parses buffer and runs comprehensive Zod validation and duplicate detection
 */
export async function parseCandidateExcelFile(buffer, filename = 'candidates.xlsx') {
  const rawRows = await extractRowsFromBuffer(buffer);

  // Pre-fetch existing candidate IDs and emails from DB to detect duplicates
  const existingCandidates = await prisma.candidate.findMany({
    select: { candidateId: true, email: true },
  });
  const existingIds = new Set(existingCandidates.map((c) => (c.candidateId || '').toUpperCase()));
  const existingEmails = new Set(existingCandidates.map((c) => (c.email || '').toLowerCase()));

  const seenInBatchIds = new Set();
  const seenInBatchEmails = new Set();

  const report = [];
  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  rawRows.forEach((rowData, idx) => {
    const rowNumber = idx + 2;
    const rowErrors = [];

    // Zod Schema Validation
    const parseResult = candidateRowSchema.safeParse(rowData);
    if (!parseResult.success) {
      parseResult.error.errors.forEach((err) => {
        rowErrors.push(`${err.path.join('.')}: ${err.message}`);
      });
    }

    // Duplicate & Existing Record Detection
    let isDuplicateInBatch = false;
    let isExistingInDb = false;
    const normId = (rowData.candidateId || '').toUpperCase();
    const normEmail = (rowData.email || '').toLowerCase();

    if (normId && existingIds.has(normId)) {
      isExistingInDb = true;
    }
    if (normEmail && existingEmails.has(normEmail)) {
      isExistingInDb = true;
    }

    // Duplicate in same file
    if (normId && seenInBatchIds.has(normId)) {
      isDuplicateInBatch = true;
      rowErrors.push(`Duplicate Candidate ID "${rowData.candidateId}" found multiple times in this spreadsheet.`);
    }
    if (normEmail && seenInBatchEmails.has(normEmail)) {
      isDuplicateInBatch = true;
      rowErrors.push(`Duplicate Email "${rowData.email}" found multiple times in this spreadsheet.`);
    }

    if (normId) seenInBatchIds.add(normId);
    if (normEmail) seenInBatchEmails.add(normEmail);

    let status = 'VALID';
    const hasSchemaError = !parseResult.success;

    if (hasSchemaError) {
      status = 'INVALID';
      invalidCount++;
    } else if (isDuplicateInBatch) {
      status = 'DUPLICATE';
      duplicateCount++;
    } else {
      status = 'VALID';
      validCount++;
      if (isExistingInDb) {
        duplicateCount++;
      }
    }

    const internId = rowData.internId || generateSynchronousGemmaInternId(idx);
    const { rawToken } = generateSecureResponseToken();
    const responseUrl = buildCandidateResponseUrl(rawToken);
    rowData.internId = internId;

    report.push({
      internId: String(internId || ''),
      responseUrl: String(responseUrl || ''),
      token: String(rawToken || ''),
      rowNumber: Number(rowNumber),
      candidateId: String(rowData.candidateId || `SF-INT-2026-${String(idx + 1).padStart(4, '0')}`),
      fullName: String(rowData.fullName || ''),
      email: String(rowData.email || ''),
      phone: String(rowData.phone || ''),
      role: String(rowData.role || 'Web Developer Intern'),
      department: String(rowData.department || 'Engineering'),
      batch: String(rowData.batch || 'Batch A'),
      joiningDate: String(rowData.joiningDate || '2026-06-01'),
      endDate: String(rowData.endDate || '2026-08-31'),
      duration: String(rowData.duration || '3 Months'),
      workMode: String(rowData.workMode || 'Online - Remote'),
      collegeName: String(rowData.collegeName || ''),
      degree: String(rowData.degree || ''),
      reportingManager: String(rowData.reportingManager || 'Priyanka Nair'),
      assignedMentor: String(rowData.assignedMentor || 'Rahul Kapoor'),
      offerLetterStatus: String(rowData.offerLetterStatus || 'Ready to Send'),
      taskStatus: String(rowData.taskStatus || 'Not Assigned'),
      remarks: String(rowData.remarks || ''),
      status,
      isExistingInDb,
      isValid: status === 'VALID',
      errors: rowErrors,
      raw: rowData,
      data: rowData,
    });
  });

  return {
    totalRows: report.length,
    validCount,
    duplicateCount,
    invalidCount,
    canProceed: validCount > 0,
    rows: report,
  };
}
