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
  ArrowRightIcon,
  ShortfundlyLogoSymbol,
  SparklesIcon,
} from '@/components/Icons.jsx';

export const metadata = {
  title: 'Shortfundly Campus Outreach Portal | Simplify College Outreach with Email Automation',
  description:
    'Dedicated platform for company teams to manage verified college contacts, craft personalized campaign templates, and dispatch high-deliverability email outreach.',
};

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className={styles.landingWrapper}>
      {/* ==================== 1. NAVBAR ==================== */}
      <header className={styles.navbar}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <Link href="/" className={styles.brandLink}>
            <ShortfundlyLogoSymbol size={40} className={styles.brandSymbol} />
            <div className={styles.brandDetails}>
              <span className={styles.brandName}>Shortfundly</span>
              <span className={styles.brandTagline}>Campus Outreach</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#about" className={styles.navLink}>About</a>
            <a href="#features" className={styles.navLink}>Key Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#who-is-it-for" className={styles.navLink}>Who Is It For?</a>
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
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==================== 2. HERO SECTION ==================== */}
      <section className={styles.heroSection}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot}></span>
            <span>Enterprise Campus Outreach Platform</span>
          </div>

          <h1 className={styles.heroHeadline}>
            Simplify College Outreach with <br />
            <span className={styles.heroHighlight}>Email Automation</span>
          </h1>

          <p className={styles.heroSubtext}>
            The dedicated platform for company teams to connect with colleges and universities.
            Manage verified institutional contacts, create personalized email templates, and execute
            safe bulk outreach with automated deliverability protection.
          </p>

          <div className={styles.heroCtaGroup}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.primaryCta}>
                <span>Access Outreach Dashboard</span>
                <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <Link href="/login" className={styles.primaryCta}>
                <span>Login to Portal</span>
                <ArrowRightIcon size={18} />
              </Link>
            )}
            <a href="#how-it-works" className={styles.secondaryCta}>
              <span>See How It Works</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className={styles.heroStatsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>2,500+</div>
              <div className={styles.statLabel}>Verified Colleges</div>
              <div className={styles.statDesc}>Clean statewide academic directory</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Duplicate Emails</div>
              <div className={styles.statDesc}>Pre-flight deduplication engine</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>30-Day</div>
              <div className={styles.statLabel}>Anti-Spam Cooldown</div>
              <div className={styles.statDesc}>Safeguards company domain reputation</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>100%</div>
              <div className={styles.statLabel}>Delivery Transparency</div>
              <div className={styles.statDesc}>Real-time Accepted &amp; Failed logs</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. ABOUT THE PORTAL ==================== */}
      <section id="about" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Portal Overview</span>
            <h2 className={styles.sectionTitle}>About the Portal</h2>
            <p className={styles.sectionSubtitle}>
              An internal communication system engineered to make collegiate outreach structured,
              reliable, and completely automated.
            </p>
          </div>

          <div className={styles.aboutGrid}>
            {/* What It Is */}
            <div className={styles.aboutCard}>
              <div className={styles.aboutIconBox}>
                <BuildingIcon size={24} />
              </div>
              <span className={styles.aboutCardTag}>What It Is</span>
              <h3 className={styles.aboutCardTitle}>Campus Outreach &amp; Automation Platform</h3>
              <p className={styles.aboutCardDesc}>
                A centralized, high-throughput email system built for Shortfundly to streamline institutional
                communications with colleges, autonomous institutions, and state universities nationwide.
              </p>
              <div className={styles.aboutCardPoints}>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Consolidates 2,500+ verified academic institutions in one place.</span>
                </div>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Connects directly to company Google Workspace SMTP gateways.</span>
                </div>
              </div>
            </div>

            {/* Why It Is Used */}
            <div className={styles.aboutCard}>
              <div className={styles.aboutIconBox}>
                <ShieldCheckIcon size={24} />
              </div>
              <span className={styles.aboutCardTag}>Why It Is Used</span>
              <h3 className={styles.aboutCardTitle}>Manage Contacts &amp; Simplify Outreach</h3>
              <p className={styles.aboutCardDesc}>
                Replaces scattered spreadsheets and error-prone manual emailing. Enforces a strict 30-day contact
                cooldown, automated deduplication, and socket rate limiting so your company emails never get flagged as spam.
              </p>
              <div className={styles.aboutCardPoints}>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Protects corporate email domain reputation with rate-limited batches.</span>
                </div>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Eliminates duplicate communications across internal team members.</span>
                </div>
              </div>
            </div>

            {/* How It Helps Company Employees */}
            <div className={styles.aboutCard}>
              <div className={styles.aboutIconBox}>
                <SparklesIcon size={24} />
              </div>
              <span className={styles.aboutCardTag}>How It Helps Employees</span>
              <h3 className={styles.aboutCardTitle}>Empower Company Teams</h3>
              <p className={styles.aboutCardDesc}>
                Saves outreach managers and coordinators 10+ hours every week. Employees can filter institutions by role,
                select pre-approved partnership templates, and dispatch campaigns in seconds with zero manual copy-pasting.
              </p>
              <div className={styles.aboutCardPoints}>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Instant variable merging with zero manual formatting mistakes.</span>
                </div>
                <div className={styles.aboutPointItem}>
                  <span className={styles.aboutPointBullet}></span>
                  <span>Real-time delivery status visibility with 1-click error retry.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 4. KEY FEATURES ==================== */}
      <section id="features" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Capabilities</span>
            <h2 className={styles.sectionTitle}>Key Features</h2>
            <p className={styles.sectionSubtitle}>
              Comprehensive tools designed to manage every stage of your college communication pipeline:
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <BuildingIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Contact Management</h3>
              <p className={styles.featureDesc}>
                Access a structured database of over 2,500+ verified colleges or upload custom CSV/Excel spreadsheets.
                Automatic pre-flight auditing eliminates duplicate rows and checks active 30-day cooldowns.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Clean Institutional Census</span>
                <span className={styles.featureTag}>District &amp; Stream Filters</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <TemplateIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Personalized Templates</h3>
              <p className={styles.featureDesc}>
                Create reusable proposal and invitation templates with smart merge tokens like <code>[College Name]</code>,{' '}
                <code>[Contact Person]</code>, and <code>[City / District]</code> that adapt automatically for each recipient.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Dynamic Salutations</span>
                <span className={styles.featureTag}>Live Preview Modal</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <SendIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Bulk Email Sending</h3>
              <p className={styles.featureDesc}>
                Dispatch emails to dozens or hundreds of institutions safely with the Auto-Separated Safe Batch Engine.
                Partitions recipients into 50-contact chunks with configurable cooling pauses and 300ms polite socket jitter.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Safe Batching Engine</span>
                <span className={styles.featureTag}>Anti-Spam Pacing</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <UserIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Targeted Outreach</h3>
              <p className={styles.featureDesc}>
                Directly segment and contact key decision-makers based on your initiative: Principals for institutional MOUs,
                Placement Heads (TPO) for internships, Deans for student events, and HODs for branch workshops.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Principals &amp; Directors</span>
                <span className={styles.featureTag}>TPOs, Deans &amp; HODs</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <CheckCircleIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Email Status Tracking</h3>
              <p className={styles.featureDesc}>
                Track the delivery lifecycle of every outreach email in real time. Inspect Accepted and Failed states,
                read exact SMTP server response codes, and retry failed recipients with a single click.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Live Accepted / Failed Logs</span>
                <span className={styles.featureTag}>1-Click Retry Function</span>
              </div>
            </div>

            {/* Feature 6 - Deliverability Assurance */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <ShieldCheckIcon size={22} />
              </div>
              <h3 className={styles.featureTitle}>Deliverability &amp; Safety</h3>
              <p className={styles.featureDesc}>
                Maintain enterprise-grade domain health with Google SMTP TLS/SSL encryption, cryptographic session authentication,
                and an automatic 30-day blackout window per college to prevent recipient fatigue.
              </p>
              <div className={styles.featureTags}>
                <span className={styles.featureTag}>Google SMTP 465 SSL</span>
                <span className={styles.featureTag}>30-Day Anti-Fatigue Rules</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 5. HOW IT WORKS ==================== */}
      <section id="how-it-works" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Step-by-Step Workflow</span>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <p className={styles.sectionSubtitle}>
              A clear, four-step operational process designed for speed, personalization, and deliverability safety:
            </p>
          </div>

          <div className={styles.howGrid}>
            {/* Step 1 */}
            <div className={styles.howStepCard}>
              <div className={styles.howStepHeader}>
                <span className={styles.howStepBadge}>STEP 01</span>
                <BuildingIcon size={20} className={styles.howStepIcon} />
              </div>
              <h3 className={styles.howStepTitle}>Manage Contacts</h3>
              <p className={styles.howStepDesc}>
                Load the verified directory of 2,500+ colleges or upload custom spreadsheets. Filter by district,
                stream, and target role while the pre-flight engine strips duplicates and identifies active cooldowns.
              </p>
              <div className={styles.howStepFooter}>
                <span className={styles.howPill}>Directory &amp; Custom CSV/Excel</span>
                <span className={styles.howPill}>Automated Duplicate Removal</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.howStepCard}>
              <div className={styles.howStepHeader}>
                <span className={styles.howStepBadge}>STEP 02</span>
                <TemplateIcon size={20} className={styles.howStepIcon} />
              </div>
              <h3 className={styles.howStepTitle}>Prepare Emails</h3>
              <p className={styles.howStepDesc}>
                Select an approved outreach proposal template. Dynamic tokens like <code>[College Name]</code>,{' '}
                <code>[Contact Person]</code>, and <code>[City / District]</code> populate automatically with live preview validation.
              </p>
              <div className={styles.howStepFooter}>
                <span className={styles.howPill}>Personalized Merge Tags</span>
                <span className={styles.howPill}>Pre-Approved Pitch Blueprints</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={styles.howStepCard}>
              <div className={styles.howStepHeader}>
                <span className={styles.howStepBadge}>STEP 03</span>
                <SendIcon size={20} className={styles.howStepIcon} />
              </div>
              <h3 className={styles.howStepTitle}>Send Campaigns</h3>
              <p className={styles.howStepDesc}>
                Dispatch single high-priority emails or execute bulk campaigns with the Auto-Separated Safe Batch Engine.
                Sends in 50-recipient chunks with polite socket delays and cooling intervals to protect domain reputation.
              </p>
              <div className={styles.howStepFooter}>
                <span className={styles.howPill}>50-Recipient Safe Batches</span>
                <span className={styles.howPill}>300ms Socket Rate Limiting</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className={styles.howStepCard}>
              <div className={styles.howStepHeader}>
                <span className={styles.howStepBadge}>STEP 04</span>
                <CheckCircleIcon size={20} className={styles.howStepIcon} />
              </div>
              <h3 className={styles.howStepTitle}>Track Status</h3>
              <p className={styles.howStepDesc}>
                Review live delivery outcomes in your campaign dashboard. Inspect real-time server response codes,
                retry temporary failures with 1 click, and enforce the automatic 30-day cooldown window.
              </p>
              <div className={styles.howStepFooter}>
                <span className={styles.howPill}>Real-Time Delivery Audits</span>
                <span className={styles.howPill}>Automated 30-Day Cooldown</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 6. WHO IS IT FOR? ==================== */}
      <section id="who-is-it-for" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Target Users</span>
            <h2 className={styles.sectionTitle}>Who Is It For?</h2>
            <p className={styles.sectionSubtitle}>
              Tailored specifically for internal Shortfundly teams managing academic outreach and institutional relationships:
            </p>
          </div>

          <div className={styles.whoGrid}>
            {/* Team 1: Campus Outreach */}
            <div className={styles.whoCard}>
              <div className={styles.whoIconBox}>
                <BuildingIcon size={22} />
              </div>
              <h3 className={styles.whoRoleTitle}>Campus Outreach Teams</h3>
              <p className={styles.whoDesc}>
                Coordinate academic collaborations, college festival sponsorships, filmmaking workshop tie-ups,
                and campus ambassador recruitment drives directly with college leadership.
              </p>
              <div className={styles.whoPoints}>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Campus Festival Partnerships</span>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Student Ambassador Drives</span>
              </div>
            </div>

            {/* Team 2: Partnership Teams */}
            <div className={styles.whoCard}>
              <div className={styles.whoIconBox}>
                <ShieldCheckIcon size={22} />
              </div>
              <h3 className={styles.whoRoleTitle}>Partnership Teams</h3>
              <p className={styles.whoDesc}>
                Establish long-term institutional Memorandums of Understanding (MOUs), campus creator passes,
                and multi-college alliances directly with University Registrars, Vice-Chancellors, and Principals.
              </p>
              <div className={styles.whoPoints}>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Institutional MOU Formalization</span>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Executive-Level Approvals</span>
              </div>
            </div>

            {/* Team 3: Business Development */}
            <div className={styles.whoCard}>
              <div className={styles.whoIconBox}>
                <SendIcon size={22} />
              </div>
              <h3 className={styles.whoRoleTitle}>Business Development Teams</h3>
              <p className={styles.whoDesc}>
                Expand Shortfundly&apos;s footprint across higher education networks. Target specific academic streams
                and geographic clusters to identify and scale new institutional partnership opportunities.
              </p>
              <div className={styles.whoPoints}>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Statewide College Expansion</span>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Institutional Pipeline Growth</span>
              </div>
            </div>

            {/* Team 4: Internship & Recruitment */}
            <div className={styles.whoCard}>
              <div className={styles.whoIconBox}>
                <UserIcon size={22} />
              </div>
              <h3 className={styles.whoRoleTitle}>Internship Teams</h3>
              <p className={styles.whoDesc}>
                Engage directly with Training &amp; Placement Officers (TPOs) and career cells to announce creator
                fellowships, media internships, skill-building workshops, and campus hiring initiatives.
              </p>
              <div className={styles.whoPoints}>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Direct TPO Communications</span>
                <span className={styles.whoPoint}><span className={styles.whoPointDot}></span>Internship &amp; Fellowship Drives</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 7. FINAL CTA ==================== */}
      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaCard}`}>
          <h2 className={styles.ctaHeadline}>Ready to Simplify Your College Outreach?</h2>
          <p className={styles.ctaText}>
            Sign in with your authorized Shortfundly company account to access verified institutional directories,
            manage customizable outreach templates, and launch safe, automated email campaigns.
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

          <div className={styles.ctaSecurityNote}>
            <ShieldCheckIcon size={14} />
            <span>Restricted to authorized Shortfundly personnel. Cryptographic CAPTCHA &amp; session security active.</span>
          </div>
        </div>
      </section>

      {/* ==================== 8. FOOTER ==================== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerContent}`}>
          <div className={styles.footerBrandArea}>
            <ShortfundlyLogoSymbol size={32} className={styles.footerSymbol} />
            <div className={styles.footerBrandText}>
              <span className={styles.footerTitle}>Shortfundly</span>
              <span className={styles.footerSubtitle}>Campus Outreach</span>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <a href="#about" className={styles.footerLink}>About</a>
            <a href="#features" className={styles.footerLink}>Key Features</a>
            <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
            <a href="#who-is-it-for" className={styles.footerLink}>Who Is It For?</a>
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
