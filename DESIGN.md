---
_provenance:
  writtenBy: stardust:replica
  writtenAt: 2026-10-07T09:58:46Z
  mode: bounded-single
  synthesizedFrom:
    - stardust/current/pages/explore-destination.json
    - stardust/current/pages/book-manage-flight-pass.json
    - stardust/current/pages/experience-classes.json
    - stardust/replica/tokens.json
---

# Saudia — design system (captured current state, preserve mode)

Descriptive, not creative: this is the live saudia.com design as measured on three
pilot archetypes (Explore destination, Book & Manage product, Experience cards).
Every value traces to `stardust/replica/tokens.json`. A full `--prep` extract will
replace this bounded spec.

## Typography
- Family: **Saudia Sans** (Saudia's own brand face, self-hosted by saudia.com) with
  weights 400 / 500 / 600 / 900; weight-700 text renders with the 900 face.
  Fallback stack `arial, sans-serif`. Icons: Material Symbols Outlined / Material Icons.
- Body 16/24 with 0.16px tracking inherited site-wide; rich copy 16/25.6 in rgb(51 51 51).
- Headings are tight-tracked: hero 64/68 (−2.56px), section 40/48 (−1.2px), card titles 24/32.
- Small text 14/20 (+0.28px), micro 12/16 (+0.48px).

## Colour
- Brand green rgb(0 128 62) for primary actions; darker greens rgb(2 102 52) / rgb(0 105 55) / #004626 for text links and leads.
- Neutrals as black at 70% / 55% / 42%; rules at 10% black; fields at 5% black.
- Accents: notice yellow rgb(235 187 35), info blue rgb(0 119 185), home-theme beige rgb(243 237 225).
- Photo heroes carry a bottom scrim to #192518.

## Layout
- 1200px centred container; 20px mobile gutter.
- Header = optional notice strip + nav bar (logo, SkyTeam mark, six top-level menus, AI search / language / Login).
- Footer = newsletter band, link grid (accordion on mobile), app badges, awards + social, legal row.
- Fixed third-party chrome: Medallia "Send feedback" tab (right edge) and chatbot launcher (bottom right).

## Components seen
Hero banner · booking widget (tabs, trip type, From/To fields, info bar) · rich destination copy with
image banner and itinerary box · FAQ accordion · two-column intro with check-list · subscription plan
cards with pills · image cards with gradient overlay.
