/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-replica.js
  var import_replica_exports = {};
  __export(import_replica_exports, {
    default: () => import_replica_default
  });

  // tools/importer/parsers/eds-block.js
  function parse(element, { document }) {
    const [name, ...variants] = [...element.classList];
    const title = name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const header = variants.length ? `${title} (${variants.join(", ")})` : title;
    const rows = [...element.children].map((row) => [...row.children].map((cell) => {
      const empty = !cell.textContent.trim() && !cell.querySelector("img, picture, a");
      const hints = (empty ? "" : cell.dataset.xwalkField || "").split(" ").filter(Boolean).map((field) => document.createComment(` field:${field} `));
      return [...hints, ...cell.childNodes];
    }));
    element.replaceWith(WebImporter.DOMUtils.createTable([[header], ...rows], document));
  }

  // tools/importer/transformers/eds-sections.js
  var DROPPED_KEYS = ["nav", "footer"];
  function kvRows(block) {
    return [...block.children].map((row) => [...row.children]).filter((cells) => cells.length >= 2).map(([k, v]) => [k.textContent.trim(), v]);
  }
  function transform(main, document) {
    main.querySelectorAll(":scope > div > div.metadata").forEach((block) => {
      const rows = kvRows(block).map(([k, v]) => [k.toLowerCase(), v.textContent.trim()]).filter(([k]) => !DROPPED_KEYS.includes(k));
      block.replaceWith(WebImporter.DOMUtils.createTable([["Metadata"], ...rows], document));
    });
    main.querySelectorAll(":scope > div > div.section-metadata").forEach((block) => {
      const rows = kvRows(block).map(([k, v]) => [k, v.textContent.trim()]);
      block.replaceWith(WebImporter.DOMUtils.createTable([["Section Metadata"], ...rows], document));
    });
    const sections = [...main.querySelectorAll(":scope > div")];
    sections.forEach((section, i) => {
      if (i > 0) section.before(document.createElement("hr"));
      section.replaceWith(...section.childNodes);
    });
  }

  // tools/importer/transformers/booking-fragment.js
  var FRAGMENTS = "/content/dam/saudiaeds/fragments/booking-engine";
  var NAMES = ["home", "abha", "antalya", "athens", "bodrum", "el-alamein", "malaga", "mykonos", "nice", "salalah"];
  function bookingFragmentName(pagePath) {
    const path = pagePath.replace(/\.html$/, "").replace(/\/$/, "");
    if (/\/en(\/index)?$/.test(path)) return "home";
    return path.split("/").pop().replace(/^fly-to-/, "");
  }
  function addBookingFragment(main, document, pagePath) {
    const name = bookingFragmentName(pagePath);
    if (!NAMES.includes(name)) return;
    main.querySelectorAll("div.booking").forEach((block) => {
      if (block.children.length > 4) return;
      const href = `${FRAGMENTS}/${name}`;
      const cell = document.createElement("div");
      cell.dataset.xwalkField = "fragment";
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = href;
      a.textContent = href;
      p.append(a);
      cell.append(p);
      const row = document.createElement("div");
      row.append(cell);
      const variationRow = document.createElement("div");
      variationRow.append(document.createElement("div"));
      block.append(row, variationRow);
    });
  }

  // tools/importer/import-replica.js
  var META_BLOCKS = ["metadata", "section-metadata"];
  var import_replica_default = {
    // The importer's pre-clean strips comments (and empty inline markers) before transform(),
    // so park each xwalk field hint on its cell as data-xwalk-field (space-separated, in
    // order); the block parser re-creates the comments at the start of the cell.
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
      const hints = [];
      while (walker.nextNode()) {
        const m = walker.currentNode.nodeValue.trim().match(/^field:(\S+)$/);
        if (m) hints.push([walker.currentNode, m[1]]);
      }
      hints.forEach(([comment, field]) => {
        const cell = comment.parentElement;
        cell.dataset.xwalkField = [cell.dataset.xwalkField, field].filter(Boolean).join(" ");
        comment.remove();
      });
    }),
    transform: ({ document, params }) => {
      const main = document.querySelector("main");
      addBookingFragment(main, document, new URL(params.originalURL).pathname);
      main.querySelectorAll(":scope > div > div[class]").forEach((block) => {
        if (!META_BLOCKS.includes(block.classList[0])) parse(block, { document });
      });
      transform(main, document);
      const { pathname } = new URL(params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(pathname.replace(/\.html$/, ""));
      return [{
        element: main,
        path,
        report: { title: document.title, source: "stardust replica (approved)" }
      }];
    }
  };
  return __toCommonJS(import_replica_exports);
})();
