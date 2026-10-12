/* global WebImporter */
/**
 * Parser: eds-block — re-imports an already-modeled EDS block (div.<name>[.<variant>…],
 * one div per row, one div per cell) as an import table. Every cell node is MOVED into
 * the table and each xwalk field hint is re-created as a <!-- field:x --> comment, so
 * hints and collapsed attributes (img alt) survive into the generated page unchanged.
 *
 * Header row: "Hero (banner)" → block `hero`, variant class `banner`.
 * @param {Element} element the block div
 * @param {{ document: Document }} context importer context
 */
export default function parse(element, { document }) {
  const [name, ...variants] = [...element.classList];
  const title = name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const header = variants.length ? `${title} (${variants.join(', ')})` : title;

  // field hints arrive as the cell's data-xwalk-field (the import script's onLoad parks
  // them, since source comments are stripped before transform); rebuild them as comments.
  // An array cell is appended node by node straight into the <td> (no wrapper element).
  // an empty cell carries no hint (Universal Editor hinting rule)
  const rows = [...element.children].map((row) => [...row.children].map((cell) => {
    const empty = !cell.textContent.trim() && !cell.querySelector('img, picture, a');
    const hints = (empty ? '' : cell.dataset.xwalkField || '').split(' ').filter(Boolean)
      .map((field) => document.createComment(` field:${field} `));
    return [...hints, ...cell.childNodes];
  }));

  element.replaceWith(WebImporter.DOMUtils.createTable([[header], ...rows], document));
}
