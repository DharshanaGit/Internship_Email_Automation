import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { generateSynchronousGemmaInternId } from './gemmaService.js';
import { generateSecureResponseToken, buildCandidateResponseUrl } from './offerService.js';

const candidateRowSchema = z.object({
  candidateId: z.string().optional().default(() => `SF-INT-2026-${Math.floor(1000 + Math.random() * 9000)}`),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address format'),
  phone: z.string().optional().nullable(),
  role: z.string().optional().default('Web Developer Intern'),
  department: z.string().optional().default('Engineering'),
  collegeName: z.string().optional().nullable(),
  degree: z.string().optional().nullable(),
  joiningDate: z.string().optional().default('2026-06-01'),
  endDate: z.string().optional().default('2026-08-31'),
  duration: z.string().optional().default('3 Months'),
  stipend: z.string().optional().default('10000'),
  workMode: z.string().optional().default('Online - Remote'),
  reportingManager: z.string().optional().default('Priyanka Nair'),
  assignedMentor: z.string().optional().default('Rahul Kapoor'),
  offerLetterStatus: z.string().optional().default('Ready to Send'),
  taskStatus: z.string().optional().default('Not Assigned'),
  remarks: z.string().optional().nullable(),
});

function normalizeDateValue(val, defaultDate = '2026-06-01') {
  if (val === null || val === undefined || val === '') return defaultDate;
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val.toISOString().split('T')[0] : defaultDate;
  }
  if (typeof val === 'number') {
    // Excel serial date representation
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : defaultDate;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/.test(str)) {
    const parts = str.split(/[\/\-\.]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
      return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return defaultDate;
}

function getSafeCellString(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val.toISOString().split('T')[0] : '';
  }
  if (typeof val === 'object') {
    if (val.text) return String(val.text).trim();
    if (val.result !== undefined && val.result !== null) return String(val.result).trim();
    if (Array.isArray(val.richText)) return val.richText.map((t) => t.text || '').join('').trim();
    if (val.hyperlink && val.text) return String(val.text).trim();
  }
  return String(val || '').trim();
}

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
      headers[colNumber] = getSafeCellString(cell.value);
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
          return getSafeCellString(val);
        }
      }
      return '';
    };

    const rawRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawFullName = getColVal(row, 'Name', 'Full Name', 'Candidate Name', 'FullName', 'CandidateName', 'Student Name');
      const rawEmail = getColVal(row, 'Email ID', 'Email', 'Candidate Email', 'EmailID', 'Mail ID', 'Mail', 'Email Address');
      if (!rawFullName && !rawEmail) return;

      const joiningRaw = getColVal(row, 'JoiningDate', 'Joining Date', 'Start Date', 'StartDate', 'Joining');
      const endRaw = getColVal(row, 'EndingDate', 'Ending Date', 'End Date', 'EndDate', 'Internship End Date', 'Completion Date');

      const joiningDate = normalizeDateValue(joiningRaw, '2026-06-01');
      const endDate = normalizeDateValue(endRaw, '2026-08-31');

      rawRows.push({
        candidateId: getColVal(row, 'Candidate ID', 'candidate_id', 'CandidateId', 'ID') || `SF-INT-2026-${String(rowNumber - 1).padStart(4, '0')}`,
        fullName: rawFullName,
        email: rawEmail,
        phone: getColVal(row, 'Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact Number', 'PhoneNumber'),
        role: getColVal(row, 'Role', 'Designation', 'Designation/Internship Role', 'Internship Role', 'Position', 'Domain') || 'Web Developer Intern',
        department: getColVal(row, 'Department', 'Dept') || 'Engineering',
        collegeName: getColVal(row, 'College', 'College Name', 'University', 'Institution', 'CollegeName') || 'Recognized University',
        degree: getColVal(row, 'Degree', 'Course', 'Program', 'Qualification', 'Branch') || 'B.Tech / B.E.',
        joiningDate,
        endDate,
        duration: getColVal(row, 'Internship Duration', 'Duration') || '3 Months',
        stipend: getColVal(row, 'Monthly Stipend (INR)', 'Monthly Stipend', 'Stipend (INR)', 'Stipend', 'MonthlyStipend', 'Stipend Amount') || '10000',
        workMode: getColVal(row, 'Work Mode', 'WorkMode') || 'Online - Remote',
        reportingManager: getColVal(row, 'Reporting Manager', 'Manager') || 'Priyanka Nair',
        assignedMentor: getColVal(row, 'Assigned Mentor', 'Mentor') || 'Rahul Kapoor',
        offerLetterStatus: getColVal(row, 'Offer Letter Status', 'Offer Status') || 'Ready to Send',
        taskStatus: getColVal(row, 'Task Status', 'TaskStatus') || 'Not Assigned',
        remarks: getColVal(row, 'Remarks', 'Notes'),
      });
    });

    if (rawRows.length > 0) {
      return rawRows;
    }
    // If no rows parsed via ExcelJS, proceed to SheetJS fallback
    throw new Error('No rows found via ExcelJS');
  } catch (excelJsError) {
    // Robust SheetJS fallback if ExcelJS encounters malformed drawings/anchors or CSV
    try {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
        return [];
      }
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      return rows.map((r, idx) => {
        const getVal = (...keys) => {
          for (const k of keys) {
            const found = Object.keys(r).find(
              (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            if (found && r[found] !== undefined && r[found] !== null && String(r[found]).trim() !== '') {
              return getSafeCellString(r[found]);
            }
          }
          return '';
        };

        const rawFullName = getVal('Name', 'Full Name', 'Candidate Name', 'FullName', 'CandidateName', 'Student Name');
        const rawEmail = getVal('Email ID', 'Email', 'Candidate Email', 'EmailID', 'Mail ID', 'Mail', 'Email Address');

        const joiningDate = normalizeDateValue(getVal('JoiningDate', 'Joining Date', 'Start Date', 'StartDate', 'Joining'), '2026-06-01');
        const endDate = normalizeDateValue(getVal('EndingDate', 'Ending Date', 'End Date', 'EndDate', 'Internship End Date', 'Completion Date'), '2026-08-31');

        return {
          candidateId: getVal('Candidate ID', 'candidate_id', 'CandidateId', 'ID') || `SF-INT-2026-${String(idx + 1).padStart(4, '0')}`,
          fullName: rawFullName,
          email: rawEmail,
          phone: getVal('Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact Number', 'PhoneNumber'),
          role: getVal('Role', 'Designation', 'Designation/Internship Role', 'Internship Role', 'Position', 'Domain') || 'Web Developer Intern',
          department: getVal('Department', 'Dept') || 'Engineering',
          collegeName: getVal('College', 'College Name', 'University', 'Institution', 'CollegeName') || 'Recognized University',
          degree: getVal('Degree', 'Course', 'Program', 'Qualification', 'Branch') || 'B.Tech / B.E.',
          joiningDate,
          endDate,
          duration: getVal('Internship Duration', 'Duration') || '3 Months',
          stipend: getVal('Monthly Stipend (INR)', 'Monthly Stipend', 'Stipend (INR)', 'Stipend', 'MonthlyStipend', 'Stipend Amount') || '10000',
          workMode: getVal('Work Mode', 'WorkMode') || 'Online - Remote',
          reportingManager: getVal('Reporting Manager', 'Manager') || 'Priyanka Nair',
          assignedMentor: getVal('Assigned Mentor', 'Mentor') || 'Rahul Kapoor',
          offerLetterStatus: getVal('Offer Letter Status', 'Offer Status') || 'Ready to Send',
          taskStatus: getVal('Task Status', 'TaskStatus') || 'Not Assigned',
          remarks: getVal('Remarks', 'Notes'),
        };
      }).filter((r) => r.fullName || r.email);
    } catch (sheetJsErr) {
      console.warn('SheetJS fallback also encountered error:', sheetJsErr.message);
      return [];
    }
  }
}

/**
 * Parses buffer and runs comprehensive Zod validation and duplicate detection
 */
export async function parseCandidateExcelFile(buffer, filename = 'candidates.xlsx') {
  const rawRows = await extractRowsFromBuffer(buffer);

  // Pre-fetch existing candidate IDs and emails from DB to detect duplicates with safety fallback
  let existingCandidates = [];
  try {
    existingCandidates = await prisma.candidate.findMany({
      select: { candidateId: true, email: true },
    });
  } catch (dbErr) {
    console.warn('Could not pre-fetch candidates from DB for duplicate check:', dbErr.message);
  }

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

    let responseUrl = '';
    try {
      responseUrl = buildCandidateResponseUrl(rawToken);
    } catch {
      responseUrl = `https://internship-email-automation.vercel.app/offers/respond?token=${encodeURIComponent(rawToken)}`;
    }

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
      stipend: String(rowData.stipend || '10000'),
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
