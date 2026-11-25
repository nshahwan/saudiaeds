/**
 * stories-folder — the stories list built from a folder of pages (no hand-authored stories),
 * e.g. the latest press releases. Renders with the stories block's design (blocks/stories).
 * Follows waringme/eds-reusable-blocks cards-folder (listing, settings, page properties,
 * errors); the markup is the stories list (ul.stories__list > li > .stories__item).
 *
 * Settings: window.edsReusableBlocks.storiesFolder (scripts.js) — indexPath (default
 * /query-index.json), siteRoot (AEM prefix removed from folder selections), authorRoot (AEM
 * author API root; '' forces published behaviour; unset: detected from a /content/<site>/ path).
 *
 * Model (xwalk block, _stories-folder.json) — three positional single-cell rows:
 *   folder    the folder to list (link or path starting with /; the site root and .html dropped)
 *   count     how many stories (default 3; not a whole number: the default; 0 becomes 1)
 *   category  optional: only pages with that Category page property (any depth, any case)
 * Styles: `card-order` sorts by the Card order page property (lowest first, 0 included, missing
 * = 999, ties by title; `story-order` from before is read the same), otherwise latest first;
 * `include-subfolders` lists descendants too, without the pages that are parents of others.
 * Each page becomes a story from its Card title / Card summary / Card link text / Image / Card
 * mobile image properties, falling back to its first heading (else its title without the site
 * name), description and share / first image; link text "Learn more" (the stories design). The
 * current page, nav, footer and fragments are left out. Published pages come from the query index
 * (up to 2000 entries), in the Universal Editor (AEM author) from <authorRoot><folder>.2.json, or
 * /bin/querybuilder.json for a category or sub-folders (up to 500 pages). Entries missing a
 * title, summary or image are completed from the page itself (failures logged, index data kept).
 * A listing that fails shows a message; in the editor an unset folder and an empty folder show
 * their own prompts so the block stays selectable.
 * @ew-exempt all — index-driven listing; the block's only authored content is its config (EW5 c)
 */
import { loadCSS } from '../../scripts/aem.js';
import folderPages from '../../scripts/folder-pages.js';
import { storyItem, storyText } from '../stories/stories.js';

const settings = () => window.edsReusableBlocks?.storiesFolder || {};
const SETTINGS = ['folder', 'count', 'category'];
const COUNT = 3;
const {
  authorRoot, sitePath, usable, picture, withoutSiteName, list: listPages,
} = folderPages(settings);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** the block's field rows, in model order: folder, count, category (set or empty) */
function readConfig(block) {
  const config = {
    folder: null,
    count: COUNT,
    category: '',
    order: block.classList.contains('card-order') || block.classList.contains('story-order')
      ? 'card-order' : 'latest',
    deep: block.classList.contains('include-subfolders'),
  };
  [...block.children].slice(0, SETTINGS.length).forEach((row, i) => {
    const a = row.querySelector('a');
    const text = row.textContent.trim();
    if (SETTINGS[i] === 'folder') {
      const raw = a ? a.getAttribute('href') : text;
      if (raw && raw.startsWith('/')) config.folder = sitePath(raw);
      else if (raw) throw new Error('Folder must be an absolute site path beginning with /');
    } else if (SETTINGS[i] === 'count' && /^\d+$/.test(text)) {
      const count = Number(text);
      if (!Number.isSafeInteger(count)) throw new Error('Story count must be a safe whole number');
      config.count = Math.max(1, count);
    } else if (SETTINGS[i] === 'category') {
      config.category = text.toLowerCase();
    }
  });
  return config;
}

function story(entry) {
  const text = storyText({
    title: entry.cardTitle || entry.heading || withoutSiteName(entry.title),
    summary: entry.cardSummary || entry.description,
    linkText: entry.cardLinkText,
  }, entry.href || entry.path);
  // listing images are decorative (alt=""); a failed image removes its slot
  const desktop = usable(entry.image) ? picture(entry.image, '.stories__pic') : null;
  const mobile = desktop && usable(entry.mobileImage) ? picture(entry.mobileImage, '.stories__pic') : null;
  return storyItem(desktop, mobile, text);
}

export default async function decorate(block) {
  // the stories' look (list, section layout) lives in the stories block's stylesheet
  block.classList.add('stories');
  block.parentElement?.classList.add('stories-wrapper');
  block.closest('.section')?.classList.add('stories-container');
  const css = loadCSS(`${window.hlx.codeBasePath}/blocks/stories/stories.css`);
  const list = el('ul', 'stories__list');
  const prompt = (text) => list.append(el('li', 'stories-folder__placeholder', text));
  try {
    const config = readConfig(block);
    block.replaceChildren(list);
    if (!config.folder) {
      if (authorRoot()) prompt('Pick a folder to show its pages as stories.');
      return;
    }
    block.dataset.folder = config.folder;
    const opts = {
      limit: config.count, order: config.order, category: config.category, deep: config.deep,
    };
    const entries = await listPages(config.folder, opts);
    list.append(...entries.map(story));
    if (!entries.length && authorRoot()) prompt(`No pages found in ${config.folder}.`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('stories-folder: could not load listing', error);
    list.replaceChildren();
    prompt('Could not load the page listing.');
    list.lastElementChild.setAttribute('role', 'status');
    block.replaceChildren(list);
  } finally {
    await css;
  }
}
