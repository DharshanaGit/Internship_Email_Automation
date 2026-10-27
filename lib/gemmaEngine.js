/**
 * Gemma 2B Automation Engine
 * Powers role-based task generation, progressive sprint deliverables,
 * and AI feedback synthesis for Shortfundly internship automation.
 */

// Comprehensive Gemma 2B Prompt & Knowledge Base for Shortfundly Roles
const ROLE_PROMPTS = {
  'Web Developer': {
    tasks: [
      {
        title: 'Sprint 1: Component Library & RESTful API Architecture',
        description: `Objective: Construct modular Next.js responsive UI components using CSS Modules and connect with SQLite backend endpoints.\n\nDeliverables:\n1. Reusable UI components adhering to modern Web3 dark aesthetic.\n2. RESTful route handler with Zod input validation and error boundaries.\n3. Unit test suite covering component rendering and API states.\n\nTech Stack: Next.js, React 19, CSS Modules, SQLite, Prisma ORM.\nEvaluation Rubric: Clean architecture, zero console warnings, responsive layout across all breakpoints.`,
      },
      {
        title: 'Sprint 2: Authentication, Security Auditing & Session Management',
        description: `Objective: Implement cryptographic authentication with JWT session cookies and rate-limiting.\n\nDeliverables:\n1. Secure HTTP-only cookie session management.\n2. Server-side bcrypt hashing and input sanitization.\n3. Security test report detailing penetration vectors and mitigations.\n\nTech Stack: Jose/JWT, Bcrypt.js, Next.js Middleware.\nEvaluation Rubric: Zero token leakage, strict SameSite cookie enforcement.`,
      },
      {
        title: 'Sprint 3: High-Performance Data Streaming & Telemetry Pipeline',
        description: `Objective: Build real-time operational telemetry tracking email delivery states and failure queues.\n\nDeliverables:\n1. Optimized Prisma queries with indexing and pagination.\n2. Live event stream handler for provider webhook ingestion.\n3. Interactive dashboard charts and error monitoring deck.\n\nTech Stack: Prisma 6, SQLite, Server Actions, SVG charts.\nEvaluation Rubric: Query execution time under 50ms, resilient error handling.`,
      },
    ],
    feedbacks: [
      'Excellent execution on component modularity and CSS scoping. Code structure adheres to clean separation of concerns. Suggested optimization: add memoization for large table renders.',
      'Strong security architecture implementation with proper token expiration and cryptographic hashing. Verification tests passed with 100% assertions satisfied.',
      'Outstanding database schema optimization and telemetry streaming. Performance benchmarks exceeded targets with under 35ms query latency.',
    ],
  },

  'Digital Marketing': {
    tasks: [
      {
        title: 'Sprint 1: Technical SEO Audit & Conversion Funnel Optimization',
        description: `Objective: Audit Shortfundly web presence, identify indexing bottlenecks, and architect organic acquisition funnel.\n\nDeliverables:\n1. 25-point Technical SEO Audit report with Core Web Vitals assessment.\n2. High-converting metadata schema and OpenGraph implementation.\n3. Multi-channel keyword positioning matrix.\n\nTech Stack: Google Search Console, SEMrush, Schema.org JSON-LD.\nEvaluation Rubric: Actionable insights, data fidelity, strategic alignment with demographic targets.`,
      },
      {
        title: 'Sprint 2: Multi-Channel Organic Content & Social Engagement Campaign',
        description: `Objective: Create a 14-day synchronized social campaign across LinkedIn, Twitter/X, and YouTube.\n\nDeliverables:\n1. Complete content calendar with copy variants and visual briefs.\n2. Short-form engagement hooks and community discussion prompts.\n3. UTM tracking matrix for cross-platform attribution.\n\nTech Stack: Buffer/Hootsuite, Google Analytics 4, Notion.\nEvaluation Rubric: Creative resonance, brand consistency, clear call-to-actions.`,
      },
    ],
    feedbacks: [
      'Comprehensive keyword analysis with high-intent targeting. Recommendations for site speed and semantic markup are spot-on.',
      'Creative copy demonstrates deep understanding of target audience. Attribution matrix provides clear visibility into conversion pathways.',
    ],
  },

  'Data Analytics': {
    tasks: [
      {
        title: 'Sprint 1: Automated ETL Pipeline & Dataset Normalization',
        description: `Objective: Ingest raw operational logs, clean anomalies, and construct relational database schemas.\n\nDeliverables:\n1. Python data cleaning script handling null values, type coercion, and outliers.\n2. Normalized SQLite schema supporting rapid aggregations.\n3. Exploratory Data Analysis report with statistical variance measures.\n\nTech Stack: Python, Pandas, SQLite, Prisma.\nEvaluation Rubric: Pipeline idempotency, data loss prevention, mathematical rigor.`,
      },
      {
        title: 'Sprint 2: Executive KPI Modeling & Interactive Visualizations',
        description: `Objective: Design interactive dashboard visualizations tracking candidate completion funnels.\n\nDeliverables:\n1. Metric models calculating retention, completion velocity, and email open rates.\n2. Clean SVG/Canvas visual charts.\n3. Executive insights deck highlighting operational friction points.\n\nTech Stack: Python, Matplotlib, Chart.js, SQL.\nEvaluation Rubric: Insight clarity, visualization aesthetics, query performance.`,
      },
    ],
    feedbacks: [
      'Data transformation pipeline is clean and handles edge cases gracefully. Schema normalization significantly reduces redundancy.',
      'Executive dashboard provides immediate operational clarity. Insights on delivery bottlenecks are highly actionable.',
    ],
  },

  'UI/UX Design': {
    tasks: [
      {
        title: 'Sprint 1: Web3 Design System Tokens & Wireframe Architecture',
        description: `Objective: Formulate comprehensive design system tokens adhering to modern Web3 obsidian aesthetic.\n\nDeliverables:\n1. Complete color token system, typography scale, and responsive layout grid.\n2. Low-fidelity wireframes mapping end-to-end internship lifecycle.\n3. Accessibility audit ensuring WCAG 2.1 AA compliance.\n\nTech Stack: Figma, Design Tokens, FigJam.\nEvaluation Rubric: Visual hierarchy, contrast ratio adherence, component reusability.`,
      },
      {
        title: 'Sprint 2: High-Fidelity Interactive Prototype & Micro-Interactions',
        description: `Objective: Build high-fidelity clickable prototype for candidate offer letter and task tracker.\n\nDeliverables:\n1. Pixel-perfect components for desktop and mobile viewport states.\n2. Interactive states (hover, active, disabled, loading, empty).\n3. Developer handoff specification document with CSS variable mappings.\n\nTech Stack: Figma Component Variants, Auto-Layout.\nEvaluation Rubric: Micro-interaction smoothness, visual Polish, clear developer specs.`,
      },
    ],
    feedbacks: [
      'Exceptional design token architecture with cohesive color harmony. High-contrast typography significantly enhances readability.',
      'Clickable prototype feels responsive and intuitive. Developer specifications are thorough with exact pixel dimensions and spacing.',
    ],
  },

  'Python / AI': {
    tasks: [
      {
        title: 'Sprint 1: Gemma 2B Inference Pipeline & Prompt Engineering',
        description: `Objective: Build a local LLM inference pipeline for automated feedback generation and task evaluation.\n\nDeliverables:\n1. Local Gemma 2B prompt orchestration module with structured JSON output.\n2. Few-shot evaluation rubric for automated candidate work grading.\n3. Latency optimization and memory cache implementation.\n\nTech Stack: Python, Hugging Face, Transformers, SQLite.\nEvaluation Rubric: Prompt precision, zero hallucination, predictable schema compliance.`,
      },
      {
        title: 'Sprint 2: Automated Code Reviewer & Static Analysis Agent',
        description: `Objective: Construct an autonomous code analysis bot scanning candidate pull requests.\n\nDeliverables:\n1. AST parser analyzing code complexity and linting rules.\n2. Automated feedback generator delivering actionable suggestions.\n3. GitHub Action webhook integration.\n\nTech Stack: Python AST, Flake8, FastApi, Webhooks.\nEvaluation Rubric: False-positive minimization, review turnaround speed.`,
      },
    ],
    feedbacks: [
      'Gemma prompt engineering demonstrates strong constraint adherence. Inference pipeline executes within target memory budgets.',
      'Static analysis agent accurately identifies anti-patterns and generates constructive refactoring suggestions.',
    ],
  },
};

export const ROLE_TIERED_TASKS = {
  'Web Developer': {
    Intermediate: {
      taskId: 'TSK-WD-INT',
      taskName: 'Responsive Frontend Architecture & API Gateway Integration',
      objective: 'Construct responsive Next.js frontend interfaces connected to REST endpoints with Zod validation.',
      modules: 'Modular Component Library, Route Handlers, Form Validation, Error Boundaries',
      toolsAndTech: 'Next.js 15, React 19, CSS Modules, Zod, SQLite, Prisma ORM',
      clientRequirements: 'Clean Web3 black UI without glow artifacts, zero hydration errors, under 50ms API response time.',
    },
    Developer: {
      taskId: 'TSK-WD-DEV',
      taskName: 'Cryptographic Auth, JWT Session Management & Rate Limiting',
      objective: 'Implement end-to-end security pipeline with HTTP-only JWT cookies, bcrypt salt hashing, and rate limiting.',
      modules: 'Authentication API, RBAC Middleware, Brute-force Lockout, HMAC-SHA256 CAPTCHA',
      toolsAndTech: 'Next.js Middleware, JSONWebToken, Bcrypt.js, Crypto HMAC',
      clientRequirements: 'Strict session isolation across Admin, HR, and CEO roles, zero credential leakage in client bundle.',
    },
    Enterprise: {
      taskId: 'TSK-WD-ENT',
      taskName: 'Distributed Task Queue, Google Calendar Conferencing & Cloudinary Pipeline',
      objective: 'Build autonomous background queue worker with genuine Google Meet provisioning and Cloudinary asset management.',
      modules: 'Background Worker, Google Calendar API v3 Conference Provisioning, Cloudinary SDK, Multi-part Mailer',
      toolsAndTech: 'Cloudinary Node SDK, Google Calendar v3, Nodemailer, SQLite/Supabase PostgreSQL',
      clientRequirements: 'Persistent conference IDs without random fallbacks, secure server-side file streaming, zero credentials in client.',
    },
  },
  'Digital Marketing': {
    Intermediate: {
      taskId: 'TSK-DM-INT',
      taskName: 'Technical SEO Audit & Conversion Funnel Optimization',
      objective: 'Audit web presence, identify indexing bottlenecks, and architect organic acquisition funnel.',
      modules: 'Technical SEO Assessment, Core Web Vitals, Structured JSON-LD Schema',
      toolsAndTech: 'Google Search Console, Schema.org, SEMrush, Google Analytics 4',
      clientRequirements: 'Comprehensive 25-point audit report with actionable Core Web Vitals remediation matrix.',
    },
    Developer: {
      taskId: 'TSK-DM-DEV',
      taskName: 'Multi-Channel Social Engagement Campaign & Attribution Tracking',
      objective: 'Deploy synchronized 14-day campaign across LinkedIn, Twitter/X, and YouTube with UTM tracking.',
      modules: 'Content Calendar, Cross-platform Attribution, Hook Copy Variants',
      toolsAndTech: 'Notion, GA4, Buffer, Meta Business Suite',
      clientRequirements: 'Accurate UTM tracking matrix providing clear conversion pathways for candidate acquisition.',
    },
    Enterprise: {
      taskId: 'TSK-DM-ENT',
      taskName: 'Automated Growth Loops, Viral Referral Engineering & Paid Retargeting',
      objective: 'Engineer automated candidate referral loops and paid multi-touch conversion funnels.',
      modules: 'Referral Engine, Lookalike Audience Modeling, Custom Event Webhooks',
      toolsAndTech: 'Google Tag Manager, PostHog, Segment, Meta Conversion API',
      clientRequirements: 'End-to-end automated conversion pipeline with CPA reduction target of 25%.',
    },
  },
  'Data Analytics': {
    Intermediate: {
      taskId: 'TSK-DA-INT',
      taskName: 'Automated ETL Pipeline & Dataset Normalization',
      objective: 'Ingest raw operational logs, clean anomalies, and construct relational database schemas.',
      modules: 'Data Cleaning Script, Outlier Detection, Relational Schema Normalization',
      toolsAndTech: 'Python, Pandas, SQLite, Prisma ORM',
      clientRequirements: 'Zero data truncation, idempotent execution, and automated type coercion for CSV/Excel data.',
    },
    Developer: {
      taskId: 'TSK-DA-DEV',
      taskName: 'Executive KPI Modeling & Interactive Visualizations',
      objective: 'Design interactive dashboard visualizations tracking candidate completion funnels and performance scores.',
      modules: 'Metric Computation Engine, Completion Velocity Modeling, Visual Charts',
      toolsAndTech: 'Python, Matplotlib, Chart.js, SQL Aggregations',
      clientRequirements: 'Executive dashboard with sub-second query latency across 10,000+ candidate records.',
    },
    Enterprise: {
      taskId: 'TSK-DA-ENT',
      taskName: 'Predictive Candidate Churn Modeling & Machine Learning Telemetry',
      objective: 'Train predictive classification model forecasting candidate milestone drop-offs and deadline misses.',
      modules: 'Feature Engineering, XGBoost/Scikit-learn Model Training, Inference Endpoint',
      toolsAndTech: 'Python, Scikit-learn, XGBoost, Joblib, FastAPI',
      clientRequirements: 'Model accuracy over 85% with explainable feature importance metrics.',
    },
  },
  'UI/UX Design': {
    Intermediate: {
      taskId: 'TSK-UX-INT',
      taskName: 'Web3 Design System Tokens & Wireframe Architecture',
      objective: 'Formulate comprehensive design system tokens adhering to modern Web3 black aesthetic.',
      modules: 'Color Tokens, Typographic Scale, Component Grid, Wireframes',
      toolsAndTech: 'Figma, Design Tokens, WCAG 2.1 AA Guidelines',
      clientRequirements: 'Zero neon glow shadows, high-contrast monochrome aesthetic, fully accessible contrast ratios.',
    },
    Developer: {
      taskId: 'TSK-UX-DEV',
      taskName: 'High-Fidelity Interactive Prototype & Micro-Interactions',
      objective: 'Build high-fidelity clickable prototype for candidate offer letter and task tracker.',
      modules: 'Desktop/Mobile Viewports, Component Variants, Interactive States',
      toolsAndTech: 'Figma Auto-Layout, Component Variants, CSS Variable Specs',
      clientRequirements: 'Pixel-perfect alignment, micro-interaction smoothness, detailed developer handoff specs.',
    },
    Enterprise: {
      taskId: 'TSK-UX-ENT',
      taskName: 'Design Systems Ops, Token Automation & User Research Synthesis',
      objective: 'Automate design token export into CSS variables and conduct usability audits.',
      modules: 'Token CI/CD Sync, Usability Heatmaps, Interactive Component Matrix',
      toolsAndTech: 'Style Dictionary, Figma Tokens, Hotjar, UserTesting',
      clientRequirements: 'Automated token export pipeline syncing Figma styles directly with frontend CSS Modules.',
    },
  },
  'Python / AI': {
    Intermediate: {
      taskId: 'TSK-AI-INT',
      taskName: 'Gemma 2B Prompt Engineering & Structured Inference Pipeline',
      objective: 'Build local LLM inference pipeline for automated feedback generation and task evaluation.',
      modules: 'Prompt Orchestration, Few-shot Rubrics, JSON Output Schema',
      toolsAndTech: 'Python, Hugging Face, Transformers, Gemma 2B',
      clientRequirements: 'Zero hallucination, deterministic JSON schema compliance, under 2GB VRAM consumption.',
    },
    Developer: {
      taskId: 'TSK-AI-DEV',
      taskName: 'Autonomous Code Reviewer & Static AST Analysis Agent',
      objective: 'Construct autonomous code analysis bot scanning candidate repository deliverables.',
      modules: 'AST Parser, Complexity Scoring, Automated Feedback Dispatch',
      toolsAndTech: 'Python AST, Flake8, FastApi, GitHub Webhooks',
      clientRequirements: 'Constructive refactoring suggestions with under 3-second turnaround time per pull request.',
    },
    Enterprise: {
      taskId: 'TSK-AI-ENT',
      taskName: 'Agentic Workflow Orchestrator & Multi-Turn Interview AI',
      objective: 'Architect autonomous multi-agent system coordinating interview review scheduling and code execution.',
      modules: 'Agent State Machine, Tool Calling Pipeline, Sandboxed Code Execution',
      toolsAndTech: 'LangChain/LlamaIndex, Docker Sandbox, Redis, PostgreSQL',
      clientRequirements: 'Secure sandboxed code execution with automated penalty and score compilation.',
    },
  },
};

export function getTaskByRoleAndTier(roleName = 'Web Developer', tier = 'Developer') {
  const normRole = Object.keys(ROLE_TIERED_TASKS).find((k) =>
    roleName.toLowerCase().includes(k.toLowerCase())
  ) || 'Web Developer';

  const roleObj = ROLE_TIERED_TASKS[normRole] || ROLE_TIERED_TASKS['Web Developer'];
  const task = roleObj[tier] || roleObj['Developer'];

  return {
    ...task,
    role: normRole,
    tier,
  };
}
export function generateGemmaTask(roleName = 'Web Developer', taskIndex = 0) {
  const normRole = Object.keys(ROLE_PROMPTS).find((k) =>
    roleName.toLowerCase().includes(k.toLowerCase())
  ) || 'Web Developer';

  const presets = ROLE_PROMPTS[normRole].tasks;
  const task = presets[taskIndex % presets.length];

  return {
    title: task.title,
    description: task.description,
    role: normRole,
  };
}

/**
 * Generate progressive review feedback using Gemma intelligence
 */
export function generateGemmaFeedback(roleName = 'Web Developer', taskNumber = 1, reviewCycle = 2) {
  const normRole = Object.keys(ROLE_PROMPTS).find((k) =>
    roleName.toLowerCase().includes(k.toLowerCase())
  ) || 'Web Developer';

  const feedbacks = ROLE_PROMPTS[normRole].feedbacks;
  const feedbackText = feedbacks[(taskNumber - 1) % feedbacks.length] || feedbacks[0];

  return {
    title: `Progressive Milestone Review (Cycle ${reviewCycle}) - ${normRole}`,
    feedback: feedbackText,
    score: Math.min(100, 75 + taskNumber * 8),
  };
}

/**
 * Evaluate certificate eligibility
 * Rule: Candidates with tasksCompleted >= 1 are approved for certification
 */
export function evaluateCandidateEligibility(candidate) {
  const tasksCompleted = candidate.tasksCompleted || (candidate.tasks ? candidate.tasks.filter(t => t.status === 'Completed').length : 0);
  const eligible = tasksCompleted >= 1;

  return {
    eligible,
    tasksCompleted,
    score: eligible ? Math.min(98, 70 + tasksCompleted * 10) : 0,
    reason: eligible
      ? `Eligible: Completed ${tasksCompleted} sprint milestone(s) with satisfactory performance.`
      : 'Ineligible: Minimum 1 milestone completion required for certification (current score below 1).',
  };
}
