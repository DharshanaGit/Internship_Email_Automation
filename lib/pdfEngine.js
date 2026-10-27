import handlebars from 'handlebars';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const baseDir = isVercel ? '/tmp' : process.cwd();
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
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
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
      display: grid;
      grid-template-columns: 1fr 1fr;
      row-gap: 5px;
      column-gap: 16px;
      font-size: 12px;
    }
    .details-item strong {
      color: #0f172a;
      display: inline-block;
      min-width: 130px;
    }
    .signature-block {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
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

export function renderOfferLetterHtml(candidate, customTemplate = null) {
  if (!candidate || !candidate.fullName) {
    throw new Error('Candidate information missing for Offer Letter generation.');
  }

  const issueDate = candidate.issueDate || (candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }));
  const deadline = candidate.deadline || (candidate.offerDeadline ? new Date(candidate.offerDeadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Within 3 days of receipt');

  const context = {
    candidateName: candidate.fullName,
    role: candidate.role || 'Software Engineer Intern',
    startDate: candidate.joiningDate || '01-06-2026',
    endDate: candidate.endDate || '31-08-2026',
    duration: candidate.duration || '3 Months',
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

export async function generatePdfFromHtml(htmlContent, landscape = false) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: landscape,
      printBackground: true,
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
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
