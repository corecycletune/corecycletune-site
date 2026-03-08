const fs = require("fs");
const path = require("path");

const SITE_URL = "https://corecycletune.com";
const SRC_DIR = "articles_src";
const OUT_DIR = "articles";
const TEMPLATE_PATH = "templates/article.html";

const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, body: md };
  }

  const metaLines = match[1].split("\n");
  const meta = {};

  metaLines.forEach((line) => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    meta[key] = value;
  });

  const body = md.slice(match[0].length).trim();
  return { meta, body };
}

function inlineFormat(text) {
  let s = escapeHtml(text);

  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  return s;
}

function buildCctCycleBlock(rawLines) {
  const items = rawLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const label = (parts[0] || "").trim();
      const value = parts.slice(1).join("|").trim();

      return { label, value };
    })
    .filter((item) => item.label && item.value);

  if (!items.length) return "";

  const itemHtml = items
    .map((item, index) => {
      const arrowHtml = index < items.length - 1
        ? `<div class="cct-cycle-arrow" aria-hidden="true">→</div>`
        : "";

      return `
<div class="cct-cycle-step">
  <div class="cct-cycle-label">${inlineFormat(item.label)}</div>
  <div class="cct-cycle-value">${inlineFormat(item.value)}</div>
</div>
${arrowHtml}`.trim();
    })
    .join("\n");

  return `
<div class="cct-cycle-block" role="group" aria-label="循環調律の流れ">
  ${itemHtml}
</div>`.trim();
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let html = "";
  let paragraph = [];
  let inList = false;
  let inBlockquote = false;
  let inCctCycle = false;
  let cctCycleLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html += `<p>${inlineFormat(paragraph.join(" "))}</p>\n`;
    paragraph = [];
  }

  function closeList() {
    if (!inList) return;
    html += `</ul>\n`;
    inList = false;
  }

  function closeBlockquote() {
    if (!inBlockquote) return;
    html += `</blockquote>\n`;
    inBlockquote = false;
  }

  function closeCctCycle() {
    if (!inCctCycle) return;
    html += `${buildCctCycleBlock(cctCycleLines)}\n`;
    inCctCycle = false;
    cctCycleLines = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (line === "[cct-cycle]") {
      flushParagraph();
      closeList();
      closeBlockquote();
      inCctCycle = true;
      cctCycleLines = [];
      return;
    }

    if (line === "[/cct-cycle]") {
      closeCctCycle();
      return;
    }

    if (inCctCycle) {
      cctCycleLines.push(rawLine);
      return;
    }

    if (!line) {
      flushParagraph();
      closeList();
      closeBlockquote();
      return;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html += `<h3>${inlineFormat(line.slice(4))}</h3>\n`;
      return;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html += `<h2>${inlineFormat(line.slice(3))}</h2>\n`;
      return;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html += `<h1>${inlineFormat(line.slice(2))}</h1>\n`;
      return;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      closeBlockquote();
      if (!inList) {
        html += `<ul>\n`;
        inList = true;
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>\n`;
      return;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        html += `<blockquote>\n`;
        inBlockquote = true;
      }
      html += `<p>${inlineFormat(line.slice(2))}</p>\n`;
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  closeList();
  closeBlockquote();
  closeCctCycle();

  return html;
}

function buildMetaComment(meta) {
  return [
    "<!--",
    `title: ${meta.title || ""}`,
    `description: ${meta.description || ""}`,
    `updated: ${meta.updated || ""}`,
    `tags: ${meta.tags || ""}`,
    `topics: ${meta.topics || ""}`,
    `category: ${meta.category || ""}`,
    `readingTime: ${meta.readingTime || ""}`,
    "-->"
  ].join("\n");
}

function buildEyecatch(meta) {
  if (!meta.eyecatch) return "";
  return `<figure class="article-eyecatch"><img src="${meta.eyecatch}" alt="${escapeHtml(meta.title || "")}"></figure>`;
}

function canonicalUrl(slug) {
  return `${SITE_URL}/articles/${slug}/`;
}

function ogImageUrl(meta) {
  if (!meta.eyecatch) return `${SITE_URL}/assets/og-default.jpg`;

  if (meta.eyecatch.startsWith("http://") || meta.eyecatch.startsWith("https://")) {
    return meta.eyecatch;
  }

  return `${SITE_URL}${meta.eyecatch}`;
}

function buildStructuredData(meta, slug) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title || "",
    description: meta.description || "",
    dateModified: meta.updated || "",
    mainEntityOfPage: canonicalUrl(slug),
    url: canonicalUrl(slug),
    image: ogImageUrl(meta),
    author: {
      "@type": "Organization",
      name: "CCT Lab"
    },
    publisher: {
      "@type": "Organization",
      name: "CCT Lab"
    }
  };

  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function buildComponentStyles() {
  return `
<style>
.cct-cycle-block {
  margin: 1.25rem 0;
  padding: 1rem;
  border: 1px solid #d7e2dd;
  border-radius: 16px;
  background: #f7faf8;
}

.cct-cycle-step {
  padding: 0.75rem 0.875rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5ece8;
}

.cct-cycle-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #567064;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.cct-cycle-value {
  font-size: 1rem;
  color: #1b2430;
  line-height: 1.7;
}

.cct-cycle-arrow {
  text-align: center;
  font-size: 1.3rem;
  line-height: 1;
  color: #6c8a7d;
  padding: 0.45rem 0;
  font-weight: 700;
}

@media (min-width: 900px) {
  .cct-cycle-block {
    display: grid;
    gap: 0.75rem;
  }
}
</style>`.trim();
}

function replaceAll(templateText, values) {
  let out = templateText;

  Object.entries(values).forEach(([key, value]) => {
    out = out.replaceAll(`{{${key}}}`, value);
  });

  return out;
}

const dirs = fs.readdirSync(SRC_DIR, { withFileTypes: true });

dirs.forEach((entry) => {
  if (!entry.isDirectory()) return;

  const slug = entry.name;

  if (slug.startsWith("_")) return;

  const mdPath = path.join(SRC_DIR, slug, "article.md");
  if (!fs.existsSync(mdPath)) return;

  const md = fs.readFileSync(mdPath, "utf8");
  const { meta, body } = parseFrontMatter(md);

  const htmlBody = markdownToHtml(body);

  const html = replaceAll(template, {
    TITLE: escapeHtml(meta.title || ""),
    DESCRIPTION: escapeHtml(meta.description || ""),
    UPDATED: escapeHtml(meta.updated || ""),
    READING_TIME: escapeHtml(meta.readingTime || ""),
    EYECATCH: buildEyecatch(meta),
    CONTENT: `${buildComponentStyles()}\n${htmlBody}`,
    CANONICAL_URL: canonicalUrl(slug),
    OG_IMAGE: ogImageUrl(meta),
    STRUCTURED_DATA: buildStructuredData(meta, slug)
  });

  const outDir = path.join(OUT_DIR, slug);
  ensureDir(outDir);

  const finalHtml = `${buildMetaComment(meta)}\n${html}`;

  fs.writeFileSync(
    path.join(outDir, "index.html"),
    finalHtml,
    "utf8"
  );

  console.log("build:", slug);
});