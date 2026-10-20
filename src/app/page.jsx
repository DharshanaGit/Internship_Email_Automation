import React from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/auth.js';
import styles from './landing.module.css';
import {
  MailIcon,
  SendIcon,
  BuildingIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  TemplateIcon,
  DashboardIcon,
  ServerIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  ShortfundlyLogoSymbol,
} from '@/components/Icons.jsx';

export const metadata = {
  title: 'Shortfundly Campus Outreach Portal | Automated College Emailing',
  description:
    'Internal email automation platform for the Shortfundly team to dispatch verified outreach to Principals, TPOs, HODs, Deans, and college faculty with safe batching.',
};

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className={styles.landingWrapper}>
      {/* ==================== NAVBAR ==================== */}
      <header className={styles.navbar}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <Link href="/" className={styles.brandLink}>
            <ShortfundlyLogoSymbol size={42} className={styles.brandSymbol} />
            <div className={styles.brandDetails}>
              <span className={styles.brandName}>Shortfundly</span>
              <span className={styles.brandTagline}>Campus Outreach</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#overview" className={styles.navLink}>Overview</a>
            <a href="#stakeholders" className={styles.navLink}>Target Stakeholders</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#why-platform" className={styles.navLink}>Why Use It</a>
          </nav>

          <div className={styles.navActions}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.dashboardBtn}>
                <DashboardIcon size={16} />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginBtn}>
                <UserIcon size={16} />
                <span>Login to Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section id="overview" className={styles.heroSection}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot}></span>
            <span>Internal Company Tool • Automated College Emailing</span>
          </div>

          <h1 className={styles.heroHeadline}>
            Automate College Outreach to <br />
            <span className={styles.heroHighlight}>Principals, Deans &amp; HODs.</span>
          </h1>

          <p className={styles.heroSubtext}>
            The dedicated email automation platform for Shortfundly teams. Connect with over 2,500+ colleges
            statewide—pitching official institutional MOUs to Principals, internships to Placement Heads (TPO),
            and departmental workshops to HODs with rate-limited safe batches and zero deliverability risk.
          </p>

          <div className={styles.heroCtaRow}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.primaryCta}>
                <span>Open Campaign Dashboard</span>
                <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <Link href="/login" className={styles.primaryCta}>
                <span>Sign In to Outreach Portal</span>
                <ArrowRightIcon size={18} />
              </Link>
            )}
            <a href="#how-it-works" className={styles.secondaryCta}>
              <span>Explore How It Works</span>
            </a>
          </div>

          {/* Quick Stakeholder Coverage Badges */}
          <div className={styles.stakeholderPillsTitle}>
            Built specifically to automate communication with key college decision-makers:
          </div>
          <div className={styles.stakeholderPillsRow}>
            <div className={styles.stakeholderPill}>
              <span>🏛️ Principals &amp; Directors</span>
              <span className={styles.pillBadge}>MOU Approvals</span>
            </div>
            <div className={styles.stakeholderPill}>
              <span>💼 Placement Officers (TPO)</span>
              <span className={styles.pillBadge}>Internships &amp; Drives</span>
            </div>
            <div className={styles.stakeholderPill}>
              <span>🎓 Deans of Student Welfare</span>
              <span className={styles.pillBadge}>Campus Events</span>
            </div>
            <div className={styles.stakeholderPill}>
              <span>🔬 Heads of Department (HOD)</span>
              <span className={styles.pillBadge}>Branch Seminars</span>
            </div>
            <div className={styles.stakeholderPill}>
              <span>🤝 Faculty Coordinators &amp; Staff</span>
              <span className={styles.pillBadge}>Event Execution</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== LIVE DASHBOARD PREVIEW MOCKUP ==================== */}
      <section className={styles.mockupSection}>
        <div className={`${styles.container} ${styles.mockupContainer}`}>
          <div className={styles.mockupCard}>
            {/* Window Title Bar */}
            <div className={styles.mockupWindowBar}>
              <div className={styles.windowControls}>
                <span className={`${styles.windowDot} ${styles.windowDotRed}`}></span>
                <span className={`${styles.windowDot} ${styles.windowDotYellow}`}></span>
                <span className={`${styles.windowDot} ${styles.windowDotGreen}`}></span>
              </div>
              <span className={styles.windowTitle}>
                Shortfundly Campus Outreach Engine • Live Batch Dispatcher
              </span>
              <div className={styles.windowBadge}>
                <span className={styles.heroBadgeDot} style={{ width: '6px', height: '6px', background: '#059669' }}></span>
                <span>Google SMTP 465 Connected</span>
              </div>
            </div>

            {/* Mockup Body */}
            <div className={styles.mockupBody}>
              {/* Filter Toolbar */}
              <div className={styles.mockupFilterBar}>
                <div className={styles.mockupRoleTabs}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Target Role:</span>
                  <button type="button" className={`${styles.mockupTab} ${styles.mockupTabActive}`}>All Roles (2,501)</button>
                  <button type="button" className={styles.mockupTab}>Principals (1,480)</button>
                  <button type="button" className={styles.mockupTab}>TPOs (70)</button>
                  <button type="button" className={styles.mockupTab}>HODs (120)</button>
                  <button type="button" className={styles.mockupTab}>Deans (200)</button>
                </div>

                <div className={styles.mockupBatchStats}>
                  <span className={styles.batchBadge}>Safe Batch 1 of 5 (50 Colleges)</span>
                  <span className={styles.coolingIndicator}>
                    <ClockIcon size={13} />
                    <span>10s Anti-Spam Cooling</span>
                  </span>
                </div>
              </div>

              {/* Table Preview */}
              <table className={styles.mockupTable}>
                <thead>
                  <tr>
                    <th>Institution Name</th>
                    <th>Target Stakeholder</th>
                    <th>Verified Inbox</th>
                    <th>Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className={styles.mockupCollegeName}>Andhra University College of Engineering</span>
                      <span className={styles.mockupCollegeLoc}>Visakhapatnam • State University</span>
                    </td>
                    <td>
                      <span className={`${styles.roleTag} ${styles.roleTagPrincipal}`}>Principal / Director</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>principal@andhrauniversity.edu.in</td>
                    <td>
                      <span className={styles.statusPillReady}>
                        <CheckCircleIcon size={14} />
                        <span>Ready to Send</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className={styles.mockupCollegeName}>JNTU College of Engineering, Kakinada</span>
                      <span className={styles.mockupCollegeLoc}>Kakinada • Premier Autonomous Tech</span>
                    </td>
                    <td>
                      <span className={`${styles.roleTag} ${styles.roleTagTpo}`}>TPO / Placement Head</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>tpo@jntuk.edu.in</td>
                    <td>
                      <span className={styles.statusPillReady}>
                        <CheckCircleIcon size={14} />
                        <span>Ready to Send</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className={styles.mockupCollegeName}>Acharya Nagarjuna University</span>
                      <span className={styles.mockupCollegeLoc}>Guntur • Department of Computer Science</span>
                    </td>
                    <td>
                      <span className={`${styles.roleTag} ${styles.roleTagHod}`}>HOD (Computer Science)</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>hod.cse@anu.ac.in</td>
                    <td>
                      <span className={styles.statusPillReady}>
                        <CheckCircleIcon size={14} />
                        <span>Ready to Send</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className={styles.mockupCollegeName}>Sri Venkateswara University</span>
                      <span className={styles.mockupCollegeLoc}>Tirupati • Student Affairs Directorate</span>
                    </td>
                    <td>
                      <span className={`${styles.roleTag} ${styles.roleTagDean}`}>Dean (Student Welfare)</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>dean.sw@svuniversity.edu.in</td>
                    <td>
                      <span className={styles.statusPillCooldown}>
                        <ClockIcon size={14} />
                        <span>In 30-Day Cooldown (Protected)</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: TARGET STAKEHOLDERS ==================== */}
      <section id="stakeholders" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Stakeholder Targeting Guide</span>
            <h2 className={styles.sectionTitle}>Whom Can Company Teams Contact?</h2>
            <p className={styles.sectionSubtitle}>
              Every college role has a distinct objective and permission authority.
              The portal organizes verified contacts by these exact leadership tiers:
            </p>
          </div>

          <div className={styles.stakeholderGrid}>
            {/* Stakeholder 1: Principals */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><BuildingIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>Principals &amp; Directors</h3>
                  <span className={styles.stakeholderObjective}>Official MOUs &amp; Approvals</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                The highest administrative authority for colleges. Contact them when pitching official institutional
                partnerships, Campus Pass institutional subscriptions, and top-level executive approvals.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>Official College MOUs &amp; Approvals</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>principal@..., director@...</span>
                </div>
              </div>
            </div>

            {/* Stakeholder 2: TPOs */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><UserIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>Placement Officers (TPO)</h3>
                  <span className={styles.stakeholderObjective}>Internships &amp; Career Pass</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                The #1 highest response rate. TPOs actively look for corporate internships, student skill projects,
                creator opportunities, and career training. Every college has a dedicated placement officer.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>Internships, Hiring &amp; Creator Pass</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>tpo@..., placement@..., placements@...</span>
                </div>
              </div>
            </div>

            {/* Stakeholder 3: Deans of Student Welfare */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><SparklesIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>Deans of Student Affairs</h3>
                  <span className={styles.stakeholderObjective}>Events, Posters &amp; Clubs</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                Controls all campus extracurricular activities, student clubs, auditoriums, and event sponsorship.
                Contact them to put up campus festival posters, host filmmaking webinars, and sponsor student fests.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>Seminars, Festival Tie-ups, Posters</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>dean.sw@..., studentwelfare@...</span>
                </div>
              </div>
            </div>

            {/* Stakeholder 4: HODs */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><MailIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>Heads of Department (HOD)</h3>
                  <span className={styles.stakeholderObjective}>Department Workshops</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                Directly controls students in specific departments (CSE, IT, ECE, Media, Visual Arts, MBA).
                Target HODs directly when pitching technical workshops, hackathons, or branch-specific programs.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>Department Specific Programs</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>hod.cse@..., hod.media@...</span>
                </div>
              </div>
            </div>

            {/* Stakeholder 5: Placement Coordinators & Staff */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><UserIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>Faculty Coordinators &amp; Staff</h3>
                  <span className={styles.stakeholderObjective}>Execution &amp; Follow-up</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                Works directly under TPOs and HODs to manage day-to-day student communications, classroom announcements,
                and session scheduling. Crucial for operational follow-ups and student attendance.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>Day-to-day Workshop Execution</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>coordinator@..., faculty.placement@...</span>
                </div>
              </div>
            </div>

            {/* Stakeholder 6: University Registrars */}
            <div className={styles.stakeholderCard}>
              <div className={styles.stakeholderHeader}>
                <div className={styles.stakeholderIconBox}><ServerIcon size={22} /></div>
                <div>
                  <h3 className={styles.stakeholderRoleTitle}>University Registrars</h3>
                  <span className={styles.stakeholderObjective}>University-Wide Collaborations</span>
                </div>
              </div>
              <p className={styles.stakeholderDesc}>
                Heads administrative operations and official circulars for entire universities controlling 100+
                affiliated colleges. Essential for state-level university collaborations and official circular releases.
              </p>
              <div className={styles.stakeholderDetails}>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Target For:</span>
                  <span>University-Wide Collaborations</span>
                </div>
                <div className={detailRowClass(styles)}>
                  <span className={styles.detailLabel}>Email Pattern:</span>
                  <span className={styles.detailValue}>registrar@..., admin@...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: HOW IT WORKS ==================== */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Simple 4-Step Process</span>
            <h2 className={styles.sectionTitle}>How Company Teams Use the System</h2>
            <p className={styles.sectionSubtitle}>
              From contact selection to automated delivery and cooldown tracking in 4 easy steps:
            </p>
          </div>

          <div className={styles.workflowGrid}>
            {/* Step 1 */}
            <div className={styles.workflowStepCard}>
              <div className={styles.stepHeaderRow}>
                <span className={styles.stepBadgePill}>STEP 01</span>
                <BuildingIcon size={20} className={styles.stepIconWrap} />
              </div>
              <h3 className={styles.stepCardTitle}>Filter Verified Directory</h3>
              <p className={styles.stepCardDesc}>
                Select from 2,500+ verified institutions across Andhra Pradesh or upload a custom CSV/Excel roster.
                Filter by District, University Affiliation, and Target Role (Principal, TPO, HOD, Dean).
              </p>
              <div className={styles.stepCardFooter}>
                <span className={styles.stepPill}>Instant Pre-Flight Deduplication</span>
                <span className={styles.stepPill}>Automatic Cooldown Detection</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.workflowStepCard}>
              <div className={styles.stepHeaderRow}>
                <span className={styles.stepBadgePill}>STEP 02</span>
                <TemplateIcon size={20} className={styles.stepIconWrap} />
              </div>
              <h3 className={styles.stepCardTitle}>Pick or Craft Template</h3>
              <p className={styles.stepCardDesc}>
                Select an approved partnership proposal template. Dynamic tokens like <code>[College Name]</code>,{' '}
                <code>[Contact Person]</code>, and <code>[City / District]</code> are merged automatically for every recipient.
              </p>
              <div className={styles.stepCardFooter}>
                <span className={styles.stepPill}>Dynamic Salutations (Dear Principal, ...)</span>
                <span className={styles.stepPill}>Live Email Merging Preview</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={styles.workflowStepCard}>
              <div className={styles.stepHeaderRow}>
                <span className={styles.stepBadgePill}>STEP 03</span>
                <SendIcon size={20} className={styles.stepIconWrap} />
              </div>
              <h3 className={styles.stepCardTitle}>Dispatch in Safe Batches</h3>
              <p className={styles.stepCardDesc}>
                Choose between single 1-by-1 manual send or the <strong>Auto-Separated Safe Batch Engine</strong>.
                Splits lists into safe 50-contact chunks with 10s cooling pauses and 300ms polite socket jitter.
              </p>
              <div className={styles.stepCardFooter}>
                <span className={styles.stepPill}>50-Recipient Safe Chunking</span>
                <span className={styles.stepPill}>Configurable Inter-Batch Cooling</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className={styles.workflowStepCard}>
              <div className={styles.stepHeaderRow}>
                <span className={styles.stepBadgePill}>STEP 04</span>
                <CheckCircleIcon size={20} className={styles.stepIconWrap} />
              </div>
              <h3 className={styles.stepCardTitle}>Track &amp; Maintain Safety</h3>
              <p className={styles.stepCardDesc}>
                View live Accepted / Failed delivery badges in real time. The database automatically logs the dispatch
                and activates a <strong>30-day anti-spam cooldown</strong> to prevent team members from double-emailing.
              </p>
              <div className={styles.stepCardFooter}>
                <span className={styles.stepPill}>Live SMTP Server Response Codes</span>
                <span className={styles.stepPill}>Automated 30-Day Cooldown Protection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: WHY USE THIS PLATFORM ==================== */}
      <section id="why-platform" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Corporate Benefits</span>
            <h2 className={styles.sectionTitle}>Why Company Teams Love This System</h2>
            <p className={styles.sectionSubtitle}>
              Engineered to replace manual email fatigue with enterprise-grade deliverability:
            </p>
          </div>

          <div className={styles.whyUseGrid}>
            <div className={styles.whyUseCard}>
              <div className={styles.whyUseIcon}><ShieldCheckIcon size={24} /></div>
              <h3 className={styles.whyUseTitle}>Zero Domain Ban Risk</h3>
              <p className={styles.whyUseDesc}>
                Sending 500 emails at once from Gmail gets your company account blocked. Our engine sends
                isolated emails with polite socket jitter and inter-batch cooling so Google SMTP never flags your domain.
              </p>
            </div>

            <div className={styles.whyUseCard}>
              <div className={styles.whyUseIcon}><ClockIcon size={24} /></div>
              <h3 className={styles.whyUseTitle}>No Duplicate Emails</h3>
              <p className={styles.whyUseDesc}>
                When multiple team members work on outreach, colleges get spammed. Our central database
                enforces a strict 30-day blackout per college across all users.
              </p>
            </div>

            <div className={styles.whyUseCard}>
              <div className={styles.whyUseIcon}><SparklesIcon size={24} /></div>
              <h3 className={styles.whyUseTitle}>Saves 10+ Hours Weekly</h3>
              <p className={styles.whyUseDesc}>
                No more manually searching for college emails, copying names, and writing individual emails.
                Filter your target audience, pick a template, and dispatch in minutes.
              </p>
            </div>

            <div className={styles.whyUseCard}>
              <div className={styles.whyUseIcon}><ServerIcon size={24} /></div>
              <h3 className={styles.whyUseTitle}>Full Delivery Transparency</h3>
              <p className={styles.whyUseDesc}>
                Know with 100% certainty if an email reached the institution&apos;s server. Inspect SMTP handshakes,
                diagnose errors, and retry failed recipients with a single click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaCard}`}>
          <h2 className={styles.ctaHeadline}>Ready to Launch Your Next Campus Campaign?</h2>
          <p className={styles.ctaText}>
            Sign in with your authorized Shortfundly company credentials to access verified college directories,
            manage customizable outreach templates, and dispatch high-deliverability campaigns.
          </p>

          <div className={styles.ctaBtnGroup}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.primaryCta}>
                <span>Go to Campaign Dashboard</span>
                <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <Link href="/login" className={styles.primaryCta}>
                <span>Sign In to Outreach Portal</span>
                <ArrowRightIcon size={18} />
              </Link>
            )}
          </div>

          <div className={styles.ctaNotice}>
            <ShieldCheckIcon size={14} />
            <span>Restricted to authorized Shortfundly personnel. Cryptographic CAPTCHA &amp; bcrypt security active.</span>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerContent}`}>
          <div className={styles.footerBrandArea}>
            <ShortfundlyLogoSymbol size={36} className={styles.footerSymbol} />
            <div className={styles.footerBrandText}>
              <span className={styles.footerTitle}>Shortfundly</span>
              <span className={styles.footerSubtitle}>Campus Outreach</span>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <a href="#overview" className={styles.footerLink}>Overview</a>
            <a href="#stakeholders" className={styles.footerLink}>Target Stakeholders</a>
            <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
            <a href="#why-platform" className={styles.footerLink}>Why Use It</a>
            <Link href="/login" className={styles.footerLink}>Login to Portal</Link>
          </div>
        </div>

        <div className={`${styles.container} ${styles.footerBottom}`}>
          <div>
            &copy; {new Date().getFullYear()} Shortfundly Inc. Internal Campus Outreach Automation Platform.
          </div>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDotGreen}></span>
            <span>All Outreach Engine Sockets Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function detailRowClass(styles) {
  return styles.detailRow;
}
