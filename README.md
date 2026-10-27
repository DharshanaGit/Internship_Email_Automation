# Shortfundly Internship Email Automation & Operations Platform

> Enterprise-grade, Web3-inspired internship operations, candidate onboarding, and automated email dispatch platform architected for **Shortfundly Media Technologies Pvt. Ltd.**

Built with **Next.js 16 (App Router)**, **React 19**, **Supabase (PostgreSQL) with Prisma ORM**, **Playwright Headless Engine**, **Gemma 2B AI Engine**, and **Google Workspace & Meet APIs**.

---

## Architecture Overview

```
                                      INTERNSHIP OPERATIONS LIFECYCLE
                                                    │
        ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
        │                                           │                                           │
        ▼                                           ▼                                           ▼
Module 1: Offer Dispatch              Module 2: Sprint Briefing             Module 3: Milestone Reviews
  • Strict Sequential Validation Form   • Gemma 2B AI Task Synthesis          • Review 1: Automated Briefing Call
  • Bulk Excel / CSV Dataset Loader     • Google Meet Room Generation         • Review 2: Bespoke Mentor Feedback
  • Gemma 2B Unique Intern ID Engine    • RFC-5545 .ics Calendar Invite       • Sprint Milestone Completion
  • Tokenized Portal URL & Expiration   • Task Templates CRUD & Live Preview  • Automated Cron Review Advancement
  • Plain-Text Jinja Template Engine    • Multi-Role Sprint Assignment        • Batch Progression Engine
  • Dual Live Preview (Email + PDF)                 │                                           │
  • Playwright Single-Page A4 PDF                   ▼                                           ▼
  • Candidate Digital Signature Portal         Module 4: Performance Certificate Deck
  • Cloudinary Signature Photo Ingestion         • Canvas-Style Playwright Gold Foil PDF
  • Automatic Joining-Date Batching              • Completed Tasks Eligibility Gate (Tasks >= 1)
                                                 • CEO Performance-Based Approval Queue
                                                 • Cryptographic Verification QR & Signatures
```

---

## Key Modules & Core Capabilities

### 1. Modern Web3 UI/UX Design System
* **Obsidian Black & Purple Aesthetic**: Ultra-modern visual palette (`#000000`, `#09090b`, `#141417`, `#7c3aed`, `#c084fc`) engineered with high contrast, responsive typography, and tactile status indicators.
* **Autofill Security & Theme Integrity**: Strict CSS protection preventing browser autofill from turning inputs or password fields white. All fields maintain theme consistency across Safari, Chrome, Firefox, and Edge.
* **Real-Time Client-Side Validation**: Immediate feedback on email lowercase formatting, password matching, and role constraints prior to form submission.

### 2. Module 1 — Automate Offer Letters & Candidate Onboarding
* **Strict Sequential Single Offer Form**: Field (N) remains locked until Field (N-1) passes strict Zod validation. Includes real-time error hints, required red asterisks, and sequential unlock animations.
* **Bulk Dataset Ingestion (CSV / Excel)**: High-speed parsing via `exceljs` and `xlsx`. Sanitizes cells against type errors, detects duplicates, separates invalid rows, and provides a **Clear Uploaded Dataset** action to reset and reload files anytime.
* **Gemma 2B Unique Intern ID Generation**: Generates deterministic, collision-proof Intern IDs (e.g. `INT-2026-00042`) backed by database sequence counters and AI pattern verification.
* **Expiring Candidate Response Portals**: Each candidate receives an expiring cryptographic response link (`/offers/respond?token=...`). HR sets and customizes expiration deadlines.
* **Candidate Acceptance & Cloudinary Signature Ingestion**: In their secure response portal, candidates review terms, sign digitally via HTML5 canvas, or upload a photo of their physical signature (safely persisted to Cloudinary), confirming acceptance and automatically grouping them into batches based on joining date.
* **Jinja Text Template Engine**: Intuitive plain-text Jinja editing (`{{candidateName}}`, `{{role}}`, `{{internId}}`, `{{startDate}}`, `{{duration}}`, `{{stipend}}`, `{{deadline}}`, `{{responseUrl}}`). No raw HTML tags required.
* **Dual Live Preview**: Instant toggle between an authentic Email Client Preview and a high-fidelity Single-Page A4 Offer Letter PDF Document Preview.
* **Playwright Single-Page A4 PDF**: Headless Chromium renders pixel-perfect PDF offer letters with Shortfundly letterhead, Ref ID badges, and corporate seal.

### 3. Module 2 — Task Assignment & Google Meet Virtual Briefings
* **Gemma 2B AI Task Engine**: Dynamically synthesizes sprint objectives, technical stacks, deliverables, and evaluation rubrics customized to the intern's role.
* **Live Google Meet Room Provisioning**: Official Google Meet conference rooms generated via Google Calendar API (`conferenceDataVersion: 1`), persisted directly to candidate records.
* **RFC-5545 Calendar Integration**: Attaches synchronized `.ics` calendar events compatible with Google Calendar, Microsoft Outlook, and Apple Calendar.
* **Task Template Management**: Complete CRUD interface with Jinja variable insertions and real-time live preview for standardizing recurring assignments.

### 4. Module 3 — Progressive Milestone Reviews
* **Review 1 (Automated Briefing Call)**: Sends clean schedule notice, Google Meet link, and meeting expectations without mentor feedback notes.
* **Review 2 (Personalized Mentor Feedback)**: Provides bespoke evaluation editor for mentors to record individualized code review feedback, strengths, and sprint action items.
* **Bulk Review 2 Dispatcher**: Multi-candidate review table with custom date selectors, individual preview, and batch email dispatch.
* **Automated Cron Pipeline**: Manual trigger button executes background review scheduler (`/api/cron/process-reviews`) to advance eligible cycles without waiting for calendar days to pass.

### 5. Module 4 — Internship Completion Certificates
* **Eligibility Policy Gate**: Candidates with `tasksCompleted < 1` are locked from receiving certificates.
* **Canva-Style Official PDF**: Playwright generates certified completion certificates featuring the Shortfundly gold foil seal, serial numbers, and founder signature.
* **CEO Approval Queue**: Executive dashboard enabling CEO review and digital sign-off before official certificate dispatch.

---

## Cybersecurity & Defensive Architecture

* **Edge Authentication Middleware**: [`middleware.js`](./middleware.js) protects all `/dashboard/*` routes and redirects unauthorized traffic to `/login`.
* **HttpOnly Session Cookies**: Authenticated sessions utilize `HttpOnly: true`, `SameSite: 'lax'`, and scoped `Path: '/'`.
* **Bcrypt Password Cryptography**: Passwords hashed with 10 cost factor rounds (`$2b$10$`) with unique salts per user.
* **HMAC-SHA256 CAPTCHA Challenge**: Dynamic SVG CAPTCHA challenge verified with cryptographic HMAC and a 5-minute replay expiry window.
* **Brute-Force Rate Limiting**: In-memory IP tracking restricts failed login attempts to 10 within a 15-minute sliding window (HTTP 429 lockout).
* **SQL Injection Immunity**: 100% of database operations utilize Prisma ORM parameterized statements; raw string concatenation is forbidden.
* **Secret Protection & Isolation**: Strict `.gitignore` policy excluding `.env*`, database files (`*.db`), credentials JSON, and private keys from git history.
* **Production Security Headers**: Configured in `next.config.js` including `Strict-Transport-Security (HSTS)`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.4.3 (App Router) |
| **UI Library** | React 19.0.0 |
| **Styling** | Vanilla CSS Modules (`dashboard.module.css`, `login.module.css`) & Obsidian Web3 Theme |
| **Database & ORM** | Supabase (PostgreSQL) / SQLite with Prisma ORM 6.4.1 |
| **PDF Generation** | Playwright 1.64.1 & Chromium Headless |
| **Email Dispatch** | Nodemailer 10.2.1 with SSL/TLS (Google SMTP) |
| **Calendar & Meet** | Google APIs (`googleapis` 187.0.0) & RFC-5545 iCalendar |
| **Cloud Storage** | Cloudinary SDK (Candidate Signature Ingestion) |
| **Testing** | Vitest 5.0.5 (`--fileParallelism=false`) |
| **Validation** | Zod 4.6.7 & Jinja Template Engine |

---

## Getting Started

### 1. Prerequisites
* Node.js 18.x or 20.x
* npm or yarn
* Supabase PostgreSQL database or local SQLite instance

### 2. Installation
```bash
git clone https://github.com/DharshanaGit/Internship_Email_Automation.git
cd Internship_Email_Automation
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (never commit this file to version control):
```env
# Database Connection (Supabase PostgreSQL or SQLite)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Application URL (Use your deployed Vercel domain in production)
APP_BASE_URL="https://internship-email-automation.vercel.app"
NEXT_PUBLIC_APP_URL="https://internship-email-automation.vercel.app"

# Google SMTP Credentials
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-google-app-password"

# Google Workspace / Calendar Meet OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REFRESH_TOKEN="your-refresh-token"

# Cloudinary Storage (For candidate digital signatures)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Administrative Credentials
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="your-secure-admin-password"
HR_EMAIL="hr@gmail.com"
HR_PASSWORD="your-secure-hr-password"
CEO_EMAIL="ceo@gmail.com"
CEO_PASSWORD="your-secure-ceo-password"
```

### 4. Database Setup & Seeding
```bash
npx prisma db push
node prisma/seed.js
```

### 5. Running the Application
```bash
# Development mode (port 3001)
npm run dev

# Production build & start (port 3000)
npm run build
npm start
```
Navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## Automated Test Verification

The application includes 5 comprehensive test suites covering 47 automated tests:

```bash
npm test
```

* **`tests/cybersecurity.test.js`** (13 tests): Password hashing, salt randomness, SQL injection immunity, CAPTCHA HMAC replay defense, role authorization gates.
* **`tests/system.test.js`** (15 tests): Authentication, Prisma CRUD, Playwright A4 Offer Letter & Canva Certificate PDF generation, live SMTP mailer delivery.
* **`tests/google-meet.test.js`** (9 tests): Lifecycle status transitions, Google Meet link generation, meeting rescheduling and candidate task sync.
* **`tests/mailer-deliverability.test.js`** (4 tests): SPF/DKIM/DMARC alignment, anti-spam headers, plain-text fallback generation.
* **`tests/backend-e2e.test.js`** (6 tests): End-to-end candidate lifecycle, task assignment, multi-sprint advancement, and cleanup.

---

## License

Developed for Shortfundly Media Technologies Pvt. Ltd. All rights reserved.
