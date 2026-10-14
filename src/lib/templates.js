import { escapeHtml } from './config.js';

export const DEFAULT_TEMPLATES = [
  {
    id: 'campus-collaboration-proposal',
    title: 'Shortfundly Campus Collaboration Proposal (Official)',
    subjectTemplate: 'Proposal for Shortfundly Campus Collaboration — Empowering Student Creators at {{college_name}}',
    bodyTemplate: `<p>Dear {{contact_salutation}},</p>

<p>Greetings from Shortfundly!</p>

<p>We propose a collaboration with <strong>{{college_name}}</strong>{{department_clause}} through <strong>Shortfundly Campus</strong> to help students develop creative skills, showcase their work, and explore opportunities in filmmaking and digital content.</p>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">About Shortfundly Campus</h3>
<p>Shortfundly Campus connects student creators with collaboration, film submission, promotion, and event opportunities. Its Campus Pass brings together six products: <strong>Connect, Festival, Hub, Marketing, Ticket, and Tools.</strong> Students can build creator profiles, find collaborators, and prepare their projects for wider exposure.</p>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Proposed Areas of Collaboration</h3>
<ul style="padding-left:20px; line-height:1.6;">
  <li><strong>Student onboarding:</strong> Introduce interested students to the platform and help them activate their access.</li>
  <li><strong>Learning sessions:</strong> Plan workshops on filmmaking, OTT distribution, film marketing, and AI.</li>
  <li><strong>Campus activities:</strong> Organize screenings and competitions to showcase student talent.</li>
  <li><strong>Creator development:</strong> Encourage portfolio building, collaboration, and festival participation.</li>
  <li><strong>Student leadership:</strong> Explore a Campus Ambassador initiative to support participation and community building.</li>
</ul>
<p style="font-size:13px; color:#475569;"><em>The activities, frequency, support, and deliverables will be finalized jointly with the institution.</em></p>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Objectives for the Institution</h3>
<p>Through this partnership, we aim to:</p>
<ul style="padding-left:20px; line-height:1.6;">
  <li>Create a structured pathway for students to develop and present creative projects.</li>
  <li>Strengthen participation in film clubs and interdisciplinary activities.</li>
  <li>Help students build practical experience and demonstrable portfolios.</li>
  <li>Showcase the institution’s emerging creative talent.</li>
</ul>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Proposed Implementation</h3>
<ol style="padding-left:20px; line-height:1.6;">
  <li>Conduct a product demonstration for faculty and student coordinators.</li>
  <li>Confirm participating departments, student numbers, and priorities.</li>
  <li>Finalize the scope, commercial terms, and activity schedule.</li>
  <li>Conduct an orientation and begin student onboarding.</li>
  <li>Review participation and project progress with the designated faculty coordinator.</li>
</ol>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Commercial Terms</h3>
<p>The Campus Pass is currently listed at <strong>₹1,500 + GST per year</strong>. Institutional pricing and any additional activity charges will be confirmed through a separate quotation based on the agreed scope.</p>

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Next Steps</h3>
<p>We would welcome a meeting with your team to understand your requirements and present Shortfundly Campus. Kindly share a convenient time and nominate a faculty coordinator to take the discussion forward.</p>

<div style="background-color:#f8fafc; border-left:4px solid #e11d48; padding:12px 16px; margin:20px 0; border-radius:4px;">
  <p style="margin:4px 0;"><strong>Contact:</strong> +91 93612 23155</p>
  <p style="margin:4px 0;"><strong>Explore Campus:</strong> <a href="https://campus.shortfundly.com/" target="_blank" style="color:#e11d48; text-decoration:none;">https://campus.shortfundly.com/</a></p>
  <p style="margin:4px 0;"><strong>Schedule a Meeting:</strong> <a href="https://calendly.com/shortfundly-meeting/30min" target="_blank" style="color:#e11d48; font-weight:600;">Book a discussion on Calendly &rarr;</a></p>
</div>

<p style="margin-top:24px;">Warm regards,<br />
<strong>{{sender_name}}</strong><br />
<span style="color:#64748b;">Product Manager | Shortfundly</span><br />
<span style="color:#64748b;">SM Smartygen Media Networks Private Limited</span></p>`,
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

<h3 style="color:#0f172a; margin-top:20px; margin-bottom:8px; font-size:16px;">Benefits for {{college_name}}</h3>
<ul style="padding-left:20px; line-height:1.6;">
  <li>Free festival submissions and creator credentials for nominated students.</li>
  <li>Industry webinars hosted by acclaimed filmmakers and OTT curators.</li>
  <li>Annual excellence certificates for active student leads.</li>
</ul>

<p>We look forward to connecting with your department to nominate student leads.</p>

<div style="background-color:#f8fafc; border-left:4px solid #e11d48; padding:12px 16px; margin:20px 0; border-radius:4px;">
  <p style="margin:4px 0;"><strong>Contact:</strong> +91 93612 23155</p>
  <p style="margin:4px 0;"><strong>Explore Campus:</strong> <a href="https://campus.shortfundly.com/" target="_blank" style="color:#e11d48; text-decoration:none;">https://campus.shortfundly.com/</a></p>
  <p style="margin:4px 0;"><strong>Schedule a Call:</strong> <a href="https://calendly.com/shortfundly-meeting/30min" target="_blank" style="color:#e11d48; font-weight:600;">Book a 15-min briefing &rarr;</a></p>
</div>

<p>Warm regards,<br />
<strong>{{sender_name}}</strong><br />
<span style="color:#64748b;">Product Manager | Shortfundly</span></p>`,
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
 * Wraps body in Shortfundly responsive HTML email template
 */
export function wrapInEmailLayout(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortfundly Campus Collaboration</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px; background-color:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header with Shortfundly Brand Bar -->
          <tr>
            <td style="background-color:#020617; padding:24px 32px; border-bottom:3px solid #e11d48;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.5px;">SHORTFUNDLY</span>
                    <span style="color:#e11d48; font-size:22px; font-weight:800;">.</span>
                    <div style="color:#94a3b8; font-size:12px; margin-top:2px; font-weight:500; letter-spacing:0.5px; text-transform:uppercase;">Campus Outreach Portal</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block; background-color:rgba(225,29,72,0.15); color:#fda4af; font-size:11px; font-weight:600; padding:4px 10px; border-radius:12px; border:1px solid rgba(225,29,72,0.3);">
                      OFFICIAL PROPOSAL
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content -->
          <tr>
            <td style="padding:32px; font-size:15px; line-height:1.65; color:#1e293b;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:24px 32px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#475569; font-weight:700;">
                Shortfundly Campus &bull; SM Smartygen Media Networks Private Limited
              </p>
              <p style="margin:0 0 8px 0; font-size:11px; color:#64748b;">
                Chennai, Tamil Nadu, India | <a href="https://www.shortfundly.com" target="_blank" style="color:#e11d48; text-decoration:none;">www.shortfundly.com</a> | <a href="https://campus.shortfundly.com" target="_blank" style="color:#e11d48; text-decoration:none;">campus.shortfundly.com</a>
              </p>
              <p style="margin:10px 0 0 0; font-size:11px; color:#94a3b8; line-height:1.5;">
                This institutional outreach was sent to your university/college department to discuss creator initiatives and academic collaboration. If you prefer not to receive future communications, simply reply with &ldquo;Unsubscribe&rdquo; or email <a href="mailto:campus@shortfundly.com" style="color:#64748b; text-decoration:underline;">campus@shortfundly.com</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
