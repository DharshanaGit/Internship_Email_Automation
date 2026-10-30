# Shortfundly Operations Portal — Black with Purple Web3 Design System (DESIGN.md)

Standardized design system following `awesome-design-md` (inspired by Kraken, Raycast, and Linear). The interface operates on a deep black canvas with authoritative purple accents, precision hairlines, and zero emojis.

---

## 1. Core Visual Atmosphere: Black with Purple

- **Canvas Foundation**: Pure near-black obsidian (`#08070c`) creating a distraction-free, high-contrast operational environment.
- **Card & Panel Surfaces**: Subtle charcoal-black layers (`#0f0e17` and `#161424`) with razor-sharp 1px hairline borders (`#232135` / `rgba(255, 255, 255, 0.08)`).
- **Commanding Purple Accent**: Shortfundly Signature Purple (`#7c3aed` primary, `#a855f7` vibrant, `#c084fc` highlight) applied systematically for active tabs, primary CTAs, contract tokens, and focus rings.
- **Micro Monospace & Tokens**: Tabular monospace (`JetBrains Mono`, `ui-monospace`) for Intern IDs, candidate hashes, timestamps, and performance metrics.
- **No Emojis & No Vibe Coding Artifacts**: Institutional enterprise phrasing; 100% vector SVG icons from Lucide.

---

## 2. Design Tokens

### 2.1 Surfaces & Canvas
```css
--bg-app: #08070c;                 /* Deep matte black canvas */
--bg-surface: #0f0e17;             /* Primary card & table surface */
--bg-surface-elevated: #161424;    /* Elevated headers, drawers, active tabs */
--bg-surface-hover: #1c192e;       /* Interactive row hover */
--bg-input: #0c0b13;               /* Inputs, selects, filters */
--bg-input-focus: #12101e;          /* Focused inputs */
--bg-badge-purple: rgba(168, 85, 247, 0.14); /* Purple chip background */
--bg-overlay: rgba(5, 4, 8, 0.88); /* Modal blur backdrops */
```

### 2.2 Hairlines & Precision Dividers
```css
--border-hairline: rgba(255, 255, 255, 0.08);
--border-subtle: #232135;
--border-medium: #35314f;
--border-purple: #7c3aed;
--border-purple-light: #a855f7;
--border-focus-ring: rgba(168, 85, 247, 0.28);
```

### 2.3 Brand Purple & Semantic Accents
```css
--accent-primary: #7c3aed;          /* Deep Royal Purple */
--accent-primary-hover: #6d28d9;    /* Hover State */
--accent-primary-active: #5b21b6;   /* Pressed State */
--accent-purple: #a855f7;           /* Vibrant Purple Accent */
--accent-purple-light: #c084fc;     /* Soft Lilac Highlight */
--accent-purple-dark: #6b21a8;      /* Deep Muted Purple */

--status-success: #10b981;          /* Signal Emerald (Active / Approved) */
--status-success-bg: rgba(16, 185, 129, 0.12);
--status-success-border: rgba(16, 185, 129, 0.28);

--status-warning: #f59e0b;          /* Signal Amber (Pending / In Review) */
--status-warning-bg: rgba(245, 158, 11, 0.12);
--status-warning-border: rgba(245, 158, 11, 0.28);

--status-danger: #ef4444;           /* Signal Crimson (Expired / Attrition) */
--status-danger-bg: rgba(239, 68, 68, 0.12);
--status-danger-border: rgba(239, 68, 68, 0.28);

--status-info: #38bdf8;             /* Sky Blue (Meeting Rooms / Previews) */
--status-info-bg: rgba(56, 189, 248, 0.12);
--status-info-border: rgba(56, 189, 248, 0.28);
```

### 2.4 Typography Hierarchy
```css
--text-primary: #ffffff;            /* Crisp white text */
--text-secondary: #cbd5e1;          /* High readability body text */
--text-muted: #94a3b8;              /* Subtitles, table headers, metadata */
--text-accent: #c084fc;             /* Signature purple text highlight */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 2.5 Radii Scale
```css
--radius-xs: 4px;   /* Micro tags, tokens */
--radius-sm: 6px;   /* Standard buttons, input fields */
--radius-md: 8px;   /* Segmented bars, inner cards */
--radius-lg: 12px;  /* Main panels, tables, dialogs */
--radius-full: 9999px; /* Status badges */
```

---

## 3. Component Standards

### 3.1 Primary Buttons
- **Background**: `linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)`
- **Text**: `#ffffff`, weight 600
- **Border**: `1px solid rgba(255, 255, 255, 0.12)`
- **Radius**: `6px`
- **Hover**: Subtle brightness elevation + translateY(-1px)

### 3.2 Secondary Buttons
- **Background**: `#161424`
- **Border**: `1px solid #2e2a47`
- **Text**: `#cbd5e1`, hover to `#ffffff`
- **Radius**: `6px`

### 3.3 Monospace Identifier Chips
- **Class**: Used for `INT-2026-00001`, `TSK-DEV-001`, batch tags
- **Font**: Tabular Monospace (`var(--font-mono)`)
- **Color**: `#c084fc`
- **Background**: `rgba(168, 85, 247, 0.08)`
- **Border**: `1px solid rgba(168, 85, 247, 0.22)`
- **Padding**: `2px 6px`
- **Radius**: `4px`

### 3.4 Data Tables
- **Header**: `#0c0b13` background, `#94a3b8` 11px uppercase labels, tracking `0.06em`
- **Dividers**: `1px solid #1c1a2c`
- **Row Hover**: `rgba(168, 85, 247, 0.03)`
- **Action Buttons**: Compact 11px buttons with Lucide vector icons

### 3.5 Top Bar & Active Tabs
- **Top Bar**: Deep obsidian `#0b0a12`, border-bottom `1px solid #1f1d2e`
- **Active Navigation Tab**: Background `rgba(124, 58, 237, 0.14)`, border-bottom `2px solid #a855f7`, text `#ffffff`
- **Telemetry Beacon**: Pulsing green dot with `Mainnet • PostgreSQL Pooled • Google SMTP Active`
