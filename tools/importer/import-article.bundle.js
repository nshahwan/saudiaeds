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

  // tools/importer/import-article.js
  var import_article_exports = {};
  __export(import_article_exports, {
    default: () => import_article_default
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
  function kvRows(block2) {
    return [...block2.children].map((row) => [...row.children]).filter((cells) => cells.length >= 2).map(([k, v]) => [k.textContent.trim(), v]);
  }
  function transform(main, document) {
    main.querySelectorAll(":scope > div > div.metadata").forEach((block2) => {
      const rows = kvRows(block2).map(([k, v]) => [k.toLowerCase(), v.textContent.trim()]).filter(([k]) => !DROPPED_KEYS.includes(k));
      block2.replaceWith(WebImporter.DOMUtils.createTable([["Metadata"], ...rows], document));
    });
    main.querySelectorAll(":scope > div > div.section-metadata").forEach((block2) => {
      const rows = kvRows(block2).map(([k, v]) => [k, v.textContent.trim()]);
      block2.replaceWith(WebImporter.DOMUtils.createTable([["Section Metadata"], ...rows], document));
    });
    const sections = [...main.querySelectorAll(":scope > div")];
    sections.forEach((section, i) => {
      if (i > 0) section.before(document.createElement("hr"));
      section.replaceWith(...section.childNodes);
    });
  }

  // tools/importer/import-article.js
  var HOST = "https://www.saudia.com";
  var MIGRATED = /* @__PURE__ */ new Set([
    "/en",
    "/en/explore/saudia-new-destinations-2026/fly-to-athens",
    "/en/book-and-manage/book/flight-pass",
    "/en/plan/on-board/classes-of-travel"
  ]);
  var RELEASE = /^\/en\/about-us\/press-releases\/(20\d\d\/\d\d\/)?press-release-[\w-]+$/;
  var text = (e) => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
  function href(u, document) {
    if (!u || /^(mailto:|tel:|#)/i.test(u)) return u;
    const abs = /^https?:/i.test(u) ? u : `${HOST}${u.startsWith("/") ? "" : "/"}${u}`;
    const url = new URL(abs);
    if (!/(^|\.)saudia\.com$/i.test(url.hostname)) return u;
    const path = url.pathname.replace(/\/$/, "");
    const target = path.replace(/^\/en(-sa)?(?=\/|$)/i, "/en").toLowerCase();
    const local = document.body.dataset.migrated.split(" ");
    if (MIGRATED.has(target) || RELEASE.test(target) && local.includes(target)) {
      return target + url.search + url.hash;
    }
    return abs;
  }
  function el(document, tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v != null) e.setAttribute(k, v);
    });
    e.append(...kids.flat().filter((k) => k != null));
    return e;
  }
  function block(document, name, rows) {
    return el(document, "div", { class: name }, rows.map((row) => el(document, "div", {}, row.map(([field, nodes]) => {
      const cell = el(document, "div", {}, nodes);
      if (field) cell.dataset.xwalkField = field;
      return cell;
    }))));
  }
  function sectionMeta(document, style) {
    return el(document, "div", { class: "section-metadata" }, el(document, "div", {}, el(document, "div", {}, "style"), el(document, "div", {}, style)));
  }
  function picture(document, src, alt) {
    return el(document, "p", {}, el(document, "picture", {}, el(document, "img", { src, alt: alt || "" })));
  }
  function clean(document, nodes) {
    const out = [];
    const walk = (n) => {
      if (n.nodeType === 3) {
        if (n.textContent.trim()) out.push(el(document, "p", {}, n.textContent.trim()));
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (/^(h[1-6]|p|ul|ol)$/.test(tag)) {
        if (tag === "p" && n.querySelector("h1,h2,h3,h4,h5,h6,p,ul,ol,div,img")) {
          [...n.childNodes].forEach(walk);
          return;
        }
        if (!text(n) && !n.querySelector("img")) return;
        const c = n.cloneNode(true);
        c.querySelectorAll("*").forEach((x) => {
          [...x.attributes].forEach((a) => {
            if (!["href", "src", "alt", "target"].includes(a.name)) x.removeAttribute(a.name);
          });
        });
        [...c.attributes].forEach((a) => c.removeAttribute(a.name));
        c.querySelectorAll("a[href]").forEach((a) => a.setAttribute("href", href(a.getAttribute("href"), document)));
        c.querySelectorAll("span").forEach((s) => s.replaceWith(...s.childNodes));
        out.push(c);
        return;
      }
      if (tag === "img") {
        out.push(picture(document, n.getAttribute("src"), n.getAttribute("alt")));
        return;
      }
      [...n.childNodes].forEach(walk);
    };
    nodes.forEach(walk);
    return out;
  }
  function hero(document, root) {
    const img = root.querySelector(".saudia-hero-image-wrap img, img");
    const box = root.querySelector(".saudia-article-meta");
    const meta = (box && box.dataset.items ? JSON.parse(box.dataset.items) : []).map((t) => el(document, "p", {}, t));
    const sub = root.querySelector(".saudia-article-subtitle");
    return block(document, "article-hero", [
      [["image", img ? picture(document, img.getAttribute("src"), img.getAttribute("alt")) : null]],
      [["meta", meta]],
      [["text", [
        el(document, "h1", {}, text(root.querySelector("h1"))),
        sub && text(sub) ? el(document, "p", {}, text(sub)) : null
      ]]]
    ]);
  }
  function quote(document, q) {
    const cite = q.querySelector("cite");
    const paras = clean(document, [...q.childNodes].filter((n) => n !== cite));
    return block(document, "quote", [
      [["quotation", paras]],
      [["attribution", cite && text(cite) ? text(cite) : null]]
    ]);
  }
  var import_article_default = {
    // the importer's pre-clean may drop <head>; park the staged meta on <body> first
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      const m = (n) => {
        var _a;
        return ((_a = document.querySelector(`meta[name="${n}"]`)) == null ? void 0 : _a.content) || "";
      };
      Object.assign(document.body.dataset, {
        title: document.title,
        desc: m("description"),
        migrated: m("migrated"),
        live: m("body-class")
      });
      document.querySelectorAll(".saudia-article-meta").forEach((box) => {
        box.dataset.items = JSON.stringify([...box.querySelectorAll("span")].map(text).filter(Boolean));
      });
    }),
    transform: ({ document, params }) => {
      const main = document.querySelector("main");
      const d = document.body.dataset;
      const article = main.querySelector(".saudia-modern-article");
      const sections = [];
      sections.push(el(document, "div", {}, el(document, "div", { class: "metadata" }, [
        ["Title", d.title || ""],
        ["Description", d.desc || ""],
        ["template", "article"],
        // live shows the travel notice strip only on pages flagged withTravelNotice
        .../\bwithTravelNotice\b/.test(d.live || "") ? [] : [["theme", "no-notice"]]
      ].map(([k, v]) => el(document, "div", {}, el(document, "div", {}, k), el(document, "div", {}, v))))));
      if (article) {
        const body = article.querySelector(".saudia-article-body");
        const nodes = body ? [...body.childNodes].flatMap((n) => n.nodeType === 1 && n.matches(".saudia-article-quote") ? [quote(document, n)] : clean(document, [n])) : [];
        sections.push(el(
          document,
          "div",
          {},
          hero(document, article.querySelector(".saudia-article-hero") || article),
          nodes,
          sectionMeta(document, "article")
        ));
      }
      const back = main.querySelector(".saudia-btn-container a[href]");
      if (back) {
        sections.push(el(document, "div", {}, el(document, "p", {}, el(
          document,
          "em",
          {},
          el(document, "a", { href: href(back.getAttribute("href"), document) }, text(back))
        )), sectionMeta(document, "article-end")));
      }
      main.replaceChildren(...sections);
      main.querySelectorAll(":scope > div > div[class]").forEach((b) => {
        if (!["metadata", "section-metadata"].includes(b.classList[0])) parse(b, { document });
      });
      transform(main, document);
      const { pathname } = new URL(params.originalURL);
      return [{
        element: main,
        path: WebImporter.FileUtils.sanitizePath(pathname.replace(/\.html$/, "")),
        report: { title: d.title, source: "live capture (press release, article layout)" }
      }];
    }
  };
  return __toCommonJS(import_article_exports);
})();
