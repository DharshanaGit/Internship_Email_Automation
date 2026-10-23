# Shortfundly Internship Email Automation Platform

> An enterprise-grade, automated internship management and email dispatch system architected for Shortfundly Media Technologies Pvt. Ltd.

Built with **Next.js 15 (App Router)**, **React 19**, **SQLite with Prisma ORM**, **Playwright**, and **Google Workspace APIs**.

---

## Architecture Overview

```
                                      INTERNSHIP LIFECYCLE
                                                │
    ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
    │                                           │                                           │
    ▼                                           ▼                                           ▼
Module 1: Offer Letter               Module 2: Assign Tasks                 Module 3: Reviews
  • Playwright Single-Page A4 PDF      • Gemma 2B AI Task Synthesis           • Review 1: Automated (No Feedback)
  • Digital Acceptance Trigger         • Google Calendar Meet API             • Review 2: Manual Mentor Feedback
  • Gmail-Style Split Preview          • RFC-5545 .ics Calendar Invite        • Sprint Milestone Completion
  • Bulk & Single Dispatch             • Bulk & Single Task Dispatch          • Bulk & Single Dispatch
                                                │
                                                ▼
                                   Module 4: Certificates
                                     • Canva-Style Playwright PDF
                                     • Eligibility Gate (Completed Tasks >= 1)
                                     • Founder Digital Signature & Verification
```

---

## Key Features

### 1. Module 1 — Automate Offer Letters
* **Single-Page A4 PDF Generation**: High-fidelity PDF rendering with Playwright adhering to exact brand guidelines, company seal, and founder sign-off.
* **Tokenized Acceptance Portal**: Dispatches a cryptographically signed token enabling candidates to accept their internship online via `/api/offers/accept`.
* **Gmail-Style Live Split Preview**: Real-time visual comparison of the email body, TLS security badge, recipient/Cc headers, and compiled PDF attachment before dispatch.

### 2. Module 2 — Assign Tasks & Virtual Briefing Calls
* **Gemma 2B AI Task Engine**: Role-specific sprint objectives, milestones, deliverables, tech stacks, and evaluation rubrics synthesized on demand.
* **Live Google Meet Room Provisioning**: Official non-expired Google Meet links created on demand via Google Calendar API (`conferenceDataVersion: 1`) and persisted to the candidate record.
* **RFC-5545 Calendar Integration**: Synchronized `.ics` meeting invites dispatched as email attachments compatible with Google Calendar, Microsoft Outlook, and Apple Calendar.
* **Sprint Progression**: When Task 1 and its 2 reviews finish, candidates automatically show in Assign Tasks as **Sprint 2 Ready**, auto-populating Sprint 2 deliverables.

### 3. Module 3 — Progressive Milestone Reviews
* **Review 1 (Automated Notice)**: Clean meeting schedule, Review 1 date/time, and Google Meet room with **no feedback notes**.
* **Review 2 (Candidate-Specific Manual Feedback)**: Expanded mentor notes editor allowing HR/mentors to write bespoke code reviews, evaluations, and action items per candidate.
* **Bulk Review 2 Dispatcher**: Multi-candidate review table with individual preview, custom date inputs, and bulk dispatch.
* **Automated Cron Pipeline**: Manual trigger button executes background review scheduler (`/api/cron/process-reviews`) to advance eligible cycles without waiting for calendar days to pass.

### 4. Module 4 — Internship Completion Certificates
* **Evaluation Gate Policy**: Candidates with `tasksCompleted < 1` receive **NO** certificate.
* **Canva-Style Official PDF**: Playwright generates certified completion certificates featuring the Shortfundly gold foil seal and founder signature.
* **Bulk & Single Issuance**: Issue individual certificates or bulk dispatch to all qualified candidates with custom subjects, messages, and Cc recipients.

---

## Cybersecurity & Defensive Engineering

* **Edge Authentication Middleware**: [`middleware.js`](./middleware.js) protects all `/dashboard/*` routes and redirects unauthorized traffic to `/login`.
* **HttpOnly Session Cookies**: Authenticated sessions utilize `HttpOnly: true`, `SameSite: 'lax'`, and scoped `Path: '/'`.
* **Bcrypt Password Cryptography**: Passwords hashed with at least 10 cost factor rounds (`$2b$10$`) with unique salts per user.
* **HMAC-SHA256 CAPTCHA Verification**: Visual SVG CAPTCHA challenge signed with cryptographic HMAC and a 5-minute replay expiry window.
* **Brute-Force Rate Limiting**: In-memory IP tracking restricts failed login attempts to 10 within a 15-minute sliding window (HTTP 429 lockout).
* **SQL Injection Immunity**: 100% of database queries utilize Prisma ORM parameterized statements; raw string concatenation is forbidden.
* **XSS Defense**: Handlebars HTML entity escaping (`{{...}}`) strictly sanitizes candidate names and user-supplied data in rendered documents.
* **Production Security Headers**: Configured in `next.config.js` including `Strict-Transport-Security (HSTS)`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 15.2.1 (App Router) |
| **UI Library** | React 19.0.0 |
| **Styling** | Vanilla CSS Modules (`dashboard.module.css`) & CSS Variables (Zero Tailwind) |
| **Database & ORM** | SQLite with Prisma ORM 6.4.1 |
| **PDF Generation** | Playwright 1.64.1 & Chromium Headless |
| **Email Dispatch** | Nodemailer 10.2.1 with SSL/TLS (Google SMTP) |
| **Calendar & Meet** | Google APIs (`googleapis` 187.0.0) & RFC-5545 iCalendar |
| **Testing** | Vitest 5.0.5 |
| **Validation** | Zod 4.6.7 & Handlebars 4.7.10 |

---

## Getting Started

### 1. Prerequisites
* Node.js 18.x or 20.x
* npm or yarn

### 2. Installation
```bash
git clone https://github.com/DharshanaGit/Internship_Email_Automation.git
cd Internship_Email_Automation
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Google SMTP credentials and Google OAuth credentials:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-google-app-password"

GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REFRESH_TOKEN="your-refresh-token"
```

### 4. Database Setup & Seeding
```bash
npx prisma db push
node prisma/seed.js
```

### 5. Running the Application
```bash
# Development mode
npm run dev

# Production build & start
npm run build
npm start
```
Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Automated Test Suites

The project includes 3 automated test suites with **34 total tests**:

```bash
npm test
```

* **`tests/cybersecurity.test.js`** (13 tests): Verifies password hashing, salt uniqueness, JWT anti-tampering, CAPTCHA replay defense, SQL injection immunity, role white-list enforcement, and certificate gate policies.
* **`tests/backend-e2e.test.js`** (6 tests): End-to-end verification of candidate creation, Gemma task generation, task assignment with calendar invites, Review 1 vs Review 2 logic, milestone completion, and Sprint 2 readiness.
* **`tests/system.test.js`** (15 tests): Verifies Playwright A4 Offer Letter PDF generation, Canva Certificate PDF rendering, Excel parsing, and live SMTP mailer delivery.

---

## License

This software is developed for Shortfundly Media Technologies Pvt. Ltd. All rights reserved.
