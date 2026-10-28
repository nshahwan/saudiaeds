# EDS conversion log — Saudia replica pilot

## Inputs
Approved replica archetypes (stardust/prototypes/*-proposed.html, gated against live saudia.com):
explore-destination, book-manage-flight-pass, experience-classes.

## Target
aem-boilerplate-xwalk (Universal Editor, AEM Sites content). Every block ships a `_<block>.json`
component model; collection blocks (hero, cards, accordion) start from the
adobe-rnd/aem-block-collection-xwalk models. Content pages are written as
`content/<path>.plain.html` with field hints; the platform uploads them (no DA/admin calls here).

## Locked decisions
| Topic | Decision |
|---|---|
| Page paths | /en-sa/explore/saudia-new-destinations-2026/fly-to-athens · /en-sa/book-and-manage/book/flight-pass · /en-sa/plan/on-board/classes-of-travel (live final URL) |
| Chrome | authored fragments: /nav (notice, Experience), /nav-home (notice + AI search, Explore), /nav-product (no notice, Book & Manage); /footer-saudia, /footer-saudia-product (copy "…and travel offers."), /footer-saudia-experience (no SkyTeam emblem). Existing /footer and /index are NOT modified; pages select chrome via `nav`/`footer` page metadata. |
| Templates | page metadata `template`: destination / product / listing (not `cards`: a body class must not collide with a block class) (body class drives header reservation + hero overlap); `theme: beige` on the Explore page. |
| hero | collection block + `mobileImage` field; variant `banner` = the rounded in-copy image banner (Explore). Template-slotted. |
| booking | bespoke simple block — static initial state of the booking app (dynamics D-01: integrate the real widget later). 4 cells (xwalk/max-cells): tabs `<ul>` + promo link `<p>` share cell 1. |
| accordion | collection block (summary + text), single-open (observed). Section head "FAQs" = default content. |
| checklist | bespoke container (one richtext cell per item: h3 + body). Sits beside default content in a `split` section. |
| plans | bespoke container (head / quarterly / onetime cells). |
| cards | collection block (image + text), fleet-card styling from the page's own CMS stylesheet. |
| Prose | default content in `narrow` / `itinerary` sections (Explore); `plans` section style centres head + note. |
| Icons | Material Symbols SVGs in /icons rendered as CSS masks (no 3 MB icon webfont); plan icons are the live SVGs. |
| Fixed third-party chrome | Medallia "Send feedback" tab + chatbot launcher NOT authored — integrate via delayed.js (D-11). |
| Mega menu | implemented (D-02, 2026-10-13): all six menus, desktop panel + mobile drill-down — see the section below. |
| Fonts | Saudia Sans 400/500/600/900 self-hosted from saudia.com's own files — LICENSING ALERT (fonts/LICENSING.md). |

## Heading levels
Kept as live (h1 hero, h3 lead/banner, h4 itinerary items, h2 FAQs on Explore; card titles h4→h3 per the outline rule).

## Lint
`npm run lint` exit 0. `.eslintignore` += `stardust` (migration tooling, already in .hlxignore).
`.stylelintrc.json`: `selector-class-pattern` admits BEM (`block__el--mod`) and icon names
(`ico-call_made`, matching the /icons file names); `no-descending-specificity` off (reordering
cascade-tuned rules would move gated layout). Duplicate `header .main-nav li` merged.

## Gates (final, 2026-10-07)
| Gate | Result |
|---|---|
| EDS render vs live, symmetric capture (eds2) | Athens 1440 0.78% Δ0 · 360 2.11% Δ+4 · Flight Pass 1440 1.97% Δ−4 · 360 4.33% Δ−1 · Classes 1440 0.97% Δ0 · 360 2.32% Δ−2 — all PASS |
| davids-model-lint | only D4 reds (local image srcs — inapplicable here, the platform uploader rewrites them; 8 are on the pre-existing /index). 🟡 D1 hero advisories justified: hero is a template-slotted media block. |
| localize-links --check | exit 0 |
| block-roundtrip (--ew) | EW editable 18/18 · 45/45 · 10/10. Justified reds: hero ROLE SWAP (prototype styles the h1 via a span; EDS ships a real h1); booking MISSING CTA ×2 (prototype CTA text includes the icon-ligature word, EDS uses CSS-mask icons — both links present). |
| qa-gate (harness) | PASS ×3; one Athens ⚠ = the intentionally non-full-bleed `hero banner`. |
| content-handoff | all pages envelope-stripped; nothing left to convert. |

Fixes from the EDS-vs-live round: template `cards`→`listing` (body/block class collision);
desktop nav li padding; itinerary box padding-bottom 32; accordion desktop head 71px/16px;
checklist wrapper margin specificity.

## AEM migration to /content/saudiaeds/en (2026-10-08)
Delivered paths (paths.json maps /content/saudiaeds/ → /):
/en/explore/saudia-new-destinations-2026/fly-to-athens · /en/book-and-manage/book/flight-pass ·
/en/plan/on-board/classes-of-travel · /en/nav · /en/footer.

- Generated through the importer: `tools/importer/import-replica.js` (+ `parsers/eds-block.js`,
  `transformers/eds-sections.js`, `page-templates.json` template `replica`), sources staged by
  `stardust/replica/stage-import-src.py` from the approved pages. Field hints survive by being
  parked on the cell (`data-xwalk-field`) in onLoad — the importer pre-clean strips comments.
- Page properties written lower-case: md2jcr matches page-model field names case-sensitively,
  so the earlier `Template`/`Theme` rows were dropped from the AEM package (layout lost on AEM).
- Duplicated chrome removed: one nav (from nav-home, the superset) + one footer (footer-saudia).
  Header/footer resolve `<lang-root>/nav|footer` via `getChromePath()` (scripts.js); an authored
  nav/footer page property still overrides. Template CSS keeps the live per-template chrome
  (notice off on product, AI search only on destination, empty SkyTeam slot on listing).
- Fixes the import exposed (also needed on AEM delivery): social icons used `img:first-child`
  (broke once images are wrapped in picture elements); desktop + mobile logo links merge into
  one link (same href) — header.js splits them again.
- Gates (en pages): pixel Athens 0.78%/Δ0 · 2.11%/Δ+4; Flight Pass 2.35%/Δ−16 (R-04 footer
  wording, accepted) · 4.33%/Δ−1; Classes 0.97%/Δ0 · 2.32%/Δ+2. qa-gate PASS ×3. Roundtrip EW
  18/18 · 45/45 · 10/10, same justified reds. Field hints identical to the approved pages.
  davids-model-lint: only D4 (local image srcs, rewritten by the uploader); D5 advisory on the
  checklist (markdown makes the nested bullet list "loose").
- Superseded, NOT deleted (content deletion is blocked here): the en-sa pages and the six
  variant chrome pages (nav, nav-home, nav-product, footer-saudia, footer-saudia-product,
  footer-saudia-experience).

## Home page → /content/saudiaeds/en/index (2026-10-08)
Replica approved (prototype gate 1440 2.02%/Δ0, 360 4.86%/Δ−3), converted and imported.

- New blocks: `carousel` (hero slides; autoplay, prev/next/pause, progress bars — observed on
  live), `fares` (destination fare cards; live data is D-14), `offers` (tile grid), `promo`
  (image banner + dark CTA, variant `bottom`), `stories` (news list beside the section copy).
  The four collection blocks inline the UE instrumentation helper (the round-trip harness
  cannot resolve block imports).
- `booking`: several promo paragraphs render as quick links (first three on mobile; Stopover
  carries the arrow_forward_ios glyph); any number of trip types (last paragraph = Book with Miles).
- Template `home`: fixed header (transparent over the hero, solid once scrolled, notice
  collapses), dark page theme (#192518) switching to white once the section styled
  `theme-light` reaches the viewport top (header.js); AI search and a filled Login shown;
  dark-theme logos = optional 4th–6th brand images in the shared nav; payment partners =
  optional nodes after the footer's social list, shown on home only.
- Page heading: the first slide title is the page <h1> (R-07); other slides <h2>.
- Gates: pixel EDS vs live 1440 2.25%/Δ0 · 360 5.94%/Δ−3; qa-gate PASS 29/0/0; round-trip EW
  73/73, 6 justified reds (CTA icon-ligature text in the prototype vs CSS-mask icons in EDS);
  davids-model-lint only D4 (local image srcs) + D1 advisories on `promo` (media block);
  regression on the other three pages: Athens 0.87%/2.11%, Flight Pass 2.41% (R-04)/4.33%,
  Classes 1.13%/2.32% — all PASS. Footer "Travel classes" now links to the migrated
  /en/plan/on-board/classes-of-travel.

## Explore destinations 2026 (8 siblings) → /content/saudiaeds/en/explore/saudia-new-destinations-2026 (2026-10-08)

- Importer `tools/importer/import-destination.js` (live captures, sibling tier of the Athens
  archetype). Two live variants:
  - banner + itinerary box (Abha, Antalya, El Alamein, Malaga, Nice), gated on Abha:
    1440 1.25%/Δ0 · 360 2.04%/Δ−4;
  - feature rows (Bodrum, Mykonos, Salalah), gated on Salalah: 1440 0.97%/Δ0 · 360 2.24%/Δ−3.
- New block `features` (item model `feature`: image, text): alternating image + text rows,
  values lifted from the live `.saudia-feature-row` computed styles; alternation is positional
  (`:nth-child(even)` reverses on desktop). The closing line after the rows is bold 18px.
- Section spacing: a `narrow` column that opens with `features` pads 96/19px (no paragraph
  margin), and the FAQ after it starts 48px tighter (176px).
- Itinerary box pads 32px (an opening paragraph sits 16px lower); booking info sits 24px
  under the fields on mobile when there is no promo link.
- Athens re-check after these changes: 0.87%/2.11% (unchanged). qa-gate PASS (Abha 19/1/0,
  Salalah 19/0/0); round-trip `features` 0 structural, EW 6/6.

## Press releases, article layout (51 pages) → /content/saudiaeds/en/about-us/press-releases (2026-10-08)

- Archetype `press-release` (replica approved 2026-10-08): prototype 1440 0.23%/Δ0 ·
  360 1.14%/Δ−4; article CSS lifted verbatim from the live inline CMS stylesheet.
- Template `article`. Section `article`: `article-hero` block + body default content
  (paragraphs, lists, in-body images) with `quote` blocks in between; section `article-end`:
  the "Back to news" link (authored in italics → secondary button, outlined green).
- New blocks:
  - `article-hero` (image, text): paragraphs before the `<h1>` are the meta items
    (location | date), paragraphs after it the subtitle. **D1 justified:** a split image/text
    composition with a structured meta line — a template-slotted media block, like `hero`.
  - `quote` (quotation, attribution): blockquote + `<cite>`. **D1 justified:** the attribution
    is its own field (the speaker line is styled and placed separately); default content has no
    blockquote/cite model in the Universal Editor text component.
- Travel notice is page-level on live (12 of 51 show it): page theme `no-notice` hides the strip
  (header reservation as `product`), drops the mobile spacer, and keeps the SkyTeam logo in
  the footer; pages with the notice use the `listing` footer (empty SkyTeam slot).
- Gates EDS vs live: with notice 1440 0.76%/Δ0 · 360 2.18%/Δ−4; without notice 1440 1.40%/Δ−20
  (R-04 footer wording) · 360 1.86%/Δ−2. qa-gate PASS on 5 variants (base, list, in-body
  image, div quote, no subtitle); round-trip `article-hero` + `quote` EW 7/7, 0 structural.
- Register: R-08 (15 releases from 2024 reuse a 2026 hero image), R-09 (inline links styled
  two ways) — both deferred.

## Press releases, legacy layout (167 pages) → /content/saudiaeds/en/about-us/press-releases (2026-10-08)

- Archetype `press-legacy` (replica approved 2026-10-08): prototype 1440 0.23%/Δ0 · 360 0.96%/Δ0.
- Template `news`: `hero` banner (desktop + mobile rendition; the mobile renditions were
  collected per page at 360px → stardust/migrate/legacy-mobile-banner.json), section `news`
  (title as `<h1>`, subtitle `<h2>` — R-10; optional image under the title), section
  `news-body` (body copy; the image goes after it on the 5 pages where live puts it last).
- Two live chrome variants, keyed on the live `cms-page` body class (stable between the crawl
  and today: 61 / 106 pages):
  - theme `legacy-cms`: fixed header, `hero (campaign)` banner (rounded, no shade, 335px under
    the header on mobile; 372px, 32px below the header and 12px short of the right edge on
    desktop), bulleted footer legal links;
  - plain: header in flow, default `hero` at 460px with the standard shade.
- Gates EDS vs live: legacy-cms 1440 1.96%/Δ−20 (R-04) · 360 2.10%/Δ0; plain 1440 7.88%/Δ−40
  (R-11 −20 + R-04 −20; the hot bands are this offset — no deltas above the body image) ·
  360 9.51%/Δ−24 (R-11). qa-gate PASS on both; round-trip `hero` 0 structural (2 pictures vs the
  prototype's single picture/source — by design). D1 on `hero (campaign)`: template-slotted
  media block, as for every `hero`.
- One release (`press-release-09062026`) uses a third article variant (`saudia-banner-article`)
  and is left for the miscellaneous batch.

## Universal Editor editability, DAM assets, Content Fragment Models (2026-10-08)

- **Editability probe** `stardust/.work/probe/ue-instrumentation.mjs <origin> <harness>…`:
  instruments the authored blocks the way UE delivery does (block + container items carry
  `data-aue-resource`, field cells `data-aue-prop`, reference fields the `<img>`) before the page
  decorates, then asserts every marker survives on one element that holds exactly that field's
  authored content (no generated markup inside, no other field nested). First run: 184 markers
  lost (row markers on accordion / cards / checklist / plans; field markers on hero, carousel,
  promo, fares, offers, stories, features, article-hero, quote, cards, checklist, plans).
- **Rule applied to every block**: container rows → `moveInstrumentation(row, item)`; each field
  cell is reused as the element that holds its content (classes only, no generated children);
  decoration lives outside the field or in CSS (plans icons → CSS masks; article-hero meta line,
  checklist title and cards title overlay → CSS layout). Card-style blocks (fares, offers,
  stories, cards) no longer unwrap the authored link — it stays in the field and a CSS stretched
  link makes the card clickable, so an inline save can never drop the link.
- `booking` is edited from the properties panel by design: its labels sit between generated
  controls (tabs, radios, swap button); the block keeps its own instrumentation, the cells' inline
  markers are not carried (an inline save could otherwise write controls into the content).
- `article-hero` model: new `meta` field (location, date — one paragraph each) so the meta line is
  its own editable element; `text` holds the title + subtitle. Importer updated; 51 pages
  re-imported.
- Trap found: a block must never create a `<footer>` (or `<header>`) element — the page's
  footer loader claims the first `<footer>` in the document (the quote attribution did; the site
  footer rendered inside the article).
- Parser: no `field:` hint on an empty cell (167 legacy heroes had `text` on an empty cell).
- Result: probe 100% intact on 14 sample pages (all blocks, both widths); pixel gates unchanged
  (home 2.25/5.94, Athens 0.87/2.11, Abha 1.25/2.04, Salalah 0.97/2.24, Flight Pass 2.41/4.33,
  Classes 1.13/2.32, press article 0.76/2.18 and 1.40/1.86, legacy 1.96/2.10 and 7.88/9.51).
- **DAM**: `stardust/migrate/dam.py` (after staging, before import) copies every referenced
  image into `content/content/dam/saudiaeds/<area>/` (areas: chrome, home, explore, about-us,
  book-and-manage, plan; `shared` when used by several) and rewrites the staged sources; all
  232 pages re-imported → 577 image references to `/content/dam/saudiaeds/…` (291 assets), none
  left on local paths (pages and JCR xml). Map: `stardust/migrate/dam-map.json`.
- **Content Fragment Models**: `tools/aem-packages/build-cf-models.py` →
  `tools/aem-packages/dist/saudiaeds-cf-models-1.0.0.zip` (Press Release, Quote, Destination,
  FAQ Item under /conf/saudiaeds/settings/dam/cfm/models + cq:conf on /content/dam/saudiaeds).
- qa-gate now reads the content cap from DESIGN.json `extensions.breakpoints` (measured live at
  2560px: 1200px column on four templates). Remaining FAILs on Athens / Abha (952px itinerary
  column), Classes (1170px card grid) and Flight Pass (empty full-width section box) are the cap
  heuristic reading intentional narrower modules — no visible content exceeds the live widths.

## Press releases removed; author text options on every block, item and section (2026-10-12)

- **Removed (user decision 2026-10-12: "delete About us and all press releases")**: blocks
  `article-hero`, `quote`; page templates `article`, `news` and themes `no-notice`,
  `legacy-cms` (styles, header, footer, hero `campaign` variant); section styles `article`,
  `article-end`, `news`, `news-body`; importers `import-article` / `import-news` and their
  reports; JCR output under migration-work/jcr-content/en/about-us; the Press Release and Quote
  content fragment models (package now `saudiaeds-cf-models-1.1.0.zip`: Destination, FAQ Item).
  Register R-08..R-11 withdrawn. **The pages themselves (content/en/about-us, 218) and their
  images (content/content/dam/saudiaeds/about-us, 174) must be deleted in the UI** — the
  workspace guard forbids deleting content.
- **Text options** — single source `tools/text-options/options.json`, generator
  `tools/text-options/build.py` (then `npm run build:json`):
  - a "Text style" tab on all 23 block / item / section models (default-content components and
    page metadata excluded): font, heading size, text size, font weight, font style, letter
    case, letter spacing, line height, text / heading / link colour (brand palette), text
    alignment, and content position (hero, carousel + slide, promo);
  - blocks and items: `classes_*` select fields → classes on the block / item (container blocks
    got a container model; their JS copies the row's classes onto the decorated item);
    sections: metadata fields → classes (scripts.js `decorateSectionTextOptions`); header and
    footer carry their fragment sections' options onto the parts built from them
    (`copyTextOptions`);
  - `styles/text-options.css` (imported by styles.css): each option class sets a variable — the
    nearest item / block / section wins — and one id-level rule per property applies it, so an
    author's choice beats the block typography; every option defaults to the live design.
  - lint: `xwalk/max-cells` raised for `booking` (5) and `section` (14) — the classes_* group and
    section metadata are not block cells.
- Verified: `stardust/.work/probe/text-options-probe.mjs` (authors every option on every block,
  one item per container, every section and the nav/footer fragments, then checks computed
  styles) → 597/597 visible text elements on 5 page types follow their nearest options; content
  position moves the text in hero, carousel and promo at both widths; with no options set all
  pixel gates are unchanged (home 2.25/5.94, Athens 0.87/2.11, Abha 1.25/2.04, Salalah
  0.97/2.24, Flight Pass 2.41/4.33, Classes 1.13/2.32); UE markers 163/163 intact.

## Booking engine Content Fragment model + fragments (2026-10-13)

- Models `booking-engine` (title, tabs[], tripTypes[], milesLabel, fromLabel, defaultOrigin,
  toLabel, swapLabel, infoMessage, infoLink → booking-link, links → booking-link[]) and
  `booking-link` (label, url, external) added to tools/aem-packages/build-cf-models.py.
- Fragments: 10 Booking Engines (home + 9 destinations) and 12 Booking Links under
  /content/dam/saudiaeds/fragments/{booking-engine,booking-links}, built from
  tools/aem-packages/booking-engine-fragments.json (extracted from the pages' booking blocks;
  the destinations' duplicated "Flight status" tab listed once).
- Package `saudiaeds-cf-models-1.2.0.zip`. Not installed from here: the AEM author answers 401
  (no author credentials in this environment) — install via Package Manager.
- The pages' booking blocks still carry their own authored content; they do not read the
  fragments yet.

## Booking block connected to the Booking Engine fragments (2026-10-13)

- `booking` model: `fragment` (aem-content-fragment picker, root …/fragments/booking-engine) and
  hidden `fragmentVariation`, after the four label rows (existing content keeps its row order).
- `booking.js`: renders the authored rows first, then loads the fragment via the persisted query
  `saudiaeds/booking-engine-by-path` (author origin inside UE with the session cookie, publish
  host otherwise; 4 s timeout) and re-renders from it inside `div.booking__fragment`
  (`data-aue-resource` = the fragment's master variation, `data-aue-type="reference"`; single-
  value labels as `data-aue-prop` text fields; each link as a reference to its Booking Link
  fragment). Falls back silently to the authored rows.
- Importers: transformer `booking-fragment.js` appends the fragment rows (page → fragment name:
  /en/index → home, fly-to-X → X); 10 pages re-imported; JCR carries `fragment="/content/dam/…"`.
- Query: tools/aem-packages/graphql/booking-engine-by-path.graphql + persist-queries.sh (run by
  the user with their own credentials); AEM setup steps in tools/aem-packages/README.md.
- Verified: with a mocked query response the widget renders entirely from the fragment
  (instrumented, same layout); against the real publish (query not yet persisted → 404) it keeps
  the authored labels; pixel gates unchanged (home 2.25/5.94, Athens 0.87/2.11, Salalah
  0.97/2.24); UE markers intact; lint clean.

## Header mega menus (D-02, 2026-10-13)

- Content: the six menus were captured from live (`stardust/migrate/megamenu.json`, promo images
  `megamenu-media.json` → DAM `/content/dam/saudiaeds/chrome/`). `stage-import-src.py` writes
  them into the nav source as nested lists: label → groups (title + links) + promo item (image,
  heading link, description); external links carry `title="External link"`. Nav re-imported
  (`en/nav`), so authors edit the menus as ordinary nested lists in the nav page.
- `blocks/header`: each label with a nested list becomes a disclosure button (`aria-expanded`,
  `aria-controls`); one menu open at a time, closes on a second click, Escape (focus back to the
  label) or an outside click. Groups are packed into columns as live does (consecutive groups
  share a column while they total ≤ 4 links: Plan's Travel information + Flight Information).
  Promo = image card, heading link stretched over the card, description, green arrow.
- Desktop (live values): panel full width at nav top + 58px, 40px padding; 1200px content; 180px
  columns with four groups (190px with fewer), gap 24; titles 500 14/20 #000; links 14/20
  rgba(0,0,0,.55), 12px apart; 40px after each group; promo 384×280 right; open label
  rgba(0,0,0,.1) bg, 500. Home: an open menu switches the header to its light theme (live).
- Mobile: the burger list (24px 600, 48px pitch); tapping a label opens a full-screen drill-down
  (back, title, close; titles 24/32, links 16/24 at 40px pitch, promo last).
- Verified against live at 1440: every menu's title/column/promo positions within 2px and panel
  heights within 2px; mobile drill-down rows match the live capture. Closed header unchanged:
  Athens gate 0.87% (282 px vs the previous capture — the "AI search" label no longer wraps,
  which also matches live). UE markers intact, text options 100%, lint clean.
- Note: the live "AlFursan Store" menu link is broken on live itself
  (`https://www.saudia.com/unsafe:javascript:void(0)`); carried as captured.

## Press release article layout rebuilt (2026-10-28)

- The 51 article-layout press releases still in the workspace referenced code removed on
  2026-10-12 (Article Hero 404'd, unknown to Universal Editor). User decision: rebuild the
  article layout (the legacy `news` layout, 167 pages, stays removed).
- Rebuilt from the approved prototype (stardust/prototypes/press-release{-proposed.html,.css}):
  blocks `article-hero` (image, meta, text; cells matched by content, meta separators in CSS)
  and `quote` (quotation, attribution → `<figure><blockquote>…<figcaption>`, no `<footer>`),
  with models, section filter and Text style tabs; section styles `article` (flow-root, 40px
  padding after the hero: the live flex column never collapses margins) and `article-end`
  (Back to news, outlined secondary button); template `article` main padding 76/188 (mobile),
  32/120 (desktop); theme `no-notice` hides the strip and reserves the header like `product`;
  with the notice the footer is the `listing` one (empty SkyTeam slot).
- Verified: harness en-press-release vs the prototype at 1440 and 360 — all 12 measured
  elements 0px off, same document height (2929 / 5749); sweep of all 51 pages at both widths
  (no 404s or errors, hero/quotes/back button present, notice on 12, hidden on 39, no overflow);
  UE probe 100% on 5 variants (base, div quote, in-body image, list, no subtitle) and on home and
  Flight Pass; text options 93/93; lint clean.
