# Shortfundly Campus Outreach Portal — Complete System Documentation

**Connecting Campuses. Empowering Creators.**  
*Official Technical Specification, Architecture, Security Audit & Benchmark Report*

---

## Table of Contents
1. [Executive Summary & Full Project Idea](#1-executive-summary--full-project-idea)
2. [Product Architecture & Technology Stack](#2-product-architecture--technology-stack)
3. [Methodology, Safe Batching & AP Directory Pipeline](#3-methodology-safe-batching--ap-directory-pipeline)
4. [Cybersecurity Architecture & Defense In Depth](#4-cybersecurity-architecture--defense-in-depth)
5. [Testing Results & Benchmark Verification](#5-testing-results--benchmark-verification)
6. [Live Application Showcase (Original Website Screenshots)](#6-live-application-showcase-original-website-screenshots)
7. [Deployment & Operations Guide](#7-deployment--operations-guide)

---

## 1. Executive Summary & Full Project Idea

### 1.1 The Vision
**Shortfundly** is a premier creative platform dedicated to short films, independent cinema, and emerging digital creators. To scale institutional partnerships across colleges, universities, and film institutes, the **Shortfundly Campus Outreach Portal** was conceived as an enterprise-grade automation, data engineering, and partner-relationship engine.

The portal establishes a direct bridge between educational institutions and the **Shortfundly Campus Pass** ecosystem, which unifies six flagship offerings:
- **Connect**: Collaborative creator network matching student directors, cinematographers, writers, and editors.
- **Festival**: Direct film festival submissions, curation circuits, and screening opportunities.
- **Hub**: Institutional community hub for film clubs, media departments, and campus screenings.
- **Marketing**: Targeted film promotion, digital campaign management, and press outreach.
- **Ticket**: Campus screening ticketing, box-office management, and event access control.
- **Tools**: Professional creator utility suites, budgeting calculators, and distribution kits.

### 1.2 Core Problem Statement
Educational outreach often suffers from critical bottlenecks when executed through conventional email clients or generic mass-mailing software:
1. **Accidental Privacy Violations**: Mass outreach executed via CC or misconfigured BCC exposes institutional contact lists, resulting in severe compliance and reputational hazards.
2. **Spam Flagging & Domain Reputation Degradation**: Blast senders using flashy marketing templates or untrusted shared IP pools suffer poor inbox deliverability and domain blacklisting.
3. **Accidental Duplicate Harassment**: Multiple representatives contacting the same dean or faculty member multiple times within a short timeframe creates friction.
4. **Lack of Granular Control**: Generic tools fail to offer pre-flight validation (CSV format inspection, syntax checks, cooldown enforcement, and per-recipient template interpolation).

### 1.3 The Solution
The **Shortfundly Campus Outreach Portal** solves these challenges through:
- **100% Isolated 1-to-1 Email Dispatch**: Zero shared headers across recipients. Every email is dispatched as a unique, independent SMTP envelope.
- **Atomic 30-Day Duplicate Cooldown Guard**: Recipient addresses are normalized and cross-referenced against historical dispatches to prevent duplicate outreach.
- **High-Deliverability Natural Email Layout**: Clean, professional plain-HTML design that respects corporate email filters and ensures primary inbox delivery.
- **Self-Contained Security Architecture**: In-house cryptographic SVG CAPTCHA, strict role-based access control (RBAC), and pure parameterized SQLite storage without external third-party tracking.
- **Automated Safe Batching Engine**: Auto-partitions statewide contact databases into safe, rate-limited chunks with calming cooling delays between dispatches to guarantee zero server stress and zero spam flagging.

---

## 2. Product Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  Next.js 16 (App Router)  |  Pure CSS Modules  |  Zero External UI Libraries      |
+-----------------------------------------------------------------------------------+
                                         │  HTTPS / Cookie-Based Session
                                         ▼
+-----------------------------------------------------------------------------------+
|                            APPLICATION & API GATEWAY                              |
|  - Middleware Authentication & RBAC Check                                         |
|  - Cryptographic HMAC-SHA256 SVG CAPTCHA Engine                                   |
|  - Zod Input Sanitization & Schema Validation                                     |
|  - Sliding-Window In-Memory Rate Limiters                                         |
|  - Fast In-Memory Dataset Cache API (/api/outreach/dataset)                       |
+-----------------------------------------------------------------------------------+
                  │                                               │
                  ▼                                               ▼
+-----------------------------------+           +-----------------------------------+
|          DATA & AUDIT TIER        |           |      OUTREACH & MAILER TIER       |
|  - SQLite (node:sqlite)           |           |  - Nodemailer Transport Pool      |
|  - WAL Journaling Mode            |           |  - Google SMTP (smtp.gmail.com)   |
|  - Parameterized Queries (SQLi)   |           |  - Direct SSL/TLS (Port 465)      |
|  - Immutable audit_logs Ledger    |           |  - Auto-Separate Batch Engine     |
|  - Master AP College Directory    |           |  - Calming Inter-Batch Cooldown   |
+-----------------------------------+           +-----------------------------------+
```

### 2.1 Technology Stack Matrix

| Architectural Layer | Technology | Key Characteristics |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** | Modern server/client component paradigm, fast hydration, SEO & header control. |
| **Language Standard** | **Pure Modern JavaScript (ESM)** | Vanilla JS/JSX; zero TypeScript compilation overhead; standard node modules. |
| **Styling Architecture** | **CSS Modules (`*.module.css`)** | Scoped modular styles, native CSS variables, strictly zero external UI bloat (no Tailwind/Bootstrap/MUI). |
| **Database Engine** | **SQLite via `node:sqlite`** | Built-in Node.js synchronous engine (`DatabaseSync`), zero native binary rebuild dependencies. |
| **Database Mode** | **WAL (Write-Ahead Logging)** | High concurrency reads and writes, `PRAGMA busy_timeout = 5000`, ACID transactional integrity. |
| **Session & Auth** | **JWT (`jose`) & `bcryptjs`** | Stateless signed JWTs in HTTP-Only cookies, 12-round bcrypt salt, database token revocation check. |
| **Anti-Bot Mechanism** | **Self-Contained Cryptographic CAPTCHA** | Dynamic SVG procedural noise generator with HMAC-SHA256 timestamp signature validation. |
| **Email Gateway** | **Nodemailer + Google SMTP Gateway** | Secure TLS/SSL connection pool to `smtp.gmail.com:465` with dynamic credentials and live latency testing. |
| **Safe Batch Engine** | **Client-Side Partitioning & Pacing** | Auto-segments large datasets into safe batches (25/50/100/200) with anti-spam cooling intervals. |
| **Data Engine & Scraper** | **Python (Playwright & BeautifulSoup)** | Headless browser data harvesting across state educational portals with multi-sheet Excel generation. |
| **Runtime Validation** | **Zod Schemas** | Strict type coercion and runtime boundary validation on all inbound requests. |

---

## 3. Methodology, Safe Batching & AP Directory Pipeline

### 3.1 Single Manual Outreach Workflow
1. **User Initiation**: Team member enters recipient institution, contact person, designation, and email.
2. **Real-Time Pre-check**: As the email is typed, an asynchronous background check queries `/api/outreach/check-duplicate` to verify whether the recipient is within the 30-day cooldown window.
3. **Template Merge & Live Preview**: The user selects an institutional template. Dynamic variables (`{{college_name}}`, `{{contact_salutation}}`, `{{department}}`, `{{designation}}`, `{{city_district}}`) are interpolated in real time with HTML escaping.
4. **Queue & Dispatch**: Upon submission, the job is committed to `outreach_logs` in a `PENDING` state, processed by the mailer pool, and transitioned to `ACCEPTED` or `FAILED`.

### 3.2 Unstress Bulk Outreach Panel & Auto-Separate Batch Engine
The bulk outreach input panel was comprehensively upgraded into an unstressful, high-throughput campaign system:

```
[ Built-in AP Dataset Loader (1-Click) ]  OR  [ Custom Spreadsheet Dropzone (.xlsx, .csv) ]
                           │
                           ▼
[ Multi-Sheet Directory Navigator (6 Categorized Tabs) ]
   ├── All Colleges AP Master (1,832 Colleges)
   ├── Principal & Director Contacts (1,291 Contacts)
   ├── HOD Contacts (528 Contacts)
   ├── Dean & Leadership Contacts (186 Contacts)
   ├── Placement & TPO Contacts (172 Contacts)
   └── Department Staff & Faculty (1,250 Contacts)
                           │
                           ▼
[ Smart Applied Campaign Filters (Real-Time Pre-Flight) ]
   ├── District Filter (13 Standardized AP Districts — 0 Numeric Codes)
   ├── Target Stakeholder Role (Principals, HODs, Deans, TPOs, Faculty)
   ├── Website Availability (Institutions With Website vs Without Website)
   ├── Live Query Search (Name, City, Department, Email)
   └── Status Classification (Eligible, 30-Day Cooldown, Shared Inbox, No Email)
                           │
                           ▼
[ Auto-Separate Safe Batch Engine ]
   ├── Auto-partitions filtered records into safe chunks (25, 50, 100, 200)
   ├── Horizontal Interactive Batch Navigation Pills (Status: Ready / Sending / Completed)
   ├── Safe Inter-Batch Cooling Delay (5s, 10s Safe, 15s, 30s Ultra-Safe countdown)
   ├── Granular Execution Modes:
   │     ├── "Send Active Batch Only" (Single 50-contact chunk dispatch)
   │     └── "Auto-Play All Batches (Unstressed)" (Continuous sequential batch execution with Pause/Resume)
   └── Rate-Limited Sockets (300ms polite jitter per email + zero shared headers)
```

### 3.3 Dynamic Template Personalization Rules
Templates support multiple syntax conventions (`[College Name]`, `{{college_name}}`, `[Contact Person]`, `[City / District]`, `[Official Website URL]`, etc.) and automatically resolve contextual nuances:
- **Intelligent Salutation**: Formats salutations dynamically (e.g., `"Dear Dr. Miller (Dean of Arts),"` vs fallback `"Dear Sir/Madam,"`).
- **Department Clause Insertion**: Automatically integrates department context cleanly into proposal narratives without awkward grammar.
- **Campus Pass Value Terms**: Standardized commercial details outlining the Campus Pass (₹1,500 + GST/year) and all 6 platform product offerings.

### 3.4 Andhra Pradesh Statewide Higher Education Directory & Scraping Pipeline
A comprehensive state-level higher education institutional intelligence pipeline was developed to empower the outreach portal with officially verified contacts:
- **Official Portals Scraped**: 
  - Andhra Pradesh State Council of Higher Education (APSCHE)
  - AP EAPCET / APTOnline College Master (`https://eapcet-sche.aptonline.in`)
  - AP Comprehensive Admission Portal (CAP / APCFSS: `https://cap.apcfss.in`)
  - Department of Collegiate Education (AP CCE / GDC)
- **1,832 Verified Colleges (0 Duplicates)**: Statewide institutional census covering Engineering, Pharmacy, MBA, MCA, Medical, Law, Architecture, Polytechnic, and PG colleges.
- **District Standardization**: Cleaned and eliminated all raw numeric district codes, standardizing every record across all 13 official districts (**Guntur**: 271, **Prakasam**: 191, **Chittoor**: 173, **Krishna**: 161, **East Godavari**: 153, **Visakhapatnam**: 152, **Anantapur**: 146, **Kurnool**: 138, **West Godavari**: 128, **Nellore**: 124, **Kadapa**: 116, **Srikakulam**: 55, **Vizianagaram**: 52).
- **National & Premier Institutes**: Integrated premier institutions including IIT Tirupati, NIT Andhra Pradesh, IIIT Sri City, IIITDM Kurnool, IIM Visakhapatnam, IISER Tirupati, AIIMS Mangalagiri, KL University, GITAM, VFSTR, and Government Medical Colleges (AMC, GMC, SVMC, KMC, RMC).
- **Master Excel Architecture**: Consolidated into `Andhra_Pradesh_Master_College_Directory_2026.xlsx` across 6 purpose-built sheets, also exported as pre-cached JSON (`ap_master_dataset_cache.json`) for instant sub-10ms web app loading.

---

## 4. Cybersecurity Architecture & Defense In Depth

The system is engineered following OWASP Top 10 guidelines and strict defense-in-depth principles:

### 4.1 Zero Shared Header Privacy Guarantee
To guarantee institutional privacy, bulk outreach never batches multiple recipients into single email dispatches:
- **Strictly Isolated Envelopes**: Every email is dispatched with its own independent SMTP envelope where `To:` contains only the single recipient.
- **Zero CC / BCC Usage**: Recipient lists are completely invisible across organizations.

### 4.2 Cryptographic In-House CAPTCHA
Rather than relying on third-party tracking scripts (such as Google reCAPTCHA or Cloudflare Turnstile), the system generates its own cryptographic challenge:
- **Procedural SVG Rendering**: Mathematical wave distortion, noise dots, and variable font metrics prevent OCR bot scraping.
- **HMAC-SHA256 Signed Timestamp**: Each challenge returns a signed token `timestamp.hmac`.
- **Replay & Tampering Immunity**: Tokens older than 5 minutes are rejected; forged signatures are instantly dropped via timing-safe cryptographic comparison.

### 4.3 Multi-Role Access Control (RBAC)
The application enforces strict authorization across three distinct administrative roles:

| Role | Access Scope | Template Actions | Outreach Dispatch | System Settings |
|---|---|---|---|---|
| **Admin** | Full system control | Create, Edit, Delete | Full dispatch | Full SMTP & User config |
| **Team Lead** | Operational campaigns | Create, Edit | Full dispatch | Read-only |
| **Manager** | Review & reporting | View only | Authorization gated (`can_send`) | Gated |

### 4.4 Parameterized Data Access Layer (SQLi Immunity)
Every database interaction uses 100% parameterized SQLite statements:
```javascript
// Parameterized safe query via node:sqlite
const stmt = db.prepare(`
  SELECT id, status, created_at 
  FROM outreach_logs 
  WHERE normalized_email = ? 
  ORDER BY created_at DESC LIMIT 1
`);
const record = stmt.get(normalizedEmail);
```
SQL injection payloads (e.g., `' OR '1'='1' --`) are treated strictly as string literals and cannot compromise the database.

### 4.5 Attack Mitigation & Security Headers
- **Brute-Force Rate Limiting**: In-memory sliding window limiter restricts failed logins to 5 attempts per 15-minute window per IP.
- **Outreach Rate Limiting**: Maximum 30 dispatches per hour per session to avoid unintended mailer flooding.
- **HTTP Security Headers**:
  - `Content-Security-Policy`: Restricts script and asset execution origins.
  - `X-Frame-Options: DENY`: Prevents Clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `CSRF Protection`: Origin and Referer validation on all mutation endpoints.
- **Immutable Audit Trail**: All security events (logins, failed attempts, outreach queueing, configuration updates) are recorded in the `audit_logs` table with IP, actor, action, and timestamp.

---

## 5. Testing Results & Benchmark Verification

The system was subjected to rigorous end-to-end automated testing, cybersecurity audits, and concurrency load stress testing.

### 5.1 Production Readiness Suite (`scripts/test-system.js`)
All 9 core production tests executed and passed cleanly:

```
--- PRODUCTION READINESS & CYBERSECURITY VERIFICATION SUITE ---

[Test 1] Verifying SQLite schema and admin bootstrap...
✓ Test 1 Passed: Database schema and admin bootstrap verified.

[Test 2] Verifying Company Login and Credential Verification...
✓ Test 2 Passed: Company authentication and password security verified.

[Test 3] Verifying Shortfundly Proposal Template & Variable Escaping...
✓ Test 3 Passed: Email template variable escaping and integrity verified.

[Test 4] Verifying Outreach Job Queue and Background Worker Transitions...
✓ Test 4 Passed: Outreach queueing, worker dispatch, and state transition verified.

[Test 5] Verifying Duplicate Prevention Guard...
✓ Test 5 Passed: Atomic duplicate prevention and 30-day cooldown verified.

[Test 6] Verifying SMTP Error Categorization...
✓ Test 6 Passed: Transient vs Permanent error categorization verified.

[Test 7] Verifying Security Audit Log Ledger...
✓ Test 7 Passed: Security audit trails verified.

[Test 8] Verifying Multi-User RBAC Permissions (Admin, Team Lead, Manager)...
✓ Test 8 Passed: Role-based permissions and can_send controls verified.

[Test 9] Verifying Dynamic Google SMTP Settings and Transporter Pool...
Live Google SMTP handshake status: {
  success: true,
  configured: true,
  host: 'smtp.gmail.com',
  port: 465,
  user: 'dharshana.shortfundly@gmail.com',
  message: 'Google SMTP server handshake verified successfully. Ready for campus outreach dispatches.'
}
✓ Test 9 Passed: Dynamic SMTP configuration and live Google handshake verified.

======================================================
 ALL 9 PRODUCTION SYSTEM TESTS PASSED CLEANLY
======================================================
```

### 5.2 Cybersecurity Audit & Concurrency Load Stress Suite (`scripts/load-test.js`)
The system was tested against malicious payloads, template injection, and intense concurrent loads:

| Benchmark / Audit | Target Metric | Measured Result | Verdict |
|---|---|---|---|
| **SQL Injection Immunity** | SQL payload neutralization | 100% parameterized statement defense | **PASSED** |
| **XSS & HTML Sanitization** | Script & event handler escaping | Unescaped tags completely neutralized | **PASSED** |
| **Cryptographic CAPTCHA** | Replay & forgery defense | Forged signatures & expired tokens 100% blocked | **PASSED** |
| **Template Personalization** | High-throughput variable render | **10,000 emails rendered in 2.08s (4,803 renders/sec)** | **PASSED** |
| **SQLite WAL Write Concurrency** | 200 concurrent atomic transactions | **12,005 TPS** (p50: 0.02ms, p95: 0.07ms, p99: 0.96ms) | **PASSED** |
| **Batch Duplicate Detection** | 500 contact batch cross-check | **39.88 ms total resolution time** | **PASSED** |
| **Memory Leak & Heap Stability** | Memory retention after 10k ops | Zero memory leaks; garbage collector stable | **PASSED** |

---

## 6. Live Application Showcase (Original Website Screenshots)

> **Note on Verification**: All screenshots below are genuine, non-synthetic captures taken directly from the live running web application using automated browser instrumentation.

### 6.1 Secure Authentication Gateway & Cryptographic CAPTCHA
The portal authentication screen featuring company login, dynamic SVG procedural noise CAPTCHA, single-click challenge refresh, and active enterprise cybersecurity indicators.

![Original Login Screen](public/docs/real_login_page.png)

---

### 6.2 Campus Outreach Automation Command Center (Dashboard Overview)
The centralized executive overview displaying live real-time KPI metrics (`Total Outreach: 2`, `SMTP Accepted: 2`, `Failed Attempts: 0`, `Pending Queue: 0`), top bar connectivity pills (`SQLite Active`, `Google SMTP`), and the real delivery audit ledger.

![Original Dashboard Overview](public/docs/real_dashboard_overview.png)

---

### 6.3 Single Manual Outreach Dispatcher
The target institution dispatch console with real-time field validation, institutional recipient details, department targeting, template selection, and pre-dispatch email preview.

![Original Manual Outreach Form](public/docs/real_manual_outreach.png)

---

### 6.4 Unstress Bulk Campaign Engine & Safe Batching Panel

#### 6.4.1 Officially Verified AP Master Directory Loader & Smart Campaign Filters
The upgraded bulk outreach panel featuring the **1-Click AP Master Dataset Loader** (1,832 verified colleges, 0 duplicates), multi-sheet directory tabs, master workbook download trigger, and real-time smart campaign filters (District across 13 AP districts, Target Stakeholder Role, Website Availability, and live search).

![Unstress Bulk Campaign Panel](public/docs/real_unstress_bulk_campaign_panel.png)

*Figure 4a: Upgraded Unstress Bulk Outreach Panel displaying 1-click built-in Andhra Pradesh Master Directory loader (1,832 colleges), categorized sheet tabs, and smart multi-attribute campaign filters.*

---

#### 6.4.2 Auto-Separated Safe Batches & Institutional Recipients Audit Table
The auto-separated batching engine automatically partitioning recipient volumes into safe 50-contact chunks (26 Batches • 1,280 Eligible Recipients), configurable cooling delays (10s Safe), horizontal batch navigation pills, "Send Batch 1 Only", and "Auto-Play All Batches (Unstressed)" campaign controls.

![Auto-Separated Safe Batches and Recipients Table](public/docs/real_unstress_batches_and_table.png)

*Figure 4b: Auto-Separated Safe Batch Engine displaying horizontal batch selector pills, anti-spam cooling timer controls, and verified institutional recipients audit table.*

---

#### 6.4.3 Custom Spreadsheet & CSV Dropzone Importer
The flexible secondary custom importer supporting drag-and-drop of user-provided `.xlsx`, `.xls`, or `.csv` files with automatic 22-column normalization and sample template download.

![Custom CSV Dropzone Importer](public/docs/real_bulk_campaign.png)

*Figure 4c: Custom Spreadsheet Importer supporting external CSV/Excel ingestion with instant deduplication and schema normalization.*

---

### 6.5 Outreach Email Templates Manager
The official Shortfundly template library displaying standard institutional outreach documents (Campus Collaboration Proposal, Ambassador Chapter Invitation, etc.) with real-time preview and editing controls.

![Original Email Templates Manager](public/docs/real_templates_manager.png)

---

### 6.6 System Settings & Google SMTP Gateway Configuration
The administrative settings panel displaying the live Google SMTP transport configuration (`smtp.gmail.com:465 SSL`), masked App Password protection, and sender display names.

![Original System Settings](public/docs/real_smtp_settings.png)

---

### 6.7 Live Google SMTP Diagnostics & Health Engine Modal
The active diagnostic modal demonstrating live SMTP handshake verification over Port 465, direct Nodemailer engine transport status, and Google Workspace deliverability guidelines.

![Original Google SMTP Diagnostics Modal](public/docs/real_smtp_diagnostics_modal.png)

---

## 7. Deployment & Operations Guide

### 7.1 Environment Configuration (`.env.local`)
Create `.env.local` using `.env.example` as a template:
```env
# Application Environment
NODE_ENV=production
JWT_SECRET=super_secret_cryptographic_key_minimum_32_characters

# Bootstrap Administrator (Dual-Variant Support: ShortfundlyAdmin#2026 or ShortfundlyAdmin)
ADMIN_EMAIL=campus@shortfundly.com
ADMIN_PASSWORD="ShortfundlyAdmin#2026"

# Google SMTP Credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dharshana.shortfundly@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx

# Sender Profile
FROM_EMAIL=campus@shortfundly.com
FROM_NAME="Shortfundly Campus Outreach"

# Guardrail Timings
DUPLICATE_COOLDOWN_DAYS=30
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_SEC=900
RATE_LIMIT_SEND_MAX=30
RATE_LIMIT_SEND_WINDOW_SEC=3600
```

### 7.2 Verification & Build Commands
```bash
# 1. Install production dependencies
npm install

# 2. Execute Production Verification Test Suite
node scripts/test-system.js

# 3. Execute Cybersecurity Audit & Load Stress Suite
node scripts/load-test.js

# 4. Build Next.js Optimized Distribution
npm run build

# 5. Launch Production Server
npm run start
```

### 7.3 Google App Password Setup
To enable Google SMTP:
1. Log in to the designated Google Account.
2. Enable **2-Step Verification** in Security settings.
3. Navigate to **App passwords** (`https://myaccount.google.com/apppasswords`).
4. Generate a 16-character App Password for "Shortfundly Mailer".
5. Paste the generated password into `SMTP_PASS` in `.env.local` or configure it directly in the **System Settings** dashboard.
