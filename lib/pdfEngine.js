import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { calculateTenureDuration } from './dateUtils.js';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production');
const baseDir = isVercel ? os.tmpdir() : process.cwd();
export const STORAGE_OFFER_DIR = path.join(baseDir, 'storage', 'offer_letters');
export const STORAGE_CERT_DIR = path.join(baseDir, 'storage', 'certificates');

// Ensure persistent directories exist safely
export function ensureStorageDirs() {
  try {
    if (!fs.existsSync(STORAGE_OFFER_DIR)) fs.mkdirSync(STORAGE_OFFER_DIR, { recursive: true });
    if (!fs.existsSync(STORAGE_CERT_DIR)) fs.mkdirSync(STORAGE_CERT_DIR, { recursive: true });
  } catch (err) {
    // Graceful fallback for read-only sandboxes in build step
  }
}
ensureStorageDirs();


// Corporate Offer Letter HTML Template
export const corporateOfferTemplateSource = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Offer Letter - {{candidateName}}</title>
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
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 12px;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: 1px;
    }
    .brand-sub {
      font-size: 10.5px;
      color: #4f46e5;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .header-contact {
      text-align: right;
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    .header-contact a {
      color: #4f46e5;
      text-decoration: none;
    }
    .title-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #4f46e5;
      padding: 8px 14px;
      margin-bottom: 14px;
      border-radius: 4px;
    }
    .title-banner-table {
      width: 100%;
    }
    .title-heading {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .ref-meta {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
    }
    .salutation {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .lead-text {
      color: #334155;
      font-size: 11.5px;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .terms-card {
      background: #fafafa;
      border: 1px solid #e2e8f0;
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
      padding: 4px 6px;
      vertical-align: top;
      width: 50%;
    }
    .term-label {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 1px;
    }
    .term-val {
      color: #0f172a;
      font-size: 11.5px;
      font-weight: 600;
    }
    .clauses-block {
      margin-bottom: 14px;
    }
    .clause-item {
      margin-bottom: 7px;
      font-size: 11px;
      color: #334155;
      line-height: 1.45;
    }
    .clause-item strong {
      color: #0f172a;
    }
    .sig-table {
      width: 100%;
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    .sig-table td {
      width: 50%;
      vertical-align: top;
      padding: 0 10px;
    }
    .digital-box {
      border: 1.5px dashed #4f46e5;
      background: #f5f3ff;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 6px;
    }
    .digital-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: #4338ca;
      background: #e0e7ff;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 4px;
    }
    .footer-bar {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      font-size: 9.5px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: middle;">
        <div class="brand-title">SHORTFUNDLY</div>
        <div class="brand-sub">Shortfundly Media Technologies Pvt. Ltd.</div>
      </td>
      <td class="header-contact" style="vertical-align: middle;">
        Chennai, Tamil Nadu, India &bull; PIN 600001<br>
        Web: <a href="https://www.shortfundly.com">www.shortfundly.com</a> | Email: hr@shortfundly.com
      </td>
    </tr>
  </table>

  <!-- Reference Banner -->
  <div class="title-banner">
    <table class="title-banner-table">
      <tr>
        <td class="title-heading">Official Internship Appointment Offer</td>
        <td class="ref-meta">
          <strong>Date:</strong> {{issueDate}} &nbsp;|&nbsp; <strong>Ref:</strong> {{candidateId}} &nbsp;|&nbsp; <strong>Intern ID:</strong> {{internId}}
        </td>
      </tr>
    </table>
  </div>

  <!-- Salutation & Summary -->
  <div class="salutation">Dear {{candidateName}},</div>
  <p class="lead-text">
    We are pleased to offer you an appointment as <strong>{{role}}</strong> at <strong>Shortfundly Media Technologies Pvt. Ltd.</strong> Following our thorough technical evaluation, we are confident your skills and academic commitment will make a meaningful impact across our live engineering sprints.
  </p>

  <!-- Structured Terms -->
  <div class="terms-card">
    <table class="terms-table">
      <tr>
        <td>
          <div class="term-label">Position / Role</div>
          <div class="term-val">{{role}} &bull; {{department}}</div>
        </td>
        <td>
          <div class="term-label">Internship Tenure & Duration</div>
          <div class="term-val">{{startDate}} to {{endDate}} ({{duration}})</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="term-label">Work Mode</div>
          <div class="term-val">{{workMode}} (100% Virtual / Remote)</div>
        </td>
        <td>
          <div class="term-label">Monthly Stipend</div>
          <div class="term-val">{{stipend}}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="term-label">Reporting Manager</div>
          <div class="term-val">{{reportingManager}}</div>
        </td>
        <td>
          <div class="term-label">Assigned Engineering Mentor</div>
          <div class="term-val">{{assignedMentor}}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Key Clauses -->
  <div class="clauses-block">
    <div class="clause-item">
      <strong>1. Deliverables & Milestones:</strong> You will engage in production sprints, participate in scheduled review check-ins, and deliver verified repository commits per assigned project specifications.
    </div>
    <div class="clause-item">
      <strong>2. Confidentiality & Intellectual Property:</strong> All source code, product workflows, documentation, and digital assets developed during your internship remain the exclusive property of Shortfundly Media Technologies Pvt. Ltd.
    </div>
    <div class="clause-item">
      <strong>3. Completion Certification:</strong> Upon successful submission of project milestones and mentor sign-off on {{endDate}}, an Official Internship Completion Certificate will be formally issued.
    </div>
  </div>

  <!-- Signatures -->
  <table class="sig-table">
    <tr>
      <td>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">For <strong>Shortfundly Media Technologies Pvt. Ltd.</strong></div>
        <div style="height: 34px; display: table-cell; vertical-align: bottom; font-family: cursive; font-size: 17px; color: #4f46e5; border-bottom: 1px dashed #cbd5e1; width: 190px;">
          Authorized Signatory
        </div>
        <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; margin-top: 6px;">Priyanka Nair</div>
        <div style="font-size: 10px; color: #64748b;">Director of Talent Acquisition & Operations</div>
      </td>
      <td>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">Candidate Acceptance & Verification</div>
        <div class="digital-box">
          <div class="digital-badge">&#10003; Secure Acceptance Portal Placeholder</div>
          <div style="font-size: 11px; font-weight: 700; color: #1e1b4b;">{{candidateName}}</div>
          <div style="font-size: 9.5px; color: #6366f1; margin-top: 2px;">
            Candidate Digital Signature / Decision Record: <strong>[PENDING DIGITAL SIGNATURE]</strong>
          </div>
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">Response Deadline: {{deadline}}</div>
      </td>
    </tr>
  </table>

  <div class="footer-bar">
    Official Shortfundly Internship Appointment &bull; CIN: U72900TN2015PTC099876 &bull; Chennai, Tamil Nadu, India &bull; www.shortfundly.com
  </div>
</body>
</html>`;

// Offer Letter HTML Template (Single A4 Page Clean Layout)
const offerLetterTemplateSource = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Offer Letter - {{candidate_name}}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.48;
      font-size: 13px;
      padding: 38px 46px;
      margin: 0;
    }
    .header-block {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #0f172a;
    }
    .company-subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-contact {
      font-size: 10.5px;
      color: #64748b;
      text-align: right;
      line-height: 1.4;
    }
    .company-contact a {
      color: #2563eb;
      text-decoration: none;
    }
    .doc-title-block {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      padding: 10px 16px;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
    }
    .doc-heading {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #1e293b;
      text-transform: uppercase;
    }
    .ref-meta {
      font-size: 11.5px;
      color: #475569;
      text-align: right;
    }
    .ref-meta strong {
      color: #0f172a;
    }
    .recipient-block {
      margin-top: 14px;
      font-size: 12.5px;
      line-height: 1.4;
      color: #334155;
    }
    .recipient-block strong {
      font-size: 13.5px;
      color: #0f172a;
    }
    .body-content {
      margin-top: 14px;
      color: #334155;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .body-content p {
      margin-bottom: 9px;
    }
    .details-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10px 0;
    }
    .details-grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .details-row {
      display: table-row;
    }
    .details-item {
      display: table-cell;
      width: 50%;
      padding: 3px 8px 3px 0;
      vertical-align: top;
    }
    .details-item strong {
      color: #0f172a;
      display: inline-block;
      min-width: 130px;
    }
    .signature-block {
      margin-top: 16px;
      display: table;
      width: 100%;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-block-row {
      display: table-row;
    }
    .sig-col {
      display: table-cell !important;
      width: 50%;
      vertical-align: top;
      padding-right: 20px;
    }
    .sig-col {
      font-size: 12px;
      line-height: 1.45;
    }
    .sig-space {
      height: 38px;
      display: flex;
      align-items: flex-end;
      margin-bottom: 4px;
    }
    .sig-badge {
      display: inline-block;
      font-family: cursive;
      font-size: 16px;
      color: #1d4ed8;
      border-bottom: 1px dashed #93c5fd;
      padding-bottom: 2px;
    }
    .candidate-sig-line {
      border-bottom: 1px solid #94a3b8;
      width: 180px;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    .footer-bar {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>
    <!-- Header Block -->
    <div class="header-block">
      <div>
        <div class="company-title">SHORTFUNDLY</div>
        <div class="company-subtitle">Shortfundly Media Technologies Pvt. Ltd.</div>
      </div>
      <div class="company-contact">
        Chennai, Tamil Nadu, India<br>
        <a href="https://www.shortfundly.com">www.shortfundly.com</a> | hr@shortfundly.com
      </div>
    </div>

    <!-- Reference Block -->
    <div class="doc-title-block">
      <div class="doc-heading">INTERNSHIP OFFER LETTER</div>
      <div class="ref-meta">
        <div><strong>Date:</strong> {{joining_date}}</div>
        <div><strong>Ref ID:</strong> {{candidate_id}}</div>
      </div>
    </div>

    <!-- Recipient Block -->
    <div class="recipient-block">
      <div>To,</div>
      <div><strong>{{candidate_name}}</strong></div>
      <div>{{degree}}</div>
      <div>{{college_name}}</div>
      <div>{{recipient_email}} | {{candidate_phone}}</div>
    </div>

    <!-- Body Content -->
    <div class="body-content">
      <p>Dear <strong>{{candidate_name}}</strong>,</p>
      <p>
        Congratulations! We are pleased to offer you an online internship with Shortfundly as a 
        <strong>{{internship_role}}</strong> in our <strong>{{department}}</strong> department. We were impressed 
        by your academic profile and technical potential, and we are excited to welcome you to our team.
      </p>

      <div class="details-card">
        <div class="details-grid">
          <div class="details-item"><strong>Position & Dept:</strong> {{internship_role}} &mdash; {{department}}</div>
          <div class="details-item"><strong>Work Mode:</strong> {{work_mode}} (100% Virtual)</div>
          <div class="details-item"><strong>Tenure & Duration:</strong> {{joining_date}} to {{end_date}} ({{internship_duration}})</div>
          <div class="details-item"><strong>Reporting Manager:</strong> {{reporting_manager}}</div>
          <div class="details-item"><strong>Assigned Mentor:</strong> {{assigned_mentor}}</div>
          <div class="details-item"><strong>Stipend Amount:</strong> {{stipend}}</div>
          <div class="details-item"><strong>Final Review:</strong> {{end_date}}</div>
        </div>
      </div>

      <p>
        <strong>Terms & Expectations:</strong> During your tenure, you will collaborate remotely on live project sprints, 
        attend scheduled virtual reviews, and adhere to project delivery timelines under your mentor's guidance. 
        You agree to maintain strict confidentiality regarding all proprietary code, data, and internal workflows 
        belonging to Shortfundly. All intellectual property and deliverables created during this internship shall remain 
        the sole property of Shortfundly Media Technologies Pvt. Ltd.
      </p>
      <p>
        Upon satisfactory completion of your assigned tasks and final review on {{end_date}}, you will be awarded an 
        Official Internship Completion Certificate.
      </p>
      <p>
        Please signify your acceptance of this offer by signing and returning a copy of this letter within 3 business days. 
        We look forward to an impactful learning journey together!
      </p>
    </div>
  </div>

  <!-- Signature Block -->
  <div>
    <div class="signature-block">
      <div class="signature-block-row">
        <div class="sig-col">
          <div>Warm regards,</div>
          <div class="sig-space">
            <span class="sig-badge">Authorized Signatory</span>
          </div>
          <div><strong>Authorized Signatory</strong></div>
          <div style="color: #64748b;">Human Resources &mdash; Shortfundly</div>
        </div>
        <div class="sig-col">
          <div><strong>Accepted By:</strong></div>
          <div class="candidate-sig-line"></div>
          <div>Signature: _______________________</div>
          <div>Name: <strong>{{candidate_name}}</strong></div>
          <div>Date: ___________________________</div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      Shortfundly Media Technologies Pvt. Ltd. &bull; Chennai, Tamil Nadu, India &bull; Confidential &bull; Official Letter of Internship
    </div>
  </div>
</body>
</html>
`;

// Completion Certificate HTML Template (Recreated Canva Design)
const certificateTemplateSource = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Certificate - {{candidate_name}}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #0f172a;
      color: #ffffff;
      width: 297mm;
      height: 210mm;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      -webkit-print-color-adjust: exact;
    }
    .cert-frame {
      width: 280mm;
      height: 194mm;
      border: 3px solid #3b82f6;
      outline: 1px solid rgba(255, 255, 255, 0.15);
      outline-offset: 5px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0b1120 0%, #172554 50%, #0b1120 100%);
      padding: 30px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .brand-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 3px;
      color: #60a5fa;
      text-transform: uppercase;
    }
    .cert-num {
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: 1px;
      font-family: monospace;
    }
    .cert-center {
      text-align: center;
      margin: auto 0;
    }
    .cert-title {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #f8fafc;
      text-transform: uppercase;
      margin-bottom: 12px;
      text-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
    }
    .cert-award-to {
      font-size: 15px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 14px;
    }
    .candidate-name {
      font-size: 36px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 2px;
      margin-bottom: 16px;
      font-family: 'Segoe UI', serif;
      border-bottom: 2px solid rgba(56, 189, 248, 0.4);
      display: inline-block;
      padding: 0 24px 6px 24px;
    }
    .cert-desc {
      font-size: 15px;
      color: #cbd5e1;
      max-width: 780px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .cert-desc strong {
      color: #ffffff;
    }
    .period-badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 20px;
      background: rgba(37, 99, 235, 0.2);
      border: 1px solid rgba(96, 165, 250, 0.3);
      border-radius: 20px;
      font-size: 13px;
      color: #93c5fd;
    }
    .cert-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .founder-sig {
      text-align: left;
    }
    .sig-script {
      font-family: cursive;
      font-size: 26px;
      color: #60a5fa;
      margin-bottom: 4px;
    }
    .founder-name {
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .founder-title {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .org-details {
      text-align: right;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div class="brand-top">
      <div class="brand-name">SHORTFUNDLY</div>
      <div class="cert-num">VERIFICATION ID: {{certificate_id}}</div>
    </div>

    <div class="cert-center">
      <div class="cert-title">INTERNSHIP CERTIFICATE</div>
      <div class="cert-award-to">We award this certificate to</div>
      <div class="candidate-name">{{candidate_name}}</div>
      <div class="cert-desc">
        In recognition of him/her contribution to the company as<br>
        <strong>{{role}}</strong> in the <strong>{{department}}</strong> department.
      </div>
      <div>
        <div class="period-badge">For the period of {{joining_date}} to {{end_date}}</div>
      </div>
    </div>

    <div class="cert-bottom">
      <div class="founder-sig">
        <div class="sig-script">Selvam</div>
        <div class="founder-name">Selvam</div>
        <div class="founder-title">Founder & CEO, Shortfundly Media Technologies</div>
      </div>
      <div class="org-details">
        <div>Issued on: {{issue_date}}</div>
        <div>Shortfundly Media Technologies Pvt. Ltd.</div>
        <div>Chennai, Tamil Nadu, India</div>
      </div>
    </div>
  </div>
</body>
</html>
`;


const compiledOfferLetter = handlebars.compile(offerLetterTemplateSource);
const compiledCorporateOfferLetter = handlebars.compile(corporateOfferTemplateSource);
const compiledCertificate = handlebars.compile(certificateTemplateSource);

function buildTextOfferLetterHtml(context, textBody) {
  let rendered = textBody;
  Object.entries(context).forEach(([k, v]) => {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi'), v || '');
  });

  const paragraphs = rendered
    .split(/\n\s*\n/)
    .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 13.5px;">${p.trim().replace(/\n/g, '<br />')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Internship Offer Letter - Shortfundly</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; line-height: 1.6; }
    .header { border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .company { font-size: 22px; font-weight: 800; color: #7c3aed; letter-spacing: 1px; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    .sig-block { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
    .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">SHORTFUNDLY</div>
      <div style="font-size: 11px; color: #64748b;">Shortfundly Media Technologies Pvt. Ltd. &bull; Chennai, India</div>
    </div>
    <div class="meta">
      <div><strong>Date:</strong> ${context.issueDate || '01-06-2026'}</div>
      <div><strong>Ref ID:</strong> ${context.candidateId || 'SF-INT-2026'}</div>
      <div><strong>Intern ID:</strong> ${context.internId || 'INT-2026-001'}</div>
    </div>
  </div>

  <div>
    <div style="font-size: 13px; margin-bottom: 16px; color: #475569;">
      <div>To,</div>
      <div style="font-weight: 700; color: #0f172a;">${context.candidateName}</div>
      <div>${context.degree || ''} &bull; ${context.collegeName || ''}</div>
    </div>

    ${paragraphs}
  </div>

  <div class="sig-block">
    <div style="font-size: 12px;">
      <div>Warm regards,</div>
      <div style="height: 32px; font-family: cursive; font-size: 18px; color: #7c3aed; margin-top: 6px;">Authorized Signatory</div>
      <div style="font-weight: 700; color: #0f172a;">Shortfundly Human Resources</div>
      <div style="color: #64748b;">Talent Acquisition & Mentorship</div>
    </div>

    <div style="font-size: 12px; text-align: right;">
      <div>Accepted & Confirmed:</div>
      <div style="height: 32px; border-bottom: 1px dashed #94a3b8; width: 180px; margin: 6px 0 4px auto;"></div>
      <div style="font-weight: 700; color: #0f172a;">${context.candidateName}</div>
      <div style="color: #64748b;">Candidate Signature</div>
    </div>
  </div>

  <div class="footer">
    Official Letter of Internship &bull; Shortfundly Media Technologies Pvt. Ltd. &bull; www.shortfundly.com
  </div>
</body>
</html>`;
}

function extractField(text, regex, fallback = '') {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : fallback;
}

function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&bull;/g, '•')
    .replace(/&mdash;/g, '—')
    .replace(/[\\()]/g, '')
    .trim();
}

function wrapPdfLines(text, maxChars = 80) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = word;
    } else {
      cur = cur ? cur + ' ' + word : word;
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

function generateFallbackPdfBuffer(htmlContent) {
  const rawHtml = htmlContent || '';
  const cleanBody = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Extract structured candidate metadata from HTML if available
  const candidateName = extractField(cleanBody, /Dear\s*<strong>\s*([^<]+)\s*<\/strong>/i) ||
                        extractField(cleanBody, /Dear\s+([A-Za-z\s.]+)[,\n]/i) ||
                        extractField(cleanBody, /<title>[^-]+-\s*([^<]+)<\/title>/i, 'Candidate');

  const role = extractField(cleanBody, /(?:internship as a|position of)\s*<strong>\s*([^<]+)\s*<\/strong>/i) ||
               extractField(cleanBody, /Position &amp; Dept:<\/strong>\s*([^<—]+)/i) ||
               extractField(cleanBody, /Role \/ Position:<\/strong>\s*([^<—\n]+)/i, 'Intern');

  const refId = extractField(cleanBody, /Ref ID:<\/strong>\s*([^<]+)/i) ||
                extractField(cleanBody, /Intern ID:<\/strong>\s*([^<]+)/i, 'SF-INT-2026');

  const joiningDate = extractField(cleanBody, /Date:<\/strong>\s*([^<]+)/i) ||
                      extractField(cleanBody, /Start Date:<\/strong>\s*([^<]+)/i, '01-06-2026');

  const duration = extractField(cleanBody, /Tenure &amp; Duration:<\/strong>\s*([^<]+)/i) ||
                   extractField(cleanBody, /Duration:<\/strong>\s*([^<]+)/i, '3 Months');

  const stipend = extractField(cleanBody, /Stipend Amount:<\/strong>\s*([^<]+)/i) ||
                  extractField(cleanBody, /Stipend:<\/strong>\s*([^<]+)/i, 'Rs. 10,000');

  const workMode = extractField(cleanBody, /Work Mode:<\/strong>\s*([^<]+)/i, 'Online - Remote');
  const reportingManager = extractField(cleanBody, /Reporting Manager:<\/strong>\s*([^<]+)/i, 'Priyanka Nair');

  const safeCandName = sanitizePdfText(candidateName);
  const safeRole = sanitizePdfText(role);
  const safeRefId = sanitizePdfText(refId);
  const safeDate = sanitizePdfText(joiningDate);
  const safeDuration = sanitizePdfText(duration);
  const safeStipend = sanitizePdfText(stipend);
  const safeMode = sanitizePdfText(workMode);
  const safeManager = sanitizePdfText(reportingManager);

  // Stream graphics commands
  const ops = [];

  // 1. Top Brand Accent Stripe
  ops.push('0.31 0.27 0.90 rg 40 808 515 4 re f');

  // 2. Header Branding
  ops.push(`BT /F2 20 Tf 0.12 0.11 0.29 rg 40 782 Td (SHORTFUNDLY) Tj ET`);
  ops.push(`BT /F1 8.5 Tf 0.31 0.27 0.90 rg 40 770 Td (SHORTFUNDLY MEDIA TECHNOLOGIES PRIVATE LIMITED) Tj ET`);
  ops.push(`BT /F1 8 Tf 0.40 0.45 0.55 rg 360 782 Td (CIN: U72900TN2015PTC099876) Tj ET`);
  ops.push(`BT /F1 8 Tf 0.40 0.45 0.55 rg 360 771 Td (Chennai, Tamil Nadu, India) Tj ET`);
  ops.push(`BT /F1 8 Tf 0.31 0.27 0.90 rg 360 760 Td (hr@shortfundly.com | www.shortfundly.com) Tj ET`);

  // Divider Rule
  ops.push('0.88 0.91 0.94 RG 1 w 40 750 m 555 750 l S');

  // 3. Document Title Banner Box
  ops.push('0.96 0.97 0.99 rg 40 716 515 24 re f');
  ops.push('0.88 0.91 0.94 RG 1 w 40 716 515 24 re S');
  ops.push('0.31 0.27 0.90 rg 40 716 4 24 re f');
  ops.push(`BT /F2 10.5 Tf 0.12 0.16 0.23 rg 52 724 Td (OFFICIAL INTERNSHIP OFFER LETTER) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.40 0.45 0.55 rg 400 724 Td (Ref ID: ${safeRefId}  |  ${safeDate}) Tj ET`);

  // 4. Salutation & Opening
  ops.push(`BT /F1 10 Tf 0.40 0.45 0.55 rg 40 694 Td (To,) Tj ET`);
  ops.push(`BT /F2 12 Tf 0.06 0.09 0.16 rg 40 680 Td (${safeCandName}) Tj ET`);
  ops.push(`BT /F1 9.5 Tf 0.28 0.33 0.41 rg 40 667 Td (Candidate ID: ${safeRefId}  -  Recognized University / College) Tj ET`);

  ops.push(`BT /F1 10 Tf 0.20 0.25 0.33 rg 40 642 Td (Dear ${safeCandName},) Tj ET`);

  const intro1 = `We are pleased to offer you an internship position as ${safeRole} at Shortfundly.`;
  const intro2 = `Based on your academic profile, evaluation, and interview performance, we are confident`;
  const intro3 = `you will make a strong contribution to our technical initiatives and product engineering.`;
  ops.push(`BT /F1 9.5 Tf 0.20 0.25 0.33 rg 40 626 Td (${intro1}) Tj ET`);
  ops.push(`BT /F1 9.5 Tf 0.20 0.25 0.33 rg 40 613 Td (${intro2}) Tj ET`);
  ops.push(`BT /F1 9.5 Tf 0.20 0.25 0.33 rg 40 600 Td (${intro3}) Tj ET`);

  // 5. Terms Table Box
  ops.push('0.97 0.98 0.99 rg 40 488 515 96 re f');
  ops.push('0.88 0.91 0.94 RG 1 w 40 488 515 96 re S');
  ops.push('0.93 0.95 0.98 rg 40 564 515 20 re f');
  ops.push(`BT /F2 9 Tf 0.18 0.24 0.36 rg 50 570 Td (KEY APPOINTMENT TERMS & CONDITIONS) Tj ET`);

  // Grid column 1
  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 50 546 Td (Position / Role:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 140 546 Td (${safeRole}) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 50 528 Td (Work Mode:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 140 528 Td (${safeMode}) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 50 510 Td (Duration:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 140 510 Td (${safeDuration}) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 50 494 Td (Stipend:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 140 494 Td (${safeStipend}) Tj ET`);

  // Grid column 2
  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 310 546 Td (Joining Date:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 410 546 Td (${safeDate}) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 310 528 Td (Reporting Manager:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 410 528 Td (${safeManager}) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 310 510 Td (Department:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 410 510 Td (Product & Engineering) Tj ET`);

  ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 310 494 Td (Certificate:) Tj ET`);
  ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 410 494 Td (Upon Successful Review) Tj ET`);

  // 6. Policy & Expectations
  ops.push(`BT /F2 9.5 Tf 0.12 0.16 0.23 rg 40 464 Td (Professional Guidelines & Expectations:) Tj ET`);
  const bodyParas = [
    `1. Project Deliverables: You will participate in automated sprint cycles, collaborate with assigned mentors,`,
    `   attend scheduled virtual check-ins, and submit assigned milestones before the designated review deadlines.`,
    `2. Confidentiality & IP: All source code, datasets, credentials, and documentation developed during your`,
    `   tenure remain the exclusive intellectual property of Shortfundly Media Technologies Pvt. Ltd.`,
    `3. Completion Certificate: Awarded upon satisfactory completion and milestone approval by HR & Mentorship.`,
    `4. Acceptance: Please sign and confirm your acceptance through our secure candidate verification portal.`
  ];
  let curY = 448;
  for (const bp of bodyParas) {
    ops.push(`BT /F1 8.5 Tf 0.28 0.33 0.41 rg 40 ${curY} Td (${bp}) Tj ET`);
    curY -= 14;
  }

  // 7. Signature Block
  ops.push('0.88 0.91 0.94 RG 1 w 40 330 m 555 330 l S');

  // Left column: Company Signatory
  ops.push(`BT /F1 9 Tf 0.40 0.45 0.55 rg 40 312 Td (For Shortfundly Media Technologies Pvt. Ltd.) Tj ET`);
  ops.push(`BT /F2 13 Tf 0.31 0.27 0.90 rg 40 280 Td (Authorized Signatory) Tj ET`);
  ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 40 262 Td (Talent Acquisition & HR Operations) Tj ET`);
  ops.push(`BT /F1 8.5 Tf 0.40 0.45 0.55 rg 40 248 Td (Shortfundly Media Technologies) Tj ET`);

  // Right column: Intern Signature
  ops.push(`BT /F1 9 Tf 0.40 0.45 0.55 rg 360 312 Td (Accepted & Confirmed by Intern:) Tj ET`);
  ops.push('0.58 0.64 0.72 RG 1 w 360 276 m 530 276 l S');
  ops.push(`BT /F1 8.5 Tf 0.28 0.33 0.41 rg 360 262 Td (Signature: _________________________) Tj ET`);
  ops.push(`BT /F2 9 Tf 0.06 0.09 0.16 rg 360 248 Td (Name: ${safeCandName}) Tj ET`);
  ops.push(`BT /F1 8.5 Tf 0.40 0.45 0.55 rg 360 234 Td (Date: _____________________________) Tj ET`);

  // 8. Footer Bar
  ops.push('0.94 0.96 0.98 RG 1 w 40 160 m 555 160 l S');
  ops.push(`BT /F1 8 Tf 0.58 0.64 0.72 rg 85 146 Td (Official Shortfundly Internship Appointment  *  Chennai, India  *  Confidential  *  www.shortfundly.com) Tj ET`);

  const contentStream = `q\n${ops.join('\n')}\nQ`;
  const streamLength = Buffer.byteLength(contentStream);

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000252 00000 n 
0000000405 00000 n 
0000000325 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${480 + streamLength}
%%EOF`;

  return Buffer.from(pdfString);
}

export function renderOfferLetterHtml(candidate, customTemplate = null) {
  if (!candidate || !candidate.fullName) {
    throw new Error('Candidate information missing for Offer Letter generation.');
  }

  const issueDate = candidate.issueDate || (candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }));
  const deadline = candidate.deadline || (candidate.offerDeadline ? new Date(candidate.offerDeadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Within 3 days of receipt');
  const durationCalculated = calculateTenureDuration(candidate.joiningDate || '2026-06-01', candidate.endDate || '2026-08-31').label;
  const finalDuration = candidate.duration && candidate.duration.includes('Days') ? candidate.duration : durationCalculated;

  const context = {
    candidateName: candidate.fullName,
    role: candidate.role || 'Software Engineer Intern',
    startDate: candidate.joiningDate || '01-06-2026',
    endDate: candidate.endDate || '31-08-2026',
    duration: finalDuration,
    stipend: candidate.stipend || 'Rs. 10,000',
    workMode: candidate.workMode || 'Online - Remote',
    reportingManager: candidate.reportingManager || 'Priyanka Nair',
    assignedMentor: candidate.assignedMentor || 'Rahul Kapoor',
    issueDate: issueDate,
    deadline: deadline,
    candidateId: candidate.candidateId || candidate.id || 'SF-INT-2026',
    internId: candidate.internId || candidate.candidateId || 'INT-2026-00001',
    collegeName: candidate.collegeName || 'Recognized University',
    degree: candidate.degree || 'Bachelor of Engineering',
    department: candidate.department || 'Engineering',

    candidate_id: candidate.candidateId || candidate.id || 'SF-INT-2026',
    candidate_name: candidate.fullName,
    recipient_email: candidate.email,
    candidate_phone: candidate.phone || '+91-9876543210',
    college_name: candidate.collegeName || 'Recognized University',
    joining_date: candidate.joiningDate || '01-06-2026',
    end_date: candidate.endDate || '31-08-2026',
    internship_role: candidate.role || 'Software Engineer Intern',
    work_mode: candidate.workMode || 'Online - Remote',
    internship_duration: candidate.duration || '3 Months',
    reporting_manager: candidate.reportingManager || 'Priyanka Nair',
    assigned_mentor: candidate.assignedMentor || 'Rahul Kapoor',
  };

  if (customTemplate) {
    if (!/<[a-z][\s\S]*>/i.test(customTemplate)) {
      return buildTextOfferLetterHtml(context, customTemplate);
    }
    const customCompiler = handlebars.compile(customTemplate);
    return customCompiler(context);
  }

  return compiledCorporateOfferLetter(context);
}


export function renderCertificateHtml(candidate, certId, issueDate) {
  if (!candidate || !candidate.fullName) {
    throw new Error('Candidate information missing for Certificate generation.');
  }

  return compiledCertificate({
    candidate_name: candidate.fullName,
    role: candidate.role || 'Software Engineer Intern',
    department: candidate.department || 'Engineering',
    joining_date: candidate.joiningDate || '01-06-2026',
    end_date: candidate.endDate || '31-08-2026',
    certificate_id: certId || `SF-CERT-${candidate.candidateId || Date.now()}`,
    issue_date: issueDate || new Date().toISOString().split('T')[0],
  });
}

let sharedBrowser = null;
let sharedBrowserTimer = null;

async function getSharedBrowser() {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    if (sharedBrowserTimer) clearTimeout(sharedBrowserTimer);
    sharedBrowserTimer = setTimeout(async () => {
      try { await sharedBrowser?.close(); } catch {}
      sharedBrowser = null;
    }, 25000);
    return sharedBrowser;
  }

  try {
    const pw = await import('playwright');
    if (!pw?.chromium) return null;

    const launchPromise = pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Chromium launch timeout')), 15000)
    );

    sharedBrowser = await Promise.race([launchPromise, timeoutPromise]);

    sharedBrowserTimer = setTimeout(async () => {
      try { await sharedBrowser?.close(); } catch {}
      sharedBrowser = null;
    }, 25000);

    return sharedBrowser;
  } catch (err) {
    console.warn('[PDF Engine] Could not initialize Playwright browser:', err.message);
    return null;
  }
}

export async function generatePdfFromHtml(htmlContent, landscape = false) {
  try {
    const browser = await getSharedBrowser();

    if (!browser) {
      return generateFallbackPdfBuffer(htmlContent);
    }

    // Sanitize and ensure proper A4 full-width alignment without centering margins
    const printFixStyle = `
      <style id="a4-print-alignment-fix">
        @page {
          size: A4 portrait;
          margin: 12mm 14mm !important;
        }
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .wrapper, #wrapper, .container, main, .content {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
      </style>
    `;

    const normalizedHtml = htmlContent.includes('</head>')
      ? htmlContent.replace('</head>', `${printFixStyle}</head>`)
      : `${printFixStyle}${htmlContent}`;

    const page = await browser.newPage();
    try {
      await page.setViewportSize({ width: 794, height: 1123 });
      await page.setContent(normalizedHtml, { waitUntil: 'domcontentloaded', timeout: 8000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: landscape,
        printBackground: true,
        preferCSSPageSize: true,
      });
      return pdfBuffer;
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    console.warn('[PDF Engine] Fast fallback buffer used:', err.message);
    return generateFallbackPdfBuffer(htmlContent);
  }
}

/**
 * Generates personalized Offer Letter PDF and persists to disk
 */
export async function generateOfferLetterPdf(candidate, customTemplate = null) {
  const html = renderOfferLetterHtml(candidate, customTemplate);
  const pdfBuffer = await generatePdfFromHtml(html, false);

  const cleanCandId = (candidate.candidateId || candidate.id || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Offer_Letter_${cleanCandId}.pdf`;
  const filePath = path.join(STORAGE_OFFER_DIR, filename);

  // Write to persistent storage safely
  ensureStorageDirs();
  try {
    fs.writeFileSync(filePath, pdfBuffer);
  } catch (err) {
    console.warn(`Could not persist PDF to ${filePath}:`, err.message);
  }

  return {
    pdfBuffer,
    filePath,
    filename,
  };
}

/**
 * Generates personalized Certificate PDF and persists to disk
 */
export async function generateCertificatePdf(candidate, certId, issueDate) {
  const html = renderCertificateHtml(candidate, certId, issueDate);
  const pdfBuffer = await generatePdfFromHtml(html, true);

  const cleanCandId = (candidate.candidateId || candidate.id || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Certificate_${cleanCandId}.pdf`;
  const filePath = path.join(STORAGE_CERT_DIR, filename);

  // Write to persistent storage safely
  ensureStorageDirs();
  try {
    fs.writeFileSync(filePath, pdfBuffer);
  } catch (err) {
    console.warn(`Could not persist PDF to ${filePath}:`, err.message);
  }

  return {
    pdfBuffer,
    filePath,
    filename,
  };
}
