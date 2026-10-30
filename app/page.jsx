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
              <span className={styles.brandTagline}>Enterprise Talent Automation</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#modules" className={styles.navLink}>Modules</a>
            <a href="#workflow" className={styles.navLink}>Lifecycle Workflow</a>
            <a href="#architecture" className={styles.navLink}>Architecture</a>
            <a href="#security" className={styles.navLink}>Security & RFC</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" prefetch={true} className={styles.btnSecondary} style={{ padding: '8px 16px', fontSize: '13px' }}>
              <span>Sign In</span>
            </Link>
            <Link href="/login" prefetch={true} className={styles.btnPrimary} style={{ padding: '8px 18px', fontSize: '13px' }}>
              <span>Launch Portal</span>
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
              <span className={styles.heroBadgeText}>Production Live &bull; Google SMTP &bull; Supabase PostgreSQL</span>
            </div>

            <h1 className={styles.headline}>
              Industrial Internship Operations.
              <span className={styles.headlineGradient}> Precision Automated.</span>
            </h1>

            <p className={styles.subheading}>
              The unified mission control for Shortfundly Media Technologies. Orchestrate single & bulk offer dispatches, Playwright A4 PDF contracts, Google Meet milestone reviews, and tamper-proof certificates in real time.
            </p>

            <div className={styles.heroActions}>
              <Link href="/login" prefetch={true} className={styles.btnPrimaryLg}>
                <span>Enter Operations Portal</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#modules" className={styles.btnSecondaryLg}>
                <span>Explore 6 Operations Modules</span>
              </a>
            </div>

            {/* Quick KPI Stat Bar */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>100%</div>
                <div className={styles.kpiLabel}>Primary Inbox Rate</div>
                <div className={styles.kpiSub}>RFC 5322 &bull; Google DKIM</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>&lt; 1.2s</div>
                <div className={styles.kpiLabel}>PDF Engine Latency</div>
                <div className={styles.kpiSub}>Playwright Headless A4</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>15</div>
                <div className={styles.kpiLabel}>Gemma AI Task Templates</div>
                <div className={styles.kpiSub}>Industrial Dev Milestones</div>
              </div>
              <div className={styles.kpiItem}>
                <div className={styles.kpiValue}>256-bit</div>
                <div className={styles.kpiLabel}>Cryptographic Decision Tokens</div>
                <div className={styles.kpiSub}>Zero-Collision Double-Spend Lock</div>
              </div>
            </div>
          </div>

          {/* 3. High-Fidelity Interactive Deck Mockup */}
          <div className={styles.mockupContainer}>
            <div className={styles.mockupFrame}>
              {/* Window Header */}
              <div className={styles.mockupWindowHeader}>
                <div className={styles.windowControls}>
                  <span className={styles.windowDot} style={{ background: '#ef4444' }}></span>
                  <span className={styles.windowDot} style={{ background: '#f59e0b' }}></span>
                  <span className={styles.windowDot} style={{ background: '#10b981' }}></span>
                  <span className={styles.windowTitle}>shortfundly-operations-portal.internal &bull; nextjs-16.4-turbopack</span>
                </div>
                <div className={styles.windowMeta}>
                  <span className={styles.badgeLive}>● LIVE WORKSPACE</span>
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
                  <span>1. Automate Offer Letter</span>
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
                  <span>4. Email Telemetry</span>
                </button>
              </div>

              {/* Mockup Body Content */}
              <div className={styles.mockupContent}>
                {activePreviewTab === 'offers' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupStatsRow}>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #10b981' }}>
                        <div className={styles.statLabel}>OFFER LETTERS SENT</div>
                        <div className={styles.statNum}>197</div>
                        <div className={styles.statDesc}>Successfully Dispatched</div>
                      </div>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #f43f5e' }}>
                        <div className={styles.statLabel}>DELIVERY FAILURES</div>
                        <div className={styles.statNum}>0</div>
                        <div className={styles.statDesc}>100% DKIM Verified</div>
                      </div>
                      <div className={styles.mockupStatCard} style={{ borderLeft: '3px solid #f59e0b' }}>
                        <div className={styles.statLabel}>PENDING ACCEPTANCE</div>
                        <div className={styles.statNum}>14</div>
                        <div className={styles.statDesc}>Cryptographic Token Locked</div>
                      </div>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>ROLE</span>
                        <span>BATCH</span>
                        <span>DECISION TOKEN</span>
                        <span>DELIVERY STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00001</code>
                        <strong>Dharshana</strong>
                        <span>AI Engineer</span>
                        <span className={styles.pillPurple}>Batch A</span>
                        <code className={styles.tokenCode}>sf-tok_8f92a1...</code>
                        <span className={styles.pillGreen}>Delivered (Google SMTP)</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00002</code>
                        <strong>Dharshu</strong>
                        <span>Web Developer Intern</span>
                        <span className={styles.pillPurple}>Batch B</span>
                        <code className={styles.tokenCode}>sf-tok_4c78d0...</code>
                        <span className={styles.pillGreen}>Delivered (Google SMTP)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'tasks' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupBar}>
                      <span className={styles.pillPurple}>Task Assignment &bull; Gemma 2B Templates</span>
                      <span className={styles.pillCyan}>Auto Google Meet Integration</span>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>ASSIGNED TASK</span>
                        <span>DEADLINE</span>
                        <span>GOOGLE MEET ROOM</span>
                        <span>STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00001</code>
                        <strong>Dharshana</strong>
                        <span>[DEV] TSK-DEV-001: Dynamic Telemetry</span>
                        <span>2026-11-05</span>
                        <a href="#" className={styles.meetLink}><Video size={12} /> meet.google.com/abc-defg-hij</a>
                        <span className={styles.pillGreen}>Assigned</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00002</code>
                        <strong>Dharshu</strong>
                        <span>[DEV] TSK-DEV-002: Realtime API Engine</span>
                        <span>2026-11-07</span>
                        <a href="#" className={styles.meetLink}><Video size={12} /> meet.google.com/klm-nopq-rst</a>
                        <span className={styles.pillGreen}>Assigned</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'reviews' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupBar}>
                      <span className={styles.pillPurple}>Review Queue (2)</span>
                      <span className={styles.pillCyan}>Schedule Milestone (HR Decided)</span>
                      <span className={styles.pillGreen}>Subsequent Feedback CSV Ingestion</span>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>INTERN ID</span>
                        <span>CANDIDATE</span>
                        <span>TASK INFO</span>
                        <span>STAGE</span>
                        <span>EVALUATION SCORE</span>
                        <span>FEEDBACK SYNC</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00001</code>
                        <strong>Dharshana</strong>
                        <span>TSK-DEV-001 (#1)</span>
                        <span className={styles.pillAmber}>Review 2 Pending</span>
                        <strong>92.0%</strong>
                        <span>Automated Jinja Email Dispatched</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <code>INT-2026-00002</code>
                        <strong>Dharshu</strong>
                        <span>TSK-DEV-002 (#1)</span>
                        <span className={styles.pillAmber}>Review 1 Pending</span>
                        <strong>88.5%</strong>
                        <span>Evaluation Feedback Recorded</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'telemetry' && (
                  <div className={styles.mockupPanel}>
                    <div className={styles.mockupStatsRow}>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>OFFER LETTERS</div>
                        <div className={styles.statNum}>197</div>
                        <div className={styles.statDesc}>RFC 5322 Compliant</div>
                      </div>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>TASK BRIEFINGS</div>
                        <div className={styles.statNum}>197</div>
                        <div className={styles.statDesc}>With Google Meet Links</div>
                      </div>
                      <div className={styles.mockupStatCard}>
                        <div className={styles.statLabel}>MILESTONE REVIEWS</div>
                        <div className={styles.statNum}>182</div>
                        <div className={styles.statDesc}>Feedback Streams</div>
                      </div>
                    </div>

                    <div className={styles.mockupTableRow}>
                      <div className={styles.tableHeader}>
                        <span>TIMESTAMP</span>
                        <span>RECIPIENT</span>
                        <span>STREAM / TYPE</span>
                        <span>SUBJECT</span>
                        <span>DKIM / SPF STATUS</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <span className={styles.timeText}>Just now</span>
                        <strong>dharshanab32@gmail.com</strong>
                        <span className={styles.pillPurple}>OFFER_LETTER</span>
                        <span>Official Internship Offer & Contract</span>
                        <span className={styles.pillGreen}><Check size={11} /> 100% Primary Inbox</span>
                      </div>
                      <div className={styles.tableRowItem}>
                        <span className={styles.timeText}>2 mins ago</span>
                        <strong>dachudharshana17@gmail.com</strong>
                        <span className={styles.pillPurple}>OFFER_LETTER</span>
                        <span>Official Internship Offer & Contract</span>
                        <span className={styles.pillGreen}><Check size={11} /> 100% Primary Inbox</span>
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
            <div className={styles.sectionBadge}>System Capabilities</div>
            <h2 className={styles.sectionTitle}>The 6 Production Modules</h2>
            <p className={styles.sectionSubtitle}>
              Engineered end-to-end to manage candidate intake, offer dispatches, task sprints, multi-session reviews, certificates, and deliverability audit trails.
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
              <h3 className={styles.moduleTitle}>Automate Offer Letter</h3>
              <p className={styles.moduleDesc}>
                Sequential single intake and bulk dataset loading (.xlsx / .csv). Generates customized single-page Playwright A4 PDF offer contracts, creates cryptographic SHA-256 decision tokens, and delivers directly via Google SMTP.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#a855f7" /> Playwright headless PDF generation (&lt; 1.2s)</li>
                <li><Check size={13} color="#a855f7" /> Cryptographic offer acceptance & sign link</li>
                <li><Check size={13} color="#a855f7" /> Custom Jinja email templating engine</li>
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
              <h3 className={styles.moduleTitle}>Task Allocation & Milestones</h3>
              <p className={styles.moduleDesc}>
                Role-based sprint task allocation powered by 15 Gemma 2B industrial task templates. Seamless Google Meet conference generation, individual or batch-wise meeting rooms, and automated deadline reminders.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#38bdf8" /> 15 Industrial role templates (AI, Web, UI/UX)</li>
                <li><Check size={13} color="#38bdf8" /> Real Google Meet room URL auto-generation</li>
                <li><Check size={13} color="#38bdf8" /> 24h deadline reminder mail automation</li>
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
              <h3 className={styles.moduleTitle}>Milestone Reviews & Mentorship</h3>
              <p className={styles.moduleDesc}>
                HR-decided multi-session review coordination (Review 1, Review 2, QA signoff). Upload subsequent feedback via Excel/CSV, inspect intern preview rows before sending, and dispatch evaluation summaries.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#10b981" /> Full intern details preview in all 3 sub-tabs</li>
                <li><Check size={13} color="#10b981" /> Subsequent feedback CSV / Excel ingestion</li>
                <li><Check size={13} color="#10b981" /> Cumulative percentage performance scoring</li>
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
              <h3 className={styles.moduleTitle}>Unified Intern Ledger & Batches</h3>
              <p className={styles.moduleDesc}>
                Centralized registry of all candidate details with dynamic batch segregation (Batch A, B, C, D, E, Solo Interns). Quick drag-and-drop batch reassignment, lifecycle attrition tracking, and instant Excel/CSV exports.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#fbbf24" /> Dynamic customizable batches & roles</li>
                <li><Check size={13} color="#fbbf24" /> 1-Click Master Excel & CSV export</li>
                <li><Check size={13} color="#fbbf24" /> Departure, completion & attrition ledger</li>
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
                Generate and dispatch officially formatted, tamper-proof completion certificates signed by Founder & CEO Selvam M. Includes cryptographic certificate ID verification and high-resolution PDF attachments.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#f472b6" /> Official Founder signature & corporate seal</li>
                <li><Check size={13} color="#f472b6" /> Automated single & batch certificate issuing</li>
                <li><Check size={13} color="#f472b6" /> Cryptographic certificate validation token</li>
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
              <h3 className={styles.moduleTitle}>Telemetry & Audit Stream</h3>
              <p className={styles.moduleDesc}>
                Real-time delivery verification across every communication channel. Guaranteed RFC 5322 compliance, Google Workspace SMTP authentication, zero-leak rate-limiting queue, and cryptographic delivery audit logs.
              </p>
              <ul className={styles.moduleFeatureList}>
                <li><Check size={13} color="#c084fc" /> 100% DKIM / SPF Primary Inbox alignment</li>
                <li><Check size={13} color="#c084fc" /> Full email body & recipient inspection</li>
                <li><Check size={13} color="#c084fc" /> Batch-wise stream filtering & search</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Complete Lifecycle Workflow */}
      <section id="workflow" className={styles.workflowSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionBadge}>End-To-End Pipeline</div>
            <h2 className={styles.sectionTitle}>The 5-Step Internship Lifecycle</h2>
            <p className={styles.sectionSubtitle}>
              From prospective candidate intake to final certificate issuance, every milestone is managed with zero manual friction.
            </p>
          </div>

          <div className={styles.workflowGrid}>
            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>01</div>
              <h4 className={styles.stepName}>Intake & Batching</h4>
              <p className={styles.stepInfo}>
                HR uploads candidate roster via Excel or uses sequential intake. Interns are auto-assigned an Intern ID and grouped into Batch A, B, C, or custom cohorts.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>02</div>
              <h4 className={styles.stepName}>Offer Dispatch & Signing</h4>
              <p className={styles.stepInfo}>
                Playwright renders customized A4 offer letters. Candidates receive email with secure SHA-256 response links to accept or sign online before deadline.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>03</div>
              <h4 className={styles.stepName}>Task & Meet Provisioning</h4>
              <p className={styles.stepInfo}>
                HR selects Gemma 2B industrial sprint tasks. Google Meet conferencing is auto-provisioned (batch-wise or individual) with calendar invites and reminder crons.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>04</div>
              <h4 className={styles.stepName}>Milestone Reviews</h4>
              <p className={styles.stepInfo}>
                Evaluators conduct scheduled code walkthroughs. Feedback CSVs are uploaded directly, updating cumulative performance scores and triggering review emails.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.stepNum}>05</div>
              <h4 className={styles.stepName}>Certification</h4>
              <p className={styles.stepInfo}>
                Upon completing sprint deliverables, final scores are computed and official Shortfundly Completion Certificates are generated and delivered automatically.
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
                <div className={styles.sectionBadge}>Enterprise Foundation</div>
                <h2 className={styles.archTitle}>Production Stack & Cryptographic Security</h2>
              </div>
              <div className={styles.badgeLive}>VERIFIED ACTIVE</div>
            </div>

            <div className={styles.archGrid}>
              <div className={styles.archItem}>
                <div className={styles.archIcon}><Database size={18} color="#a855f7" /></div>
                <div>
                  <h4 className={styles.archName}>Supabase PostgreSQL + Prisma ORM</h4>
                  <p className={styles.archText}>Enterprise connection pooler with foreign-key referential integrity and strict relational constraints.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Send size={18} color="#38bdf8" /></div>
                <div>
                  <h4 className={styles.archName}>Google SMTP Direct Transport</h4>
                  <p className={styles.archText}>SSL/TLS port 465 with authentic DKIM & SPF canonical headers for zero-spam primary inbox delivery.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Lock size={18} color="#10b981" /></div>
                <div>
                  <h4 className={styles.archName}>Cryptographic Decision Tokens</h4>
                  <p className={styles.archText}>High-entropy 256-bit crypto tokens with atomic concurrency locking to prevent double-acceptance races.</p>
                </div>
              </div>

              <div className={styles.archItem}>
                <div className={styles.archIcon}><Cpu size={18} color="#fbbf24" /></div>
                <div>
                  <h4 className={styles.archName}>Next.js 16 + Turbopack SSR</h4>
                  <p className={styles.archText}>High-performance server-rendered route handlers, edge caching, and sub-second cold starts.</p>
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
              <span>Ready for Operational Deployment</span>
            </div>
            <h2 className={styles.ctaTitle}>Start Streamlining Internship Operations</h2>
            <p className={styles.ctaSubtitle}>
              Access the Shortfundly Operations Portal to dispatch offers, track submissions, and manage candidate reviews with modern precision.
            </p>
            <div className={styles.ctaBtnGroup}>
              <Link href="/login" prefetch={true} className={styles.btnPrimaryLg}>
                <span>Launch Operations Portal</span>
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
                Official Talent Acquisition & Internship Automation Infrastructure. Engineered for speed, RFC email deliverability, and verified milestone continuity.
              </p>
              <div className={styles.footerLiveIndicator}>
                <span className={styles.statusDot}></span>
                <span>System Operational &bull; Supabase PostgreSQL &bull; Google SMTP Live</span>
              </div>
            </div>

            <div className={styles.footerLinksGrid}>
              <div className={styles.footerCol}>
                <h5 className={styles.footerColTitle}>Navigation</h5>
                <a href="#modules" className={styles.footerLink}>Modules</a>
                <a href="#workflow" className={styles.footerLink}>Workflow</a>
                <a href="#architecture" className={styles.footerLink}>Architecture</a>
                <a href="#security" className={styles.footerLink}>Security</a>
              </div>

              <div className={styles.footerCol}>
                <h5 className={styles.footerColTitle}>Portal Access</h5>
                <Link href="/login" className={styles.footerLink}>System Admin Login</Link>
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
              <span>RFC 5322 Compliant</span>
              <span>&bull;</span>
              <span>256-bit AES Encryption</span>
              <span>&bull;</span>
              <span>Playwright PDF Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
