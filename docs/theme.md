# Orbit Theme — "VOXA" (dark blue / pixel)

Extracted from the VOXA design references. Dark-first aesthetic: near-black canvas, deep-to-sky blue accents, white high-emphasis CTAs, generous rounding, and a pixel display font for large headers.

This maps onto the **existing Tailwind v4 + shadcn oklch token system** in `client/src/app/globals.css`, so most of it is drop-in.

---

## 1. Fonts

| Role | Font | Source | Notes |
| --- | --- | --- | --- |
| Body / UI / headings | **Space Grotesk** | Google Fonts | Confirmed from the brand sheet. The everyday font. |
| Pixel display | **Pixelify Sans** | Google Fonts | Big section headers + wordmark. Closest free match — the actual VOXA wordmark is likely custom/paid. Alternatives: **Silkscreen**, **Handjet**. |
| Mono (optional) | Keep Geist Mono, or **Space Mono** | Google Fonts | For code blocks in chat. Space Mono pairs with Space Grotesk. |

### Wiring in `client/src/app/layout.tsx`

```tsx
import { Space_Grotesk, Pixelify_Sans, Space_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

// on <html>:
className={`${spaceGrotesk.variable} ${pixelifySans.variable} ${spaceMono.variable} dark h-full antialiased`}
```

> Note the added `dark` class on `<html>` — VOXA is dark-only, so default the app to the dark palette. (If you want a light mode too, keep `dark` off and theme `:root` instead — see §4.)

### Font tokens in `globals.css`

Replace the three `--font-*` lines in **both** `@theme inline` and `:root`:

```css
/* in @theme inline */
--font-sans: var(--font-space-grotesk);
--font-mono: var(--font-space-mono);
--font-heading: var(--font-space-grotesk);
--font-display: var(--font-pixelify);   /* new — pixel headers */

/* in :root */
--font-sans: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-space-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
--font-heading: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif;
--font-display: var(--font-pixelify), "Courier New", monospace;
```

Use the pixel font sparingly — only for large display headers (`font-display`, uppercase, wide tracking). Body text and component labels stay Space Grotesk. Pixel fonts are illegible below ~24px.

---

## 2. Color palette (source = hex, from the brand sheet)

| Token | Hex | Use |
| --- | --- | --- |
| Ink (canvas) | `#040404` | Page background, darkest surface |
| Deep blue | `#0147a3` | Gradients, deep accents, pressed states |
| Sky blue | `#5aa2fa` | Primary accent — interactive, chat bubbles, active nav, rings, sparkles |
| White | `#ffffff` | Foreground text, high-emphasis CTA pills |

Supporting tones (derived, not on the sheet — for surfaces/borders):

| Token | Hex (approx) | Use |
| --- | --- | --- |
| Card | `#0c1420` | Lifted dark surface with a blue cast |
| Muted | `#16202e` | Secondary surfaces, input backgrounds |
| Border | `rgba(255,255,255,0.10)` | Hairline dividers on dark |

---

## 3. oklch conversions (for your pipeline)

Your `globals.css` uses oklch. These are conversions of the hex above (approximate — verify in-browser; you can also paste hex directly, Tailwind v4 accepts it).

```
#040404  ->  oklch(0.05 0 0)
#0147a3  ->  oklch(0.43 0.15 257)
#5aa2fa  ->  oklch(0.71 0.13 256)
#ffffff  ->  oklch(1 0 0)
```

---

## 4. Drop-in token block

Replace the `.dark { … }` block in `globals.css` with this (and, since VOXA is dark-only, optionally mirror it into `:root` too). Hue is locked around **256** (blue) instead of the current 285–286 (violet).

```css
.dark {
  --background: oklch(0.05 0 0);            /* #040404 */
  --foreground: oklch(0.98 0.004 256);      /* near-white */

  --card: oklch(0.17 0.03 256);             /* dark blue-tinted surface */
  --card-foreground: oklch(0.98 0.004 256);

  --popover: oklch(0.15 0.03 256);
  --popover-foreground: oklch(0.98 0.004 256);

  /* Primary = sky blue. Pops on dark; drives chat bubbles, active nav, accents. */
  --primary: oklch(0.71 0.13 256);          /* #5aa2fa */
  --primary-foreground: oklch(0.05 0 0);    /* #040404 — dark text on blue */

  --secondary: oklch(0.24 0.03 256);
  --secondary-foreground: oklch(0.97 0.004 256);

  --muted: oklch(0.22 0.025 256);           /* #16202e-ish */
  --muted-foreground: oklch(0.72 0.02 256);

  --accent: oklch(0.43 0.15 257);           /* deep blue #0147a3 */
  --accent-foreground: oklch(0.98 0.004 256);

  --destructive: oklch(0.70 0.19 22);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);
  --ring: oklch(0.71 0.13 256);             /* sky blue focus ring */

  --chart-1: oklch(0.71 0.13 256);
  --chart-2: oklch(0.43 0.15 257);
  --chart-3: oklch(0.80 0.10 230);
  --chart-4: oklch(0.62 0.16 270);
  --chart-5: oklch(0.85 0.08 256);

  --sidebar: oklch(0.08 0.01 256);          /* slightly lifted from canvas */
  --sidebar-foreground: oklch(0.98 0.004 256);
  --sidebar-primary: oklch(0.71 0.13 256);
  --sidebar-primary-foreground: oklch(0.05 0 0);
  --sidebar-accent: oklch(0.20 0.04 256);
  --sidebar-accent-foreground: oklch(0.92 0.03 256);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.71 0.13 256);
}
```

### Radius — bump it up

VOXA uses softer corners than your current `0.625rem`. In `:root`:

```css
--radius: 0.875rem;   /* was 0.625rem */
```

Marketing CTAs should be **full pills** (`rounded-full`); cards use the default `rounded-xl`/`rounded-2xl`.

---

## 5. Signature recipes

These are the VOXA "look" patterns. Add as utilities or inline classes.

### Hero radial gradient (blue → black)

The defining background. Deep blue glow bleeding into near-black.

```css
.bg-voxa-radial {
  background:
    radial-gradient(120% 120% at 30% 80%, #0147a3 0%, #061018 45%, #040404 100%);
}
```

Tailwind inline equivalent:
```html
<div class="bg-[radial-gradient(120%_120%_at_30%_80%,#0147a3_0%,#061018_45%,#040404_100%)]">
```

### White pill CTA (the "Try Voxa for free" button)

High-emphasis action = white pill, dark text, arrow icon. In shadcn Button terms this is a custom variant:

```tsx
// white pill — highest emphasis, marketing surfaces
className="rounded-full bg-white text-[#040404] hover:bg-white/90 gap-1.5 px-5"
// pairs with an ArrowUpRight icon
```

For in-app primary actions, the default `primary` (sky blue) button is correct — reserve the white pill for hero/landing CTAs.

### Glass card (the "ADVANCED CHAT" prompt cards)

```css
.card-voxa {
  background: linear-gradient(180deg, rgba(90,162,250,0.10), rgba(1,71,163,0.06));
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);
}
```

### Pixel section header

```html
<h2 class="font-display uppercase tracking-wide text-4xl text-[#5aa2fa] leading-[0.9]">
  Advanced<br/>Chat
</h2>
```

Pixel font + sky blue + tight leading + uppercase. Keep it to 1–3 words.

### Outlined nav + "Launch App" pill

- Nav bar: `bg-[#040404]` with a `rounded-2xl` inset content frame and `border-white/8`.
- Logo "VOXA": `font-display` uppercase, white.
- Nav links: `text-white/70 hover:text-white`, active = `text-white`.
- "Launch App": outlined pill — `rounded-full border border-white/20 text-white hover:bg-white/10`.

---

## 6. Mapping to existing components

| Component | Change |
| --- | --- |
| `dashboard-sidebar` avatar gradient | swap violet `from-primary to-primary/60` — now resolves to sky-blue automatically once tokens change |
| Chat user bubbles (`bg-primary`) | become sky blue with dark text automatically — verify contrast |
| Landing hero (`page.tsx`) | apply `bg-voxa-radial`, set the wordmark to `font-display`, swap "Create an account" to white-pill style |
| Active nav state (`bg-primary/10 ring-primary/20`) | reads as blue automatically |
| Logo lockups (`Orbit` text) | optionally set to `font-display` uppercase for the pixel wordmark feel |

Most of the app re-skins for free because everything already references the semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, …). The only hand-edits are: the landing hero gradient, the white-pill CTA variant, and applying `font-display` to display headers.

---

## 7. Quick checklist to apply

1. `npm` — fonts come from `next/font/google`, no install needed.
2. Edit `layout.tsx`: import the three fonts, add their variables + `dark` to `<html>`.
3. Edit `globals.css`: swap the `--font-*` tokens, add `--font-display`, replace the `.dark` block, bump `--radius`.
4. Add the `.bg-voxa-radial` / `.card-voxa` utilities (in `globals.css` under `@layer base` or `@layer utilities`).
5. Re-skin the landing hero + add the white-pill CTA variant to your Button usage.
6. Spot-check contrast: sky-blue `primary` with `#040404` foreground text on buttons; white text on blue cards.
```
