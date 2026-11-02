import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, isDeadlineExpired, formatFlexibleDate } from '../lib/dateUtils.js';
import { buildCandidateResponseUrl, getAppBaseUrl } from '../lib/offerService.js';
import { validateEmail, validateName } from '../app/login/page.jsx';

describe('Phase 3 Fixes & Verifications Suite', () => {
  describe('1. Date Parsing & Expiry Bug (02/06/2026 vs 27/10/2026)', () => {
    it('correctly parses DD/MM/YYYY date format without month-day inversion', () => {
      // 02/06/2026 means 2nd June 2026 (not 6th February 2026)
      const d = parseFlexibleDate('02/06/2026');
      expect(d).not.toBeNull();
      expect(d.getDate()).toBe(2);
      expect(d.getMonth()).toBe(5); // June is index 5
      expect(d.getFullYear()).toBe(2026);
    });

    it('correctly parses high-day dates like 27/10/2026', () => {
      const d = parseFlexibleDate('27/10/2026');
      expect(d).not.toBeNull();
      expect(d.getDate()).toBe(27);
      expect(d.getMonth()).toBe(9); // October is index 9
      expect(d.getFullYear()).toBe(2026);
    });

    it('evaluates future deadlines as NOT expired', () => {
      // Future date in 2029
      const futureDate = '15/08/2029';
      expect(isDeadlineExpired(futureDate)).toBe(false);

      // Past date in 2020
      const pastDate = '01/01/2020';
      expect(isDeadlineExpired(pastDate)).toBe(true);
    });

    it('formats flexible dates into British/Indian standard DD/MM/YYYY format', () => {
      const formatted = formatFlexibleDate('2026-06-02T18:00:00.000Z');
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('2. Candidate Response Links Production Integrity', () => {
    it('always generates HTTPS Vercel production links and never localhost', () => {
      const token = 'test-token-phase3-verification';
      const url = buildCandidateResponseUrl(token);

      expect(url).toMatch(/^https:\/\//);
      expect(url).not.toContain('localhost');
      expect(url).not.toContain('127.0.0.1');
      expect(url).toContain('/offers/respond?token=test-token-phase3-verification');
    });
  });

  describe('3. Login & Create Account Email Validation (No Plain Numbers Only)', () => {
    it('rejects plain numbers only in email address', () => {
      const err = validateEmail('9876543210');
      expect(err).toBe('Plain numbers only are not allowed. Please enter a valid email address with letters.');
    });

    it('rejects email where username is plain numbers only', () => {
      const err = validateEmail('123456@gmail.com');
      expect(err).toBe('Email username cannot be plain numbers only; it must contain letters (e.g. name@domain.com).');
    });

    it('rejects email with no letters at all', () => {
      const err = validateEmail('12345@67890.com');
      expect(err).toBe('Email username cannot be plain numbers only; it must contain letters (e.g. name@domain.com).');
    });

    it('allows valid emails containing both letters and numbers', () => {
      expect(validateEmail('dachudharshana17@gmail.com')).toBeNull();
      expect(validateEmail('dharshanab32@gmail.com')).toBeNull();
      expect(validateEmail('user123@shortfundly.com')).toBeNull();
      expect(validateEmail('intern2026@shortfundly.in')).toBeNull();
    });

    it('allows valid emails with letters only', () => {
      expect(validateEmail('admin@gmail.com')).toBeNull();
      expect(validateEmail('hr@shortfundly.com')).toBeNull();
    });

    it('rejects full name containing numbers in create account', () => {
      expect(validateName('Dharshana 17')).toBe('Full name cannot contain numbers (letters only).');
      expect(validateName('Admin 123')).toBe('Full name cannot contain numbers (letters only).');
      expect(validateName('Dharshana')).toBeNull();
    });
  });
});
