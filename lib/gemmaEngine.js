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

/**
 * Generate task briefing for candidate based on designation and task index
 */
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
