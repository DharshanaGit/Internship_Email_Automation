# Shortfundly Operations Portal — Production Web3 Design System (DESIGN.md)

Inspired by the curated specifications in `awesome-design-md` (Linear, Kraken, Coinbase, Vercel), this design system establishes the visual source of truth for the Shortfundly Internship Email Automation & Operations Hub. It eliminates vibe-coding artifacts, loud neon gradients, emojis, and amateur borders in favor of a precision-engineered, production-ready dark aesthetic.

---

## 1. Design Philosophy & Principles

- **Precision Obsidian Canvas**: Near-black matte obsidian surfaces (`#07080b`, `#0d1017`) replace noisy purple backgrounds.
- **Hairline Restraint**: Borders are razor-sharp 1px hairlines (`rgba(255, 255, 255, 0.07)` or `#1b1f2b`), never thick colored outlines or glowing neon boxes.
- **Typography Scale**: High-density typography using system sans (`Inter, -apple-system, BlinkMacSystemFont`) with tabular monospace (`JetBrains Mono, ui-monospace`) for identifiers, timestamps, metrics, and tokens.
- **Enterprise Web3 Tone**: Formal, reliable institutional copy. Emojis and playful "vibe coding" labels are strictly banned. All visual indicators use vector SVGs (Lucide).
- **Subtle Chromatic Hierarchy**: The primary brand accent is Web3 Indigo/Ultraviolet (`#6366f1` / `#7c3aed`), reserved strictly for active navigation, focus states, and primary CTAs.

---

## 2. Design Tokens

### 2.1 Surfaces & Canvas
```css
--bg-app: #07080b;              /* Deep obsidian base */
--bg-surface: #0d1017;          /* Panel & card background */
--bg-surface-elevated: #131722; /* Hovered cards & elevated drawers */
--bg-surface-active: #181d2a;   /* Active selection state */
--bg-input: #0a0c12;            /* Input & select elements */
--bg-overlay: rgba(3, 4, 7, 0.85); /* Modal blur backdrops */
```

### 2.2 Hairline Borders & Dividers
```css
--border-hairline: rgba(255, 255, 255, 0.07);
--border-subtle: #1c202c;
--border-medium: #2a3042;
--border-focus: #6366f1;
--border-focus-ring: rgba(99, 102, 241, 0.25);
```

### 2.3 Typography & Text Contrast
```css
--text-primary: #f8fafc;        /* High-contrast crisp white */
--text-secondary: #cbd5e1;      /* Readable secondary body */
--text-muted: #64748b;          /* Meta, captions, timestamps */
--text-disabled: #475569;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 2.4 Semantic Accents
```css
--accent-primary: #6366f1;        /* Web3 Indigo */
--accent-primary-hover: #4f46e5;
--accent-primary-active: #4338ca;
--accent-secondary: #818cf8;

--status-success: #10b981;        /* Signal Emerald */
--status-success-bg: rgba(16, 185, 129, 0.10);
--status-success-border: rgba(16, 185, 129, 0.22);

--status-warning: #f59e0b;        /* Signal Amber */
--status-warning-bg: rgba(245, 158, 11, 0.10);
--status-warning-border: rgba(245, 158, 11, 0.22);

--status-danger: #ef4444;         /* Signal Crimson */
--status-danger-bg: rgba(239, 68, 68, 0.10);
--status-danger-border: rgba(239, 68, 68, 0.22);

--status-info: #0ea5e9;           /* Sky Blue */
--status-info-bg: rgba(14, 165, 233, 0.10);
--status-info-border: rgba(14, 165, 233, 0.22);
```

### 2.5 Radii Scale
```css
--radius-xs: 4px;   /* Micro chips, tags */
--radius-sm: 6px;   /* Buttons, inputs, table selects */
--radius-md: 8px;   /* Sub-cards, segmented bars */
--radius-lg: 12px;  /* Main panels, tables, dialogs */
--radius-pill: 9999px; /* Status pills */
```

---

## 3. Component Architecture & Rules

### 3.1 Buttons
- **Primary**: Solid indigo (`#6366f1`), 6px radius, uppercase/medium typography, 1px subtle border `rgba(255, 255, 255, 0.12)`. No neon glow blur.
- **Secondary**: Surface background (`#131722`), hairline border (`rgba(255, 255, 255, 0.08)`), hover transitions to `#181d2a`.
- **Ghost/Tertiary**: Transparent, hover highlight only.

### 3.2 Navigation & Tabs
- Horizontal segmented bars with 6px rounded pills.
- Inactive tabs: muted gray (`#64748b`), no border.
- Active tabs: dark glass background (`#131722`), hairline border (`rgba(255, 255, 255, 0.09)`), crisp text (`#ffffff`), and a clean accent dot.

### 3.3 Tables & Data Grids
- Uppercase headers: 11px font size, 0.06em tracking, color `#64748b`.
- Row height: 44px - 48px with 1px border divider (`rgba(255, 255, 255, 0.04)`).
- Hover: subtle `#0f131d` highlight.
- Monospace tokens (`INT-2026-00001`, `TSK-DEV-001`): enclosed in 4px monospace chip with `letter-spacing: 0.02em`.

### 3.4 Strict Prohibitions
1. **NO EMOJIS**: Under no circumstances should emojis be rendered in headers, badges, table cells, or toast notifications. Lucide vector icons only.
2. **NO VIBE-CODING JARGON**: Strip terms like "Vibe", "Magic", "Industrial Gemma Deck", "Ultra". Use enterprise terminology: "Operations Hub", "Evaluation Ledger", "Cryptographic Telemetry".
3. **NO GLOWING / NEON BORDERS**: Remove all 2px bright magenta/purple outlines. Use restrained hairlines.
