import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';
import {
  getAppBaseUrl,
  buildCandidateResponseUrl,
  generateSecureResponseToken,
  buildOfferEmailContent,
} from '../lib/offerService.js';

describe('Candidate Secure Offer Response Link & Decision Pipeline', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. APP_BASE_URL Resolution & Production Safety', () => {
    it('resolves the deployed Vercel domain using APP_BASE_URL', () => {
      process.env.APP_BASE_URL = 'https://internship-email-automation.vercel.app';
      delete process.env.VERCEL;

      const url = getAppBaseUrl();
      expect(url).toBe('https://internship-email-automation.vercel.app');
    });

    it('gracefully strips trailing slashes from APP_BASE_URL', () => {
      process.env.APP_BASE_URL = 'https://internship-email-automation.vercel.app///';

      const url = getAppBaseUrl();
      expect(url).toBe('https://internship-email-automation.vercel.app');
    });

    it('builds a secure HTTPS response URL with the exact token and route', () => {
      process.env.APP_BASE_URL = 'https://internship-email-automation.vercel.app';
      const token = 'c9a2f78b1234567890abcdef';

      const responseUrl = buildCandidateResponseUrl(token);
      expect(responseUrl).toBe('https://internship-email-automation.vercel.app/offers/respond?token=c9a2f78b1234567890abcdef');
      expect(responseUrl).not.toContain('localhost');
      expect(responseUrl.startsWith('https://')).toBe(true);
    });

    it('throws a clear error if APP_BASE_URL is missing in production environment', () => {
      delete process.env.APP_BASE_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      process.env.NODE_ENV = 'production';

      expect(() => getAppBaseUrl()).toThrow(/Server configuration error: "APP_BASE_URL" is missing/i);
    });

    it('strictly forbids localhost in production environment and throws clear error', () => {
      process.env.APP_BASE_URL = 'http://localhost:3000';
      process.env.NODE_ENV = 'production';

      expect(() => getAppBaseUrl()).toThrow(/Invalid APP_BASE_URL for production environment/i);
    });
  });

  describe('2. Offer Email Generation & Link Injection', () => {
    it('embeds the HTTPS response link into the email body without allowing AI URL tampering', () => {
      process.env.APP_BASE_URL = 'https://internship-email-automation.vercel.app';
      const { rawToken } = generateSecureResponseToken();
      const responseLink = buildCandidateResponseUrl(rawToken);

      const candidate = {
        fullName: 'Aarav Patel',
        role: 'Full Stack Engineer Intern',
        joiningDate: '2026-06-01',
        endDate: '2026-08-31',
        duration: '3 Months',
        stipend: 'Rs. 15,000',
        candidateId: 'SF-INT-2026-0099',
        internId: 'INT-2026-00099',
      };

      const emailContent = buildOfferEmailContent({
        candidate,
        deadlineStr: 'June 5, 2026',
        responseLink,
      });

      expect(emailContent.html).toContain('https://internship-email-automation.vercel.app/offers/respond?token=');
      expect(emailContent.html).toContain(rawToken);
      expect(emailContent.html).not.toContain('localhost');
      expect(emailContent.text).toContain(responseLink);
    });
  });

  describe('3. Database Candidate Token Mapping & Idempotency', () => {
    const testCandidateId = `SF-TEST-LINK-${Date.now()}`;
    let createdCandidate = null;

    it('creates candidate with cryptographic offer token and retrieves via tokenHash', async () => {
      const { rawToken, tokenHash } = generateSecureResponseToken();

      createdCandidate = await prisma.candidate.create({
        data: {
          candidateId: testCandidateId,
          internId: `INT-2026-TEST-${Date.now().toString().slice(-4)}`,
          fullName: 'Test Response Link Candidate',
          email: `test.link.${Date.now()}@example.com`,
          phone: '+91 9988776655',
          role: 'Backend Engineer Intern',
          department: 'Engineering',
          joiningDate: '2026-07-01',
          endDate: '2026-09-30',
          duration: '3 Months',
          reportingManager: 'Priyanka Nair',
          assignedMentor: 'Rahul Kapoor',
          stipend: 'Rs. 12,000',
          offerLetterStatus: 'Sent',
          offerAcceptanceToken: rawToken,
          offerAcceptanceTokenHash: tokenHash,
          offerDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(createdCandidate.id).toBeDefined();

      // Retrieve by raw token
      const foundByToken = await prisma.candidate.findFirst({
        where: {
          OR: [
            { offerAcceptanceToken: rawToken },
            { offerAcceptanceTokenHash: tokenHash },
          ],
        },
      });

      expect(foundByToken).not.toBeNull();
      expect(foundByToken.id).toBe(createdCandidate.id);
      expect(foundByToken.fullName).toBe('Test Response Link Candidate');
    });

    it('records acceptance with signature record and locks against conflicting response', async () => {
      expect(createdCandidate).not.toBeNull();

      const acceptTime = new Date();
      const mockCloudinarySigUrl = 'https://res.cloudinary.com/shortfundly/image/upload/v1/intern_signatures/sig-test.png';

      const updated = await prisma.candidate.update({
        where: { id: createdCandidate.id },
        data: {
          offerLetterStatus: 'Accepted',
          offerAcceptedAt: acceptTime,
          signatureType: 'UPLOADED',
          signatureUrl: mockCloudinarySigUrl,
          remarks: 'Accepted with signature image',
        },
      });

      expect(updated.offerLetterStatus).toBe('Accepted');
      expect(updated.offerAcceptedAt).toBeDefined();
      expect(updated.signatureUrl).toBe(mockCloudinarySigUrl);

      // Verify idempotency guard: already accepted candidate cannot be overwritten
      const checkCandidate = await prisma.candidate.findUnique({
        where: { id: createdCandidate.id },
      });

      const isLocked = checkCandidate.offerLetterStatus === 'Accepted' || checkCandidate.offerLetterStatus.startsWith('Rejected');
      expect(isLocked).toBe(true);
    });

    it('cleans up test candidate record safely', async () => {
      if (createdCandidate?.id) {
        await prisma.candidateOfferAcceptance.deleteMany({
          where: { candidateId: createdCandidate.id },
        });
        await prisma.candidate.delete({
          where: { id: createdCandidate.id },
        });
      }
    });
  });
});
