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

  // tools/importer/import-destination.js
  var import_destination_exports = {};
  __export(import_destination_exports, {
    default: () => import_destination_default
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

  // tools/importer/import-destination.js
  var HOST = "https://www.saudia.com";
  var MIGRATED = /* @__PURE__ */ new Set([
    "/en",
    "/en/explore/saudia-new-destinations-2026/fly-to-athens",
    "/en/book-and-manage/book/flight-pass",
    "/en/plan/on-board/classes-of-travel",
    "/en/explore/saudia-new-destinations-2026/fly-to-abha",
    "/en/explore/saudia-new-destinations-2026/fly-to-antalya",
    "/en/explore/saudia-new-destinations-2026/fly-to-bodrum",
    "/en/explore/saudia-new-destinations-2026/fly-to-el-alamein",
    "/en/explore/saudia-new-destinations-2026/fly-to-malaga",
    "/en/explore/saudia-new-destinations-2026/fly-to-mykonos",
    "/en/explore/saudia-new-destinations-2026/fly-to-nice",
    "/en/explore/saudia-new-destinations-2026/fly-to-salalah"
  ]);
  var ICON = '.material-icons, .material-icons-outlined, .material-symbols-outlined, [class*="icon-"]';
  var text = (e) => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
  function href(u) {
    if (!u || /^(https?:|mailto:|tel:|#)/i.test(u)) return u;
    const path = u.split(/[?#]/)[0].replace(/\/$/, "");
    const target = path.replace(/^\/en(-sa)?(?=\/|$)/i, "/en").toLowerCase();
    if (MIGRATED.has(target)) return target + u.slice(path.length);
    return HOST + (u.startsWith("/") ? u : `/${u}`);
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
        c.querySelectorAll(ICON).forEach((i) => i.remove());
        c.querySelectorAll("*").forEach((x) => {
          [...x.attributes].forEach((a) => {
            if (!["href", "src", "alt", "target"].includes(a.name)) x.removeAttribute(a.name);
          });
        });
        [...c.attributes].forEach((a) => c.removeAttribute(a.name));
        c.querySelectorAll("a[href]").forEach((a) => a.setAttribute("href", href(a.getAttribute("href"))));
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
  function hero(document, root, meta) {
    const img = root.querySelector("img");
    const h1 = root.querySelector("h1");
    return block(document, "hero", [
      [["image", img ? picture(document, img.getAttribute("src"), img.getAttribute("alt")) : null]],
      [["mobileImage", meta.mobile ? picture(document, meta.mobile, meta.mobileAlt) : null]],
      [["text", el(document, "h1", {}, text(h1))]]
    ]);
  }
  function booking(document, root) {
    const label = (a) => {
      const c = a.cloneNode(true);
      c.querySelectorAll(ICON).forEach((i) => i.remove());
      return text(c);
    };
    const tabs = el(document, "ul", {}, [...root.querySelectorAll(".mat-tab-label")].map((t) => el(document, "li", {}, text(t))));
    const promos = [...root.querySelectorAll(".ancillary-links a")].filter((a) => label(a)).map((a) => el(document, "p", {}, el(document, "a", { href: href(a.getAttribute("href")) }, label(a))));
    const trips = [...root.querySelectorAll(".mat-radio-label-content")].map((r) => el(document, "p", {}, text(r)));
    const miles = text(root.querySelector(".mat-slide-toggle-content"));
    const info = root.querySelector(".covid-update-box");
    const more = info ? info.querySelector("a") : null;
    return block(document, "booking", [
      [["tabs", [tabs, ...promos]]],
      [["trip", [...trips, miles ? el(document, "p", {}, miles) : null]]],
      // live fills the desktop origin by script (capture state, as on the approved Athens page)
      [["route", [el(document, "p", {}, "From"), el(document, "p", {}, "Jeddah (JED)"), el(document, "p", {}, "To")]]],
      [["info", [
        el(document, "p", {}, text(info && info.querySelector("p"))),
        more ? el(document, "p", {}, el(document, "a", { href: href(more.getAttribute("href")) }, label(more))) : null
      ]]]
    ]);
  }
  function features(document, box) {
    return block(document, "features", [...box.querySelectorAll(".saudia-feature-row")].map((row) => {
      const img = row.querySelector(".saudia-feature-image img");
      return [
        ["image", img ? picture(document, img.getAttribute("src"), img.getAttribute("alt")) : null],
        ["text", clean(document, [...(row.querySelector(".saudia-feature-content") || row).childNodes])]
      ];
    }));
  }
  function richText(document, root) {
    const wrapper = root.querySelector(".saudia-destination-wrapper") || root;
    const box = wrapper.querySelector(":scope > .saudia-itinerary-box");
    if (box && box.querySelector(".saudia-feature-row")) {
      const nodes = [...wrapper.children].flatMap((n) => n === box ? [features(document, box)] : clean(document, [n]));
      return [el(document, "div", {}, nodes, sectionMeta(document, "narrow"))];
    }
    const copy = [];
    const itinerary = [];
    let banner = null;
    [...wrapper.children].forEach((n) => {
      if (n.matches(".saudia-banner")) banner = n;
      else if (n.matches(".saudia-itinerary-box")) itinerary.push(...n.childNodes);
      else if (!banner) copy.push(n);
      else itinerary.push(n);
    });
    const sections = [];
    if (copy.length) sections.push(el(document, "div", {}, clean(document, copy), sectionMeta(document, "narrow")));
    if (banner) {
      sections.push(el(document, "div", {}, block(document, "hero banner", [
        [["image", picture(document, banner.dataset.bg, "")]],
        [[null, []]],
        [["text", el(document, "h3", {}, text(banner.querySelector("h1,h2,h3,h4")))]]
      ]), sectionMeta(document, "narrow")));
    }
    if (itinerary.length) sections.push(el(document, "div", {}, clean(document, itinerary), sectionMeta(document, "itinerary")));
    return sections;
  }
  function faq(document, root) {
    const items = [...root.querySelectorAll("mat-expansion-panel")].map((p) => [
      ["summary", el(document, "p", {}, text(p.querySelector("mat-panel-title")))],
      ["text", clean(document, [...(p.querySelector(".mat-expansion-panel-body") || p).childNodes])]
    ]);
    return el(
      document,
      "div",
      {},
      el(document, "h2", {}, text(root.querySelector("h2,h3")) || "FAQs"),
      block(document, "accordion", items),
      sectionMeta(document, "faq")
    );
  }
  var import_destination_default = {
    // the importer's pre-clean may drop <head>; park the staged meta on <body> first
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      const m = (n) => {
        var _a;
        return ((_a = document.querySelector(`meta[name="${n}"]`)) == null ? void 0 : _a.content) || "";
      };
      Object.assign(document.body.dataset, {
        title: document.title,
        desc: m("description"),
        mobile: m("mobile-hero"),
        mobileAlt: m("mobile-hero-alt")
      });
    }),
    transform: ({ document, params }) => {
      const main = document.querySelector("main");
      const d = document.body.dataset;
      const meta = {
        title: d.title || "",
        desc: d.desc || "",
        mobile: d.mobile || null,
        mobileAlt: d.mobileAlt || ""
      };
      const q = (s) => main.querySelector(s);
      const sections = [];
      sections.push(el(document, "div", {}, el(document, "div", { class: "metadata" }, [
        ["Title", meta.title],
        ["Description", meta.desc],
        ["template", "destination"],
        ["theme", "beige"]
      ].map(([k, v]) => el(document, "div", {}, el(document, "div", {}, k), el(document, "div", {}, v))))));
      if (q("app-jss-image-link-list")) sections.push(el(document, "div", {}, hero(document, q("app-jss-image-link-list"), meta)));
      if (q("app-jss-saudia-general-tablayout")) sections.push(el(document, "div", {}, booking(document, q("app-jss-saudia-general-tablayout"))));
      if (q("app-jss-title-text")) sections.push(...richText(document, q("app-jss-title-text")));
      if (q("app-jss-faq")) sections.push(faq(document, q("app-jss-faq")));
      main.replaceChildren(...sections);
      main.querySelectorAll(":scope > div > div[class]").forEach((b) => {
        if (!["metadata", "section-metadata"].includes(b.classList[0])) parse(b, { document });
      });
      transform(main, document);
      const { pathname } = new URL(params.originalURL);
      return [{ element: main, path: WebImporter.FileUtils.sanitizePath(pathname.replace(/\.html$/, "")), report: { title: meta.title, source: "live capture (destination sibling)" } }];
    }
  };
  return __toCommonJS(import_destination_exports);
})();
