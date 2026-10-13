/**
 * Transformer: booking-fragment — points every booking block at the page's Booking Engine
 * Content Fragment (/content/dam/saudiaeds/fragments/booking-engine/<name>, packaged by
 * tools/aem-packages/build-cf-models.py). Appends the block's two fragment rows: `fragment`
 * (a link to the fragment path) and `fragmentVariation` (empty: master). Run BEFORE the
 * eds-block parser, on EDS-shaped block markup (div.booking > row > cell).
 */
const FRAGMENTS = '/content/dam/saudiaeds/fragments/booking-engine';
// the Booking Engine fragments that exist (tools/aem-packages/booking-engine-fragments.json)
const NAMES = ['home', 'abha', 'antalya', 'athens', 'bodrum', 'el-alamein', 'malaga', 'mykonos', 'nice', 'salalah'];

export function bookingFragmentName(pagePath) {
  const path = pagePath.replace(/\.html$/, '').replace(/\/$/, '');
  if (/\/en(\/index)?$/.test(path)) return 'home';
  return path.split('/').pop().replace(/^fly-to-/, '');
}

export default function addBookingFragment(main, document, pagePath) {
  const name = bookingFragmentName(pagePath);
  if (!NAMES.includes(name)) return;
  main.querySelectorAll('div.booking').forEach((block) => {
    if (block.children.length > 4) return; // already carries the fragment rows
    const href = `${FRAGMENTS}/${name}`;
    const cell = document.createElement('div');
    cell.dataset.xwalkField = 'fragment';
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = href;
    p.append(a);
    cell.append(p);
    const row = document.createElement('div');
    row.append(cell);
    const variationRow = document.createElement('div');
    variationRow.append(document.createElement('div'));
    block.append(row, variationRow);
  });
}
