import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_OFFER_PDF_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Internship Offer Letter - Shortfundly</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #2c3e50; margin: 0; padding: 0; background-color: #f4f6f8; }
        .wrapper { max-width: 680px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { border-bottom: 2px solid #004aad; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .company-name { font-size: 24px; font-weight: bold; color: #004aad; letter-spacing: 0.5px; }
        .date { color: #7f8c8d; font-size: 14px; text-align: right; }
        .content { font-size: 15px; color: #34495e; }
        .salutation { font-size: 16px; font-weight: bold; margin-bottom: 20px; }
        .details-box { background: #f8fafc; border-left: 4px solid #004aad; padding: 15px 20px; margin: 25px 0; border-radius: 4px; }
        .details-box ul { margin: 0; padding-left: 20px; }
        .details-box li { margin-bottom: 8px; }
        .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-top: 25px; margin-bottom: 10px; }
        .signature-block { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .footer-note { font-size: 12px; color: #95a5a6; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <div class="company-name">SHORTFUNDLY</div>
            <div class="date">Date: {{issueDate}}</div>
        </div>
        
        <div class="content">
            <div class="salutation">Dear {{candidateName}},</div>
            
            <p>We are delighted to offer you the position of <strong>{{role}}</strong> at <strong>Shortfundly</strong>. Your skills, background, and performance throughout our evaluation process stood out, and we are confident that you will make a valuable contribution to our engineering and product teams.</p>
            
            <div class="details-box">
                <strong>Internship Terms & Structure:</strong>
                <ul>
                    <li><strong>Position / Role:</strong> {{role}}</li>
                    <li><strong>Anticipated Start Date:</strong> {{startDate}}</li>
                    <li><strong>Duration:</strong> {{duration}}</li>
                    <li><strong>Stipend / Compensation:</strong> {{stipend}}</li>
                    <li><strong>Work Location / Mode:</strong> {{workMode}} (e.g., Remote / Hybrid / Chennai Office)</li>
                    <li><strong>Reporting To:</strong> {{reportingManager}}</li>
                </ul>
            </div>

            <div class="section-title">1. Roles and Responsibilities</div>
            <p>During your internship, you will be involved in core development tasks, collaborating closely with cross-functional teams to build scalable features, optimize workflows, and deliver impactful solutions aligned with company objectives. Specific project milestones will be outlined during your onboarding orientation.</p>

            <div class="section-title">2. Confidentiality & Intellectual Property</div>
            <p>As a team member at Shortfundly, you will have access to proprietary information, trade secrets, and internal codebases. You agree to maintain strict confidentiality regarding all company matters and assign all intellectual property rights developed during your tenure exclusively to Shortfundly.</p>

            <div class="section-title">3. Acceptance of Offer</div>
            <p>Please review this offer carefully. To confirm your acceptance, kindly sign and return a copy of this letter along with your required onboarding documents by <strong>{{deadline}}</strong>. If you have any questions or require clarification, please feel free to reach out to us.</p>
            
            <p>We are excited about the prospect of having you join the Shortfundly family and look forward to achieving great milestones together.</p>
            
            <div class="signature-block">
                <p>Sincerely,</p>
                <br>
                <strong>Hiring & Talent Acquisition Team</strong><br>
                <span>Shortfundly</span><br>
                <a href="https://www.shortfundly.com" target="_blank" style="color: #004aad; text-decoration: none;">www.shortfundly.com</a>
            </div>
        </div>

        <div class="footer-note">
            This is a computer-generated document from Shortfundly Automated Onboarding System. No physical signature is required.
        </div>
    </div>
</body>
</html>`;

const DEFAULT_OFFER_EMAIL_BODY = `<p>Dear {{candidateName}},</p>
<p>Congratulations! We are thrilled to offer you the position of <strong>{{role}}</strong> at Shortfundly. We were deeply impressed by your skills, background, and performance throughout our evaluation process.</p>
<div style="background: #181524; border-left: 4px solid #a855f7; padding: 14px 18px; margin: 18px 0; border-radius: 6px; color: #f3e8ff;">
  <strong style="color: #c084fc;">Internship Details:</strong><br/>
  • <strong>Role / Position:</strong> {{role}}<br/>
  • <strong>Anticipated Start Date:</strong> {{startDate}}<br/>
  • <strong>Duration:</strong> {{duration}}<br/>
  • <strong>Stipend / Compensation:</strong> {{stipend}}<br/>
  • <strong>Work Location / Mode:</strong> Online
</div>
<p><strong>Action Required: Review & Respond</strong></p>
<p>To review the full formal offer letter PDF attached to this email and record your response, please access your secure candidate portal via the unique link below:</p>
<p><a href="{{responseLink}}" style="display: inline-block; background: #9333ea; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">👉 Access Your Secure Offer Portal & Sign Offer</a></p>
<p><em>Important Note on Expiration:</em> This unique link and offer will officially expire on <strong>{{deadline}}</strong>. Please ensure you complete your response before this deadline.</p>
<p><strong>How to Confirm Acceptance:</strong></p>
<ol>
  <li>Click the secure link above to open your candidate portal.</li>
  <li>Review the terms outlined in the formal offer letter.</li>
  <li>Provide your digital signature directly on the platform.</li>
  <li>Upload a photo of your signature (or signature document/ID as required) to officially confirm your acceptance of this offer.</li>
</ol>
<p>If you have any questions or require clarifications regarding the terms, please feel free to reach out to us by replying directly to this email.</p>
<p>We are excited about the prospect of having you join the Shortfundly family and look forward to building amazing things together!</p>
<p>Best regards,<br/>
<strong>Hiring & Talent Acquisition Team</strong><br/>
Shortfundly<br/>
<a href="https://www.shortfundly.com">www.shortfundly.com</a></p>`;

async function main() {
  console.log('Seeding Supabase Postgres database...');

  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Shortfundly@Pass2026!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. System Administrator
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@shortfundly.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: 'System Administrator', role: 'ADMIN' },
    create: { email: adminEmail, passwordHash, name: 'System Administrator', role: 'ADMIN' },
  });
  console.log('Admin user initialized:', admin.email);

  // Also support admin@gmail.com for login convenience
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { passwordHash, name: 'Admin User', role: 'ADMIN' },
    create: { email: 'admin@gmail.com', passwordHash, name: 'Admin User', role: 'ADMIN' },
  });

  // 2. HR Director
  const hrEmail = process.env.HR_EMAIL || 'hr@shortfundly.com';
  const hr = await prisma.user.upsert({
    where: { email: hrEmail },
    update: { passwordHash, name: 'HR Director', role: 'HR' },
    create: { email: hrEmail, passwordHash, name: 'HR Director', role: 'HR' },
  });
  console.log('HR user initialized:', hr.email);

  await prisma.user.upsert({
    where: { email: 'hr@gmail.com' },
    update: { passwordHash, name: 'HR Director', role: 'HR' },
    create: { email: 'hr@gmail.com', passwordHash, name: 'HR Director', role: 'HR' },
  });

  // 3. CEO & Founder
  const ceoEmail = process.env.CEO_EMAIL || 'ceo@shortfundly.com';
  const ceo = await prisma.user.upsert({
    where: { email: ceoEmail },
    update: { passwordHash, name: 'M. Selvam (Founder & CEO)', role: 'CEO' },
    create: { email: ceoEmail, passwordHash, name: 'M. Selvam (Founder & CEO)', role: 'CEO' },
  });
  console.log('CEO user initialized:', ceo.email);

  await prisma.user.upsert({
    where: { email: 'ceo@gmail.com' },
    update: { passwordHash, name: 'M. Selvam (Founder & CEO)', role: 'CEO' },
    create: { email: 'ceo@gmail.com', passwordHash, name: 'M. Selvam (Founder & CEO)', role: 'CEO' },
  });

  // 4. System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
      smtpSecure: true,
      smtpUser: process.env.SMTP_USER || 'dharshana.shortfundly@gmail.com',
      smtpPass: process.env.SMTP_PASS || '',
      senderEmail: 'dharshana.shortfundly@gmail.com',
      senderName: process.env.SMTP_SENDER_NAME || 'Shortfundly Media Technologies',
      googleCalendarConnected: true,
      defaultMeetLinkPrefix: 'https://meet.google.com',
      simulationMode: false,
    },
  });

  // 5. Default Offer Template
  await prisma.offerTemplate.upsert({
    where: { name: 'Default Corporate Offer Letter' },
    update: {
      subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
      emailBody: DEFAULT_OFFER_EMAIL_BODY,
      pdfTemplate: DEFAULT_OFFER_PDF_TEMPLATE,
      isDefault: true,
    },
    create: {
      name: 'Default Corporate Offer Letter',
      subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
      emailBody: DEFAULT_OFFER_EMAIL_BODY,
      pdfTemplate: DEFAULT_OFFER_PDF_TEMPLATE,
      isDefault: true,
    },
  });
  console.log('Default Offer Template initialized.');

  // 6. Default Internship Batch A
  const approvedRoles = JSON.stringify([
    'Web Developer Intern',
    'AI Engineer Intern',
    'UI/UX Designer Intern',
    'Data Science Intern',
    'Backend Engineer Intern',
    'Full Stack Intern',
    'Digital Marketing Intern',
  ]);

  await prisma.internshipBatch.upsert({
    where: { batchName: 'Batch A' },
    update: {
      roles: approvedRoles,
      stipend: 'Rs. 10,000',
      joiningDate: '2026-06-01',
      endDate: '2026-08-31',
      duration: '3 Months',
    },
    create: {
      batchName: 'Batch A',
      roles: approvedRoles,
      stipend: 'Rs. 10,000',
      joiningDate: '2026-06-01',
      endDate: '2026-08-31',
      duration: '3 Months',
      status: 'Active',
    },
  });
  console.log('Batch A initialized.');

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
