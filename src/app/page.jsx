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
  ArrowRightIcon,
  SparklesIcon,
} from '@/components/Icons.jsx';

export default function LandingPage() {
  return (
    <div className={styles.platformShell}>
      {/* 1. Header */}
      <header className={styles.topNavbar}>
        <div className={styles.navbarInner}>
          <div className={styles.brandGroup}>
            <CampaignPulseLogoSymbol size={36} />
            <div className={styles.brandTitleWrap}>
              <span className={styles.brandTitle}>Campus <span className={styles.brandTeal}>Automation</span></span>
              <span className={styles.brandTag}>Email Outreach Platform</span>
            </div>
          </div>

          <nav className={styles.mainNav}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#audience" className={styles.navLink}>Audience</a>
            <a href="#security" className={styles.navLink}>Security</a>
          </nav>

          <div className={styles.navCtaGroup}>
            <Link href="/login" className={styles.loginPillBtn}>
              <span>Log In</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            {/* Left Copy */}
            <div className={styles.heroCopy}>
              <div className={styles.limeChip}>
                <SparklesIcon size={12} />
                <span>CAMPUS OUTREACH PLATFORM</span>
              </div>

              <h1 className={styles.heroHeading}>
                Simple, Reliable Email Outreach to Colleges and Universities
              </h1>

              <p className={styles.heroSubhead}>
                Connect directly with college principals, department heads, deans, and placement officers. Select target colleges, customize email templates with images and attachments, and send emails safely with built-in spam protection.
              </p>

              <div className={styles.heroActions}>
                <Link href="/login" className={styles.primaryLimeBtn}>
                  <span>Log In to Platform</span>
                  <ArrowRightIcon size={16} />
                </Link>
                <a href="#features" className={styles.secondarySlateBtn}>
                  <span>View Features</span>
                </a>
              </div>

              <div className={styles.trustBar}>
                <div className={styles.trustItem}>
                  <CheckCircleIcon size={14} className={styles.trustTeal} />
                  <span>Verified College Contacts</span>
                </div>
                <div className={styles.trustItem}>
                  <ShieldCheckIcon size={14} className={styles.trustTeal} />
                  <span>Duplicate Email Protection</span>
                </div>
                <div className={styles.trustItem}>
                  <ServerIcon size={14} className={styles.trustTeal} />
                  <span>Google SMTP Sending</span>
                </div>
              </div>
            </div>

            {/* Right: Platform Capabilities Showcase */}
            <div className={styles.heroGraphicWrap}>
              <div className={styles.cockpitCard}>
                <div className={styles.cockpitHeader}>
                  <div className={styles.cockpitStatusGroup}>
                    <div className={styles.trafficLights}>
                      <span className={styles.lightRed} />
                      <span className={styles.lightYellow} />
                      <span className={styles.lightGreen} />
                    </div>
                    <span className={styles.cockpitTitle}>Platform Overview</span>
                  </div>
                  <span className={styles.badgeOnline}>ACTIVE</span>
                </div>

                <div className={styles.previewModuleList}>
                  <div className={styles.previewModuleItem}>
                    <BuildingIcon size={18} className={styles.previewModuleIcon} />
                    <div className={styles.previewModuleContent}>
                      <span className={styles.previewModuleTitle}>College Directory</span>
                      <span className={styles.previewModuleText}>Pre-loaded directory with search, location filters, and key roles (Principals, TPOs, HODs).</span>
                    </div>
                  </div>

                  <div className={styles.previewModuleItem}>
                    <TemplateIcon size={18} className={styles.previewModuleIcon} />
                    <div className={styles.previewModuleContent}>
                      <span className={styles.previewModuleTitle}>Email Templates &amp; Media</span>
                      <span className={styles.previewModuleText}>Add posters, promotional banners, and attach PDF or office documents easily.</span>
                    </div>
                  </div>

                  <div className={styles.previewModuleItem}>
                    <ShieldCheckIcon size={18} className={styles.previewModuleIcon} />
                    <div className={styles.previewModuleContent}>
                      <span className={styles.previewModuleTitle}>Duplicate Protection</span>
                      <span className={styles.previewModuleText}>Automatic 30-day safeguard prevents sending duplicate emails to the same contact.</span>
                    </div>
                  </div>

                  <div className={styles.previewModuleItem}>
                    <ServerIcon size={18} className={styles.previewModuleIcon} />
                    <div className={styles.previewModuleContent}>
                      <span className={styles.previewModuleTitle}>Delivery Tracking</span>
                      <span className={styles.previewModuleText}>Track sent, pending, and failed emails in a real-time audit ledger with retry options.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cockpitFooter}>
                  <div className={styles.tokenTag}>
                    <code>Directory:</code> Pre-loaded Colleges + Custom CSV / Excel Importer
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Use This Platform (3 Pillars) */}
      <section className={styles.sectionPadded} id="about">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>WHY USE THIS PLATFORM</span>
          <h2 className={styles.sectionMainTitle}>Built for Professional Campus Partnerships</h2>
          <p className={styles.sectionLeadText}>
            Reach institutional decision-makers directly and effectively without spam issues, delivery errors, or manual copy-pasting.
          </p>
        </div>

        <div className={styles.threePillarsGrid}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <BuildingIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>What It Does</h3>
            <p className={styles.pillarBody}>
              Provides a central system with verified college directories, customizable email templates, and automated, rate-controlled email delivery.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>College Directory</span>
              <span className={styles.miniPill}>Role Filters</span>
              <span className={styles.miniPill}>Delivery Ledger</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <ShieldCheckIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>Why It Helps</h3>
            <p className={styles.pillarBody}>
              Saves hours of manual effort, protects your sender reputation with duplicate prevention, and ensures emails reach the inbox safely.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>No Duplicate Emails</span>
              <span className={styles.miniPill}>Verified Contacts</span>
              <span className={styles.miniPill}>Safe Email Sending</span>
            </div>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIconBox}>
              <SendIcon size={22} />
            </div>
            <h3 className={styles.pillarTitle}>How It Works</h3>
            <p className={styles.pillarBody}>
              Select colleges, pick a template, preview personalized messages, and send campaigns with accurate delivery status tracking.
            </p>
            <div className={styles.pillBadgesList}>
              <span className={styles.miniPill}>Personalized Tags</span>
              <span className={styles.miniPill}>Pre-Send Preview</span>
              <span className={styles.miniPill}>Delivery Status</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features */}
      <section className={styles.sectionMist} id="features">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>KEY FEATURES</span>
          <h2 className={styles.sectionMainTitle}>Everything You Need for Campus Outreach</h2>
          <p className={styles.sectionLeadText}>
            Practical tools designed for partnership managers, academic coordinators, and recruitment teams.
          </p>
        </div>

        <div className={styles.capabilitiesGrid}>
          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><BuildingIcon size={18} /></div>
              <h3 className={styles.capTitle}>College Directory &amp; Filters</h3>
            </div>
            <p className={styles.capDesc}>
              Search colleges by state, district, and institution type. Access direct contacts for Principals, TPOs, HODs, and Deans.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><TemplateIcon size={18} /></div>
              <h3 className={styles.capTitle}>Custom Email Templates</h3>
            </div>
            <p className={styles.capDesc}>
              Create and edit templates with personal tags like <code className={styles.codeTag}>[College Name]</code>, <code className={styles.codeTag}>[Department]</code>, and <code className={styles.codeTag}>[Contact Person]</code>.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><SendIcon size={18} /></div>
              <h3 className={styles.capTitle}>Safe Batch Sending</h3>
            </div>
            <p className={styles.capDesc}>
              Send individual proposals or run bulk campaigns with automatic delay controls to maintain high deliverability.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><ShieldCheckIcon size={18} /></div>
              <h3 className={styles.capTitle}>Duplicate Prevention</h3>
            </div>
            <p className={styles.capDesc}>
              Built-in 30-day protection prevents emailing the same contact multiple times across different campaigns.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><CheckCircleIcon size={18} /></div>
              <h3 className={styles.capTitle}>Delivery Status Ledger</h3>
            </div>
            <p className={styles.capDesc}>
              View clear delivery records (Accepted, Pending, Failed) with detailed timestamps and easy one-click retry.
            </p>
          </div>

          <div className={styles.capItem}>
            <div className={styles.capHeader}>
              <div className={styles.capIconBox}><ServerIcon size={18} /></div>
              <h3 className={styles.capTitle}>Google SMTP Setup</h3>
            </div>
            <p className={styles.capDesc}>
              Connect securely with your Google Workspace SMTP account with built-in connection testing and encrypted settings.
            </p>
          </div>
        </div>
      </section>

      {/* 5. 4-Step Process */}
      <section className={styles.sectionPadded} id="how-it-works">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>HOW IT WORKS</span>
          <h2 className={styles.sectionMainTitle}>Send Your Campaign in 4 Simple Steps</h2>
          <p className={styles.sectionLeadText}>
            From selecting colleges to reviewing delivered emails in minutes.
          </p>
        </div>

        <div className={styles.pipelineGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>01</div>
            <h3 className={styles.stepTitle}>Choose Colleges</h3>
            <p className={styles.stepDesc}>
              Select colleges from the verified directory or upload your own CSV spreadsheet.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>02</div>
            <h3 className={styles.stepTitle}>Customize Template</h3>
            <p className={styles.stepDesc}>
              Pick a saved template or write your email. Add images, attachments, and personal tags.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>03</div>
            <h3 className={styles.stepTitle}>Review &amp; Send</h3>
            <p className={styles.stepDesc}>
              Preview your emails, verify recipient counts, and send with automatic duplicate checks.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepIndex}>04</div>
            <h3 className={styles.stepTitle}>Track Delivery</h3>
            <p className={styles.stepDesc}>
              Monitor real-time delivery status in the ledger and retry any failed emails easily.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Target Audience */}
      <section className={styles.sectionMist} id="audience">
        <div className={styles.sectionHeadingWrap}>
          <span className={styles.sectionChip}>WHO CAN USE IT</span>
          <h2 className={styles.sectionMainTitle}>Designed for Educational Outreach Teams</h2>
          <p className={styles.sectionLeadText}>
            Help your team manage partnerships and institutional initiatives efficiently.
          </p>
        </div>

        <div className={styles.personasGrid}>
          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Campus Partnerships</h3>
            </div>
            <p className={styles.personaText}>
              Reach Principals and Directors directly to propose institutional MoUs, skill programs, and college collaborations.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Placement &amp; Internships</h3>
            </div>
            <p className={styles.personaText}>
              Coordinate campus hiring drives, internship announcements, and placement seminars directly with verified TPOs.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Academic Alliances</h3>
            </div>
            <p className={styles.personaText}>
              Invite Department Heads and Deans to guest lectures, technical workshops, and faculty development programs.
            </p>
          </div>

          <div className={styles.personaCard}>
            <div className={styles.personaHeader}>
              <UserIcon size={16} className={styles.personaIconTeal} />
              <h3 className={styles.personaTitle}>Student Programs &amp; Competitions</h3>
            </div>
            <p className={styles.personaText}>
              Invite student clubs, faculty advisors, and coordinators to hackathons, festivals, and innovation challenges.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Security & Standards */}
      <section className={styles.securitySection} id="security">
        <div className={styles.securityCard}>
          <div className={styles.securityIconBox}>
            <ShieldCheckIcon size={26} />
          </div>
          <div className={styles.securityInfo}>
            <h3 className={styles.securityTitle}>Standard Email Deliverability &amp; Spam Protection</h3>
            <p className={styles.securityText}>
              Emails are delivered securely through standard Google Workspace SMTP channels. Built-in 30-day duplicate protection prevents repeated emails to the same recipient, keeping outreach polite, professional, and compliant.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaCard}>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalHeading}>Ready to Start Your Campus Outreach?</h2>
            <p className={styles.finalSubText}>
              Log in to your account to access the college directory and manage your email campaigns.
            </p>
            <div className={styles.finalActions}>
              <Link href="/login" className={styles.primaryLimeBtn}>
                <span>Log In to Platform</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CampaignPulseLogoSymbol size={30} />
              <span className={styles.footerBrandName}>Campus Email Automation</span>
            </div>
            <p className={styles.footerTagline}>
              Professional college email outreach and campaign management platform.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Navigation</span>
              <Link href="/login" className={styles.footerLink}>Log In</Link>
              <a href="#about" className={styles.footerLink}>About</a>
              <a href="#features" className={styles.footerLink}>Features</a>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Quick Links</span>
              <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
              <a href="#audience" className={styles.footerLink}>Audience</a>
              <a href="#security" className={styles.footerLink}>Security</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>&copy; {new Date().getFullYear()} Campus Email Automation Platform. All rights reserved.</div>
          <div className={styles.footerLegal}>Authorized Personnel Only</div>
        </div>
      </footer>
    </div>
  );
}
