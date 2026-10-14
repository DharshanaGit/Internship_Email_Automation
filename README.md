# Shortfundly Campus Outreach Portal

**Connecting Campuses. Empowering Creators.**

A production-grade campus partnership and email automation portal engineered for **Shortfundly**, designed to connect educational institutions and student filmmakers with the Shortfundly Campus Pass ecosystem (Connect, Festival, Hub, Marketing, Ticket, and Tools).

---

## Key Capabilities

### 1. Outreach Dispatch & Bulk Automation
- **Single Manual Outreach**: Compose, customize, review, and dispatch individual proposals with automated duplicate checks and live variable interpolation.
- **Bulk CSV Upload & Campaign Engine**:
  - Drag-and-drop CSV import with downloadable template (`sample_college_outreach.csv`).
  - Pre-flight validation breakdown: Total Contacts, Valid Addresses, Invalid Rows, CSV Duplicates, and In-Cooldown Contacts (30-day window).
  - Row-level selection checkboxes, *Select All*, *Deselect All*, and *Select Eligible Only*.
  - Template selection, live variable merging, and per-contact visual preview.
  - Rate-limited sequential dispatch with live progress tracking (Sent, Failed, Remaining).
  - **Zero Shared Header Privacy Guarantee**: Each recipient receives an individual, isolated email. Recipient addresses are never shared across To, CC, or BCC fields.

### 2. Cybersecurity & Access Control
- **Cryptographic CAPTCHA**: Self-contained SVG CAPTCHA challenge with HMAC-SHA256 timestamped signatures, preventing automated credential stuffing without relying on third-party APIs.
- **Role-Based Access Control (RBAC)**:
  - `Admin`: Full system control (Google SMTP gateway configuration, user management, template deletion, outreach records).
  - `Team Lead`: Template creation/editing, outreach dispatch, campaign management.
  - `Manager`: Read-only access to dashboard and records by default; granular dispatch authorization assignable by Administrator.
- **Security Hardening**:
  - `bcrypt` hashing (12 work factor rounds) for all user credentials.
  - HTTP-only, SameSite=lax JWT session cookies with 8-hour TTL and database revocation checks.
  - In-memory sliding window rate limiters on login attempts and outreach dispatches.
  - Full SQL injection immunity with 100% parameterized SQLite statements (`node:sqlite`).
  - Comprehensive OWASP security headers (CSP, nosniff, frame protection, referrer policy).
  - CSRF origin validation on all state-mutating API routes.
  - Immutable security audit log ledger in SQLite (`audit_logs`).

### 3. Production Google SMTP Gateway
- Integrated **Nodemailer** transport pool configured for `smtp.gmail.com:465` (Direct SSL/TLS).
- Dynamic, database-backed SMTP configuration with live connection handshake testing and latency reporting.
- Error classification separating transient network timeouts from permanent 5xx mailbox errors.

### 4. Modern Professional White Theme UI
- Pure CSS Modules (`*.module.css`) with native CSS custom properties.
- Strictly zero external UI libraries or utility-first frameworks.
- Clean typography, accessible contrast, responsive sidebar layout, and real-time KPI metrics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | JavaScript & JSX (Strictly No TypeScript) |
| **Styling** | Pure CSS Modules (`*.module.css`) & Native CSS Variables |
| **Database** | SQLite via built-in `node:sqlite` (`DatabaseSync` with WAL mode) |
| **Authentication** | JWT (`jose`), `bcryptjs`, Cryptographic HMAC CAPTCHA |
| **Email Protocol** | Nodemailer (Google SMTP over SSL/TLS) |
| **Validation** | Zod runtime schema validation |

---

## Getting Started

### Prerequisites
- Node.js v20+ or v24+
- A Google Account with an **App Password** generated at [Google App Passwords](https://myaccount.google.com/apppasswords)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/DharshanaGit/Shortfundly_Campus_Email_Automation.git
   cd Shortfundly_Campus_Email_Automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Configure your Google SMTP user and 16-character App Password in `.env.local`:
   ```env
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```

4. Run the production readiness test suite:
   ```bash
   node scripts/test-system.js
   ```

5. Build and launch:
   ```bash
   npm run build
   npm run start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Administrator Credentials
- **Email**: `campus@shortfundly.com`
- **Password**: `ShortfundlyAdmin#2026`

*(Credentials and secrets can be customized in `.env.local` and through the System Settings dashboard).*

---

## License
Proprietary &copy; 2026 Shortfundly. All rights reserved.
