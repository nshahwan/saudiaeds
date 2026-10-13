# Dynamic surface — saudia.com pilot (3 archetypes)

Observed in the interactive browser session (stardust/replica/motion/observed.json). The static
recreation renders every widget's initial state; this table is the migration gate for behaviour.

| # | Feature | Where | Observed behaviour | Disposition |
|---|---|---|---|---|
| D-01 | Booking widget (Book / Check-in / Flight schedule / Flight status / Manage tabs, trip type, From/To airport comboboxes, Book with Miles) | explore-destination | Angular app; airport autocomplete + booking flow hit saudia.com booking APIs; default origin "Jeddah (JED)" filled by script on desktop only | **Integrate** — embed the existing booking app/widget as a block (host-bound API); static replica shows initial state |
| D-02 | Main-nav mega menu | all (header) | click on a top-level item opens a 284px submenu panel | **Implemented** (2026-10-13) in `blocks/header` from the nav fragment's nested lists — all six menus, desktop + mobile |
| D-03 | AI search | explore-destination header | opens Saudia AI search overlay | **Integrate** (third-party/app) |
| D-04 | Language / country selector, Login | header | open selector / login flows | **Integrate** (existing app routes) |
| D-05 | Notice strip | header (Athens, Classes) | link to /en-SA/travel-updates/202602281; mobile close button | **Implement** as authored banner fragment; close is client-side |
| D-06 | FAQ accordion | explore-destination | single-open: opening a panel closes the others | **Implemented** (canon.js) |
| D-07 | Footer groups | all, mobile | tap to expand | **Implemented** (canon.js) |
| D-08 | Fleet card hover | experience-cards | image scale 1.03, deeper shadow, green-tinted border | **Implemented** (CSS lifted from page's own stylesheet) |
| D-09 | "Sign up now" | book-manage-product | script button opens https://flightpass.saudia.com/sv/subscriptions in a new tab | **Implemented** as `<a target="_blank">` |
| D-10 | Newsletter subscribe | footer | email form posting to Saudia subscription service | **Integrate** (form endpoint) |
| D-11 | Medallia "Send feedback" tab, chatbot launcher | all (fixed) | third-party scripts | **Integrate** via delayed.js; replicated statically for the gate |
| D-12 | Analytics (GTM, Datadog) | all | tags | **Integrate** via delayed.js |
| D-13 | Newsletter nudge ("Get exclusive discounts… subscribing to our newsletter.") | home | CDP personalisation pop-over (absolute, z 99999), shown once per visitor, closeable | **Integrate** (CDP) — not rendered in the replica; no layout effect |
| D-14 | "Best fares from Jeddah" | home | origin-city selector + live fare prices from the fares API; 5-card horizontal carousel | **Integrate** (fares API) — replica shows the captured fares as authored cards |
| D-15 | Hero carousel | home | autoplay, prev / next / pause, progress bars, 5 slides | **Implemented** (canon.js / EDS block) |
| D-16 | Home header + theme | home | fixed header turns solid on scroll; page theme dark → light once the theme marker passes the viewport top | **Implemented** (canon.js / EDS header + scripts) |
