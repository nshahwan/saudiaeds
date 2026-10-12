/* global WebImporter */
/**
 * Import script: replica — migrates the approved Saudia replica pages (and the shared
 * nav/footer) into the AEM site at /content/saudiaeds/en (delivered as /en/...).
 *
 * Source: the gated EDS pages staged by stardust/replica/stage-import-src.py, one per
 * target path (http://127.0.0.1:8795/en/<path>.html). Blocks are already modeled for
 * xwalk, so the parser re-emits them cell by cell; the document path is the source path.
 */
import edsBlockParser from './parsers/eds-block.js';
import edsSectionsTransformer from './transformers/eds-sections.js';

const META_BLOCKS = ['metadata', 'section-metadata'];

export default {
  // The importer's pre-clean strips comments (and empty inline markers) before transform(),
  // so park each xwalk field hint on its cell as data-xwalk-field (space-separated, in
  // order); the block parser re-creates the comments at the start of the cell.
  onLoad: async ({ document }) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
    const hints = [];
    while (walker.nextNode()) {
      const m = walker.currentNode.nodeValue.trim().match(/^field:(\S+)$/);
      if (m) hints.push([walker.currentNode, m[1]]);
    }
    hints.forEach(([comment, field]) => {
      const cell = comment.parentElement;
      cell.dataset.xwalkField = [cell.dataset.xwalkField, field].filter(Boolean).join(' ');
      comment.remove();
    });
  },

  transform: ({ document, params }) => {
    const main = document.querySelector('main');

    main.querySelectorAll(':scope > div > div[class]').forEach((block) => {
      if (!META_BLOCKS.includes(block.classList[0])) edsBlockParser(block, { document });
    });
    edsSectionsTransformer(main, document);

    const { pathname } = new URL(params.originalURL);
    const path = WebImporter.FileUtils.sanitizePath(pathname.replace(/\.html$/, ''));
    return [{
      element: main,
      path,
      report: { title: document.title, source: 'stardust replica (approved)' },
    }];
  },
};
