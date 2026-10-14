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
 * Safely renders a template string with escaped variable values
 */
export function renderTemplate(templateStr, variables = {}) {
  const safeCollege = escapeHtml(variables.college_name || '');
  const safeDepartment = variables.department ? escapeHtml(variables.department) : '';
  const safeContact = variables.contact_person ? escapeHtml(variables.contact_person) : '';
  const safeSender = variables.sender_name ? escapeHtml(variables.sender_name) : 'Shortfundly Campus Team';

  const salutation = safeContact ? safeContact : 'Sir/Madam';
  const departmentClause = safeDepartment ? ` (${safeDepartment})` : '';

  return (templateStr || '')
    .replace(/\{\{college_name\}\}/g, safeCollege)
    .replace(/\{\{department\}\}/g, safeDepartment)
    .replace(/\{\{department_clause\}\}/g, departmentClause)
    .replace(/\{\{contact_person\}\}/g, safeContact)
    .replace(/\{\{contact_salutation\}\}/g, salutation)
    .replace(/\{\{sender_name\}\}/g, safeSender);
}

/**
 * Wraps body in a clean, natural plain-email layout without promotional banners, cards, or photo flyers
 */
export function wrapInEmailLayout(bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">
  <div style="max-width: 680px; margin: 0; color: #111827;">
    ${bodyHtml}
    
    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; line-height: 1.5;">
      Shortfundly Campus &bull; SM Smartygen Media Networks Private Limited<br />
      Chennai, Tamil Nadu, India | <a href="https://campus.shortfundly.com" target="_blank" style="color: #6b7280; text-decoration: underline;">campus.shortfundly.com</a><br />
      To opt out of future collaboration outreach, reply with &ldquo;Unsubscribe&rdquo; or email <a href="mailto:campus@shortfundly.com" style="color: #6b7280; text-decoration: underline;">campus@shortfundly.com</a>.
    </div>
  </div>
</body>
</html>`;
}
