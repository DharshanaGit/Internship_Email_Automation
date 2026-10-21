'use client';

import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import {
  ShortfundlyLogoSymbol,
  SendIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  BuildingIcon,
  ServerIcon,
  TemplateIcon,
  UserIcon,
  ClockIcon,
  MailIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from '@/components/Icons.jsx';

export default function LandingPage() {
  return (
    <div className={styles.landingWorkspace}>
      {/* 1. Precision Floating Navigation */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandIconWrap}>
              <ShortfundlyLogoSymbol size={36} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Shortfundly</span>
              <span className={styles.portalTag}>Campus Outreach Workspace</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a href="#about" className={styles.navLink}>Platform Overview</a>
            <a href="#features" className={styles.navLink}>Capabilities</a>
            <a href="#coverage" className={styles.navLink}>College Directory</a>
            <a href="#workflow" className={styles.navLink}>Workflow</a>
            <a href="#security" className={styles.navLink}>Security &amp; SMTP</a>
          </nav>

          <div className={styles.navActions}>
            <div className={styles.liveBadge}>
              <span className={styles.pulseDot} />
              <span>5,189 Campuses Indexed</span>
            </div>
            <Link href="/login" className={styles.navLoginPill}>
              <span>Sign In</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Operations Console Preview */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            {/* Left Column: Mission & Value Proposition */}
            <div className={styles.heroCopy}>
              <div className={styles.eyebrowChip}>
                <span className={styles.chipDot} />
                <span>ENTERPRISE ACADEMIC OUTREACH PLATFORM</span>
              </div>

              <h1 className={styles.heroTitle}>
                Simplify College Outreach with Verified Contact Intelligence &amp; Email Automation
              </h1>

              <p className={styles.heroSubtitle}>
                A dedicated operations workspace built for company teams to discover, personalize, and dispatch outreach to Principals, HODs, Deans, and Placement Directors across 5,189+ colleges with zero spam.
              </p>

              <div className={styles.heroCtaGroup}>
                <Link href="/login" className={styles.primaryCta}>
                  <span>Access Outreach Workspace</span>
                  <ArrowRightIcon size={16} />
                </Link>
                <a href="#coverage" className={styles.secondaryCta}>
                  <span>Explore Directory Coverage</span>
                </a>
              </div>

              <div className={styles.heroTrustPills}>
                <div className={styles.trustPill}>
                  <CheckCircleIcon size={14} className={styles.trustIcon} />
                  <span>100% Genuine Data</span>
                </div>
                <div className={styles.trustPill}>
                  <ShieldCheckIcon size={14} className={styles.trustIcon} />
                  <span>30-Day Anti-Collision Shield</span>
                </div>
                <div className={styles.trustPill}>
                  <ServerIcon size={14} className={styles.trustIcon} />
                  <span>Google SMTP 250 OK</span>
                </div>
              </div>
            </div>

            {/* Right Column: Nested Operations Console Graphic (Inspired by Reference) */}
            <div className={styles.heroConsoleWrapper}>
              <div className={styles.operationsConsole}>
                {/* Console Header Bar */}
                <div className={styles.consoleHeader}>
                  <div className={styles.consoleTitleGroup}>
                    <div className={styles.trafficDots}>
                      <span className={styles.dotCoral} />
                      <span className={styles.dotSand} />
                      <span className={styles.dotSage} />
                    </div>
                    <span className={styles.consoleTitle}>Outreach Dispatch Monitor</span>
                  </div>
                  <span className={styles.onlineBadge}>ENGINE ACTIVE</span>
                </div>

                {/* Console Content Grid */}
                <div className={styles.consoleBodyGrid}>
                  {/* Activity Timeline Column */}
                  <div className={styles.activityColumn}>
                    <div className={styles.miniSectionTitle}>Recent Transmissions</div>

                    <div className={styles.activityFeed}>
                      <div className={styles.activityCard}>
                        <div className={styles.activityStatusAccepted}>
                          <CheckCircleIcon size={12} />
                          <span>250 OK</span>
                        </div>
                        <div className={styles.activityDetails}>
                          <span className={styles.activityCollege}>College of Engineering Pune (COEP)</span>
                          <span className={styles.activityMeta}>principal@coep.ac.in &bull; <strong>Principal</strong></span>
                        </div>
                        <span className={styles.activityTime}>Just now</span>
                      </div>

                      <div className={styles.activityCard}>
                        <div className={styles.activityStatusCooldown}>
                          <ShieldCheckIcon size={12} />
                          <span>COOLDOWN</span>
                        </div>
                        <div className={styles.activityDetails}>
                          <span className={styles.activityCollege}>VJTI Mumbai</span>
                          <span className={styles.activityMeta}>tpo@vjti.ac.in &bull; <strong>Protected (24d remaining)</strong></span>
                        </div>
                        <span className={styles.activityTime}>2m ago</span>
                      </div>

                      <div className={styles.activityCard}>
                        <div className={styles.activityStatusAccepted}>
                          <CheckCircleIcon size={12} />
                          <span>250 OK</span>
                        </div>
                        <div className={styles.activityDetails}>
                          <span className={styles.activityCollege}>Dr. D.Y. Patil Institute</span>
                          <span className={styles.activityMeta}>hod.comp@dypvp.edu.in &bull; <strong>HOD Comp</strong></span>
                        </div>
                        <span className={styles.activityTime}>5m ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Circular Rate & Telemetry Side Card */}
                  <div className={styles.dialColumn}>
                    <div className={styles.dialCard}>
                      <div className={styles.dialMetricLabel}>Deliverability Rate</div>
                      <div className={styles.dialValueRow}>
                        <span className={styles.dialNumber}>98.4%</span>
                        <span className={styles.dialTag}>Accepted</span>
                      </div>
                      <div className={styles.dialBarBg}>
                        <div className={styles.dialBarFill} style={{ width: '98.4%' }} />
                      </div>
                      <div className={styles.dialSubtext}>Direct SMTP inbox acknowledgment</div>
                    </div>

                    <div className={styles.dialCard}>
                      <div className={styles.dialMetricLabel}>Collision Guard</div>
                      <div className={styles.dialValueRow}>
                        <span className={styles.dialNumber}>100%</span>
                        <span className={styles.dialTagProtected}>Shielded</span>
                      </div>
                      <div className={styles.dialBarBg}>
                        <div className={styles.dialBarFillCoral} style={{ width: '100%' }} />
                      </div>
                      <div className={styles.dialSubtext}>Zero repeat contact within 30 days</div>
                    </div>
                  </div>
                </div>

                {/* Directory Merge Preview Row */}
                <div className={styles.consoleFooterStrip}>
                  <div className={styles.tokenPill}>
                    <strong>[College Name]</strong> &rarr; MIT World Peace University
                  </div>
                  <div className={styles.tokenPill}>
                    <strong>[Contact Person]</strong> &rarr; Prof. Dean Student Affairs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Statewide Institutional Coverage Ribbon */}
      <section className={styles.coverageSection} id="coverage">
        <div className={styles.coverageRibbon}>
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>5,189</span>
            <span className={styles.ribbonLabel}>Colleges Covered (94.5% Statewide)</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>13,647</span>
            <span className={styles.ribbonLabel}>100% Verified Unique Contacts</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>3,238</span>
            <span className={styles.ribbonLabel}>Principals &amp; Institutional Directors</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>1,170</span>
            <span className={styles.ribbonLabel}>Training &amp; Placement Officers (TPO)</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>3,211</span>
            <span className={styles.ribbonLabel}>Faculties, Deans &amp; HODs</span>
          </div>
        </div>
      </section>

      {/* 4. About Platform: What, Why & How */}
      <section className={styles.sectionWarm} id="about">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>PLATFORM ARCHITECTURE</span>
          <h2 className={styles.sectionTitle}>What is Shortfundly Campus Outreach &amp; Why It Matters</h2>
          <p className={styles.sectionDescription}>
            Building high-impact college partnerships requires reaching verified decision-makers without deliverability issues, spam flags, or manual copy-pasting.
          </p>
        </div>

        <div className={styles.threePillarsGrid}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <BuildingIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>What It Is</h3>
            <p className={styles.pillarText}>
              A dedicated academic email operations workspace combining an extensive verified directory of Indian colleges with automated personalization and safe SMTP delivery.
            </p>
            <div className={styles.pillarTagList}>
              <span className={styles.pillarTag}>Statewide Contact Directory</span>
              <span className={styles.pillarTag}>Role-Specific Targeting</span>
              <span className={styles.pillarTag}>Centralized Audit Ledger</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <ShieldCheckIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>Why It Is Used</h3>
            <p className={styles.pillarText}>
              To eliminate hundreds of manual outreach hours, safeguard company domain reputation with strict 30-day anti-collision rules, and ensure outreach messages land cleanly in the inbox.
            </p>
            <div className={styles.pillarTagList}>
              <span className={styles.pillarTag}>Zero 30-Day Duplicate Collisions</span>
              <span className={styles.pillarTag}>100% Verified Records</span>
              <span className={styles.pillarTag}>Direct Google SMTP Handshake</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <SendIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>How It Empowers Teams</h3>
            <p className={styles.pillarText}>
              Company employees can dispatch customized collaboration proposals, campus film screening invitations, or recruitment notices with two clicks.
            </p>
            <div className={styles.pillarTagList}>
              <span className={styles.pillarTag}>Dynamic Merge Substitution</span>
              <span className={styles.pillarTag}>Pre-Send Review &amp; Inline Edit</span>
              <span className={styles.pillarTag}>Live 250 OK Status Logging</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Key Features Grid */}
      <section className={styles.sectionLinen} id="features">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>OPERATIONAL CAPABILITIES</span>
          <h2 className={styles.sectionTitle}>Engineered for High-Performance Outreach Teams</h2>
          <p className={styles.sectionDescription}>
            Designed specifically for partnership directors, business development executives, and student creator managers.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><BuildingIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Contact Management &amp; Directory</h3>
            </div>
            <p className={styles.featureDesc}>
              Search, filter, and organize college records across regions, institutions, and roles. Access direct verified emails for Principals, TPOs, HODs, and Deans.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><TemplateIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Intelligent Template Engine</h3>
            </div>
            <p className={styles.featureDesc}>
              Create customized outreach templates with dynamic placeholders for <code className={styles.codePill}>[College Name]</code>, <code className={styles.codePill}>[Department]</code>, and <code className={styles.codePill}>[Contact Person]</code>.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><SendIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Safe Batch Dispatching</h3>
            </div>
            <p className={styles.featureDesc}>
              Send single customized proposals or execute bulk campaigns with automatic cooling delay throttling to guarantee optimal deliverability.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><ShieldCheckIcon size={18} /></div>
              <h3 className={styles.featureTitle}>30-Day Anti-Collision Cooldown</h3>
            </div>
            <p className={styles.featureDesc}>
              Automated database shields prevent contacting the same recipient more than once every 30 days, protecting your domain from spam reports.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><CheckCircleIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Live 250 OK Delivery Ledger</h3>
            </div>
            <p className={styles.featureDesc}>
              Track exact SMTP delivery responses in real-time. Review detailed audit logs with message timestamps, recipient tags, and instant one-click retry.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><ServerIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Configurable SMTP Credentials</h3>
            </div>
            <p className={styles.featureDesc}>
              Seamlessly integrates with Google Workspace SMTP (SSL 465 / STARTTLS 587) with built-in diagnostic connection tests and credential encryption.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Operational 4-Phase Workflow */}
      <section className={styles.sectionWarm} id="workflow">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>OPERATIONAL PIPELINE</span>
          <h2 className={styles.sectionTitle}>How the Platform Works in 4 Steps</h2>
          <p className={styles.sectionDescription}>
            From institutional discovery to delivered inbox acknowledgment in minutes.
          </p>
        </div>

        <div className={styles.workflowGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>01</div>
            <h3 className={styles.stepTitle}>Select Target Campuses</h3>
            <p className={styles.stepDesc}>
              Select colleges from the verified statewide dataset or import your custom CSV list with role and district filters.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>02</div>
            <h3 className={styles.stepTitle}>Personalize Template</h3>
            <p className={styles.stepDesc}>
              Choose from pre-approved campus partnership templates or customize merge fields with instant live HTML preview.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>03</div>
            <h3 className={styles.stepTitle}>Execute Safe Dispatch</h3>
            <p className={styles.stepDesc}>
              Launch single outreach or run safe batch campaigns with automatic anti-duplicate scanning and rate-limiting.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>04</div>
            <h3 className={styles.stepTitle}>Audit &amp; Track Responses</h3>
            <p className={styles.stepDesc}>
              Monitor real-time delivery status (Accepted 250 OK, Failed, Pending) with full audit trails and retry tools.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Target Audience */}
      <section className={styles.sectionLinen}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>TARGET AUDIENCE</span>
          <h2 className={styles.sectionTitle}>Built for High-Growth Company Outreach Teams</h2>
          <p className={styles.sectionDescription}>
            Empowering various company departments to drive meaningful campus initiatives.
          </p>
        </div>

        <div className={styles.personasGrid}>
          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIcon} />
              <h3 className={styles.personaTitle}>Campus Outreach &amp; Partnerships</h3>
            </div>
            <p className={styles.personaText}>
              Establish formal MoUs, institutional festival collaborations, and campus creator societies directly with Principals and Directors.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIcon} />
              <h3 className={styles.personaTitle}>Business Development &amp; Alliances</h3>
            </div>
            <p className={styles.personaText}>
              Pitch corporate sponsorships, creative workshops, screening licenses, and student membership drives to Deans and Department Heads.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIcon} />
              <h3 className={styles.personaTitle}>Talent Acquisition &amp; Internships</h3>
            </div>
            <p className={styles.personaText}>
              Coordinate campus recruitment drives, summer internship programs, and design challenges directly with verified Placement Officers (TPOs).
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIcon} />
              <h3 className={styles.personaTitle}>Student Creator Program Managers</h3>
            </div>
            <p className={styles.personaText}>
              Invite college film clubs, media faculties, and student directors to Shortfundly screening festivals and creator competitions.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Security & Compliance Guarantee */}
      <section className={styles.securitySection} id="security">
        <div className={styles.securityBox}>
          <div className={styles.securityIconBox}>
            <ShieldCheckIcon size={28} />
          </div>
          <div className={styles.securityInfo}>
            <h3 className={styles.securityTitle}>Enterprise Security, Deliverability &amp; Data Ethics</h3>
            <p className={styles.securityText}>
              Shortfundly Campus Outreach complies with RFC 5322 email transmission standards. All communications pass through TLS 1.3 encrypted Google SMTP channels with full SPF, DKIM, and DMARC alignment. The 30-day anti-collision safeguard ensures zero institutional inbox harassment.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Final Access Banner */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaCard}>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalCtaHeading}>Ready to Accelerate Your College Outreach?</h2>
            <p className={styles.finalCtaSub}>
              Sign in with your Shortfundly company account to access the Maharashtra College Master Directory and dispatch your next campaign.
            </p>
            <div className={styles.finalBtnWrap}>
              <Link href="/login" className={styles.primaryCta}>
                <span>Sign In to Outreach Workspace</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Platform Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShortfundlyLogoSymbol size={32} />
              <span className={styles.footerBrandName}>Shortfundly Campus Outreach</span>
            </div>
            <p className={styles.footerTagline}>
              Empowering campuses, students, and creative communities across India.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Quick Access</span>
              <Link href="/login" className={styles.footerLink}>Console Login</Link>
              <a href="#about" className={styles.footerLink}>Platform Overview</a>
              <a href="#coverage" className={styles.footerLink}>Statewide Directory</a>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Capabilities</span>
              <a href="#features" className={styles.footerLink}>Safe-Send Engine</a>
              <a href="#workflow" className={styles.footerLink}>Workflow Guide</a>
              <a href="#security" className={styles.footerLink}>Security &amp; SMTP</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>&copy; {new Date().getFullYear()} Shortfundly Outreach Platform. All rights reserved.</div>
          <div className={styles.footerLegal}>Internal Enterprise Portal &bull; Authorized Personnel Only</div>
        </div>
      </footer>
    </div>
  );
}
