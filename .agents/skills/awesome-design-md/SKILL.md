---
name: awesome-design-md
description: >-
  Curated library of 84+ production DESIGN.md design system specifications inspired by industry-leading platforms (Stripe, Linear, Vercel, Apple, Claude, Supabase, Raycast, OpenAI, etc.). Use this skill whenever the user wants to apply a specific design language, adopt a modern design system, or style their website/dashboard with tokenized color palettes, typography, spacing, and component guidelines.
---

# awesome-design-md

A curated collection of analyzed `DESIGN.md` files representing real-world design systems. A `DESIGN.md` file acts as a visual source-of-truth for AI agents, specifying color tokens, typography scales, border radii, shadows, component blueprints, and layout rules.

## Available Design Systems in `design-md/`

The library contains 84+ design systems categorized by brand aesthetic:
- **Developer & Tech Platforms**: `vercel`, `linear.app`, `supabase`, `stripe`, `raycast`, `warp`, `posthog`, `sentry`, `resend`, `hashicorp`, `clickhouse`
- **AI & Frontier Models**: `claude`, `x.ai`, `minimax`, `together.ai`, `cohere`, `replicate`, `runwayml`, `ollama`, `elevenlabs`
- **Design & Productivity**: `apple`, `airbnb`, `spotify`, `notion`, `figma`, `framer`, `webflow`, `miro`, `cal`, `superhuman`
- **Fintech & Web3**: `coinbase`, `binance`, `kraken`, `revolut`, `mercury`, `wise`, `mastercard`
- **Hardware & Automotive**: `tesla`, `spacex`, `dji`, `bmw`, `bmw-m`, `ferrari`, `lamborghini`, `playstation`, `nintendo-2001`

## How to Apply a Design System to a Project

1. **Locate the chosen brand specification**:
   Look inside the `./design-md/<brand>/DESIGN.md` folder.

2. **Adopt the Design Tokens**:
   Copy or reference the chosen `DESIGN.md` into the project root as `DESIGN.md`.

3. **Enforce Design Rules in Components**:
   - Extract the CSS variable tokens (colors, gradients, dark/light themes).
   - Use the specified typography hierarchy (headings, body, monospace accents).
   - Apply border-radius, elevation/glow, and glassmorphism styling.
   - Style cards, navigation, modals, and buttons to match the selected brand language.
