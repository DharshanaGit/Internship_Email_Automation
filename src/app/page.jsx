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
    <div className={styles.landingContainer}>
      {/* 1. Precision Top Navigation */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.brandGroup}>
            <ShortfundlyLogoSymbol size={40} />
            <div className={styles.brandText}>
              <span className={styles.brandName}>Shortfundly</span>
              <span className={styles.portalTag}>Campus Outreach Portal</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a href="#about" className={styles.navLink}>About Platform</a>
            <a href="#features" className={styles.navLink}>Core Capabilities</a>
            <a href="#coverage" className={styles.navLink}>Institutional Directory</a>
            <a href="#workflow" className={styles.navLink}>Operational Workflow</a>
            <a href="#security" className={styles.navLink}>Enterprise Security</a>
          </nav>

          <div className={styles.navActions}>
            <div className={styles.livePill}>
              <span className={styles.pulseDot} />
              <span>5,189 Campuses Indexed</span>
            </div>
            <Link href="/login" className={styles.navLoginBtn}>
              <span>Sign In</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Asymmetric Executive Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          {/* Left Column: Editorial Value Proposition */}
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>NEXT-GENERATION ACADEMIC OUTREACH AUTOMATION</span>
            </div>

            <h1 className={styles.heroTitle}>
              Simplify College Outreach with Verified Contact Intelligence &amp; Email Automation
            </h1>

            <p className={styles.heroSubtitle}>
              The dedicated enterprise outreach portal built for company teams to discover, manage, and engage Principals, HODs, Deans, and Training &amp; Placement Officers across 5,189+ higher education institutions with 100% genuine data and zero spam.
            </p>

            <div className={styles.heroCtaGroup}>
              <Link href="/login" className={styles.primaryCta}>
                <span>Access Outreach Console</span>
                <ArrowRightIcon size={16} />
              </Link>
              <a href="#coverage" className={styles.secondaryCta}>
                <span>Explore Directory Coverage</span>
              </a>
            </div>

            <div className={styles.heroTrustBar}>
              <div className={styles.trustItem}>
                <CheckCircleIcon size={14} className={styles.trustIcon} />
                <span>Zero Dummy Data</span>
              </div>
              <div className={styles.trustItem}>
                <ShieldCheckIcon size={14} className={styles.trustIcon} />
                <span>30-Day Anti-Collision Shield</span>
              </div>
              <div className={styles.trustItem}>
                <ServerIcon size={14} className={styles.trustIcon} />
                <span>Google SMTP (250 OK)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dispatch Simulator Graphic Card */}
          <div className={styles.heroGraphic}>
            <div className={styles.dispatchSimulatorCard}>
              <div className={styles.simCardHeader}>
                <div className={styles.simHeaderLeft}>
                  <div className={styles.simTrafficLights}>
                    <span className={styles.lightRed} />
                    <span className={styles.lightYellow} />
                    <span className={styles.lightGreen} />
                  </div>
                  <span className={styles.simTitle}>Outreach Dispatch Monitor &bull; Live Telemetry</span>
                </div>
                <span className={styles.simBadgeActive}>ENGINE ONLINE</span>
              </div>

              {/* Sample Dispatch Activity Stream */}
              <div className={styles.simActivityFeed}>
                <div className={styles.simLogItem}>
                  <div className={styles.simStatusOk}>
                    <CheckCircleIcon size={12} />
                    <span>250 OK</span>
                  </div>
                  <div className={styles.simLogDetails}>
                    <span className={styles.simCollege}>College of Engineering Pune (COEP)</span>
                    <span className={styles.simRecipient}>principal@coep.ac.in &bull; <strong>Principal</strong></span>
                  </div>
                  <span className={styles.simTime}>Just now</span>
                </div>

                <div className={styles.simLogItem}>
                  <div className={styles.simStatusShield}>
                    <ShieldCheckIcon size={12} />
                    <span>COOLDOWN</span>
                  </div>
                  <div className={styles.simLogDetails}>
                    <span className={styles.simCollege}>Veermata Jijabai Technological Institute (VJTI)</span>
                    <span className={styles.simRecipient}>tpo@vjti.ac.in &bull; <strong>Protected (24d remaining)</strong></span>
                  </div>
                  <span className={styles.simTime}>2m ago</span>
                </div>

                <div className={styles.simLogItem}>
                  <div className={styles.simStatusOk}>
                    <CheckCircleIcon size={12} />
                    <span>250 OK</span>
                  </div>
                  <div className={styles.simLogDetails}>
                    <span className={styles.simCollege}>Dr. D.Y. Patil Institute of Technology</span>
                    <span className={styles.simRecipient}>hod.comp@dypvp.edu.in &bull; <strong>HOD Computer</strong></span>
                  </div>
                  <span className={styles.simTime}>5m ago</span>
                </div>
              </div>

              {/* Verified Contact Card Preview */}
              <div className={styles.simContactCard}>
                <div className={styles.simCardTag}>INSTITUTIONAL DIRECTORY RECORD</div>
                <div className={styles.simCardBody}>
                  <div className={styles.simOrg}>
                    <BuildingIcon size={16} className={styles.simOrgIcon} />
                    <div>
                      <div className={styles.simOrgName}>MIT World Peace University</div>
                      <div className={styles.simOrgLoc}>Pune, Maharashtra &bull; NIRF Top 100 Ranked</div>
                    </div>
                  </div>
                  <div className={styles.simTokens}>
                    <span className={styles.simToken}>[College Name] &rarr; MIT-WPU</span>
                    <span className={styles.simToken}>[Contact Person] &rarr; Prof. Dean Student Affairs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Statewide Institutional Coverage Ribbon */}
      <section className={styles.coverageRibbon} id="coverage">
        <div className={styles.ribbonContainer}>
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
            <span className={styles.ribbonLabel}>Placement Officers &amp; TPOs</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonItem}>
            <span className={styles.ribbonNumber}>3,211</span>
            <span className={styles.ribbonLabel}>Faculties, Deans &amp; HODs</span>
          </div>
        </div>
      </section>

      {/* 4. About Platform: What, Why & How */}
      <section className={styles.section} id="about">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>PLATFORM ARCHITECTURE</span>
          <h2 className={styles.sectionTitle}>What is Shortfundly Campus Outreach &amp; Why It Matters</h2>
          <p className={styles.sectionDescription}>
            Building high-impact educational partnerships requires reaching the exact institutional decision-makers without deliverability issues, spam flags, or manual copy-pasting.
          </p>
        </div>

        <div className={styles.threePillarsGrid}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <BuildingIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>What It Is</h3>
            <p className={styles.pillarText}>
              A centralized campus outreach automation platform integrating an extensive verified directory of Indian colleges, smart template personalization, and automated rate-controlled email delivery.
            </p>
            <ul className={styles.pillarPoints}>
              <li>&bull; Comprehensive statewide contact directory</li>
              <li>&bull; Role-specific targeting (Principals, TPOs, HODs)</li>
              <li>&bull; Clean, centralized operational ledger</li>
            </ul>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <ShieldCheckIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>Why It Is Used</h3>
            <p className={styles.pillarText}>
              To eliminate hours of manual outreach, protect company domain reputation with strict 30-day anti-collision rules, and ensure outreach messages land cleanly in the inbox.
            </p>
            <ul className={styles.pillarPoints}>
              <li>&bull; Zero duplicate outreach within 30 days</li>
              <li>&bull; 100% genuine academic email records</li>
              <li>&bull; Professional delivery via Google SMTP</li>
            </ul>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconWrap}>
              <SendIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>How It Empowers Teams</h3>
            <p className={styles.pillarText}>
              Company employees can dispatch hundreds of personalized collaboration proposals, campus film screening invites, or workshop invitations with two clicks.
            </p>
            <ul className={styles.pillarPoints}>
              <li>&bull; Dynamic merge token substitution</li>
              <li>&bull; Pre-send review and inline customization</li>
              <li>&bull; Real-time delivery status logging (250 OK)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Key Features Grid */}
      <section className={styles.sectionLight} id="features">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>ENTERPRISE CAPABILITIES</span>
          <h2 className={styles.sectionTitle}>Everything You Need for Scaled Campus Engagement</h2>
          <p className={styles.sectionDescription}>
            Engineered specifically for business development, partnership executives, and student creator program managers.
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
              Send single customized proposals or execute bulk campaigns up to 500 colleges at a time with automatic 2-5 second delay throttling to guarantee inbox deliverability.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><ShieldCheckIcon size={18} /></div>
              <h3 className={styles.featureTitle}>30-Day Anti-Collision Cooldown</h3>
            </div>
            <p className={styles.featureDesc}>
              Automated database shields prevent contacting the same recipient more than once every 30 days, protecting your domain from blacklists and spam reports.
            </p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIconBox}><CheckCircleIcon size={18} /></div>
              <h3 className={styles.featureTitle}>Live 250 OK Delivery Ledger</h3>
            </div>
            <p className={styles.featureDesc}>
              Track exact SMTP delivery responses in real-time. Review detailed audit logs with message timestamps, recipient tags, and instant one-click retry for transient issues.
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
      <section className={styles.section} id="workflow">
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
              Select colleges from the verified statewide dataset or upload your custom CSV list with role and department filters.
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

      {/* 7. Target Audience: Who is this for? */}
      <section className={styles.sectionLight}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>DESIGNED FOR TEAMS</span>
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
              Coordinate campus recruitment drives, summer internship programs, and design challenges directly with verified Training &amp; Placement Officers (TPOs).
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

      {/* 9. Final High-Impact Access Banner */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaCard}>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalCtaHeading}>Ready to Accelerate Your College Outreach?</h2>
            <p className={styles.finalCtaSub}>
              Sign in with your Shortfundly company account to access the Maharashtra College Master Directory and dispatch your next campaign.
            </p>
            <div className={styles.finalBtnWrap}>
              <Link href="/login" className={styles.primaryCta}>
                <span>Sign In to Outreach Portal</span>
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
