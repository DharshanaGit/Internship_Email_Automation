'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import {
  Send,
  Users,
  Calendar,
  FileCheck,
  Activity,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Video,
  FileSpreadsheet,
  Award,
  Terminal,
  Database,
  Lock,
  Cpu,
  ChevronRight,
  Check,
  Clock,
  ExternalLink,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const [activePreviewTab, setActivePreviewTab] = useState('offers');

  return (
    <div className={styles.landingWrapper}>
      {/* 1. Header / Navigation */}
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandIcon}>
              <Send size={18} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Shortfundly Ops</span>
              <span className={styles.brandTagline}>Internship Management Portal</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#modules" className={styles.navLink}>Modules</a>
            <a href="#workflow" className={styles.navLink}>How It Works</a>
            <a href="#architecture" className={styles.navLink}>Technology</a>
            <a href="#security" className={styles.navLink}>Reliability</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" prefetch={true} className={styles.btnSecondary} style={{ padding: '8px 16px', fontSize: '13px' }}>
              <span>Sign In</span>
            </Link>
            <Link href="/login" prefetch={true} className={styles.btnPrimary} style={{ padding: '8px 18px', fontSize: '13px' }}>
              <span>Open Portal</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroCenter}>
            <div className={styles.heroBadge}>
              <span className={styles.statusDot}></span>
              <span className={styles.heroBadgeText}>Production Ready &bull; Google Email &bull; Cloud Database</span>
            </div>

            <h1 className={styles.headline}>
              Internship Management and Email Automation,
              <span className={styles.headlineGradient}> Made Simple.</span>
            </h1>

            <p className={styles.subheading}>
              The all-in-one platform for Shortfundly to send personalized offer letters, assign project tasks, schedule Google Meet reviews, and issue verified completion certificates.
            </p>

            <div className={styles.heroActions}>
              <Link href="/login" prefetch={true} className={styles.btnPrimaryLg}>
                <span>Go to Operations Portal</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#modules" className={styles.btnSecondaryLg}>
                <span>View Core Features</span>
              </a>
            </div>

            {/* Quick KPI Stat Bar */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>100%</div>
                <div className={styles.kpiLabel}>Inbox Delivery</div>
                <div className={styles.kpiSub}>Direct to Primary Inbox</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>&lt; 1.2s</div>
                <div className={styles.kpiLabel}>PDF Generation</div>
                <div className={styles.kpiSub}>Clean A4 Documents</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>15</div>
                <div className={styles.kpiLabel}>Role Task Templates</div>
                <div className={styles.kpiSub}>Ready-to-Use Tasks</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>Secure</div>
                <div className={styles.kpiLabel}>Candidate Decision Links</div>
                <div className={styles.kpiSub}>Safe One-Click Acceptance</div>
              </div>
            </div>
          </div>

          {/* 3. Interactive Deck Mockup Preview */}
          <div className={styles.mockupContainer}>
            <div className={styles.mockupFrame}>
              {/* Window Header */}
              <div className={styles.mockupWindowHeader}>
                <div className={styles.windowControls}>
                  <span className={styles.windowDot} style={{ background: '#ef4444' }}></span>
                  <span className={styles.windowDot} style={{ background: '#f59e0b' }}></span>
                  <span className={styles.windowDot} style={{ background: '#10b981' }}></span>
                  <span className={styles.windowTitle}>shortfundly-operations-portal &bull; preview</span>
                </div>
                <div className={styles.windowMeta}>
                  <span className={styles.badgeLive}>LIVE WORKSPACE</span>
                </div>
              </div>

              {/* Mockup Sub Tabs */}
              <div className={styles.mockupNav}>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('offers')}
                  className={`${styles.mockupNavTab} ${activePreviewTab === 'offers' ? styles.mockupNavTabActive : ''}`}
                >
                  <Send size={13} />
                  <span>1. Offer Letters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('tasks')}
                  className={`${styles.mockupNavTab} ${activePreviewTab === 'tasks' ? styles.mockupNavTabActive : ''}`}
                >
                  <Calendar size={13} />
                  <span>2. Task Allocation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('reviews')}
                  className={`${styles.mockupNavTab} ${activePreviewTab === 'reviews' ? styles.mockupNavTabActive : ''}`}
                >
                  <Video size={13} />
                  <span>3. Milestone Reviews</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('telemetry')}
                  className={`${styles.mockupNavTab} ${activePreviewTab === 'telemetry' ? styles.mockupNavTabActive : ''}`}
                >
                  <Activity size={13} />
                  <span>4. Track Emails</span>
                </button>
              </div>

              {/* Mockup Body Content */}
              <div className={styles.mockupContent}>
                {activePreviewTab === 'offers' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupStatsRow}>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #10b981' }}>
                        <div className={styles.statLabel}>OFFER LETTERS SENT</div>
                        <div className={styles.statNum}>124</div>
                        <div className={styles.statDesc}>Delivered to inboxes</div>
                      </div>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #f43f5e' }}>
                        <div className={styles.statLabel}>FAILED EMAILS</div>
                        <div className={styles.statNum}>0</div>
                        <div className={styles.statDesc}>All delivered successfully</div>
                      </div>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #f59e0b' }}>
                        <div className={styles.statLabel}>WAITING FOR RESPONSE</div>
                        <div className={styles.statNum}>12</div>
                        <div className={styles.statDesc}>Awaiting candidate signature</div>
                      </div>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>ROLE</span>
                        <span>BATCH</span>
                        <span>RESPONSE LINK</span>
                        <span>STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00101</code>
                        <strong>Aditi Sharma</strong>
                        <span>Frontend Developer</span>
                        <span className={styles.pillPurple}>Batch A</span>
                        <span className={styles.tokenCode}>Active link generated</span>
                        <span className={styles.pillGreen}>Delivered to Inbox</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00102</code>
                        <strong>Rohan Mehta</strong>
                        <span>Web Developer Intern</span>
                        <span className={styles.pillPurple}>Batch B</span>
                        <span className={styles.tokenCode}>Active link generated</span>
                        <span className={styles.pillGreen}>Delivered to Inbox</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'tasks' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupBar}>
                      <span className={styles.pillPurple}>Ready Task Templates</span>
                      <span className={styles.pillCyan}>Auto Google Meet Rooms</span>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>ASSIGNED TASK</span>
                        <span>DEADLINE</span>
                        <span>MEETING LINK</span>
                        <span>STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00101</code>
                        <strong>Aditi Sharma</strong>
                        <span>Dashboard Components Sprint</span>
                        <span>7 Days</span>
                        <a href="#" className={styles.meetLink}><Video size={12} /> meet.google.com/abc-defg-hij</a>
                        <span className={styles.pillGreen}>Assigned</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00102</code>
                        <strong>Rohan Mehta</strong>
                        <span>API Integration Milestone</span>
                        <span>7 Days</span>
                        <a href="#" className={styles.meetLink}><Video size={12} /> meet.google.com/klm-nopq-rst</a>
                        <span className={styles.pillGreen}>Assigned</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'reviews' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupBar}>
                      <span className={styles.pillPurple}>Review Queue</span>
                      <span className={styles.pillCyan}>Schedule Review Meetings</span>
                      <span className={styles.pillGreen}>Upload Feedback Spreadsheets</span>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>CURRENT TASK</span>
                        <span>STAGE</span>
                        <span>SCORE</span>
                        <span>UPDATE</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00101</code>
                        <strong>Aditi Sharma</strong>
                        <span>Dashboard Components</span>
                        <span className={styles.pillAmber}>Review 2 Scheduled</span>
                        <strong>92.0%</strong>
                        <span>Feedback email sent</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00102</code>
                        <strong>Rohan Mehta</strong>
                        <span>API Integration</span>
                        <span className={styles.pillAmber}>Review 1 Scheduled</span>
                        <strong>88.5%</strong>
                        <span>Feedback email sent</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'telemetry' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupStatsRow}>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>OFFER LETTERS</div>
                        <div className={styles.statNum}>124</div>
                        <div className={styles.statDesc}>Sent to candidates</div>
                      </div>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>TASK EMAILS</div>
                        <div className={styles.statNum}>124</div>
                        <div className={styles.statDesc}>With meeting links</div>
                      </div>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>REVIEW EMAILS</div>
                        <div className={styles.statNum}>118</div>
                        <div className={styles.statDesc}>Feedback reports sent</div>
                      </div>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>TIME</span>
                        <span>RECIPIENT</span>
                        <span>TYPE</span>
                        <span>SUBJECT</span>
                        <span>STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <span className={styles.timeText}>Just now</span>
                        <strong>intern.sample1@shortfundly.com</strong>
                        <span className={styles.pillPurple}>OFFER_LETTER</span>
                        <span>Official Internship Offer Letter</span>
                        <span className={styles.pillGreen}><Check size={11} /> Delivered</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <span className={styles.timeText}>2 mins ago</span>
                        <strong>intern.sample2@shortfundly.com</strong>
                        <span className={styles.pillPurple}>OFFER_LETTER</span>
                        <span>Official Internship Offer Letter</span>
                        <span className={styles.pillGreen}><Check size={11} /> Delivered</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The 6 Core Modules Deep Dive */}
      <section id="modules" className={styles.modulesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionBadge}>Core Platform</div>
            <h2 className={styles.sectionTitle}>Everything You Need to Manage Interns</h2>
            <p className={styles.sectionSubtitle}>
              Handle candidate intake, offer letters, tasks, reviews, and completion certificates from a single dashboard.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {/* Module 1 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a855f7' }}>
                  <Send size={20} />
                </div>
                <span className={styles.moduleNumber}>01</span>
              </div>
              <h3 className={styles.moduleTitle}>Send Offer Letters</h3>
              <p className={styles.moduleDesc}>
                Add candidates one by one or upload an Excel file. Automatically create personalized PDF offer letters and send them with a secure response link.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#a855f7" /> Fast PDF generation with official formatting</li>
                <li><Check size={13} color="#a855f7" /> One-click accept or decline online links</li>
                <li><Check size={13} color="#a855f7" /> Customizable email wording and attachments</li>
              </ul>
            </div>

            {/* Module 2 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Calendar size={20} />
                </div>
                <span className={styles.moduleNumber}>02</span>
              </div>
              <h3 className={styles.moduleTitle}>Assign Tasks & Milestones</h3>
              <p className={styles.moduleDesc}>
                Choose ready-to-use task templates tailored to each role. Automatically attach Google Meet links and send automated reminder emails before the deadline.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#38bdf8" /> 15 Role templates for Developers, AI, and Design</li>
                <li><Check size={13} color="#38bdf8" /> Automatic Google Meet video conference links</li>
                <li><Check size={13} color="#38bdf8" /> Automatic deadline reminders sent to students</li>
              </ul>
            </div>

            {/* Module 3 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Video size={20} />
                </div>
                <span className={styles.moduleNumber}>03</span>
              </div>
              <h3 className={styles.moduleTitle}>Reviews & Mentorship</h3>
              <p className={styles.moduleDesc}>
                Set up Review 1, Review 2, and final evaluation meetings. Upload feedback spreadsheets, preview candidate scores, and send review summary emails.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#10b981" /> Preview candidate details before dispatching</li>
                <li><Check size={13} color="#10b981" /> Upload feedback via Excel or CSV easily</li>
                <li><Check size={13} color="#10b981" /> Automatic score calculation and tracking</li>
              </ul>
            </div>

            {/* Module 4 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <Users size={20} />
                </div>
                <span className={styles.moduleNumber}>04</span>
              </div>
              <h3 className={styles.moduleTitle}>Candidate Directory & Batches</h3>
              <p className={styles.moduleDesc}>
                Keep track of all interns in one list. Organize interns into Batch A, B, C, or custom groups, and export reports to Excel or CSV anytime.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#fbbf24" /> Flexible batch organization and filters</li>
                <li><Check size={13} color="#fbbf24" /> 1-Click Excel and CSV downloads</li>
                <li><Check size={13} color="#fbbf24" /> Track active interns and completions</li>
              </ul>
            </div>

            {/* Module 5 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                  <Award size={20} />
                </div>
                <span className={styles.moduleNumber}>05</span>
              </div>
              <h3 className={styles.moduleTitle}>Internship Certificates</h3>
              <p className={styles.moduleDesc}>
                Create and email verified completion certificates signed by the CEO. Each certificate includes an official ID and is attached as a clean PDF.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#f472b6" /> Official CEO signature and company branding</li>
                <li><Check size={13} color="#f472b6" /> Send certificates individually or in bulk</li>
                <li><Check size={13} color="#f472b6" /> Unique certificate ID for easy verification</li>
              </ul>
            </div>

            {/* Module 6 */}
            <div className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  <Activity size={20} />
                </div>
                <span className={styles.moduleNumber}>06</span>
              </div>
              <h3 className={styles.moduleTitle}>Track Emails & History</h3>
              <p className={styles.moduleDesc}>
                See every email sent across offer letters, tasks, and reviews. Track delivery status in real time so you know your emails reached the recipient inbox.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#c084fc" /> Direct delivery using your Google account</li>
                <li><Check size={13} color="#c084fc" /> Inspect sent email text and recipients</li>
                <li><Check size={13} color="#c084fc" /> Filter email history by batch and category</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Complete Lifecycle Workflow */}
      <section id="workflow" className={styles.workflowSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionBadge}>Step-by-Step Flow</div>
            <h2 className={styles.sectionTitle}>The 5-Step Internship Process</h2>
            <p className={styles.sectionSubtitle}>
              From prospective candidate intake to final certificate issuance, every milestone is organized and clear.
            </p>
          </div>

          <div className={styles.workflowGrid}>
            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>01</div>
              <h4 className={styles.stepName}>Intake & Batching</h4>
              <p className={styles.stepInfo}>
                Upload intern lists from Excel or enter candidates individually. Organize students into Batch A, B, or custom groups.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>02</div>
              <h4 className={styles.stepName}>Offer Dispatch</h4>
              <p className={styles.stepInfo}>
                Generate personalized offer PDFs. Candidates receive an email with a secure link to review and sign their offer online.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>03</div>
              <h4 className={styles.stepName}>Task Assignment</h4>
              <p className={styles.stepInfo}>
                Select practical tasks for each role. Meeting rooms are automatically scheduled, and deadline reminders are sent.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>04</div>
              <h4 className={styles.stepName}>Review & Feedback</h4>
              <p className={styles.stepInfo}>
                Mentors evaluate project work, enter feedback scores, and send review emails to students after each checkpoint.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>05</div>
              <h4 className={styles.stepName}>Certification</h4>
              <p className={styles.stepInfo}>
                Once tasks are complete, final scores are recorded and official signed completion certificates are sent automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Technical Architecture & Security */}
      <section id="architecture" className={styles.architectureSection}>
        <div className={styles.container}>
          <div className={styles.architectureCard}>
            <div className={styles.archHeader}>
              <div>
                <div className={styles.sectionBadge}>Reliable Foundations</div>
                <h2 className={styles.archTitle}>Fast, Secure, and Dependable Technology</h2>
              </div>
              <div className={styles.badgeLive}>VERIFIED ACTIVE</div>
            </div>

            <div className={styles.archGrid}>
              <div className={styles.archItem}>
                <div className={styles.archIcon}><Database size={18} color="#a855f7" /></div>
                <div>
                  <h4 className={styles.archName}>Cloud Database Storage</h4>
                  <p className={styles.archText}>Stores all candidates, tasks, review scores, and email history safely with automatic backups.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Send size={18} color="#38bdf8" /></div>
                <div>
                  <h4 className={styles.archName}>Google Email Integration</h4>
                  <p className={styles.archText}>Connects directly with your Google account using secure app passwords for dependable email delivery.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Lock size={18} color="#10b981" /></div>
                <div>
                  <h4 className={styles.archName}>Secure Response Links</h4>
                  <p className={styles.archText}>Each intern receives an individual link to safely accept their offer or submit their work.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Cpu size={18} color="#fbbf24" /></div>
                <div>
                  <h4 className={styles.archName}>Fast Modern Architecture</h4>
                  <p className={styles.archText}>Built with modern web technology for rapid loading, instant search, and seamless page transitions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaBadge}>
              <Sparkles size={14} />
              <span>Ready for Your Team</span>
            </div>
            <h2 className={styles.ctaTitle}>Start Managing Interns More Efficiently</h2>
            <p className={styles.ctaSubtitle}>
              Open the Shortfundly Operations Portal to send offer letters, coordinate task reviews, and issue certificates in a few simple steps.
            </p>
            <div className={styles.ctaBtnGroup}>
              <Link href="/login" prefetch={true} className={styles.btnPrimaryLg}>
                <span>Open Operations Portal</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandCol}>
              <div className={styles.brand}>
                <div className={styles.brandIcon} style={{ width: '32px', height: '32px' }}>
                  <Send size={16} />
                </div>
                <span className={styles.brandName} style={{ fontSize: '15px' }}>Shortfundly Operations Portal</span>
              </div>
              <p className={styles.footerBrandDesc}>
                Official platform for internship communication, task tracking, and milestone reviews at Shortfundly Media Technologies.
              </p>
              <div className={styles.footerLiveIndicator}>
                <span className={styles.statusDot}></span>
                <span>System Operational &bull; Google Mail Ready &bull; Database Connected</span>
              </div>
            </div>

            <div className={styles.footerLinksGrid}>
              <div className={styles.footerCol}>
                <h5 className={styles.footerColTitle}>Quick Links</h5>
                <a href="#modules" className={styles.footerLink}>Features</a>
                <a href="#workflow" className={styles.footerLink}>How It Works</a>
                <a href="#architecture" className={styles.footerLink}>Technology</a>
                <a href="#modules" className={styles.footerLink}>All Modules</a>
              </div>

              <div className={styles.footerCol}>
                <h5 className={styles.footerColTitle}>Portal Roles</h5>
                <Link href="/login" className={styles.footerLink}>Administrator Login</Link>
                <Link href="/login" className={styles.footerLink}>HR Coordinator Access</Link>
                <Link href="/login" className={styles.footerLink}>Technical Reviewer</Link>
              </div>

              <div className={styles.footerCol}>
                <h5 className={styles.footerColTitle}>Company</h5>
                <span className={styles.footerStaticText}>Shortfundly Media Technologies Pvt. Ltd.</span>
                <span className={styles.footerStaticText}>Chennai, Tamil Nadu, India</span>
                <span className={styles.footerStaticText}>talent@shortfundly.com</span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerCopy}>
              &copy; {new Date().getFullYear()} Shortfundly Media Technologies Pvt. Ltd. All rights reserved.
            </div>
            <div className={styles.footerLegal}>
              <span>Standard Email Delivery</span>
              <span>&bull;</span>
              <span>Secure Data Storage</span>
              <span>&bull;</span>
              <span>PDF Documents</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
