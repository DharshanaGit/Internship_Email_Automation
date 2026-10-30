/**
 * Date & IST Time Utilities for Shortfundly Internship Automation
 */

export function parseFlexibleDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput !== 'string') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  const trimmed = dateInput.trim();

  // Check for DD/MM/YYYY or DD-MM-YYYY with optional time
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] !== undefined ? parseInt(dmyMatch[4], 10) : 23;
    const min = dmyMatch[5] !== undefined ? parseInt(dmyMatch[5], 10) : 59;
    const sec = dmyMatch[6] !== undefined ? parseInt(dmyMatch[6], 10) : 59;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // Check for YYYY-MM-DD with optional time
  const ymdMatch = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] !== undefined ? parseInt(ymdMatch[4], 10) : 23;
    const min = ymdMatch[5] !== undefined ? parseInt(ymdMatch[5], 10) : 59;
    const sec = ymdMatch[6] !== undefined ? parseInt(ymdMatch[6], 10) : 59;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  const standard = new Date(trimmed);
  return isNaN(standard.getTime()) ? null : standard;
}

export function isDeadlineExpired(deadlineInput) {
  if (!deadlineInput) return false;
  const parsed = parseFlexibleDate(deadlineInput);
  if (!parsed) return false;
  return Date.now() > parsed.getTime();
}

export function formatFlexibleDate(dateInput, fallback = 'N/A') {
  if (!dateInput) return fallback;
  const parsed = parseFlexibleDate(dateInput);
  if (!parsed) return String(dateInput);
  return parsed.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

export function formatToDdMmYy(dateInput) {
  const d = parseFlexibleDate(dateInput) || (dateInput instanceof Date ? dateInput : new Date(dateInput));
  if (isNaN(d.getTime())) return '<dd.mm.yy>';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

export function parseDdMmYyToDate(str) {
  if (!str) return new Date();
  const parsed = parseFlexibleDate(str);
  if (parsed) return parsed;
  const clean = str.replace(/[<>]/g, '').trim();
  const parts = clean.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = 2000 + parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(str);
}

export function addDays(dateInput, days) {
  const d = parseFlexibleDate(dateInput) || (dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput));
  d.setDate(d.getDate() + days);
  return d;
}

const IST_SLOTS = [
  '09:30 AM IST',
  '10:00 AM IST',
  '10:30 AM IST',
  '11:00 AM IST',
  '11:30 AM IST',
  '12:00 PM IST',
  '02:00 PM IST',
  '02:30 PM IST',
  '03:00 PM IST',
  '03:30 PM IST',
  '04:00 PM IST',
  '04:30 PM IST',
  '05:00 PM IST',
  '05:30 PM IST',
  '06:00 PM IST',
  '06:30 PM IST',
];

export function getRandomIstTime() {
  return IST_SLOTS[Math.floor(Math.random() * IST_SLOTS.length)];
}

/**
 * Calculates working days skipping Sundays (Monday to Saturday are working days)
 * @param {Date|string} startDateInput - Starting anchor date
 * @param {number} workingDays - Number of working days to add
 * @returns {Date}
 */
export function addWorkingDays(startDateInput, workingDays = 1) {
  const d = parseFlexibleDate(startDateInput) || (startDateInput instanceof Date ? new Date(startDateInput) : new Date());
  let added = 0;
  const targetDays = Math.max(1, parseInt(workingDays, 10) || 1);

  while (added < targetDays) {
    d.setDate(d.getDate() + 1);
    // 0 = Sunday (skipped!). Monday (1) to Saturday (6) are working days
    if (d.getDay() !== 0) {
      added++;
    }
  }
  return d;
}

/**
 * Calculates accurate calendar days and approximate months between two dates
 * @param {Date|string} startDateInput 
 * @param {Date|string} endDateInput 
 * @returns {{ days: number, months: number, label: string }}
 */
export function calculateTenureDuration(startDateInput, endDateInput) {
  const start = parseFlexibleDate(startDateInput);
  const end = parseFlexibleDate(endDateInput);

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { days: 90, months: 3, label: '90 Days (~3 Months)' };
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return { days: 1, months: 0, label: '1 Day' };
  }

  // Inclusive count of days
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const approxMonths = Math.max(1, Math.round(totalDays / 30));

  const label = `${totalDays} Days (~${approxMonths} Month${approxMonths > 1 ? 's' : ''})`;
  return { days: totalDays, months: approxMonths, label };
}

/**
 * Calculates grace review meeting schedule:
 * Tomorrow or day after tomorrow (skipping Sundays, Mon-Sat working)
 */
export function getGraceReviewSchedule(taskDeadlineInput, delayDays = 1) {
  const deadlineDate = parseFlexibleDate(taskDeadlineInput) || new Date();
  const reviewDate = addWorkingDays(deadlineDate, delayDays);
  return {
    dateObj: reviewDate,
    dateStr: formatToDdMmYy(reviewDate),
    isoDate: reviewDate.toISOString().split('T')[0],
    timeStr: '04:00 PM IST',
  };
}

/**
 * Calculates explanation call date: 2 working days after task mail is sent
 */
export function getExplanationSchedule(taskMailSentDate = new Date()) {
  const expDateObj = addWorkingDays(taskMailSentDate, 2);
  return {
    dateObj: expDateObj,
    dateStr: formatToDdMmYy(expDateObj),
    timeStr: getRandomIstTime(),
  };
}

/**
 * Calculates Review 1 schedule:
 * Review 1 mail sent on next working day of explanation call date (+1 working day)
 * Review 1 call date is 2 working days after explanation call date (+2 working days)
 */
export function getReviewOneSchedule(explanationCallDate) {
  const expDate = parseDdMmYyToDate(explanationCallDate);
  const mailDate = addWorkingDays(expDate, 1);
  const callDate = addWorkingDays(expDate, 2);

  return {
    mailDateStr: formatToDdMmYy(mailDate),
    callDateObj: callDate,
    callDateStr: formatToDdMmYy(callDate),
    timeStr: getRandomIstTime(),
  };
}

/**
 * Calculates Review 2 schedule:
 * Review 2 mail sent on next working day of Review 1 date (+1 working day)
 * Second Review call date is 2 working days after review mail is sent (+2 working days)
 */
export function getReviewTwoSchedule(reviewOneCallDate) {
  const rev1Date = parseDdMmYyToDate(reviewOneCallDate);
  const mailDate = addWorkingDays(rev1Date, 1);
  const callDate = addWorkingDays(mailDate, 2);

  return {
    mailDateStr: formatToDdMmYy(mailDate),
    callDateObj: callDate,
    callDateStr: formatToDdMmYy(callDate),
    timeStr: getRandomIstTime(),
  };
}
