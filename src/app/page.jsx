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
} from '@/components/Icons.jsx';

export const metadata = {
  title: 'Shortfundly Campus Outreach Portal | Email Automation & College Directory',
  description:
    'Enterprise campus outreach and email automation platform to manage verified college contacts, craft personalized campaign templates, and dispatch high-deliverability outreach.',
};

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className={styles.landingWrapper}>
      {/* ==================== STICKY NAVIGATION BAR ==================== */}
      <header className={styles.navbar}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <Link href="/" className={styles.brand}>
            <img
              src="/sf_logo.svg"
              alt="Shortfundly Logo"
              className={styles.brandLogo}
            />
            <div className={styles.brandDivider}></div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Shortfundly</span>
              <span className={styles.brandBadge}>Campus Outreach</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#what-it-is" className={styles.navLink}>What It Is</a>
            <a href="#why-use-it" className={styles.navLink}>Why It Matters</a>
            <a href="#who-it-is-for" className={styles.navLink}>Who It&apos;s For</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
          </nav>

          <div className={styles.navActions}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.dashboardNavBtn}>
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
      <section className={styles.heroSection}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <div className={styles.heroTag}>
            <span className={styles.heroTagPulse}></span>
            <span>Campus Outreach &amp; Email Automation Platform</span>
          </div>

          <h1 className={styles.heroHeadline}>
            Connect with Campuses. <br />
            <span className={styles.headlineHighlight}>Automate Your Outreach.</span>
          </h1>

          <p className={styles.heroSubtext}>
            The dedicated email automation platform engineered for academic partnerships.
            Manage verified college contacts, craft dynamic templates, and dispatch
            safe, rate-limited campaigns with zero deliverability stress.
          </p>

          <div className={styles.heroCtaGroup}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.primaryCtaBtn}>
                <span>Open Campaign Dashboard</span>
                <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <Link href="/login" className={styles.primaryCtaBtn}>
                <span>Sign In to Outreach Portal</span>
                <ArrowRightIcon size={18} />
              </Link>
            )}
            <a href="#how-it-works" className={styles.secondaryCtaBtn}>
              <span>Explore How It Works</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className={styles.heroStatsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>2,500+</div>
              <div className={styles.statLabel}>Verified Institutions</div>
              <div className={styles.statDesc}>Clean statewide academic directory</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Duplicate Contacts</div>
              <div className={styles.statDesc}>Pre-flight deduplication engine</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>30-Day</div>
              <div className={styles.statLabel}>Anti-Spam Cooldown</div>
              <div className={styles.statDesc}>Protects sender domain reputation</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>100%</div>
              <div className={styles.statLabel}>Isolated SMTP Sockets</div>
              <div className={styles.statDesc}>Safe batches with polite jitter</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 1: WHAT IT IS ==================== */}
      <section id="what-it-is" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Platform Purpose</span>
            <h2 className={styles.sectionTitle}>What is the Shortfundly Outreach Portal?</h2>
            <p className={styles.sectionSubtitle}>
              A specialized communication hub built to bridge the gap between creative tech programs
              and higher education institutions.
            </p>
          </div>

          <div className={styles.whatGrid}>
            <div className={styles.whatTextCard}>
              <p className={styles.whatLeadingParagraph}>
                The <strong>Shortfundly Campus Outreach Portal</strong> is a comprehensive email automation
                workspace designed specifically to coordinate educational partnerships, creator workshops,
                student festival invitations, and campus ambassador drives across hundreds of colleges and universities.
              </p>

              <div className={styles.whatFeaturesList}>
                <div className={styles.whatFeatureItem}>
                  <div className={styles.whatFeatureIcon}><CheckIcon size={14} /></div>
                  <div className={styles.whatFeatureText}>
                    <strong>Verified Institutional Census:</strong> Eliminates fake emails and generic catch-alls with verified inboxes directly mapped to Principals, Directors, TPOs, and Department Heads.
                  </div>
                </div>

                <div className={styles.whatFeatureItem}>
                  <div className={styles.whatFeatureIcon}><CheckIcon size={14} /></div>
                  <div className={styles.whatFeatureText}>
                    <strong>Unified Outreach Workspace:</strong> Combines contact registry management, dynamic variable personalization, sequential SMTP dispatch, and audit logging into one streamlined interface.
                  </div>
                </div>

                <div className={styles.whatFeatureItem}>
                  <div className={styles.whatFeatureIcon}><CheckIcon size={14} /></div>
                  <div className={styles.whatFeatureText}>
                    <strong>Reputation-Safe Delivery:</strong> Implements safe batching, anti-spam cooling periods, and per-email socket delays to ensure emails land directly in university inboxes, not spam filters.
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.whatVisualCard}>
              <div className={styles.whatVisualHeader}>
                <div className={styles.whatVisualTitle}>
                  <ServerIcon size={16} />
                  <span>Integrated Platform Architecture</span>
                </div>
                <div className={styles.liveIndicator}>
                  <span className={styles.liveDot}></span>
                  <span>Active Gateway</span>
                </div>
              </div>

              <div className={styles.whatStackList}>
                <div className={styles.whatStackItem}>
                  <div className={styles.whatStackItemLabel}>
                    <BuildingIcon size={16} />
                    <span>Statewide Institutional Database</span>
                  </div>
                  <span className={styles.whatStackItemTag}>2,501 Colleges</span>
                </div>

                <div className={styles.whatStackItem}>
                  <div className={styles.whatStackItemLabel}>
                    <TemplateIcon size={16} />
                    <span>Dynamic Personalization Engine</span>
                  </div>
                  <span className={styles.whatStackItemTag}>Token Merging</span>
                </div>

                <div className={styles.whatStackItem}>
                  <div className={styles.whatStackItemLabel}>
                    <ClockIcon size={16} />
                    <span>Auto-Separate Safe Batch Engine</span>
                  </div>
                  <span className={styles.whatStackItemTag}>Cooling Timer</span>
                </div>

                <div className={styles.whatStackItem}>
                  <div className={styles.whatStackItemLabel}>
                    <ShieldCheckIcon size={16} />
                    <span>Google Workspace SMTP Gateway</span>
                  </div>
                  <span className={styles.whatStackItemTag}>SSL / Port 465</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 2: WHY IT IS USED ==================== */}
      <section id="why-use-it" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Core Value &amp; Purpose</span>
            <h2 className={styles.sectionTitle}>Why Use This Platform?</h2>
            <p className={styles.sectionSubtitle}>
              Manual campus emailing is slow, prone to errors, and puts domain reputation at risk.
              Here is how the portal solves these challenges:
            </p>
          </div>

          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyIconBox}>
                <BuildingIcon size={24} />
              </div>
              <h3 className={styles.whyTitle}>Centralize College Intelligence</h3>
              <p className={styles.whyDesc}>
                Replace disorganized, outdated spreadsheets with a structured repository of verified
                academic contacts, categorized by state, district, university affiliation, and decision-maker tier.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIconBox}>
                <SendIcon size={24} />
              </div>
              <h3 className={styles.whyTitle}>Eliminate Manual Outreach Overhead</h3>
              <p className={styles.whyDesc}>
                Drafting individual emails by hand wastes dozens of hours. The platform automates mass
                personalized dispatches with 1-click batch navigation and real-time email previews.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIconBox}>
                <ShieldCheckIcon size={24} />
              </div>
              <h3 className={styles.whyTitle}>Protect Sender Reputation</h3>
              <p className={styles.whyDesc}>
                Automated 30-day contact cooldown prevents accidental double-emailing. Polite 300ms socket
                jitter and inter-batch cooling protect your Google Workspace from spam flags.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIconBox}>
                <SparklesIcon size={24} />
              </div>
              <h3 className={styles.whyTitle}>Contextual Dynamic Personalization</h3>
              <p className={styles.whyDesc}>
                Every email adapts on the fly—automatically inserting college name, contact salutation,
                district, and tailored partnership terms to maximize institutional response rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: WHO IT IS FOR ==================== */}
      <section id="who-it-is-for" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Target Audience</span>
            <h2 className={styles.sectionTitle}>Who Is It Built For?</h2>
            <p className={styles.sectionSubtitle}>
              Tailored for administrative leaders and campus relations teams coordinating
              high-impact educational collaborations.
            </p>
          </div>

          <div className={styles.whoGrid}>
            <div className={styles.whoCard}>
              <div className={styles.whoHeader}>
                <div className={styles.whoIconBox}><ServerIcon size={20} /></div>
                <h3 className={styles.whoRole}>Portal Administrators</h3>
              </div>
              <p className={styles.whoDesc}>
                Oversee the complete email ecosystem. Manage Google SMTP gateways, run real-time
                connectivity diagnostics, audit security access logs, and govern institutional master datasets.
              </p>
              <div className={styles.whoTargetList}>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>SMTP Health &amp; Credentials</span>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Access Control &amp; RBAC</span>
              </div>
            </div>

            <div className={styles.whoCard}>
              <div className={styles.whoHeader}>
                <div className={styles.whoIconBox}><BuildingIcon size={20} /></div>
                <h3 className={styles.whoRole}>Campus Partnership Teams</h3>
              </div>
              <p className={styles.whoDesc}>
                Initiate high-level institutional MOUs, creator pass distributions, and campus festival
                tie-ups directly with University Registrars, Vice-Chancellors, and College Principals.
              </p>
              <div className={styles.whoTargetList}>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Official Collaboration MOUs</span>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Institutional Permissions</span>
              </div>
            </div>

            <div className={styles.whoCard}>
              <div className={styles.whoHeader}>
                <div className={styles.whoIconBox}><UserIcon size={20} /></div>
                <h3 className={styles.whoRole}>Placement &amp; TPO Officers</h3>
              </div>
              <p className={styles.whoDesc}>
                Connect directly with Training &amp; Placement Officers (TPOs) to pitch internships,
                student skill-building programs, industry projects, and corporate recruitment opportunities.
              </p>
              <div className={styles.whoTargetList}>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Direct TPO Communications</span>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Career &amp; Internship Drives</span>
              </div>
            </div>

            <div className={styles.whoCard}>
              <div className={styles.whoHeader}>
                <div className={styles.whoIconBox}><MailIcon size={20} /></div>
                <h3 className={styles.whoRole}>Department Liaisons</h3>
              </div>
              <p className={styles.whoDesc}>
                Reach specific academic heads (CSE, Media, Visual Arts, IT, Commerce) and Deans of Student
                Welfare for targeted technical seminars, webinars, and club co-hosting.
              </p>
              <div className={styles.whoTargetList}>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>HOD Targeted Inboxes</span>
                <span className={styles.whoTargetItem}><span className={styles.whoTargetBullet}></span>Student Council &amp; Club Events</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: HOW IT WORKS ==================== */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Execution Workflow</span>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <p className={styles.sectionSubtitle}>
              From initial contact selection to verified delivery in 4 clear, structured steps:
            </p>
          </div>

          <div className={styles.howWorkflow}>
            {/* Step 1 */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>STEP 01</span>
                <BuildingIcon size={20} className={styles.stepIcon} />
              </div>
              <h3 className={styles.stepTitle}>Manage Contacts</h3>
              <p className={styles.stepDesc}>
                Load pre-verified statewide directories with 1-click or drop your custom CSV / Excel
                spreadsheets. The pre-flight audit instantly checks syntax, strips duplicates, and flags cooldowns.
              </p>
              <div className={styles.stepFeatures}>
                <span className={styles.stepFeaturePill}>1-Click AP &amp; MH Directories</span>
                <span className={styles.stepFeaturePill}>Automatic 30-Day Cooldown Check</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>STEP 02</span>
                <TemplateIcon size={20} className={styles.stepIcon} />
              </div>
              <h3 className={styles.stepTitle}>Create Email Templates</h3>
              <p className={styles.stepDesc}>
                Compose professional proposal templates using dynamic variables like <code>[College Name]</code>,{' '}
                <code>[Contact Person]</code>, and <code>[City / District]</code>. Includes pre-loaded partnership blueprints.
              </p>
              <div className={styles.stepFeatures}>
                <span className={styles.stepFeaturePill}>Dynamic Salutation Resolution</span>
                <span className={styles.stepFeaturePill}>Reusable Proposal Templates</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>STEP 03</span>
                <SendIcon size={20} className={styles.stepIcon} />
              </div>
              <h3 className={styles.stepTitle}>Send Individual or Bulk</h3>
              <p className={styles.stepDesc}>
                Execute single high-priority emails with live preview, or trigger the <strong>Auto-Separated Safe Batch Engine</strong> to
                partition hundreds of recipients into safe 50-contact chunks with cooling delays.
              </p>
              <div className={styles.stepFeatures}>
                <span className={styles.stepFeaturePill}>25/50/100 Safe Batch Chunks</span>
                <span className={styles.stepFeaturePill}>300ms Polite Socket Jitter</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>STEP 04</span>
                <CheckCircleIcon size={20} className={styles.stepIcon} />
              </div>
              <h3 className={styles.stepTitle}>Track Email Status</h3>
              <p className={styles.stepDesc}>
                Monitor real-time delivery audits directly in the dashboard. Inspect Accepted / Failed states,
                read exact SMTP server response codes, and retry failed transmissions with 1 click.
              </p>
              <div className={styles.stepFeatures}>
                <span className={styles.stepFeaturePill}>Live Server Response Codes</span>
                <span className={styles.stepFeaturePill}>1-Click Transient Error Retry</span>
              </div>
            </div>
          </div>

          {/* Trust & Security Highlights */}
          <div className={styles.trustBanner}>
            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}><ShieldCheckIcon size={20} /></div>
              <div>
                <h4 className={styles.trustTitle}>Cryptographic Defense</h4>
                <p className={styles.trustDesc}>
                  Procedural SVG CAPTCHA, bcrypt password hashing, and stateless signed JWT tokens stored in HTTP-Only cookies.
                </p>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}><ClockIcon size={20} /></div>
              <div>
                <h4 className={styles.trustTitle}>Anti-Fatigue Guardrails</h4>
                <p className={styles.trustDesc}>
                  Strict 30-day communication blackout per institution prevents team overlap and college annoyance.
                </p>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}><ServerIcon size={20} /></div>
              <div>
                <h4 className={styles.trustTitle}>Zero External Leakage</h4>
                <p className={styles.trustDesc}>
                  Zero third-party tracking scripts. Clean isolated SMTP connections directly to official mail exchangers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA BANNER ==================== */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to Scale Your Campus Outreach?</h2>
            <p className={styles.ctaSubtitle}>
              Sign in with your authorized company credentials to access the contact registry,
              manage campaign templates, and begin sending high-deliverability communications.
            </p>

            <div className={styles.ctaActions}>
              {isAuthenticated ? (
                <Link href="/dashboard" className={styles.primaryCtaBtn}>
                  <span>Return to Dashboard</span>
                  <ArrowRightIcon size={18} />
                </Link>
              ) : (
                <Link href="/login" className={styles.primaryCtaBtn}>
                  <span>Sign In to Outreach Portal</span>
                  <ArrowRightIcon size={18} />
                </Link>
              )}
            </div>

            <div className={styles.ctaSecurityNote}>
              <ShieldCheckIcon size={14} />
              <span>Restricted to authorized Shortfundly personnel only. Enterprise authentication required.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerContent}`}>
          <div className={styles.footerBrand}>
            <img
              src="/sf_logo.svg"
              alt="Shortfundly"
              className={styles.footerLogo}
            />
            <span className={styles.footerTagline}>
              Shortfundly Campus Outreach Portal • Connecting Campuses &amp; Empowering Creators
            </span>
          </div>

          <div className={styles.footerNav}>
            <a href="#what-it-is" className={styles.footerLink}>What It Is</a>
            <a href="#why-use-it" className={styles.footerLink}>Why It Matters</a>
            <a href="#who-it-is-for" className={styles.footerLink}>Who It&apos;s For</a>
            <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
            <Link href="/login" className={styles.footerLink}>Login</Link>
          </div>
        </div>

        <div className={`${styles.container} ${styles.footerBottom}`}>
          <div>
            &copy; {new Date().getFullYear()} Shortfundly Inc. All rights reserved. Built for authorized internal campus operations.
          </div>
          <div className={styles.footerStatus}>
            <span className={styles.statusDot}></span>
            <span>All Outreach Services Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
