# Font licensing — confirm before publishing to aem.live

| File | Family | Owner / foundry | Status |
|---|---|---|---|
| saudia-sans-400.woff2 | Saudia Sans Regular | Saudia (custom brand face; foundry not stated) | ⚠️ confirm web-embedding rights for the EDS domain |
| saudia-sans-500.woff2 | Saudia Sans Medium | Saudia | ⚠️ confirm |
| saudia-sans-600.woff2 | Saudia Sans SemiBold | Saudia | ⚠️ confirm |
| saudia-sans-900.woff2 | Saudia Sans Bold | Saudia | ⚠️ confirm |

The files are byte-identical to the ones saudia.com serves from
`/dist/SaudiaWebApp/browser/fonts/custom-fonts/`. Saudia's font licence must cover
self-hosting them on the new Edge Delivery origin.

**Remove path** (if the licence cannot be confirmed): delete the four `.woff2` files and
their `@font-face` rules in `styles/fonts.css`. Every stack falls back to the
metric-matched `saudia-sans-fallback` face (local Arial, size-adjust 91.44%) declared in
`styles/styles.css`, so layout is preserved; letterforms will differ.
