import { escapeHtml } from './config.js';

export const DEFAULT_TEMPLATES = [
  {
    id: 'campus-collaboration-proposal',
    title: 'Shortfundly Campus Collaboration Proposal (Official)',
    subjectTemplate: 'Proposal for Shortfundly Campus Collaboration — Empowering Student Creators at {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly!</p>

<div style="margin: 18px 0; text-align: center;">
  <img src="/uploads/email-images/sf_creator_pass_banner.svg" alt="Shortfundly Campus Creator Pass" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
</div>

<p>We propose a collaboration with <strong>{{college_name}}</strong>{{department_clause}} in <strong>{{state}}, {{country}}</strong> through <strong>Shortfundly Campus</strong> to help students develop creative skills, showcase their work, and explore opportunities in filmmaking and digital content.</p>

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

<p><strong>Objectives for {{institution}}:</strong></p>
<ul style="padding-left: 20px; line-height: 1.6;">
  <li>Create a structured pathway for students to develop and present creative projects.</li>
  <li>Strengthen participation in film clubs and interdisciplinary activities.</li>
  <li>Help students build practical experience and demonstrable portfolios.</li>
  <li>Showcase the institution’s emerging creative talent across {{state}}.</li>
</ul>

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
    id: 'campus-film-festival-invitation',
    title: 'Shortfundly National Campus Film Festival 2026 (Poster & Call for Entries)',
    subjectTemplate: 'Official Invitation: National Campus Short Film Festival 2026 — Nominate Student Filmmakers from {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly Campus!</p>

<div style="margin: 20px 0; text-align: center;">
  <a href="https://festival.shortfundly.com" target="_blank">
    <img src="/uploads/email-images/sf_campus_festival_poster.svg" alt="Shortfundly National Campus Film Festival 2026" style="max-width: 100%; height: auto; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.1);" />
  </a>
</div>

<p>We are delighted to invite <strong>{{college_name}}</strong>, {{state}}, to participate in the prestigious <strong>Shortfundly National Campus Short Film Festival 2026</strong>.</p>

<p>This annual festival celebrates visionary student storytelling across narrative fiction, documentaries, animation, and experimental media. Selected student films receive OTT distribution, festival laurels, and direct access to production house mentorship.</p>

<p><strong>Highlights for {{institution}}:</strong></p>
<ul style="padding-left: 20px; line-height: 1.6;">
  <li><strong>₹2,50,000 Total Prize Pool</strong> across Best Director, Screenplay, Cinematography, and Editor categories.</li>
  <li><strong>Exclusive Screening Rights</strong> on Shortfundly OTT for institutional showcase.</li>
  <li><strong>Industry Jury Panel</strong> consisting of celebrated directors, festival curators, and producers.</li>
  <li><strong>Institutional Trophy &amp; Digital Credentials</strong> for winning departments.</li>
</ul>

<p><strong>Nomination Details:</strong><br />
Institutions may nominate up to 5 student projects without entry fees using their verified college email address.</p>

<p>
Official Festival Portal: <a href="https://festival.shortfundly.com" target="_blank" style="color: #2563eb; text-decoration: underline;">https://festival.shortfundly.com</a><br />
Submit Nominations: <a href="https://campus.shortfundly.com/festival-entry" target="_blank" style="color: #2563eb; text-decoration: underline;">https://campus.shortfundly.com/festival-entry</a><br />
Direct Inquiry: +91 93612 23155
</p>

<p style="margin-top: 24px;">With highest regards,<br />
<strong>{{sender_name}}</strong><br />
Festival Director | Shortfundly Campus<br />
SM Smartygen Media Networks Private Limited</p>`,
    is_default: 0,
  },
  {
    id: 'campus-ambassador-initiative',
    title: 'Shortfundly Campus Ambassador Chapter Invitation',
    subjectTemplate: 'Campus Ambassador Chapter Invitation — Partnering with {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly Campus!</p>

<p>We are excited to invite <strong>{{college_name}}</strong>{{department_clause}} in <strong>{{state}}, {{country}}</strong> to establish an official <strong>Shortfundly Student Creator Chapter</strong>.</p>

<div style="margin: 16px 0; text-align: center;">
  <img src="/uploads/email-images/sf_creator_pass_banner.svg" alt="Shortfundly Student Creator Chapter" style="max-width: 100%; height: auto; border-radius: 8px;" />
</div>

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

  // Check if string already contains structural HTML tags (<p>, <div>, <table>, <ul>, <ol>, <h1-6>, <img>)
  const hasStructuralTags = /<(p|div|table|ul|ol|h[1-6]|blockquote|img)\b[^>]*>/i.test(textOrHtml);

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
 * geographic location (country, state, city/district), institution name,
 * and handles both bracket [Placeholder] and curly brace {{placeholder}} syntax.
 */
export function renderTemplate(templateStr, variables = {}) {
  const safeCollege = escapeHtml((variables.college_name || variables.institution || '').trim());
  const safeInstitution = safeCollege;
  const safeDepartment = escapeHtml((variables.department || '').trim());
  const safeContact = escapeHtml((variables.contact_person || '').trim());
  const safeDesignation = escapeHtml((variables.designation || '').trim());
  const safeSender = escapeHtml((variables.sender_name || 'Shortfundly Campus Outreach').trim());
  const safeEmail = escapeHtml((variables.email || '').trim());
  const safeCountry = escapeHtml((variables.country || variables.country_name || 'India').trim());
  const safeState = escapeHtml((variables.state || variables.state_or_region || 'Andhra Pradesh').trim());

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

  // 3. College Name & Institution replacements
  output = output
    .replace(/\[\s*College\s*Name\s*\]/gi, safeCollege)
    .replace(/\[\s*college_name\s*\]/gi, safeCollege)
    .replace(/\[\s*College\s*\]/gi, safeCollege)
    .replace(/\[\s*collegename\s*\]/gi, safeCollege)
    .replace(/\[\s*Institution\s*\]/gi, safeInstitution)
    .replace(/\[\s*institution\s*\]/gi, safeInstitution)
    .replace(/\[\s*University\s*\]/gi, safeCollege)
    .replace(/\{\{\s*college_name\s*\}\}/gi, safeCollege)
    .replace(/\{\s*college_name\s*\}/gi, safeCollege)
    .replace(/\{\{\s*college\s*\}\}/gi, safeCollege)
    .replace(/\{\s*college\s*\}/gi, safeCollege)
    .replace(/\{\{\s*institution\s*\}\}/gi, safeInstitution)
    .replace(/\{\s*institution\s*\}/gi, safeInstitution);

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

  // 9. Location & Geographic Metadata replacements
  const safeCityDistrict = escapeHtml((variables.city_district || variables.city || variables.district || '').trim());
  const safeCategory = escapeHtml((variables.category || '').trim());
  const safeWebsite = escapeHtml((variables.website_url || '').trim());
  const safePhone = escapeHtml((variables.phone || '').trim());
  const safeRemarks = escapeHtml((variables.remarks || '').trim());

  output = output
    .replace(/\[\s*Country\s*\]/gi, safeCountry)
    .replace(/\[\s*country\s*\]/gi, safeCountry)
    .replace(/\{\{\s*country\s*\}\}/gi, safeCountry)
    .replace(/\{\{\s*country_name\s*\}\}/gi, safeCountry)
    .replace(/\{\s*country\s*\}/gi, safeCountry)
    .replace(/\[\s*State\s*\]/gi, safeState)
    .replace(/\[\s*state\s*\]/gi, safeState)
    .replace(/\{\{\s*state\s*\}\}/gi, safeState)
    .replace(/\{\s*state\s*\}/gi, safeState)
    .replace(/\[\s*City\s*\/\s*District\s*\]/gi, safeCityDistrict)
    .replace(/\[\s*District\s*\]/gi, safeCityDistrict)
    .replace(/\[\s*City\s*\]/gi, safeCityDistrict)
    .replace(/\{\{\s*city_district\s*\}\}/gi, safeCityDistrict)
    .replace(/\{\s*city_district\s*\}/gi, safeCityDistrict)
    .replace(/\[\s*Category\s*\]/gi, safeCategory)
    .replace(/\[\s*Stream\s*\]/gi, safeCategory)
    .replace(/\{\{\s*category\s*\}\}/gi, safeCategory)
    .replace(/\{\s*category\s*\}/gi, safeCategory)
    .replace(/\[\s*Official\s*Website\s*URL\s*\]/gi, safeWebsite)
    .replace(/\[\s*Website\s*\]/gi, safeWebsite)
    .replace(/\{\{\s*website_url\s*\}\}/gi, safeWebsite)
    .replace(/\{\s*website_url\s*\}/gi, safeWebsite)
    .replace(/\[\s*Phone\s*\]/gi, safePhone)
    .replace(/\[\s*Contact\s*Number\s*\]/gi, safePhone)
    .replace(/\{\{\s*phone\s*\}\}/gi, safePhone)
    .replace(/\{\s*phone\s*\}/gi, safePhone)
    .replace(/\[\s*Remarks\s*\]/gi, safeRemarks)
    .replace(/\{\{\s*remarks\s*\}\}/gi, safeRemarks)
    .replace(/\{\s*remarks\s*\}/gi, safeRemarks);

  return output;
}

/**
 * Validates whether all placeholders in subject and body are resolved.
 * Returns array of remaining unresolved tokens (e.g. ['{{custom_token}}', '[Unknown Tag]']).
 */
export function validateTemplatePlaceholders(text, variables = {}) {
  const rendered = renderTemplate(text, variables);
  const remainingTokens = [];

  // Match curly braces {{...}}
  const curlyMatches = rendered.match(/\{\{([^{}]+)\}\}/g) || [];
  for (const match of curlyMatches) {
    if (!remainingTokens.includes(match)) {
      remainingTokens.push(match);
    }
  }

  // Match square brackets that look like tokens [Placeholder Name] (not links or HTML)
  const bracketMatches = rendered.match(/\[([A-Za-z0-9_\s&/-]{3,30})\](?!\()/g) || [];
  for (const match of bracketMatches) {
    if (!remainingTokens.includes(match) && !match.includes('http')) {
      remainingTokens.push(match);
    }
  }

  return {
    isValid: remainingTokens.length === 0,
    unresolvedTokens: remainingTokens,
    renderedPreview: rendered,
  };
}

/**
 * Wraps body in a clean, modern HTML email layout with responsive image handling
 * and email client compatibility (Gmail, Outlook, Yahoo, Apple Mail).
 */
export function wrapInEmailLayout(bodyHtml, options = {}) {
  const content = formatBodyToHtml(bodyHtml);
  const unsubscribeUrl = options.unsubscribeUrl || 'mailto:campus@shortfundly.com?subject=Unsubscribe';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    img { max-width: 100% !important; height: auto !important; border-radius: 6px; }
    p { margin: 0 0 16px 0; }
    a { color: #2563eb; text-decoration: underline; }
  </style>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; width: 100%;">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 680px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <!-- Email Header Bar -->
          <tr>
            <td style="padding: 20px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" vertical-align="middle">
                    <span style="font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">Shortfundly <span style="color: #e11d48; font-weight: 600;">Campus</span></span>
                  </td>
                  <td align="right" vertical-align="middle">
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; background-color: #f1f5f9; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Institutional Outreach</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 28px; color: #111827; font-size: 14px; line-height: 1.68;">
              ${content}
            </td>
          </tr>

          <!-- Email Footer -->
          <tr>
            <td style="padding: 20px 28px; border-top: 1px solid #f1f5f9; background-color: #f8fafc; font-size: 11px; color: #64748b; line-height: 1.6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <strong>Shortfundly Campus Outreach Engine</strong> &bull; SM Smartygen Media Networks Private Limited<br />
                    Chennai, Tamil Nadu, India &bull; <a href="https://campus.shortfundly.com" target="_blank" style="color: #64748b; text-decoration: underline;">campus.shortfundly.com</a><br />
                    To opt out of future institutional invitations, <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">reply with &ldquo;Unsubscribe&rdquo;</a> or email <a href="mailto:campus@shortfundly.com" style="color: #64748b; text-decoration: underline;">campus@shortfundly.com</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
