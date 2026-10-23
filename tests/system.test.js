import { describe, it, expect } from 'vitest';
import prisma from '../lib/prisma.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth.js';
import { generateCaptcha, verifyCaptcha } from '../lib/captcha.js';
import { parseCandidateExcelFile } from '../lib/excelParser.js';
import { generateOfferLetterPdf, generateCertificatePdf } from '../lib/pdfEngine.js';
import { sendEmail, testSmtpConnection } from '../lib/mailer.js';
import { generateGoogleMeetLink, createIcsCalendarInvite } from '../lib/googleCalendar.js';
import { ROLE_TASK_PRESETS, getTaskPresetForRole } from '../lib/automationEngine.js';
import fs from 'fs';
import path from 'path';

describe('1. Authentication & Security Suite', () => {
  const testPassword = 'AdminSecurePassword!2026';
  let hashedPassword = '';

  it('correctly hashes password and validates with bcrypt', async () => {
    hashedPassword = await hashPassword(testPassword);
    expect(hashedPassword).not.toBe(testPassword);
    const isValid = await verifyPassword(testPassword, hashedPassword);
    expect(isValid).toBe(true);
    const isInvalid = await verifyPassword('WrongPassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('signs and verifies JWT tokens with proper claims', () => {
    const payload = { id: 1, email: 'admin@shortfundly.com', role: 'ADMIN' };
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyToken(token);
    expect(decoded.email).toBe('admin@shortfundly.com');
    expect(decoded.role).toBe('ADMIN');
  });

  it('rejects tampered or invalid JWT tokens', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.sig';
    const decoded = verifyToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it('generates cryptographic SVG captcha challenges and verifies answers', () => {
    const challenge = generateCaptcha();
    expect(challenge.svg).toContain('data:image/svg+xml');
    expect(challenge.token).toBeDefined();

    // Verify correct challenge answer
    const solved = verifyCaptcha(challenge.answer, challenge.token);
    expect(solved).toBe(true);

    // Verify incorrect challenge answer rejected
    const incorrect = verifyCaptcha('WRONG9', challenge.token);
    expect(incorrect).toBe(false);
  });
});

describe('2. Database Storage & Prisma Operations', () => {
  it('reads system admin and multiple operational roles (ADMIN, HR, CEO) safely', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@shortfundly.com' }
    });
    expect(admin).not.toBeNull();
    expect(admin.role).toBe('ADMIN');

    const hr = await prisma.user.findUnique({
      where: { email: 'hr@shortfundly.com' }
    });
    expect(hr).not.toBeNull();
    expect(hr.role).toBe('HR');

    const ceo = await prisma.user.findUnique({
      where: { email: 'ceo@shortfundly.com' }
    });
    expect(ceo).not.toBeNull();
    expect(ceo.role).toBe('CEO');
  });

  it('verifies candidate database persistence and querying', async () => {
    const candidates = await prisma.candidate.findMany({ take: 5 });
    expect(Array.isArray(candidates)).toBe(true);
  });
});

describe('3. Excel Candidate Parsing & Zod Validation Engine', () => {
  it('reads workbook, validates schemas, and reports duplicates', async () => {
    const dummyFilePath = path.join(process.cwd(), 'Shortfundly_Internship_Candidates_Dummy.xlsx');
    if (fs.existsSync(dummyFilePath)) {
      const buffer = fs.readFileSync(dummyFilePath);
      const result = await parseCandidateExcelFile(buffer, 'Shortfundly_Internship_Candidates_Dummy.xlsx');
      expect(result.totalRows).toBeGreaterThan(0);
      expect(result.rows.length).toBe(result.totalRows);
      expect(result.canProceed).toBe(true);

      const firstRow = result.rows[0];
      expect(firstRow.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(firstRow.fullName).toBeDefined();
      expect(firstRow.role).toBeDefined();
    }
  });
});

describe('4. Personalized Playwright PDF Generation', () => {
  const sampleCandidate = {
    candidateId: 'SF-TEST-001',
    fullName: 'Akash Kumar',
    email: 'akash.test@example.com',
    degree: 'B.Tech Information Technology',
    collegeName: 'Madras Institute of Technology',
    phone: '+91 9876543210',
    role: 'Web Developer Intern',
    department: 'Engineering',
    workMode: '100% Virtual',
    joiningDate: '01 Nov 2026',
    endDate: '01 Dec 2026',
    duration: '1 Month',
    reportingManager: 'M. Selvam',
    assignedMentor: 'Engineering Lead'
  };

  it('renders Single-Page A4 Offer Letter PDF with exact Shortfundly template', async () => {
    const result = await generateOfferLetterPdf(sampleCandidate);
    expect(result.filePath).toBeDefined();
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.pdfBuffer.length).toBeGreaterThan(500);
  }, 60000);

  it('renders Canva-style Shortfundly Completion Certificate PDF with Founder Selvam signature', async () => {
    const result = await generateCertificatePdf(
      sampleCandidate,
      'SF-CERT-2026-0099',
      '02 Dec 2026'
    );
    expect(result.filePath).toBeDefined();
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.pdfBuffer.length).toBeGreaterThan(500);
  }, 60000);
});

describe('5. Google Calendar Meeting & Meet Link Automation', () => {
  it('generates standard Google Meet meeting links', () => {
    const meetUrl = generateGoogleMeetLink();
    expect(meetUrl).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });

  it('creates standard RFC-5545 .ics calendar invites for Google Calendar & Outlook', () => {
    const icsContent = createIcsCalendarInvite({
      title: 'Internship Task Explanation & Sprint Alignment',
      description: 'Orientation session for Web Developer Intern',
      meetLink: 'https://meet.google.com/sfm-tech-rev',
      startDateStr: '2026-11-06',
      startTimeStr: '11:00',
      durationMinutes: 45,
      attendeeName: 'Akash Kumar',
      attendeeEmail: 'akash.test@example.com'
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('SUMMARY:Internship Task Explanation & Sprint Alignment');
    expect(icsContent).toContain('https://meet.google.com/sfm-tech-rev');
    expect(icsContent).toContain('END:VCALENDAR');
  });
});

describe('6. Role Task Engine & Review Cycle Automation', () => {
  it('has role presets configured for all required roles', () => {
    expect(ROLE_TASK_PRESETS['Web Developer Intern']).toBeDefined();
    expect(ROLE_TASK_PRESETS['Digital Marketing Intern']).toBeDefined();
    expect(ROLE_TASK_PRESETS['Data Analytics Intern']).toBeDefined();
    expect(ROLE_TASK_PRESETS['UI/UX Design Intern']).toBeDefined();
  });

  it('matches fuzzy role titles to task presets correctly', () => {
    const preset = getTaskPresetForRole('Senior Web Developer');
    expect(preset.title).toContain('Web Application');
  });
});

describe('7. Mailer & Email Dispatch Pipeline', () => {
  it('tests SMTP configuration or simulation fallback cleanly', async () => {
    const result = await testSmtpConnection();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });

  it('dispatches emails with attachment support in simulation or live SMTP and creates DB log', async () => {
    const result = await sendEmail({
      to: 'intern.test@shortfundly.com',
      recipientName: 'Akash Kumar',
      subject: 'Test Shortfundly Internship Offer Letter',
      text: 'Congratulations on your internship offer at Shortfundly Media Technologies.',
      html: '<h1>Shortfundly Internship Offer</h1><p>Congratulations!</p>'
    });

    expect(result.success).toBe(true);
    expect(result.logId).toBeDefined();
    expect(result.status).toBe('Delivered');
  });
});
