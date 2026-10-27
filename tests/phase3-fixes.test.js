import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, isDeadlineExpired, formatFlexibleDate } from '../lib/dateUtils.js';
import { buildCandidateResponseUrl, getAppBaseUrl } from '../lib/offerService.js';

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
});
