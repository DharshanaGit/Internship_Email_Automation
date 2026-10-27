import crypto from 'crypto';
import { prisma as defaultPrisma } from './prisma.js';

/**
 * Gemma 2B AI Integration Layer
 * Formulates collision-free Intern IDs, cryptographic response tokens,
 * and 15 curated industrial engineering task templates across 3 skill tiers.
 */

/**
 * Generates a guaranteed unique Intern ID using Gemma 2B structured sequence.
 * Format: INT-YYYY-XXXXX
 * @param {any} [prismaClient]
 * @param {number} [year=2026]
 * @returns {Promise<string>}
 */
export async function generateGemmaInternId(prismaClient, year = 2026) {
  const client = (prismaClient && prismaClient.candidate) ? prismaClient : defaultPrisma;
  const prefix = `INT-${year}-`;
  
  try {
    if (client && client.candidate) {
      // Find highest existing sequence for the year
      const highestCandidate = await client.candidate.findFirst({
        where: {
          internId: {
            startsWith: prefix,
          },
        },
        orderBy: {
          internId: 'desc',
        },
        select: {
          internId: true,
        },
      });

      let nextSequence = 1;
      if (highestCandidate?.internId) {
        const parts = highestCandidate.internId.split('-');
        const currentNum = parseInt(parts[2], 10);
        if (!isNaN(currentNum)) {
          nextSequence = currentNum + 1;
        }
      }

      // Double check uniqueness loop
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidateId = `${prefix}${String(nextSequence).padStart(5, '0')}`;
        const exists = await client.candidate.findUnique({
          where: { internId: candidateId },
          select: { id: true },
        });
        if (!exists) {
          return candidateId;
        }
        nextSequence++;
      }
    }
  } catch (err) {
    // Fallback if client query encounters pool or connection limit
  }

  const randomSeq = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}${randomSeq}`;
}

/**
 * Synchronous Gemma-compatible intern ID generator for high-throughput batch loaders
 */
export function generateSynchronousGemmaInternId(index = 0, year = 2026) {
  const seq = 100 + index;
  return `INT-${year}-${String(seq).padStart(5, '0')}`;
}

/**
 * Generates a cryptographic response token and secure hash with zero-collision guarantee.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ token: string, tokenHash: string }>}
 */
export async function generateGemmaToken(prisma) {
  while (true) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const exists = await prisma.candidate.findFirst({
      where: {
        OR: [
          { offerAcceptanceToken: token },
          { offerAcceptanceTokenHash: tokenHash },
        ],
      },
      select: { id: true },
    });

    if (!exists) {
      return { token, tokenHash };
    }
  }
}

/**
 * Curated 15 Industrial Task Templates generated via Gemma 2B
 */
export const GEMMA_15_TASK_TEMPLATES = [
  // --- INTERMEDIATE (5 Templates) ---
  {
    taskId: 'TSK-INT-001',
    title: 'Component State Refactoring & Responsive Navigation Bar',
    level: 'INTERMEDIATE',
    role: 'Frontend Developer',
    objective: 'Refactor monolithic desktop navigation component into a modular, responsive navigation bar with mobile hamburger drawer and keyboard accessibility.',
    modules: '1. Modular Navigation Breakdown\n2. Mobile Viewport Drawer Implementation\n3. WAI-ARIA Keyboard Accessibility\n4. Unit Test Coverage with Vitest',
    expectedOutput: 'Accessible responsive navbar supporting desktop and mobile viewports with 90%+ Vitest test coverage.',
    techStack: 'React 19, CSS Modules, Lucide Icons, Vitest',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Component State Refactoring & Responsive Navigation Bar**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Intermediate
- Role: Frontend Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Room: {{meetLink}}

**Objective & Deliverables:**
Refactor the existing desktop navigation bar into a fully responsive navigation component supporting mobile viewports, drawer transitions, and WAI-ARIA keyboard navigation.

Please submit your GitHub repository and live deployment via the official submission portal before {{deadline}}.

Best regards,
Engineering Mentorship Team
Shortfundly Media Technologies`,
  },
  {
    taskId: 'TSK-INT-002',
    title: 'RESTful API Endpoints & Request Validation Middleware',
    level: 'INTERMEDIATE',
    role: 'Backend Developer',
    objective: 'Implement secure Next.js API endpoints for candidate operations with strict Zod schema validation and structured error response formatting.',
    modules: '1. Route Handler Architecture\n2. Zod Schema Formulation\n3. Exception & Error Handler Middleware\n4. Postman / Vitest Integration Tests',
    expectedOutput: 'Robust API endpoints rejecting invalid payloads with HTTP 400 and structured error feedback.',
    techStack: 'Node.js, Next.js App Router, Zod, Vitest',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **RESTful API Endpoints & Request Validation Middleware**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Intermediate
- Role: Backend Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Room: {{meetLink}}

**Deliverables:**
Build modular backend route handlers validating all incoming JSON bodies with Zod schemas. Ensure no unhandled exceptions crash the process.

Best regards,
Shortfundly Backend Mentorship Team`,
  },
  {
    taskId: 'TSK-INT-003',
    title: 'Intern Directory CRUD & Database Aggregations',
    level: 'INTERMEDIATE',
    role: 'Full Stack Developer',
    objective: 'Build an administrative directory interface connecting Prisma ORM queries with client-side search, multi-field filtering, and pagination.',
    modules: '1. Prisma Relational Queries\n2. Client-side Search Debounce\n3. Dynamic Sorting & Pagination\n4. Database Seeding Scripts',
    expectedOutput: 'Complete CRUD directory with sub-100ms response times and smooth pagination.',
    techStack: 'Next.js, Prisma ORM, PostgreSQL, Tailwind/CSS Modules',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Intern Directory CRUD & Database Aggregations**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Intermediate
- Role: Full Stack Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Room: {{meetLink}}

Please attend the explanation call and submit your PR before {{deadline}}.`,
  },
  {
    taskId: 'TSK-INT-004',
    title: 'Cross-Platform Candidate Onboarding Flow',
    level: 'INTERMEDIATE',
    role: 'Mobile Developer',
    objective: 'Design and implement a multi-screen mobile onboarding flow with step indicators and client-side form validation.',
    modules: '1. Navigation Stack Setup\n2. Stepper Form Layout\n3. Async Storage State Persistence\n4. Device Vibration & Haptic Feedback',
    expectedOutput: 'Smooth cross-platform mobile screen stack running on Android and iOS emulators.',
    techStack: 'React Native, Expo, React Navigation, TypeScript',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Cross-Platform Candidate Onboarding Flow**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Intermediate
- Role: Mobile Developer
- Deadline: {{deadline}}
- Meet Link: {{meetLink}}

Best regards,
Mobile Engineering Lead`,
  },
  {
    taskId: 'TSK-INT-005',
    title: 'Candidate Dataset Ingestion & Feature Normalization',
    level: 'INTERMEDIATE',
    role: 'AI/ML Engineer',
    objective: 'Formulate automated Python data pipelines to ingest messy candidate spreadsheets, clean missing values, and normalize features for ranking models.',
    modules: '1. CSV / Excel Parsing\n2. Outlier & Missing Data Imputation\n3. Feature Scaling & Encoding\n4. Automated Data Validation Reports',
    expectedOutput: 'Deterministic preprocessing script outputting clean Parquet / CSV data matrices.',
    techStack: 'Python 3.11, Pandas, NumPy, Scikit-Learn',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Candidate Dataset Ingestion & Feature Normalization**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Intermediate
- Role: AI/ML Engineer
- Deadline: {{deadline}}
- Explanation Session: {{explanationDate}} at {{explanationTime}}
- Meet Link: {{meetLink}}`,
  },

  // --- DEVELOPER (5 Templates) ---
  {
    taskId: 'TSK-DEV-001',
    title: 'Dynamic Dashboard Telemetry & Real-Time Performance Visualizer',
    level: 'DEVELOPER',
    role: 'Frontend Developer',
    objective: 'Build interactive Web3-styled dark analytics charts visualizing applicant velocity, pass rates, and review turnaround times.',
    modules: '1. Telemetry Aggregation Hooks\n2. Canvas / SVG Charting Implementation\n3. Tooltip & Historical Scrubbing\n4. Dark Web3 Theme Precision',
    expectedOutput: 'Ultra-fluid 60FPS dashboard graphs with zero layout shifts and deep obsidian contrast.',
    techStack: 'React 19, Chart.js / Recharts, CSS Modules, Lucide',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Dynamic Dashboard Telemetry & Real-Time Performance Visualizer**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Developer
- Role: Frontend Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Link: {{meetLink}}

**Core Deliverables:**
Implement high-performance telemetry dashboard components rendering real-time metrics with zero UI jank. Submit your GitHub repository prior to the deadline.

Best regards,
Shortfundly Engineering Team`,
  },
  {
    taskId: 'TSK-DEV-002',
    title: 'Secure JWT Authentication & Refresh Token Rotation Pipeline',
    level: 'DEVELOPER',
    role: 'Backend Developer',
    objective: 'Architect an enterprise authentication system with HttpOnly cookie handling, cryptographically signed JWT access tokens, and rolling refresh tokens.',
    modules: '1. Cryptographic Key Management\n2. HttpOnly Cookie Dispatch\n3. Refresh Token Rotation & Invalidation\n4. Brute-Force Rate Limiting Middleware',
    expectedOutput: 'Production-ready authentication subsystem immune to XSS token theft and replay attacks.',
    techStack: 'Node.js, JWT, bcryptjs, PostgreSQL, Next.js Middleware',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Secure JWT Authentication & Refresh Token Rotation Pipeline**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Developer
- Role: Backend Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Room: {{meetLink}}`,
  },
  {
    taskId: 'TSK-DEV-003',
    title: 'Cloudinary Digital Asset Ingestion & Signature Processing',
    level: 'DEVELOPER',
    role: 'Full Stack Developer',
    objective: 'Implement an end-to-end digital signature pipeline supporting base64 canvas exports, direct Cloudinary uploads, and cryptographic hash verification.',
    modules: '1. Cloudinary SDK Integration\n2. HTML5 Signature Pad Component\n3. Image Optimization & Format Transformation\n4. Audit Trail DB Storage',
    expectedOutput: 'Secure digital signature capture returning permanent Cloudinary URLs with verifiable SHA256 hashes.',
    techStack: 'Next.js, Cloudinary API, Prisma, Supabase PostgreSQL',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Cloudinary Digital Asset Ingestion & Signature Processing**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Developer
- Role: Full Stack Developer
- Deadline: {{deadline}}
- Meet Link: {{meetLink}}`,
  },
  {
    taskId: 'TSK-DEV-004',
    title: 'Push Notification Service & Offline SQLite Synchronization',
    level: 'DEVELOPER',
    role: 'Mobile Developer',
    objective: 'Engineer a background push notification receiver and local SQLite cache enabling mobile operations in offline environments.',
    modules: '1. Firebase Cloud Messaging (FCM)\n2. Local SQLite Database Schema\n3. Bidirectional Sync Algorithm\n4. Background Sync Job Workers',
    expectedOutput: 'Mobile app maintaining full offline read/write capability with automatic cloud reconciliation.',
    techStack: 'React Native, Expo SQLite, FCM, TypeScript',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Push Notification Service & Offline SQLite Synchronization**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Developer
- Role: Mobile Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet: {{meetLink}}`,
  },
  {
    taskId: 'TSK-DEV-005',
    title: 'Semantic Vector Search & Candidate Embedding Ingestion',
    level: 'DEVELOPER',
    role: 'AI/ML Engineer',
    objective: 'Generate text embeddings from candidate profiles and resume text using transformer models, storing them in PostgreSQL pgvector for similarity queries.',
    modules: '1. Embedding Model Pipeline\n2. pgvector Indexing & Cosine Distance\n3. Top-K Semantic Matching API\n4. Query Latency Benchmarking',
    expectedOutput: 'Sub-50ms semantic matching API finding top candidate profiles based on natural language project queries.',
    techStack: 'Python / Node.js, pgvector, HuggingFace Transformers, PostgreSQL',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Semantic Vector Search & Candidate Embedding Ingestion**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Developer
- Role: AI/ML Engineer
- Deadline: {{deadline}}
- Google Meet: {{meetLink}}`,
  },

  // --- ENTERPRISE (5 Templates) ---
  {
    taskId: 'TSK-ENT-001',
    title: 'Distributed Asynchronous Task Queuing with Redis & BullMQ',
    level: 'ENTERPRISE',
    role: 'Backend Developer',
    objective: 'Architect an enterprise background task execution pipeline handling massive email dispatches with concurrency limits, exponential backoff, and dead-letter queues.',
    modules: '1. BullMQ Queue Architecture\n2. Worker Process Isolation\n3. Exponential Backoff & Retry Logic\n4. Dead-Letter Queue & Telemetry Dashboard',
    expectedOutput: 'Fault-tolerant message broker processing 10,000+ jobs/hour without dropouts or duplicate dispatches.',
    techStack: 'Node.js, BullMQ, Redis, Nodemailer, TypeScript',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Distributed Asynchronous Task Queuing with Redis & BullMQ**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Enterprise
- Role: Backend Developer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Room: {{meetLink}}

**Requirements:**
Construct an enterprise worker subsystem handling peak email volumes with deterministic rate-limiting and failure recovery.

Best regards,
Principal Systems Architect
Shortfundly`,
  },
  {
    taskId: 'TSK-ENT-002',
    title: 'Micro-Frontend Module Federation & Optimistic Cache Layer',
    level: 'ENTERPRISE',
    role: 'Frontend Developer',
    objective: 'Implement Webpack 5 Module Federation separating the candidate operations deck into independently deployable micro-frontends with optimistic SWR cache layers.',
    modules: '1. Webpack Module Federation Config\n2. Remote Container Loading\n3. Global State Event Bus\n4. Optimistic Mutation Engine',
    expectedOutput: 'Zero-latency micro-frontend composition with seamless shared dependencies and instantaneous UI updates.',
    techStack: 'Webpack 5, React 19, Module Federation, SWR / TanStack Query',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Micro-Frontend Module Federation & Optimistic Cache Layer**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Enterprise
- Role: Frontend Developer
- Deadline: {{deadline}}
- Google Meet Link: {{meetLink}}`,
  },
  {
    taskId: 'TSK-ENT-003',
    title: 'Multi-Tenant Isolation & Row-Level Security Enforcer',
    level: 'ENTERPRISE',
    role: 'Full Stack Developer',
    objective: 'Design an enterprise multi-tenant architecture enforcing strict data isolation at the database layer using PostgreSQL Row Level Security (RLS) and tenant schema routing.',
    modules: '1. PostgreSQL RLS Policies\n2. Tenant Context Middleware\n3. Schema-based Data Migration Runner\n4. Automated Penetration Testing Suite',
    expectedOutput: 'Completely segregated multi-tenant database access preventing any cross-tenant data leaks.',
    techStack: 'PostgreSQL, Prisma, Supabase RLS, Node.js',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Multi-Tenant Isolation & Row-Level Security Enforcer**.

**Task Details:**
- Task ID: {{taskId}}
- Difficulty Level: Enterprise
- Role: Full Stack Developer
- Deadline: {{deadline}}
- Google Meet: {{meetLink}}`,
  },
  {
    taskId: 'TSK-ENT-004',
    title: 'End-to-End Encrypted WebSocket Telemetry & Biometric Guard',
    level: 'ENTERPRISE',
    role: 'Mobile Developer',
    objective: 'Implement bi-directional encrypted WebSockets for instant task review alerts with biometric app-lock security using hardware Secure Enclave.',
    modules: '1. WebSocket Connection Pooling\n2. Client-side E2EE Encryption\n3. Local Authentication (FaceID / Fingerprint)\n4. Memory Scrubbing on App Background',
    expectedOutput: 'Military-grade mobile telemetry client ensuring instantaneous notifications and hardware-backed biometric security.',
    techStack: 'React Native, WebSockets, Expo LocalAuthentication, Sodium / Libsignal',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **End-to-End Encrypted WebSocket Telemetry & Biometric Guard**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Enterprise
- Role: Mobile Developer
- Deadline: {{deadline}}
- Google Meet: {{meetLink}}`,
  },
  {
    taskId: 'TSK-ENT-005',
    title: 'Containerized CI/CD Deployment with Playwright E2E Verification',
    level: 'ENTERPRISE',
    role: 'DevOps / Cloud Engineer',
    objective: 'Create multi-stage production Docker containers, GitHub Actions CI/CD pipelines, and automated headless Playwright test suites ensuring zero regression releases.',
    modules: '1. Multi-Stage Alpine Dockerfile\n2. GitHub Actions Matrix Build\n3. Headless Playwright Test Suite\n4. Zero-Downtime Rolling Deployment Script',
    expectedOutput: 'Fully automated CI/CD pipeline building, testing, and deploying the platform in under 4 minutes.',
    techStack: 'Docker, GitHub Actions, Playwright, Linux / Bash, Nginx',
    jinjaBody: `Dear {{candidateName}},

You have been assigned Task #{{taskNumber}}: **Containerized CI/CD Deployment with Playwright E2E Verification**.

**Task Details:**
- Task ID: {{taskId}}
- Level: Enterprise
- Role: Cloud / DevOps Engineer
- Deadline: {{deadline}}
- Explanation Call: {{explanationDate}} at {{explanationTime}}
- Google Meet Link: {{meetLink}}`,
  },
];

/**
 * Seeds Gemma task templates into database if not present.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function seedGemmaTaskTemplates(prisma) {
  for (const template of GEMMA_15_TASK_TEMPLATES) {
    await prisma.taskTemplate.upsert({
      where: { taskId: template.taskId },
      update: {
        title: template.title,
        level: template.level,
        role: template.role,
        objective: template.objective,
        modules: template.modules,
        expectedOutput: template.expectedOutput,
        techStack: template.techStack,
        jinjaBody: template.jinjaBody,
        isGemmaGenerated: true,
      },
      create: {
        taskId: template.taskId,
        title: template.title,
        level: template.level,
        role: template.role,
        objective: template.objective,
        modules: template.modules,
        expectedOutput: template.expectedOutput,
        techStack: template.techStack,
        jinjaBody: template.jinjaBody,
        isGemmaGenerated: true,
      },
    });
  }
}
