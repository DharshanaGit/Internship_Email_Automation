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
 * Calculates explanation call date: 2 days after task mail is sent
 */
export function getExplanationSchedule(taskMailSentDate = new Date()) {
  const expDateObj = addDays(taskMailSentDate, 2);
  return {
    dateObj: expDateObj,
    dateStr: formatToDdMmYy(expDateObj),
    timeStr: getRandomIstTime(),
  };
}

/**
 * Calculates Review 1 schedule:
 * Review 1 mail sent on next day of explanation call date (+1 day from explanation)
 * Review 1 call date is 2 days after explanation call date (+2 days from explanation)
 */
export function getReviewOneSchedule(explanationCallDate) {
  const expDate = parseDdMmYyToDate(explanationCallDate);
  const mailDate = addDays(expDate, 1);
  const callDate = addDays(expDate, 2);

  return {
    mailDateStr: formatToDdMmYy(mailDate),
    callDateObj: callDate,
    callDateStr: formatToDdMmYy(callDate),
    timeStr: getRandomIstTime(),
  };
}

/**
 * Calculates Review 2 schedule:
 * Review 2 mail sent on next day of Review 1 date (+1 day from Review 1)
 * Second Review call date is 2 days after the second review mail is sent (+3 days from Review 1)
 */
export function getReviewTwoSchedule(reviewOneCallDate) {
  const rev1Date = parseDdMmYyToDate(reviewOneCallDate);
  const mailDate = addDays(rev1Date, 1);
  const callDate = addDays(mailDate, 2);

  return {
    mailDateStr: formatToDdMmYy(mailDate),
    callDateObj: callDate,
    callDateStr: formatToDdMmYy(callDate),
    timeStr: getRandomIstTime(),
  };
}
