import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedGemmaTaskTemplates } from '../lib/gemmaService.js';

const prisma = new PrismaClient();

const DEFAULT_OFFER_PDF_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Internship Offer Letter - Shortfundly</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 14mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            width: 100% !important;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #6d28d9;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .company-name {
            font-size: 22px;
            font-weight: 800;
            color: #1e1b4b;
            letter-spacing: 1px;
        }
        .company-subtitle {
            font-size: 10px;
            font-weight: 600;
            color: #6d28d9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
        }
        .header-meta {
            text-align: right;
            font-size: 10px;
            color: #64748b;
            line-height: 1.4;
        }
        .ref-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #6d28d9;
            padding: 8px 12px;
            margin-bottom: 14px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ref-title {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ref-date {
            font-size: 11px;
            color: #475569;
        }
        .salutation {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .lead-text {
            font-size: 11.5px;
            color: #334155;
            line-height: 1.5;
            margin-bottom: 12px;
        }
        .terms-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #6d28d9;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
        }
        .terms-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        .terms-table td {
            padding: 4px 8px;
            vertical-align: top;
            width: 50%;
        }
        .term-label {
            color: #64748b;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .term-value {
            color: #0f172a;
            font-size: 11.5px;
            font-weight: 600;
            margin-top: 1px;
        }
        .section-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 10px;
            margin-bottom: 4px;
        }
        .section-desc {
            font-size: 11px;
            color: #334155;
            line-height: 1.45;
            margin-bottom: 8px;
        }
        .signature-table {
            width: 100%;
            margin-top: 16px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
        }
        .signature-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 8px;
        }
        .footer-note {
            font-size: 9.5px;
            color: #94a3b8;
            margin-top: 14px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="vertical-align: middle;">
                <div class="company-name">SHORTFUNDLY</div>
                <div class="company-subtitle">Shortfundly Media Technologies Pvt. Ltd.</div>
            </td>
            <td class="header-meta" style="vertical-align: middle;">
                CIN: U72900TN2015PTC099876<br>
                Chennai, Tamil Nadu, India &bull; PIN 600001<br>
                Web: www.shortfundly.com &bull; Email: hr@shortfundly.com
            </td>
        </tr>
    </table>

    <div class="ref-banner">
        <div class="ref-title">Formal Internship Appointment Offer</div>
        <div class="ref-date"><strong>Date:</strong> {{issueDate}} &nbsp;|&nbsp; <strong>Ref:</strong> {{candidateId}}</div>
    </div>
    
    <div class="salutation">Dear {{candidateName}},</div>
    
    <p class="lead-text">We are delighted to offer you an internship position as <strong>{{role}}</strong> at <strong>Shortfundly Media Technologies Pvt. Ltd.</strong> Your skills, background, and performance throughout our evaluation process stood out, and we are confident that you will make a valuable contribution to our engineering and product teams.</p>
    
    <div class="terms-box">
        <table class="terms-table">
            <tr>
                <td>
                    <div class="term-label">Position / Role</div>
                    <div class="term-value">{{role}}</div>
                </td>
                <td>
                    <div class="term-label">Anticipated Start Date</div>
                    <div class="term-value">{{startDate}}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="term-label">Tenure Duration</div>
                    <div class="term-value">{{duration}}</div>
                </td>
                <td>
                    <div class="term-label">Monthly Stipend</div>
                    <div class="term-value">{{stipend}}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="term-label">Work Location / Mode</div>
                    <div class="term-value">{{workMode}}</div>
                </td>
                <td>
                    <div class="term-label">Reporting Manager</div>
                    <div class="term-value">{{reportingManager}}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section-title">1. Roles and Responsibilities</div>
    <p class="section-desc">During your internship, you will be involved in core development tasks, collaborating closely with cross-functional teams to build scalable features, optimize workflows, and deliver impactful solutions aligned with company objectives.</p>

    <div class="section-title">2. Confidentiality & Intellectual Property</div>
    <p class="section-desc">As a team member at Shortfundly, you will have access to proprietary information, trade secrets, and internal codebases. You agree to maintain strict confidentiality regarding all company matters and assign all intellectual property rights developed during your tenure exclusively to Shortfundly.</p>

    <div class="section-title">3. Acceptance of Offer</div>
    <p class="section-desc">Please review this offer carefully. To confirm your acceptance, kindly sign and submit your acceptance through our secure candidate verification portal by <strong>{{deadline}}</strong>.</p>
    
    <table class="signature-table">
        <tr>
            <td>
                <div style="font-size: 10.5px; color: #475569; margin-bottom: 4px;">For <strong>Shortfundly Media Technologies Pvt. Ltd.</strong></div>
                <div style="height: 30px; font-family: cursive; font-size: 16px; color: #6d28d9; border-bottom: 1px dashed #cbd5e1; width: 170px; display: table-cell; vertical-align: bottom;">
                    Authorized Signatory
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 6px;">Priyanka Nair</div>
                <div style="font-size: 9.5px; color: #64748b;">Director of Talent Acquisition</div>
            </td>
            <td>
                <div style="font-size: 10.5px; color: #475569; margin-bottom: 4px;">Candidate Confirmation</div>
                <div style="background: #f1f5f9; border: 1px dashed #6d28d9; border-radius: 4px; padding: 6px 10px;">
                    <div style="font-size: 9px; font-weight: 700; color: #5b21b6; text-transform: uppercase;">Verified Candidate Portal Acceptance</div>
                    <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px;">{{candidateName}}</div>
                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Digital Acceptance Record &bull; Ref: {{candidateId}}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        Official Offer of Internship &bull; Shortfundly Media Technologies Pvt. Ltd. &bull; CIN: U72900TN2015PTC099876 &bull; www.shortfundly.com
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

  await seedGemmaTaskTemplates(prisma);
  console.log('15 Gemma Task Templates initialized.');

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
