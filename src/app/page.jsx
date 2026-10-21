'use client';

import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import {
  CampaignPulseLogoSymbol,
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
  SparklesIcon,
} from '@/components/Icons.jsx';

export default function LandingPage() {
  return (
    <div className={styles.platformShell}>
      {/* 1. Modern SaaS Header */}
      <header className={styles.topNavbar}>
        <div className={styles.navbarInner}>
          <div className={styles.brandGroup}>
            <CampaignPulseLogoSymbol size={36} />
            <div className={styles.brandTitleWrap}>
              <span className={styles.brandTitle}>ReachOut <span className={styles.brandTeal}>OS</span></span>
              <span className={styles.brandTag}>Campus Email Automation Platform</span>
            </div>
          </div>

          <nav className={styles.mainNav}>
            <a href="#platform" className={styles.navLink}>Platform</a>
            <a href="#features" className={styles.navLink}>Capabilities</a>
            <a href="#directory" className={styles.navLink}>College Directory</a>
            <a href="#pipeline" className={styles.navLink}>Pipeline</a>
            <a href="#security" className={styles.navLink}>Security &amp; SMTP</a>
          </nav>

          <div className={styles.navCtaGroup}>
            <div className={styles.telemetryBadge}>
              <span className={styles.pulseDot} />
              <span>5,189 Colleges Active</span>
            </div>
            <Link href="/login" className={styles.loginPillBtn}>
              <span>Launch Console</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Editorial Copy & Live Campaign Cockpit */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            {/* Left Copy */}
            <div className={styles.heroCopy}>
              <div className={styles.limeChip}>
                <SparklesIcon size={12} />
                <span>NEXT-GENERATION ACADEMIC OUTREACH PLATFORM</span>
              </div>

              <h1 className={styles.heroHeading}>
                High-Deliverability College Outreach &amp; Campaign Management
              </h1>

              <p className={styles.heroSubhead}>
                The dedicated campaign operations workspace built for corporate teams to discover, personalize, and dispatch rate-controlled emails to verified Principals, HODs, Deans, and Placement Directors with zero spam and genuine 250 OK inbox deliverability.
              </p>

              <div className={styles.heroActions}>
                <Link href="/login" className={styles.primaryLimeBtn}>
                  <span>Access Campaign Workspace</span>
                  <ArrowRightIcon size={16} />
                </Link>
                <a href="#directory" className={styles.secondarySlateBtn}>
                  <span>Explore Directory Coverage</span>
                </a>
              </div>

              <div className={styles.trustBar}>
                <div className={styles.trustItem}>
                  <CheckCircleIcon size={14} className={styles.trustTeal} />
                  <span>100% Verified Records</span>
                </div>
                <div className={styles.trustItem}>
                  <ShieldCheckIcon size={14} className={styles.trustTeal} />
                  <span>30-Day Anti-Collision Shield</span>
                </div>
                <div className={styles.trustItem}>
                  <ServerIcon size={14} className={styles.trustTeal} />
                  <span>Google SMTP (250 OK)</span>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Campaign Monitor (SaaS Cockpit) */}
            <div className={styles.heroGraphicWrap}>
              <div className={styles.cockpitCard}>
                <div className={styles.cockpitHeader}>
                  <div className={styles.cockpitStatusGroup}>
                    <div className={styles.trafficLights}>
                      <span className={styles.lightRed} />
                      <span className={styles.lightYellow} />
                      <span className={styles.lightGreen} />
                    </div>
                    <span className={styles.cockpitTitle}>Campaign Engine &bull; Live Telemetry</span>
                  </div>
                  <span className={styles.badgeOnline}>ENGINE ONLINE</span>
                </div>

                <div className={styles.cockpitBody}>
                  {/* Left: Dispatch Activity Stream */}
                  <div className={styles.streamCol}>
                    <span className={styles.colHeader}>Real-Time Transmissions</span>
                    <div className={styles.streamList}>
                      <div className={styles.streamCard}>
                        <div className={styles.tagAccepted}>
                          <CheckCircleIcon size={11} />
                          <span>250 OK</span>
                        </div>
                        <div className={styles.streamInfo}>
                          <span className={styles.streamCollege}>College of Engineering Pune (COEP)</span>
                          <span className={styles.streamMeta}>principal@coep.ac.in &bull; <strong>Principal</strong></span>
                        </div>
                        <span className={styles.streamTime}>Just now</span>
                      </div>

                      <div className={styles.streamCard}>
                        <div className={styles.tagCooldown}>
                          <ShieldCheckIcon size={11} />
                          <span>COOLDOWN</span>
                        </div>
                        <div className={styles.streamInfo}>
                          <span className={styles.streamCollege}>Veermata Jijabai Technological Inst. (VJTI)</span>
                          <span className={styles.streamMeta}>tpo@vjti.ac.in &bull; <strong>Protected (24d remaining)</strong></span>
                        </div>
                        <span className={styles.streamTime}>2m ago</span>
                      </div>

                      <div className={styles.streamCard}>
                        <div className={styles.tagAccepted}>
                          <CheckCircleIcon size={11} />
                          <span>250 OK</span>
                        </div>
                        <div className={styles.streamInfo}>
                          <span className={styles.streamCollege}>Dr. D.Y. Patil Institute of Tech</span>
                          <span className={styles.streamMeta}>hod.comp@dypvp.edu.in &bull; <strong>HOD Comp</strong></span>
                        </div>
                        <span className={styles.streamTime}>5m ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metric Gauges */}
                  <div className={styles.gaugesCol}>
                    <div className={styles.gaugeBox}>
                      <span className={styles.gaugeLabel}>Deliverability Rate</span>
                      <div className={styles.gaugeNumberRow}>
                        <span className={styles.gaugeNum}>99.4%</span>
                        <span className={styles.tagSuccess}>Optimal</span>
                      </div>
                      <div className={styles.gaugeTrack}>
                        <div className={styles.gaugeFillTeal} style={{ width: '99.4%' }} />
                      </div>
                      <span className={styles.gaugeSub}>Direct SMTP 250 OK inbox response</span>
                    </div>

                    <div className={styles.gaugeBox}>
                      <span className={styles.gaugeLabel}>Collision Shield</span>
                      <div className={styles.gaugeNumberRow}>
                        <span className={styles.gaugeNum}>100%</span>
                        <span className={styles.tagLime}>Active</span>
                      </div>
                      <div className={styles.gaugeTrack}>
                        <div className={styles.gaugeFillLime} style={{ width: '100%' }} />
                      </div>
                      <span className={styles.gaugeSub}>Zero duplicate recipient contact</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cockpitFooter}>
                  <div className={styles.tokenTag}>
                    <code>[College Name]</code> &rarr; MIT World Peace University
                  </div>
                  <div className={styles.tokenTag}>
                    <code>[Contact Person]</code> &rarr; Prof. Dean Student Affairs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Statewide Institutional Coverage Ribbon */}
      <section className={styles.coverageSection} id="directory">
        <div className={styles.coverageRibbon}>
          <div className={styles.ribbonCell}>
            <span className={styles.ribbonFigure}>5,189</span>
            <span className={styles.ribbonCaption}>Colleges Covered (94.5% Statewide)</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonCell}>
            <span className={styles.ribbonFigure}>13,647</span>
            <span className={styles.ribbonCaption}>100% Verified Academic Contacts</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonCell}>
            <span className={styles.ribbonFigure}>3,238</span>
            <span className={styles.ribbonCaption}>Principals &amp; Institutional Directors</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonCell}>
            <span className={styles.ribbonFigure}>1,170</span>
            <span className={styles.ribbonCaption}>Placement Officers (TPOs)</span>
          </div>
          <div className={styles.ribbonDivider} />
          <div className={styles.ribbonCell}>
            <span className={styles.ribbonFigure}>3,211</span>
            <span className={styles.ribbonCaption}>Faculties, Deans &amp; HODs</span>
          </div>
        </div>
      </section>

      {/* 4. Platform Architecture (3-Pillar SaaS Grid) */}
      <section className={styles.sectionPadded} id="platform">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>PLATFORM ARCHITECTURE</span>
          <h2 className={styles.sectionMainTitle}>Why Modern Teams Choose ReachOut OS</h2>
          <p className={styles.sectionLeadText}>
            Building high-impact educational partnerships requires reaching the exact institutional decision-makers without deliverability issues, spam flags, or manual copy-pasting.
          </p>
        </div>

        <div className={styles.threePillarsGrid}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <BuildingIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>What It Is</h3>
            <p className={styles.pillarBody}>
              A centralized campus outreach automation platform integrating an extensive verified directory of Indian colleges, smart template personalization, and automated rate-controlled email delivery.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>Statewide Verified Directory</span>
              <span className={styles.miniPill}>Role-Specific Targeting</span>
              <span className={styles.miniPill}>Centralized Delivery Ledger</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <ShieldCheckIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>Why It Is Used</h3>
            <p className={styles.pillarBody}>
              To eliminate hours of manual outreach, protect company domain reputation with strict 30-day anti-collision rules, and ensure outreach messages land cleanly in the inbox.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>Zero 30-Day Duplicate Collisions</span>
              <span className={styles.miniPill}>100% Verified Academic Records</span>
              <span className={styles.miniPill}>Google SMTP TLS Handshake</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <SendIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>How It Empowers Teams</h3>
            <p className={styles.pillarBody}>
              Company employees can dispatch hundreds of personalized collaboration proposals, campus film screening invites, or workshop invitations with two clicks.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>Dynamic Merge Substitution</span>
              <span className={styles.miniPill}>Pre-Send Review &amp; Inline Edit</span>
              <span className={styles.miniPill}>Live 250 OK Status Logging</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Capabilities Grid */}
      <section className={styles.sectionMist} id="features">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>ENTERPRISE CAPABILITIES</span>
          <h2 className={styles.sectionMainTitle}>Engineered for Modern Outreach Operations</h2>
          <p className={styles.sectionLeadText}>
            Designed specifically for partnership directors, business development executives, and campus recruitment leaders.
          </p>
        </div>

        <div className={styles.capabilitiesGrid}>
          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><BuildingIcon size={18} /></div>
              <h3 className={styles.capTitle}>Contact Management &amp; Directory</h3>
            </div>
            <p className={styles.capDesc}>
              Search, filter, and organize college records across regions, institutions, and roles. Access direct verified emails for Principals, TPOs, HODs, and Deans.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><TemplateIcon size={18} /></div>
              <h3 className={styles.capTitle}>Intelligent Template Engine</h3>
            </div>
            <p className={styles.capDesc}>
              Create customized outreach templates with dynamic placeholders for <code className={styles.codeTag}>[College Name]</code>, <code className={styles.codeTag}>[Department]</code>, and <code className={styles.codeTag}>[Contact Person]</code>.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><SendIcon size={18} /></div>
              <h3 className={styles.capTitle}>Safe Batch Dispatching</h3>
            </div>
            <p className={styles.capDesc}>
              Send single customized proposals or execute bulk campaigns with automatic cooling delay throttling to guarantee optimal deliverability.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><ShieldCheckIcon size={18} /></div>
              <h3 className={styles.capTitle}>30-Day Anti-Collision Cooldown</h3>
            </div>
            <p className={styles.capDesc}>
              Automated database shields prevent contacting the same recipient more than once every 30 days, protecting your domain from spam reports.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><CheckCircleIcon size={18} /></div>
              <h3 className={styles.capTitle}>Live 250 OK Delivery Ledger</h3>
            </div>
            <p className={styles.capDesc}>
              Track exact SMTP delivery responses in real-time. Review detailed audit logs with message timestamps, recipient tags, and instant one-click retry.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><ServerIcon size={18} /></div>
              <h3 className={styles.capTitle}>Configurable SMTP Credentials</h3>
            </div>
            <p className={styles.capDesc}>
              Seamlessly integrates with Google Workspace SMTP (SSL 465 / STARTTLS 587) with built-in diagnostic connection tests and credential encryption.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Operational Pipeline */}
      <section className={styles.sectionPadded} id="pipeline">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>CAMPAIGN PIPELINE</span>
          <h2 className={styles.sectionMainTitle}>How ReachOut OS Operates in 4 Steps</h2>
          <p className={styles.sectionLeadText}>
            From institutional discovery to delivered inbox acknowledgment in minutes.
          </p>
        </div>

        <div className={styles.pipelineGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>01</div>
            <h3 className={styles.stepTitle}>Select Target Campuses</h3>
            <p className={styles.stepDesc}>
              Select colleges from the verified statewide dataset or import your custom CSV list with role and district filters.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>02</div>
            <h3 className={styles.stepTitle}>Personalize Template</h3>
            <p className={styles.stepDesc}>
              Choose from pre-approved campus partnership templates or customize merge fields with instant live HTML preview.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>03</div>
            <h3 className={styles.stepTitle}>Execute Safe Dispatch</h3>
            <p className={styles.stepDesc}>
              Launch single outreach or run safe batch campaigns with automatic anti-duplicate scanning and rate-limiting.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>04</div>
            <h3 className={styles.stepTitle}>Audit &amp; Track Responses</h3>
            <p className={styles.stepDesc}>
              Monitor real-time delivery status (Accepted 250 OK, Failed, Pending) with full audit trails and retry tools.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Target Audience */}
      <section className={styles.sectionMist}>
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>TARGET AUDIENCE</span>
          <h2 className={styles.sectionMainTitle}>Built for High-Growth Company Outreach Teams</h2>
          <p className={styles.sectionLeadText}>
            Empowering various company departments to drive meaningful campus initiatives.
          </p>
        </div>

        <div className={styles.personasGrid}>
          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Campus Outreach &amp; Partnerships</h3>
            </div>
            <p className={styles.personaText}>
              Establish formal MoUs, institutional festival collaborations, and campus creator societies directly with Principals and Directors.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Business Development &amp; Alliances</h3>
            </div>
            <p className={styles.personaText}>
              Pitch corporate sponsorships, creative workshops, screening licenses, and student membership drives to Deans and Department Heads.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Talent Acquisition &amp; Internships</h3>
            </div>
            <p className={styles.personaText}>
              Coordinate campus recruitment drives, summer internship programs, and design challenges directly with verified Placement Officers (TPOs).
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Student Creator Program Managers</h3>
            </div>
            <p className={styles.personaText}>
              Invite college film clubs, media faculties, and student directors to screening festivals and creator competitions.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Enterprise Security & Deliverability */}
      <section className={styles.securitySection} id="security">
        <div className={styles.securityCard}>
          <div className={styles.securityIconBox}>
            <ShieldCheckIcon size={26} />
          </div>
          <div className={styles.securityInfo}>
            <h3 className={styles.securityTitle}>Enterprise Deliverability, Encryption &amp; Anti-Spam Ethics</h3>
            <p className={styles.securityText}>
              ReachOut OS complies with RFC 5322 email transmission standards. All communications pass through TLS 1.3 encrypted Google SMTP channels with full SPF, DKIM, and DMARC alignment. The 30-day anti-collision safeguard ensures zero institutional inbox harassment.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Final Launch Action Banner */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaCard}>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalHeading}>Ready to Scale Your Campus Outreach Operations?</h2>
            <p className={styles.finalSubText}>
              Sign in with your corporate account to access the verified Master Directory and launch your next automated campaign.
            </p>
            <div className={styles.finalActions}>
              <Link href="/login" className={styles.primaryLimeBtn}>
                <span>Sign In to ReachOut OS</span>
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
              <CampaignPulseLogoSymbol size={30} />
              <span className={styles.footerBrandName}>ReachOut OS</span>
            </div>
            <p className={styles.footerTagline}>
              High-deliverability campus email automation and academic intelligence platform.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Navigation</span>
              <Link href="/login" className={styles.footerLink}>Console Login</Link>
              <a href="#platform" className={styles.footerLink}>Platform Overview</a>
              <a href="#directory" className={styles.footerLink}>College Directory</a>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Infrastructure</span>
              <a href="#features" className={styles.footerLink}>Safe-Send Engine</a>
              <a href="#pipeline" className={styles.footerLink}>Pipeline</a>
              <a href="#security" className={styles.footerLink}>Security &amp; SMTP</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>&copy; {new Date().getFullYear()} ReachOut OS Platform. All rights reserved.</div>
          <div className={styles.footerLegal}>Internal Enterprise Platform &bull; Authorized Personnel Only</div>
        </div>
      </footer>
    </div>
  );
}
