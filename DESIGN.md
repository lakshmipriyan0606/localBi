---
name: "localBi Design System"
description: "Framework-agnostic design rules for web and mobile app implementation."

# ─── Colors ───────────────────────────────────────────────
colors:
  # Brand
  primary:       "#8b5cf6"
  primaryStrong: "#4c1d95"
  primarySoft:   "#ddd6fe"
  accent:        "#8b5cf6"

  # Surfaces
  surface:       "#f5f3ff"
  surfaceMuted:  "#ddd6fe"

  # Text & Border
  text:          "#2e1065"
  border:        "#5b21b6"

  # Feedback
  success:       "#16A34A"
  warning:       "#D97706"
  danger:        "#DC2626"

# ─── Typography ───────────────────────────────────────────
typography:
  family:        "Lora, Georgia, serif"
  displayFamily: "Lora, Georgia, serif"
  monoFamily:    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  source:        "Optional Google Font: https://fonts.google.com/specimen/Lora"
  weights:       "400, 500, 600, 700"
  defaultWeight: 600
  tone:          "serif"

# Spacing
spacing:
  xs:      4px
  sm:      8px
  md:      12px
  lg:      16px
  xl:      24px
  xxl:     32px
  section: 48px

# Radius
radius:
  sm: 4px
  md: 8px
  lg: 12px

# Motion
motion:
  fast:   120ms
  normal: 180ms
  slow:   260ms
---

# Design System Rules

## Purpose
localBi Design System defines portable, framework-agnostic design rules for web and mobile product interfaces. Use it as the source of truth before changing layouts, components, color, typography, motion, or interaction states.

This file is a portable design skill. Any AI or engineer should be able to read it and improve a web or mobile interface without needing React, Vue, Svelte, Tailwind, native mobile, or any other specific technology.

## Operating Modes

### New Project Mode
- Use these rules to create a coherent first implementation when no existing UI exists.
- Build the information architecture, component system, and responsive behavior from the tokens and rules below.

### Existing Project Refactor Mode
- Treat the existing product as the source of truth for content, routes, behavior, data, and information architecture.
- Improve the visual system by patching styles, tokens, spacing, typography, hierarchy, responsive behavior, and component states.
- Do not regenerate whole pages from scratch when a targeted patch can preserve the current experience.
- Do not replace real content with placeholder, demo, lorem ipsum, or simplified content.
- If a section looks inconsistent with this design system, restyle it first. Do not remove it.
- If removing content, routes, features, media, or data logic seems necessary, stop and ask for approval.

## Preservation Rules For Existing Products
- Preserve all existing headings, paragraphs, labels, buttons, links, images, icons, forms, navigation items, sections, routes, and data-fetching logic unless the user explicitly requests removal.
- Preserve semantic meaning and section order unless the user asks for an information-architecture change.
- Preserve working interactions: forms, menus, language toggles, theme toggles, dialogs, tabs, carousels, and scroll behavior.
- Preserve real brand/product names and domain-specific copy. Design changes must not make the page generic.
- Keep every original section represented after the refactor. A redesigned section is acceptable; a missing section is not.
- Never leave the first viewport empty unless the existing product intentionally has an empty state.

## Safe Refactor Workflow
1. Read the existing UI code before editing. Identify sections, routes, state, data dependencies, and user actions.
2. Inventory current colors, typography, spacing, radius, shadows, and component states.
3. Map old visual values to the tokens in this file one-to-one where possible.
4. Patch section by section. Avoid full-file rewrites when the current structure works.
5. After each section, verify the original content is still present, visible, and reachable.
6. After changing colors, check every affected text/background pair for contrast.
7. Verify desktop and mobile before finishing.

## Visual Direction
- Color direction: Violet - Creative premium UI.
- Typography direction: Soft Serif - Editorial warmth.
- Style direction: Matrix - Terminal construct UI with phosphor accents, command panels, scan grids, and hacker-product framing
- References: Matrix terminal interfaces, Hacker club landing pages, Command-line SaaS pricing panels, Mobile terminal product cards.
- Visual style: Violet color direction, Soft Serif typography, Matrix style.

## Style System: Matrix
Use Matrix to create dark technical interfaces that feel like a live terminal construct: monospaced type, command prompts, bracket labels, scan grids, phosphor borders, batch/progress panels, pricing terminals, and mobile device frames. It works best for developer tools, cybersecurity products, AI/build communities, CLI products, technical memberships, hackathon pages, and underground SaaS launches. The style must not be locked to green: use the selected color as the phosphor accent, then derive darker and softer tones from it so blue, violet, amber, red, or neutral palettes still feel Matrix.

### Layout Rules
- use a black or near-black construct background with a subtle grid, scanline, or coordinate texture behind content.
- use the selected color as the main phosphor accent for borders, CTAs, cursors, progress bars, and key labels; do not hardcode green unless green was selected.
- structure hero sections like a terminal launch screen: small bracketed system label, huge monospaced headline, blinking cursor, command CTAs, and a status/pricing panel.
- use terminal cards for offers, stats, feature lists, and product screenshots with thin accent borders and command-style headers.
- place secondary information in ticker bars, command output rows, batch capacity meters, or boot/log panels.
- use mobile frames or device mockups when showing product UI; make them look like active terminal screens, not generic phone screenshots.
- keep layouts direct and angular, but allow small radius on terminal panels and device frames when it improves polish.
- mobile layout should stack into readable terminal blocks with sticky CTAs or short command buttons where useful.

### Component Patterns
- buttons should look like commands: monospaced labels, accent border, dark fill, bracket notation, and a clear active/pressed state.
- primary CTAs can use accent fill or strong accent border; secondary CTAs should look like command links beginning with > or wrapped in brackets.
- cards should use black or tinted-black surfaces, thin accent borders, dim inner grid lines, and compact terminal headers.
- pricing or membership cards should include batch/status language, capacity bars, feature outputs, and a single initialization CTA.
- headings should be bold monospaced with optional cursor block, terminal underline, or slight phosphor glow.
- links should use bracket notation like [open docs], command prefixes like > browse, or short terminal verbs.
- forms should use terminal inputs with visible labels, caret/cursor styling, and strong focus outlines in the selected accent.
- status indicators should use prompt symbols, ASCII markers, dot matrices, progress bars, and labels so color is not the only signal.

### Existing Project Refactor Rules
- inventory the existing interface first: navigation, hero, content sections, CTAs, forms, and footer.
- preserve all content and apply the terminal aesthetic through color, typography, and surface treatment.
- do not remove real content to add decorative digital rain or matrix effects.
- patch backgrounds, fonts, borders, colors, command labels, and panel headers section by section.
- if a section has complex visuals, wrap them in terminal frames or convert surrounding metadata into command output instead of deleting the visual.
- when adding matrix effects, keep grids, rain, scanlines, and code textures behind content with low opacity.
- if the product is consumer-facing and non-technical, use terminal framing, bracket labels, and accent CTAs subtly rather than full hacker takeover.
- map pricing, plans, events, stats, and community information into batch panels, access cards, status logs, or capacity meters.
- preserve semantic structure and keyboard accessibility even with the terminal treatment.

### Spacing Rules
- use consistent, tight spacing that feels like terminal output: 4px, 8px, 16px, 24px, 32px.
- hero sections can be spacious but must stay grid-aligned: 48px to 80px desktop padding, 28px to 40px mobile padding.
- card padding should be 16px to 28px with monospaced alignment and strong label/value grouping.
- keep gutters consistent and aligned to a monospaced character grid when possible.
- use compact spacing inside command rows, status lists, and feature outputs.
- use larger gaps between hero copy and terminal panels so the command interface does not feel cramped.
- use spacing to create clear groups with accent separator lines, ticker bars, or blank terminal lines.
- keep reading containers within 900px to 1100px; allow wider grids when a terminal panel sits beside hero copy.

### Visual Hierarchy Rules
- use accent intensity and brightness to make primary elements stand out on black backgrounds.
- the selected color should highlight CTAs, key metrics, active states, borders, cursor blocks, and progress fills.
- dimmer versions of the selected color should be used for secondary labels, grid lines, inactive borders, and metadata.
- white or light gray should be used for body text to ensure readability.
- avoid using the accent color for all text; reserve it for prompts, labels, CTAs, highlights, and technical metadata.
- let headings feel like active terminal output through scale, weight, cursor marks, or slight phosphor glow.
- use ASCII dividers, bracket headers, ticker text, and prompt markers sparingly for hierarchy.
- if a non-green accent is selected, preserve Matrix identity through black background, monospace, command syntax, grids, and terminal panels rather than forcing green.

### Style Anti-patterns
- hardcode green as the only accent when the user selected another color.
- use accent-colored text on black for all body copy — it causes eye strain.
- add excessive digital rain animation that distracts from content.
- let decorative effects overlap or obscure interactive elements.
- use glossy glassmorphism, soft neumorphism, playful arcade styling, or generic cyberpunk neon unrelated to terminal syntax.
- make the interface unreadable on high-contrast or light-mode accessibility settings.
- sacrifice semantic HTML or focus states for the aesthetic.

### Style Checklist
- the page feels like a terminal construct or hacker-product interface.
- body text is readable (light gray or white on black).
- the selected color is used as the phosphor accent for labels, borders, CTAs, highlights, and progress.
- monospaced fonts are used consistently.
- CTAs are obvious and feel like interactive terminal commands.
- pricing, stats, membership, or product panels use batch/status/log language where appropriate.
- decorative effects do not interfere with content readability.
- the result is immersive and technical without depending on green-only styling.

## Design Tokens
Use semantic tokens first. Raw values from frontmatter are source values, not permission to scatter hex codes or one-off sizes through implementation.

### Color
- Primary action color: #8b5cf6.
- Strong primary: #4c1d95. Use for high-emphasis text, selected state, or strong borders.
- Soft primary: #ddd6fe. Use for subtle surfaces, selected backgrounds, or calm highlights.
- Surface: #f5f3ff.
- Muted surface: #ddd6fe.
- Text: #2e1065.
- Border: #5b21b6.
- Success, warning, and danger are semantic states. Pair them with labels, icons, or position; never rely on color alone.
- When moving from a dark theme to a light or warm theme, update inherited light text classes such as white, muted-white, or low-opacity foregrounds.
- Do not apply one warm/cream/brown palette across the entire page without contrast, hierarchy, and content anchors.

### Text Selection
- Use this style-specific `::selection` treatment for Matrix. It should follow the selected color tokens and stay readable.
```css
/* Matrix selection: phosphor terminal glow. */
::selection {
  background-color: #8b5cf6;
  color: #f5f3ff;
  text-shadow: 0 0 10px #8b5cf6;
}
```
- If the selected color changes, keep the same style behavior but re-check text/background contrast.

### Contrast And Visibility Gate
- Every visible text node must remain readable after color changes.
- Check hero text, navigation, buttons, card titles, form labels, helper text, icons, borders, and disabled states against their actual backgrounds.
- If legacy classes or CSS keep text white on a light surface, replace them with semantic foreground tokens.
- If content appears missing after a restyle, inspect contrast and visibility before deleting or rebuilding the section.
- Do not finish with invisible text, hidden CTAs, empty hero areas, or decorative backgrounds replacing product content.

### Typography
- Primary family: Lora, Georgia, serif.
- Display family: Lora, Georgia, serif.
- Monospace family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace.
- Allowed weights: 400, 500, 600, 700.
- Default UI weight: 600.
- Keep heading levels semantic. Visual size must follow layout importance, not HTML heading number.
- Keep letter spacing at 0 by default. Use uppercase labels sparingly and only for short metadata.

### Spacing And Radius
- Spacing scale: 4/8/12/16/24/32/48.
- Prefer spacing and grouping over extra borders.
- Use 4px radius for compact controls, 8px for standard cards/inputs, and 12px only for larger feature surfaces.
- Do not invent new spacing values unless the layout cannot be solved with the scale.

## Layout Rules
- Start mobile-first. The smallest useful viewport defines the base layout.
- Use content-driven breakpoints. Do not scale type directly with viewport width.
- Keep navigation, primary actions, and form completion paths easy to reach on touch devices.
- Prefer a clear grid, predictable alignment, and stable dimensions for controls, cards, tabs, and repeated items.
- Empty, loading, and error states must preserve layout stability and explain the next action.

## Component Rules
- Every interactive component must define default, hover, active, focus-visible, disabled, loading, success, and error behavior when those states apply.
- Buttons must communicate hierarchy through role: primary, secondary, tertiary, destructive, or icon-only.
- Forms must keep labels visible, helper text close to the field, and errors specific enough to fix.
- Cards must represent repeated items or contained tools. Do not nest cards inside other cards.
- Modals and popovers must include focus management, escape behavior, and clear dismissal affordances.

## Interaction And Motion
- Motion must clarify state change, not decorate the screen.
- Transitions should usually stay between 120ms and 260ms.
- Provide reduced-motion behavior for animations, parallax, shimmer, and auto-moving content.
- Pointer hover cannot be the only way to reveal important controls because touch devices do not have hover.

## Accessibility Requirements
WCAG 2.2 AA, keyboard-first interactions, visible focus states, semantic HTML before ARIA, reduced-motion support, accessible target sizes.

- Text and meaningful non-text UI must meet WCAG 2.2 AA contrast.
- Keyboard users must be able to reach, understand, and operate every interactive control.
- Focus indicators must be visible, high-contrast, and not hidden by overflow or animation.
- Semantic HTML or native platform semantics come before ARIA patches.
- Touch targets should be at least 24px by WCAG 2.2 AA and should reach 44px when layout allows.

## Content Tone
Clear, concise, implementation-focused, low-jargon, and helpful without being decorative.

- Use direct labels for actions.
- Avoid vague UI copy like "Submit" when the action can be named.
- Keep empty states useful: state what happened, why it matters, and what the user can do next.

## Rules: Do
- use semantic tokens before raw values in components.
- preserve existing content, copy, media, routes, and behavior when applying this system to an existing project.
- preserve hierarchy with spacing, contrast, typography, and component state.
- define default, hover, active, focus-visible, disabled, loading, success, and error states.
- design mobile-first, then enhance for tablet and desktop density.
- keep implementation guidance portable across React, Vue, Svelte, plain HTML/CSS, and mobile UI stacks.
- use black background with the selected accent as the phosphor signal.
- make body text light gray or white for readability.
- use monospaced fonts consistently for all text.
- make CTAs look like terminal commands with clear hover states.
- add subtle grid, glow, scanline, or code texture effects for atmosphere without interfering with content.
- use command prompts, bracket labels, capacity meters, boot logs, and status panels to make the style specific.
- preserve keyboard navigation and screen reader accessibility.

## Rules: Don't
- use low-contrast text, hidden focus indicators, or color-only state communication.
- delete or replace existing product content unless the user explicitly asks for content removal.
- introduce one-off spacing, typography, or radius values outside the token system.
- mix unrelated visual metaphors in the same screen.
- depend on framework-specific component names in design rules.
- add decorative motion without reduced-motion fallbacks.
- hardcode green as the only accent when the user selected another color.
- use accent-colored text on black for all body copy — it causes eye strain.
- add excessive digital rain animation that distracts from content.
- let decorative effects overlap or obscure interactive elements.
- use glossy glassmorphism, soft neumorphism, playful arcade styling, or generic cyberpunk neon unrelated to terminal syntax.
- make the interface unreadable on high-contrast or light-mode accessibility settings.
- sacrifice semantic HTML or focus states for the aesthetic.

## AI Implementation Checklist
- Read this file before changing UI, layout, component styling, or interaction behavior.
- Identify the target surface: mobile app, mobile web, desktop web, dashboard, landing page, form flow, or content-heavy view.
- Map the design tokens to the project technology without changing the design intent.
- Reuse existing project components when they can satisfy these rules.
- If the current UI conflicts with this file, explain the conflict and choose the more accessible, consistent option.
- Confirm all original navigation items, hero content, CTAs, media, sections, and forms still exist unless removal was requested.
- Confirm no text became invisible from background, opacity, blend-mode, or inherited color changes.
- Confirm the first viewport contains meaningful product content, not just a background treatment.
- Verify keyboard navigation, focus-visible styling, responsive behavior, text overflow, loading state, and error state before finishing.
