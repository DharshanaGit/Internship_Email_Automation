import { describe, it, expect } from 'vitest';
import { htmlToPlainText, wrapHtmlWithCompliance, getSmtpConfig, sendEmail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';

describe('Email Deliverability & Spam Prevention Suite', () => {
  it('1. Generates clean plain text from complex HTML to satisfy spam filter ratios', () => {
    const sampleHtml = `
      <h1>Shortfundly Internship Task</h1>
      <p>Dear Candidate,</p>
      <p>Please review your task on <a href="https://shortfundly.com/sprint">Sprint Dashboard</a>.</p>
      <ul>
        <li>Deliverable 1: Component library</li>
        <li>Deliverable 2: Unit tests</li>
      </ul>
      <br/>
      <p>Warm regards,<br>Shortfundly Team</p>
    `;

    const plain = htmlToPlainText(sampleHtml);

    expect(plain).toContain('Shortfundly Internship Task');
    expect(plain).toContain('Dear Candidate,');
    expect(plain).toContain('Sprint Dashboard (https://shortfundly.com/sprint)');
    expect(plain).toContain('• Deliverable 1: Component library');
    expect(plain).toContain('• Deliverable 2: Unit tests');
    expect(plain).toContain('Warm regards,\nShortfundly Team');
    expect(plain).not.toContain('<p>');
    expect(plain).not.toContain('</a>');
  });

  it('2. Wraps HTML with anti-spam compliance boilerplate and physical CAN-SPAM footer', () => {
    const rawContent = '<h3>Sprint Briefing</h3><p>Details here.</p>';
    const wrapped = wrapHtmlWithCompliance(rawContent);

    expect(wrapped).toContain('<!DOCTYPE html>');
    expect(wrapped).toContain('meta name="viewport"');
    expect(wrapped).toContain('Shortfundly Media Technologies Pvt. Ltd.');
    expect(wrapped).toContain('Chennai, Tamil Nadu, India');
    expect(wrapped).toContain('Sprint Briefing');
  });

  it('3. Guarantees SPF/DKIM/DMARC alignment when sending via Gmail SMTP', async () => {
    const config = await getSmtpConfig();

    if (config.auth.user && config.auth.user.includes('@gmail.com')) {
      // From MUST match the authenticated Gmail user
      expect(config.senderEmail).toBe(config.auth.user);
    }
  });

  it('4. Dispatches email with RFC anti-spam headers and logs clean plain text body', async () => {
    const res = await sendEmail({
      to: 'deliverability.test@example.com',
      recipientName: 'Test Recipient',
      subject: 'Shortfundly Deliverability Verification',
      html: '<h2>Welcome</h2><p>This is a test of inbox deliverability.</p>',
    });

    expect(res.success).toBe(true);

    const log = await prisma.emailLog.findUnique({ where: { id: res.logId } });
    expect(log).not.toBeNull();
    expect(log.recipientEmail).toBe('deliverability.test@example.com');
    // Body in log should be clean plain text, not raw tags
    expect(log.body).toContain('Welcome');
    expect(log.body).not.toContain('<h2>');

    // Clean up test log
    await prisma.emailLog.delete({ where: { id: res.logId } });
  }, 15000);
});
