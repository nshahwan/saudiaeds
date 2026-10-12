# Inconsistency register — saudia.com replica

Everything not listed here is frozen; any design delta found by the gate is a defect, not an
improvement. All entries below are **deferred**: they were found during recreation, replicated
exactly as captured, and ride along as a handover list for the site owner.

## R-01 — Duplicate "Flight status" tab in the booking widget

- **Evidence:** live DOM + capture `gates/explore-destination-1440/live.png` (tabs at y=532: Book · Check-in · Flight schedule · Flight status · Flight status · Manage); same at 360.
- **Finding:** the tab label "Flight status" is rendered twice; one of the two is an authoring duplicate.
- **Minimal change:** remove the second "Flight status" tab (author-side).
- **Status:** deferred
- **Where:** explore-destination › booking widget

## R-02 — FAQ answer links to a Sitecore "not found" page

- **Evidence:** live DOM, FAQ "Can I get extra baggage allowance for flights to Athens?" → link "addition baggage charges" → `/sitecore/service/notfound.aspx?item=web%3a%7b31152426-…%7d%40en-SA`.
- **Finding:** broken internal link (CMS item no longer resolves); link text also reads "addition" for "additional".
- **Minimal change:** repoint to the extra-baggage page used in the footer (`/en-SA/travel-with-saudia/manage/extra-baggage` or the author's choice) and correct the word.
- **Status:** deferred (replicated verbatim)
- **Where:** explore-destination › FAQ

## R-03 — SkyTeam emblem missing from the footer on one template

- **Evidence:** footer of `gates/experience-classes-{1440,360}/live.png` vs `gates/explore-destination-*` and `gates/book-manage-flight-pass-*`; the empty slot still reserves its width (main logo stays at x=66 on mobile).
- **Finding:** the footer SkyTeam logo renders on Explore and Book & Manage but not on Experience pages.
- **Minimal change:** restore the footer SkyTeam image on the Experience template.
- **Status:** deferred (replicated as captured, empty slot kept)
- **Where:** experience-cards › footer

## R-04 — Newsletter copy differs on Book & Manage pages ("offers" vs "travel offers")

- **Evidence:** footer subscribe copy on `gates/book-manage-flight-pass-*/live.png` reads "…new destinations and travel offers."; Explore and Experience read "…new destinations and offers."
- **Finding:** the same footer text is authored twice with different wording.
- **Minimal change:** one shared footer (`/en/footer`, user decision 2026-10-08: remove duplicated chrome pages) carrying the majority wording "…and offers.".
- **Status:** **applied** — the only accepted delta. Gate impact: book-manage-flight-pass 1440 height Δ 16px (copy wraps one line shorter at 344px), pixel 2.35% PASS; 360 unaffected (Δ −1px).
- **Where:** all templates › footer
- **Also affects:** the 39 press releases without the travel notice (they also read "…travel offers."): 1440 height Δ −20px.

## Chrome consolidation (2026-10-08) — not deltas

One nav (`/en/nav`) and one footer (`/en/footer`) now serve every template. The per-template
differences the live site shows are kept by template CSS, not by duplicate fragments:
notice strip hidden on `product` and on pages themed `no-notice` (press releases without the
travel notice); AI search only on `destination`; SkyTeam slot kept empty on `listing` and on
article pages with the notice (R-03).

## R-05 — "AlFursan Store" CTA has no target

- **Evidence:** home banner "Shop with Miles" → `<a href="javascript:void(0)">AlFursan Store</a>` (gates/home-1440/live-snapshot.html).
- **Finding:** the CTA is script-only; no URL is authored.
- **Minimal change:** author the AlFursan Store URL.
- **Status:** deferred (replicated as a link with no destination, `#`)
- **Where:** home › Shop with Miles banner

## R-06 — Two "Exclusive Offers" tiles have no link in the markup

- **Evidence:** "Let’s get you upgraded" and "Hot deals" tiles carry `cursor:pointer` but no `<a>` (navigation is script-driven); "Travel insurance" and "Saudia Flight Pass" do link.
- **Finding:** two of four offer tiles are not crawlable / keyboard-reachable links.
- **Minimal change:** author their target URLs as links.
- **Status:** deferred (replicated without a link)
- **Where:** home › Exclusive Offers

## R-07 — Five `<h1>` elements on the home page (one per hero slide)

- **Evidence:** every hero slide title is an `<h1>` on live.
- **Finding:** multiple top-level headings; the document outline has no single page title.
- **Minimal change:** one `<h1>` per page — the first slide's title (the visible page lead); the other slide titles are `<h2>`. (The prototype used a visually hidden page `<h1>`; EDS authors the first slide title instead.)
- **Status:** **applied** — semantic only, no visual change (gate unaffected).
- **Where:** home › hero carousel

## R-08 — 15 press releases from 2024 show another article's hero image

- **Evidence:** 15 article-layout press releases from May–June 2024 (e.g. `press-release-06052024-2`, the anb credit-card release) all use `Media-Center/2026/04/press-release-17042026-hero` with alt "Saudia and AlUla Partnership".
- **Finding:** these pages show the hero image and alt text from a different (2026) release; the picture does not match the story.
- **Minimal change:** the authors pick each release's own image, or drop the hero image.
- **Status:** deferred (replicated as captured; flagged to the content owners)
- **Where:** press releases › article layout, 2024

## R-09 — Inline links in press releases are styled two ways

- **Evidence:** across the 51 article-layout releases, 4 body links carry `a.saudia-inline-link` (green #00803e, semibold, no underline) and 9 are plain links with the site default style.
- **Finding:** the same kind of link looks different from one release to the next.
- **Minimal change:** one inline-link style for every press release body.
- **Status:** deferred (all body links take the default link style, which is what the majority use; the 4 green links lose their green colour)
- **Where:** press releases › article layout, body copy

## R-10 — Legacy press releases have no `<h1>`; the title is an `<h2>`

- **Evidence:** every legacy-layout release (167 pages) renders its title as `h2.UpdateHeading` and the subtitle as `<h3>`; the header's own `<h1>` is empty.
- **Finding:** the page has no top-level heading, and the outline starts at level 2.
- **Minimal change:** author the title as `<h1>` and the subtitle as `<h2>`, styled exactly like the live h2/h3. Headings in the body are unchanged.
- **Status:** **applied** — semantic only, no visual change.
- **Where:** press releases › legacy layout

## R-11 — A stray blank line follows the subtitle on 59 legacy press releases

- **Evidence:** the title component ends with `<div>&nbsp;</div>` on 59 legacy releases, adding a 24px empty line before the image or body.
- **Finding:** this is an authoring artefact: an empty paragraph used as a spacer.
- **Minimal change:** drop the empty line; the spacing is set by the section styles.
- **Status:** **applied** — those 59 pages sit 24px shorter than live.
- **Where:** press releases › legacy layout, title
