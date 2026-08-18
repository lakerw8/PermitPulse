# Design — PermitPulse

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal

## Macrostructure family
- Marketing pages: Stat-Led (hero is a giant live metric; qualifying text right)
- App pages:       Workbench (the permits browse IS the product)
- Content pages:   Long Document (if needed)

## Theme
- `--color-paper`      oklch(0.975 0.006 250)
- `--color-paper-2`    oklch(0.940 0.008 250)
- `--color-ink`        oklch(0.180 0.012 250)
- `--color-ink-2`      oklch(0.450 0.008 250)
- `--color-rule`       oklch(0.900 0.006 250)
- `--color-accent`     oklch(0.520 0.190 255)
- `--color-accent-ink` oklch(0.980 0.005 250)
- `--color-focus`      oklch(0.580 0.160 255)

## Typography
- Display: Space Grotesk, weight 600, style normal
- Body:    Geist, weight 400
- Mono:    Geist Mono, weight 400 (outlier — stats + permit numbers only)
- Display tracking: -0.025em
- Type scale anchor: `--text-display` = clamp(2.5rem, 5vw + 0.5rem, 4.75rem)

## Spacing
4-point named scale. Pages must use named tokens, never raw values.

## Motion
- motion-cut — no animation libraries installed
- Reveals: none
- Transitions: color/opacity only, 220ms ease-out
- Reduced-motion fallback: opacity-only, 150ms

## Microinteractions stance
- Silent success (no toasts)
- Hover transitions: 220ms
- Focus: immediate (0ms)

## CTA voice
- Primary CTA:   cobalt-filled pill (999px radius), white text, no shadow
- Secondary CTA: outlined pill (999px radius), ink text, 1px border

## Nav archetype
N5 · Floating pill — content-sized, centred, blur backdrop, soft shadow

## Footer archetype
Ft2 · Inline-rule single line — wordmark + credit, hairline above

## Per-page allowances
- Marketing pages MAY use the stat hero with live data.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share
- The wordmark (text-only, Space Grotesk 600).
- The cobalt accent and its placement (≤5% per viewport).
- The Space Grotesk display + Geist body fonts.
- The CTA voice (pill shape, 999px radius, cobalt fill or outlined).
- Hairline rules as dividers (not background colour shifts).

## What pages MAY differ on
- Macrostructure within the page-type family.
- Hero archetype within the family's allowance.

## Exports

### shadcn/ui CSS variables (light)
```css
:root {
  --background:         0.975 0.006 250;
  --foreground:         0.180 0.012 250;
  --card:               0.985 0.004 250;
  --card-foreground:    0.180 0.012 250;
  --popover:            0.985 0.004 250;
  --popover-foreground: 0.180 0.012 250;
  --primary:            0.520 0.190 255;
  --primary-foreground: 0.980 0.005 250;
  --secondary:          0.940 0.008 250;
  --secondary-foreground: 0.180 0.012 250;
  --muted:              0.940 0.008 250;
  --muted-foreground:   0.450 0.008 250;
  --accent:             0.940 0.008 250;
  --accent-foreground:  0.180 0.012 250;
  --border:             0.900 0.006 250;
  --input:              0.900 0.006 250;
  --ring:               0.580 0.160 255;
  --radius:             0.375rem;
}
```

### shadcn/ui CSS variables (dark)
```css
.dark {
  --background:         0.150 0.012 250;
  --foreground:         0.940 0.006 250;
  --card:               0.180 0.010 250;
  --card-foreground:    0.940 0.006 250;
  --popover:            0.180 0.010 250;
  --popover-foreground: 0.940 0.006 250;
  --primary:            0.580 0.170 255;
  --primary-foreground: 0.980 0.005 250;
  --secondary:          0.220 0.010 250;
  --secondary-foreground: 0.940 0.006 250;
  --muted:              0.220 0.010 250;
  --muted-foreground:   0.600 0.008 250;
  --accent:             0.220 0.010 250;
  --accent-foreground:  0.940 0.006 250;
  --border:             0.280 0.008 250;
  --input:              0.280 0.008 250;
  --ring:               0.620 0.150 255;
}
```
