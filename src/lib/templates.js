import { escapeHtml } from './config.js';

export const DEFAULT_TEMPLATES = [
  {
    id: 'campus-collaboration-proposal',
    title: 'Shortfundly Campus Collaboration Proposal (Official)',
    subjectTemplate: 'Proposal for Shortfundly Campus Collaboration — Empowering Student Creators at {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly!</p>

<p>We propose a collaboration with <strong>{{college_name}}</strong>{{department_clause}} through <strong>Shortfundly Campus</strong> to help students develop creative skills, showcase their work, and explore opportunities in filmmaking and digital content.</p>

<p><strong>About Shortfundly Campus:</strong><br />
Shortfundly Campus connects student creators with collaboration, film submission, promotion, and event opportunities. Its Campus Pass brings together six products: Connect, Festival, Hub, Marketing, Ticket, and Tools. Students can build creator profiles, find collaborators, and prepare their projects for wider exposure.</p>

<p><strong>Proposed Areas of Collaboration:</strong></p>
<ul style="padding-left: 20px; line-height: 1.6;">
  <li><strong>Student onboarding:</strong> Introduce interested students to the platform and help them activate their access.</li>
  <li><strong>Learning sessions:</strong> Plan workshops on filmmaking, OTT distribution, film marketing, and AI.</li>
  <li><strong>Campus activities:</strong> Organize screenings and competitions to showcase student talent.</li>
  <li><strong>Creator development:</strong> Encourage portfolio building, collaboration, and festival participation.</li>
  <li><strong>Student leadership:</strong> Explore a Campus Ambassador initiative to support participation and community building.</li>
</ul>

<p><em>The activities, frequency, support, and deliverables will be finalized jointly with the institution.</em></p>

<p><strong>Objectives for the Institution:</strong></p>
<ul style="padding-left: 20px; line-height: 1.6;">
  <li>Create a structured pathway for students to develop and present creative projects.</li>
  <li>Strengthen participation in film clubs and interdisciplinary activities.</li>
  <li>Help students build practical experience and demonstrable portfolios.</li>
  <li>Showcase the institution’s emerging creative talent.</li>
</ul>

<p><strong>Proposed Implementation:</strong></p>
<ol style="padding-left: 20px; line-height: 1.6;">
  <li>Conduct a product demonstration for faculty and student coordinators.</li>
  <li>Confirm participating departments, student numbers, and priorities.</li>
  <li>Finalize the scope, commercial terms, and activity schedule.</li>
  <li>Conduct an orientation and begin student onboarding.</li>
  <li>Review participation and project progress with the designated faculty coordinator.</li>
</ol>

<p><strong>Commercial Terms:</strong><br />
The Campus Pass is currently listed at ₹1,500 + GST per year. Institutional pricing and any additional activity charges will be confirmed through a separate quotation based on the agreed scope.</p>

<p><strong>Next Steps:</strong><br />
We would welcome a meeting with your team to understand your requirements and present Shortfundly Campus. Kindly share a convenient time and nominate a faculty coordinator to take the discussion forward.</p>

<p>
Contact: +91 93612 23155<br />
Explore Campus: <a href="https://campus.shortfundly.com/" target="_blank" style="color: #2563eb; text-decoration: underline;">https://campus.shortfundly.com/</a><br />
Schedule a Meeting: <a href="https://calendly.com/shortfundly-meeting/30min" target="_blank" style="color: #2563eb; text-decoration: underline;">https://calendly.com/shortfundly-meeting/30min</a>
</p>

<p style="margin-top: 24px;">Warm regards,<br />
<strong>{{sender_name}}</strong><br />
Product Manager | Shortfundly<br />
SM Smartygen Media Networks Private Limited</p>`,
    is_default: 1,
  },
  {
    id: 'campus-ambassador-initiative',
    title: 'Shortfundly Campus Ambassador Chapter Invitation',
    subjectTemplate: 'Campus Ambassador Chapter Invitation — Partnering with {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly Campus!</p>

<p>We are excited to invite <strong>{{college_name}}</strong>{{department_clause}} to establish an official <strong>Shortfundly Student Creator Chapter</strong>.</p>

<p>Campus Ambassadors receive hands-on experience in OTT distribution, media curation, and film festival coordination, directly backed by Shortfundly's industry ecosystem.</p>

<p><strong>Benefits for {{college_name}}:</strong></p>
<ul style="padding-left: 20px; line-height: 1.6;">
  <li>Free festival submissions and creator credentials for nominated students.</li>
  <li>Industry webinars hosted by acclaimed filmmakers and OTT curators.</li>
  <li>Annual excellence certificates for active student leads.</li>
</ul>

<p>We look forward to connecting with your department to nominate student leads.</p>

<p>
Contact: +91 93612 23155<br />
Explore Campus: <a href="https://campus.shortfundly.com/" target="_blank" style="color: #2563eb; text-decoration: underline;">https://campus.shortfundly.com/</a><br />
Schedule a Call: <a href="https://calendly.com/shortfundly-meeting/30min" target="_blank" style="color: #2563eb; text-decoration: underline;">https://calendly.com/shortfundly-meeting/30min</a>
</p>

<p style="margin-top: 24px;">Warm regards,<br />
<strong>{{sender_name}}</strong><br />
Product Manager | Shortfundly<br />
SM Smartygen Media Networks Private Limited</p>`,
    is_default: 0,
  }
];

/**
 * Ensures text line breaks, paragraphs, and indentation are formatted into standard HTML
 * preserving exact visual alignment across all email clients (Gmail, Outlook, Yahoo) and web preview panes.
 * Converts markdown links and bold emphasis to genuine HTML elements.
 */
export function formatBodyToHtml(textOrHtml) {
  if (!textOrHtml) return '';

  // Check if string already contains structural HTML tags (<p>, <div>, <table>, <ul>, <ol>, <h1-6>)
  const hasStructuralTags = /<(p|div|table|ul|ol|h[1-6]|blockquote)\b[^>]*>/i.test(textOrHtml);

  if (hasStructuralTags) {
    return textOrHtml;
  }

  let processed = textOrHtml;

  // Convert markdown links: [text](url) -> <a href="url">text</a>
  processed = processed.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline;">$1</a>'
  );

  // Convert standalone http/https URLs not already wrapped in tags
  processed = processed.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline;">$2</a>'
  );

  // Convert markdown bold: **text** or *text* -> <strong>text</strong>
  processed = processed.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(^|[\s(])\*([^*\n]+)\*([\s.,!?)]|$)/gm, '$1<strong>$2</strong>$3');

  // Convert plain text with double newlines into semantic paragraphs and single newlines to <br />
  const paragraphs = processed.split(/\r?\n\s*\r?\n/);
  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      const withLineBreaks = trimmed.replace(/\r?\n/g, '<br />\n');
      return `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #111827;">${withLineBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Safely renders a template string with escaped variable values.
 * Intelligently personalizes greetings, college & department clauses, contact person & designation,
 * and handles both bracket [Placeholder] and curly brace {{placeholder}} syntax.
 */
export function renderTemplate(templateStr, variables = {}) {
  const safeCollege = escapeHtml((variables.college_name || '').trim());
  const safeDepartment = escapeHtml((variables.department || '').trim());
  const safeContact = escapeHtml((variables.contact_person || '').trim());
  const safeDesignation = escapeHtml((variables.designation || '').trim());
  const safeSender = escapeHtml((variables.sender_name || 'Shortfundly Campus Outreach').trim());
  const safeEmail = escapeHtml((variables.email || '').trim());

  // Smart Person / Salutation Construction
  let personWithDesignation = safeContact;
  if (safeContact && safeDesignation) {
    personWithDesignation = `${safeContact} (${safeDesignation})`;
  } else if (!safeContact && safeDesignation) {
    personWithDesignation = safeDesignation;
  }
  const salutation = personWithDesignation || 'Sir/Madam';

  // Smart College & Department Construction
  let collegeWithDepartment = safeCollege;
  if (safeCollege && safeDepartment) {
    collegeWithDepartment = `${safeCollege} (${safeDepartment})`;
  } else if (!safeCollege && safeDepartment) {
    collegeWithDepartment = safeDepartment;
  }
  const departmentClause = safeDepartment ? ` (${safeDepartment})` : '';

  let output = templateStr || '';

  // 1. First replace combined placeholders if used
  output = output
    .replace(/\[\s*(?:Contact\s*Person|Contact)\s*(?:&|and)\s*Designation\s*\]/gi, salutation)
    .replace(/\[\s*(?:College\s*Name|College)\s*(?:&|and)\s*Department\s*\]/gi, collegeWithDepartment);

  // 2. Intelligently personalize greeting if generic "Dear Sir/Madam" is used and contact person is provided
  if (safeContact) {
    output = output
      .replace(/Dear\s+(?:Sir\s*\/\s*Madam|Sir|Madam|Faculty\s+Coordinator|Coordinator)\s*,/gi, `Dear ${salutation},`)
      .replace(/Respected\s+(?:Sir\s*\/\s*Madam|Sir|Madam)\s*,/gi, `Respected ${salutation},`);
  }

  // 3. College Name replacements
  output = output
    .replace(/\[\s*College\s*Name\s*\]/gi, safeCollege)
    .replace(/\[\s*college_name\s*\]/gi, safeCollege)
    .replace(/\[\s*College\s*\]/gi, safeCollege)
    .replace(/\[\s*collegename\s*\]/gi, safeCollege)
    .replace(/\[\s*Institution\s*\]/gi, safeCollege)
    .replace(/\[\s*University\s*\]/gi, safeCollege)
    .replace(/\{\{\s*college_name\s*\}\}/gi, safeCollege)
    .replace(/\{\s*college_name\s*\}/gi, safeCollege)
    .replace(/\{\{\s*college\s*\}\}/gi, safeCollege)
    .replace(/\{\s*college\s*\}/gi, safeCollege);

  // 4. Contact Person / Salutation replacements
  output = output
    .replace(/\[\s*Contact\s*Person\s*\]/gi, salutation)
    .replace(/\[\s*contact_person\s*\]/gi, salutation)
    .replace(/\[\s*contactperson\s*\]/gi, salutation)
    .replace(/\[\s*Faculty\s*Name\s*\]/gi, salutation)
    .replace(/\[\s*Faculty\s*\]/gi, salutation)
    .replace(/\[\s*Contact\s*\]/gi, salutation)
    .replace(/\[\s*Person\s*Name\s*\]/gi, salutation)
    .replace(/\[\s*Name\s*\]/gi, salutation)
    .replace(/\[\s*Salutation\s*\]/gi, salutation)
    .replace(/\{\{\s*contact_person\s*\}\}/gi, salutation)
    .replace(/\{\s*contact_person\s*\}/gi, salutation)
    .replace(/\{\{\s*contact_salutation\s*\}\}/gi, salutation)
    .replace(/\{\s*contact_salutation\s*\}/gi, salutation)
    .replace(/\{\{\s*name\s*\}\}/gi, salutation);

  // 5. Department replacements
  const hasDepartmentPlaceholder = /\[\s*(?:Department|dept|division)\s*\]|\{\{\s*department\s*\}\}/i.test(templateStr);
  output = output
    .replace(/\[\s*Department\s*\]/gi, safeDepartment)
    .replace(/\[\s*department\s*\]/gi, safeDepartment)
    .replace(/\[\s*Dept\s*\]/gi, safeDepartment)
    .replace(/\[\s*dept\s*\]/gi, safeDepartment)
    .replace(/\[\s*Division\s*\]/gi, safeDepartment)
    .replace(/\{\{\s*department\s*\}\}/gi, safeDepartment)
    .replace(/\{\s*department\s*\}/gi, safeDepartment)
    .replace(/\{\{\s*department_clause\s*\}\}/gi, departmentClause);

  // If the template had NO department placeholder at all, but the user supplied a Department:
  // ensure the department is included alongside the college name in phrases like "collaboration with [College Name]"
  if (!hasDepartmentPlaceholder && safeDepartment && safeCollege) {
    const escapedCollege = safeCollege.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(collaboration\\s+with\\s+${escapedCollege})(?!\\s*\\()`, 'gi');
    output = output.replace(regex, `$1 (${safeDepartment})`);
  }

  // 6. Designation replacements
  output = output
    .replace(/\[\s*Designation\s*\]/gi, safeDesignation)
    .replace(/\[\s*designation\s*\]/gi, safeDesignation)
    .replace(/\[\s*Role\s*\]/gi, safeDesignation)
    .replace(/\[\s*Title\s*\]/gi, safeDesignation)
    .replace(/\{\{\s*designation\s*\}\}/gi, safeDesignation)
    .replace(/\{\s*designation\s*\}/gi, safeDesignation);

  // 7. Sender Name replacements
  output = output
    .replace(/\[\s*Your\s*Name\s*\]/gi, safeSender)
    .replace(/\[\s*your_name\s*\]/gi, safeSender)
    .replace(/\[\s*Sender\s*Name\s*\]/gi, safeSender)
    .replace(/\[\s*sender_name\s*\]/gi, safeSender)
    .replace(/\[\s*Sender\s*\]/gi, safeSender)
    .replace(/\{\{\s*sender_name\s*\}\}/gi, safeSender)
    .replace(/\{\s*sender_name\s*\}/gi, safeSender);

  // 8. Recipient Email replacements
  output = output
    .replace(/\[\s*Recipient\s*Email\s*\]/gi, safeEmail)
    .replace(/\[\s*recipient_email\s*\]/gi, safeEmail)
    .replace(/\[\s*Email\s*\]/gi, safeEmail)
    .replace(/\{\{\s*email\s*\}\}/gi, safeEmail)
    .replace(/\{\s*email\s*\}/gi, safeEmail);

  return output;
}

/**
 * Wraps body in a clean, natural plain-email layout without promotional banners, cards, or photo flyers
 * Ensures paragraph structure and line breaks are fully preserved across all email clients.
 */
export function wrapInEmailLayout(bodyHtml) {
  const content = formatBodyToHtml(bodyHtml);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #111827;">
  <div style="max-width: 680px; margin: 0; color: #111827; line-height: 1.65;">
    ${content}
    
    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; line-height: 1.5;">
      Shortfundly Campus &bull; SM Smartygen Media Networks Private Limited<br />
      Chennai, Tamil Nadu, India | <a href="https://campus.shortfundly.com" target="_blank" style="color: #6b7280; text-decoration: underline;">campus.shortfundly.com</a><br />
      To opt out of future collaboration outreach, reply with &ldquo;Unsubscribe&rdquo; or email <a href="mailto:campus@shortfundly.com" style="color: #6b7280; text-decoration: underline;">campus@shortfundly.com</a>.
    </div>
  </div>
</body>
</html>`;
}
