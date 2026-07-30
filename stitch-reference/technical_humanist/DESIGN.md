---
name: Technical Humanist
colors:
  surface: '#fff8f6'
  surface-dim: '#f0d4cc'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#ffe9e3'
  surface-container-high: '#ffe2d9'
  surface-container-highest: '#f9dcd4'
  on-surface: '#271813'
  on-surface-variant: '#5b4138'
  inverse-surface: '#3d2c27'
  inverse-on-surface: '#ffede8'
  outline: '#8f7066'
  outline-variant: '#e3bfb3'
  surface-tint: '#ab3600'
  primary: '#ab3600'
  on-primary: '#ffffff'
  primary-container: '#ff5f1f'
  on-primary-container: '#561700'
  inverse-primary: '#ffb59c'
  secondary: '#5d5e61'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e5'
  on-secondary-container: '#636467'
  tertiary: '#605e5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#96948f'
  on-tertiary-container: '#2e2d29'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59c'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832700'
  secondary-fixed: '#e2e2e5'
  secondary-fixed-dim: '#c6c6c9'
  on-secondary-fixed: '#1a1c1e'
  on-secondary-fixed-variant: '#454749'
  tertiary-fixed: '#e6e2dc'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#484742'
  background: '#fff8f6'
  on-background: '#271813'
  surface-variant: '#f9dcd4'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
spacing:
  base: 8px
  container-padding: 20px
  gutter: 12px
  touch-target-min: 48px
---

## Brand & Style
The design system balances the precision of an engineering tool with the warmth of a traditional ledger. It targets educational and professional environments that require high-speed utility without sacrificing personality. 

The aesthetic is "Warm Technical," merging **Retro-Computing** (monospaced labels, bracketed elements, terminal-like metadata) with **Modern Minimalism** (generous whitespace, editorial typography, and high-quality rendering). The interface should feel like a high-end physical instrument—precise, reliable, and tactile.

Key visual pillars:
- **The Grid:** A faint underlying structural grid guides all placements.
- **Bracketed UI:** Utility actions and secondary labels are enclosed in square brackets `[ ]`.
- **High Contrast:** Clear separation between content surfaces and the warm ivory backdrop.

## Colors
The palette is rooted in high-legibility neutrals with a singular, high-energy accent.

- **Background (#FDFBF7):** A warm ivory that reduces eye strain compared to pure white, providing a "paper" feel.
- **Primary / Typography (#1A1C1E):** Deep charcoal used for all primary text and heavy iconography to ensure maximum contrast.
- **Accent (#FF5F1F):** A vivid "Industrial Orange" reserved for primary actions, success states, and the scanning viewfinder.
- **Grid & Borders (#E8E4DE):** Subtle beige-grey used for structural hairlines and background patterns.
- **Elevated Surfaces (#2D2F31):** Used for dark-mode components or high-contrast cards that need to "pop" against the ivory background.

## Typography
This design system uses a tri-font strategy to define the hierarchy of information.

- **Headlines (Bricolage Grotesque):** Chosen for its editorial, slightly quirky character that feels both modern and expressive. 
- **Body (Plus Jakarta Sans):** A clean, friendly Sans that ensures Malayalam script ('ഹാജർ') renders with clarity and ample breathing room.
- **Technical Labels (JetBrains Mono):** Used for timestamps, count totals, role badges, and any metadata that requires a "data-driven" feel.

**Malayalam Support:** Ensure line-height for body copy is increased by 20% when rendering Malayalam text to prevent vowel signs (matras) from clipping.

## Layout & Spacing
The layout is strictly mobile-first, optimized for one-handed operation on Android devices.

- **Grid Background:** A faint 24dp x 24dp grid is visible on the background layer using the `#E8E4DE` color. Content should align to the intersections of this grid.
- **Margins:** 20px horizontal margins for the main content container.
- **Touch Targets:** All interactive elements (buttons, checkboxes, navigation items) must maintain a minimum height of 48px.
- **Vertical Rhythm:** Use increments of 8px (8, 16, 24, 32, 48, 64) for all vertical spacing between components.

## Elevation & Depth
In alignment with the technical style, this system avoids soft, diffused shadows. Depth is communicated through:

- **Structural Layering:** Elements are either "Inset" (using thin borders) or "Overlaid" (using solid fills).
- **Outlines:** Most cards and buttons use a 1px solid border of `#1A1C1E`.
- **Hard Shadows:** If elevation is required, use a 2px or 4px "hard" shadow (0% blur) offset to the bottom-right, using the primary charcoal color at 20% opacity.
- **The Inversion:** Important summary cards use the `#2D2F31` (charcoal) background with Ivory text to create a high-contrast focal point without needing shadow-based elevation.

## Shapes
The shape language is **sharp and architectural**. 

- **Corners:** Use 0px (sharp) corners for almost all UI elements, including buttons, cards, and input fields. This reinforces the technical, blueprint-like aesthetic.
- **The Bracket:** Visual interest is created through characters (brackets) rather than rounded corners.
- **Viewfinder:** The QR scanning area should be a sharp-edged square with reinforced corner marks in the accent orange.

## Components

### Buttons
- **Primary:** Solid `#1A1C1E` background with ivory text. The label is wrapped in brackets: `[ SCAN QR ]`.
- **Secondary:** Outlined 1px `#1A1C1E`.
- **Ghost/Tertiary:** Monospaced text with a slight hover/tap state background of `#E8E4DE`.

### Outlined Cards
- Use a 1px border of `#E8E4DE`.
- Top-right corner of the card should feature a monospaced label in brackets, e.g., `[ STATUS: LIVE ]`.

### Role Badges
- Small, rectangular blocks with a solid fill.
- **Admin:** Primary Navy fill / Ivory text.
- **Student/User:** Ivory fill / Navy border.

### Bottom Navigation
- Minimalist bar with no blur/transparency. 
- Icons are stroke-based (1.5px weight). 
- Active state is indicated by a solid `#FF5F1F` 2px line above the icon.

### Input Fields
- Sharp corners, 1px charcoal border.
- Placeholder text in monospaced font at 60% opacity.
- Focused state changes the border to 2px and adds the accent orange color.

### Scanning Interface
- Full-screen camera view with a faint `#FF5F1F` grid overlay.
- Large, bold monospaced text at the bottom indicating progress: `[ SYSTEM_READY: 100% ]`.