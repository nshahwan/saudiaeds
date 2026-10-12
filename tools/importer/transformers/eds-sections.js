/* global WebImporter */
/**
 * Transformer: eds-sections — turns EDS section markup back into authoring structure:
 *   - div.metadata          → "Metadata" table. Keys are lower-cased: the AEM conversion
 *                             matches page-model field names case-sensitively, so
 *                             "Template"/"Theme" would be dropped (only title/description
 *                             are mapped case-insensitively). nav/footer keys are removed —
 *                             chrome resolves from the language root (/en/nav, /en/footer).
 *   - div.section-metadata  → "Section Metadata" table
 *   - main > div sections   → unwrapped, separated by <hr>
 * Run AFTER the block parser (it only handles the two metadata blocks).
 * @param {Element} main the page's main element
 * @param {Document} document the source document
 */
const DROPPED_KEYS = ['nav', 'footer'];

function kvRows(block) {
  return [...block.children]
    .map((row) => [...row.children])
    .filter((cells) => cells.length >= 2)
    .map(([k, v]) => [k.textContent.trim(), v]);
}

export default function transform(main, document) {
  main.querySelectorAll(':scope > div > div.metadata').forEach((block) => {
    const rows = kvRows(block)
      .map(([k, v]) => [k.toLowerCase(), v.textContent.trim()])
      .filter(([k]) => !DROPPED_KEYS.includes(k));
    block.replaceWith(WebImporter.DOMUtils.createTable([['Metadata'], ...rows], document));
  });

  main.querySelectorAll(':scope > div > div.section-metadata').forEach((block) => {
    const rows = kvRows(block).map(([k, v]) => [k, v.textContent.trim()]);
    block.replaceWith(WebImporter.DOMUtils.createTable([['Section Metadata'], ...rows], document));
  });

  const sections = [...main.querySelectorAll(':scope > div')];
  sections.forEach((section, i) => {
    if (i > 0) section.before(document.createElement('hr'));
    section.replaceWith(...section.childNodes);
  });
}
