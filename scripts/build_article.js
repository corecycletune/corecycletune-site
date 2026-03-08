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

function wrapText(text, maxCharsPerLine, maxLines) {
  const chars = Array.from(String(text || "").trim());
  const lines = [];

  while (chars.length && lines.length < maxLines) {
    lines.push(chars.splice(0, maxCharsPerLine).join(""));
  }

  if (chars.length && lines.length) {
    const last = lines[lines.length - 1];
    const trimmed = Array.from(last).slice(0, Math.max(0, maxCharsPerLine - 1)).join("");
    lines[lines.length - 1] = `${trimmed}…`;
  }

  return lines.length ? lines : [""];
}

function buildTextBlock(x, y, lines, options = {}) {
  const lineHeight = options.lineHeight || 22;
  const cls = options.className || "";

  return lines
    .map((line, index) => {
      const yy = y + index * lineHeight;
      return `<text x="${x}" y="${yy}" class="${cls}">${escapeHtml(line)}</text>`;
    })
    .join("\n");
}

function buildArrowHead(x, y, direction) {
  const size = 8;

  if (direction === "right") {
    return `<polygon points="${x},${y} ${x - size},${y - size / 1.6} ${x - size},${y + size / 1.6}" class="cct-flow-head" />`;
  }

  if (direction === "left") {
    return `<polygon points="${x},${y} ${x + size},${y - size / 1.6} ${x + size},${y + size / 1.6}" class="cct-flow-head" />`;
  }

  if (direction === "down") {
    return `<polygon points="${x},${y} ${x - size / 1.6},${y - size} ${x + size / 1.6},${y - size}" class="cct-flow-head" />`;
  }

  return `<polygon points="${x},${y} ${x - size / 1.6},${y + size} ${x + size / 1.6},${y + size}" class="cct-flow-head" />`;
}

function buildHorizontalArrow(x1, y, x2) {
  const dir = x2 > x1 ? "right" : "left";
  const offset = 14;
  const startX = dir === "right" ? x1 + offset : x1 - offset;
  const endX = dir === "right" ? x2 - offset : x2 + offset;

  return `
<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" class="cct-flow-line" />
${buildArrowHead(endX, y, dir)}
`.trim();
}

function buildVerticalArrow(x, y1, y2) {
  const dir = y2 > y1 ? "down" : "up";
  const offset = 14;
  const startY = dir === "down" ? y1 + offset : y1 - offset;
  const endY = dir === "down" ? y2 - offset : y2 + offset;

  return `
<line x1="${x}" y1="${startY}" x2="${x}" y2="${endY}" class="cct-flow-line" />
${buildArrowHead(x, endY, dir)}
`.trim();
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

  const topCount = Math.ceil(items.length / 2);
  const bottomCount = items.length - topCount;

  const boxW = 228;
  const gapX = 44;
  const gapY = 74;
  const margin = 26;

  const prepared = items.map((item) => {
    const labelLines = wrapText(item.label, 8, 2);
    const valueLines = wrapText(item.value, 10, 5);

    const labelHeight = labelLines.length * 18;
    const valueHeight = valueLines.length * 20;
    const boxH = 28 + labelHeight + 12 + valueHeight + 18;

    return {
      ...item,
      labelLines,
      valueLines,
      boxH
    };
  });

  const topItems = prepared.slice(0, topCount);
  const bottomItems = prepared.slice(topCount).reverse();

  const topRowHeight = topItems.length ? Math.max(...topItems.map((i) => i.boxH)) : 0;
  const bottomRowHeight = bottomItems.length ? Math.max(...bottomItems.map((i) => i.boxH)) : 0;

  const topRowWidth = topItems.length * boxW + Math.max(0, topItems.length - 1) * gapX;
  const bottomRowWidth = bottomItems.length * boxW + Math.max(0, bottomItems.length - 1) * gapX;
  const viewW = Math.max(topRowWidth, bottomRowWidth) + margin * 2;

  const topStartX = (viewW - topRowWidth) / 2;
  const bottomStartX = (viewW - bottomRowWidth) / 2;

  const topY = margin;
  const bottomY = margin + topRowHeight + gapY;

  topItems.forEach((item, index) => {
    item.x = topStartX + index * (boxW + gapX);
    item.y = topY;
  });

  bottomItems.forEach((item, index) => {
    item.x = bottomStartX + index * (boxW + gapX);
    item.y = bottomY;
  });

  const allBoxes = [...topItems, ...bottomItems];
  const viewH = bottomY + bottomRowHeight + margin;

  const boxHtml = allBoxes
    .map((item) => {
      const labelX = item.x + 16;
      const labelY = item.y + 28;
      const valueX = item.x + 16;
      const valueY = item.y + 28 + item.labelLines.length * 18 + 16;

      return `
<rect x="${item.x}" y="${item.y}" rx="16" ry="16" width="${boxW}" height="${item.boxH}" class="cct-flow-box" />
${buildTextBlock(labelX, labelY, item.labelLines, { className: "cct-flow-label", lineHeight: 18 })}
${buildTextBlock(valueX, valueY, item.valueLines, { className: "cct-flow-value", lineHeight: 20 })}
`.trim();
    })
    .join("\n");

  const arrows = [];

  for (let i = 0; i < topItems.length - 1; i++) {
    const current = topItems[i];
    const next = topItems[i + 1];

    arrows.push(
      buildHorizontalArrow(
        current.x + boxW,
        current.y + current.boxH / 2,
        next.x
      )
    );
  }

  if (bottomItems.length > 0) {
    const lastTop = topItems[topItems.length - 1];
    const firstBottom = bottomItems[0];

    arrows.push(
      buildVerticalArrow(
        lastTop.x + boxW / 2,
        lastTop.y + lastTop.boxH,
        firstBottom.y
      )
    );

    for (let i = 0; i < bottomItems.length - 1; i++) {
      const current = bottomItems[i];
      const next = bottomItems[i + 1];

      arrows.push(
        buildHorizontalArrow(
          current.x,
          current.y + current.boxH / 2,
          next.x + boxW
        )
      );
    }

    const lastBottom = bottomItems[bottomItems.length - 1];
    const firstTop = topItems[0];

    arrows.push(
      buildVerticalArrow(
        firstTop.x + boxW / 2,
        lastBottom.y,
        firstTop.y + firstTop.boxH
      )
    );
  }

  return `
<div class="cct-flow-wrap">
  <svg class="cct-flow-svg" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="循環調律の流れ図" preserveAspectRatio="xMidYMid meet">
    <g class="cct-flow-group">
      ${arrows.join("\n")}
      ${boxHtml}
    </g>
  </svg>
</div>`.trim();
}

function buildPaperSummaryBlock(rawLines) {
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

  const rowsHtml = items
    .map((item) => {
      return `
<div class="paper-summary-row">
  <div class="paper-summary-label">${inlineFormat(item.label)}</div>
  <div class="paper-summary-value">${inlineFormat(item.value)}</div>
</div>`.trim();
    })
    .join("\n");

  return `
<section class="paper-summary-block" aria-label="論文概要">
  <div class="paper-summary-head">
    <span class="paper-summary-kicker">Paper Summary</span>
    <h3>論文概要</h3>
  </div>
  <div class="paper-summary-grid">
    ${rowsHtml}
  </div>
</section>`.trim();
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let html = "";
  let paragraph = [];
  let inList = false;
  let inBlockquote = false;
  let inCctCycle = false;
  let cctCycleLines = [];
  let inPaperSummary = false;
  let paperSummaryLines = [];

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

  function closePaperSummary() {
    if (!inPaperSummary) return;
    html += `${buildPaperSummaryBlock(paperSummaryLines)}\n`;
    inPaperSummary = false;
    paperSummaryLines = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (line === "[cct-cycle]") {
      flushParagraph();
      closeList();
      closeBlockquote();
      closePaperSummary();
      inCctCycle = true;
      cctCycleLines = [];
      return;
    }

    if (line === "[/cct-cycle]") {
      closeCctCycle();
      return;
    }

    if (line === "[paper-summary]") {
      flushParagraph();
      closeList();
      closeBlockquote();
      closeCctCycle();
      inPaperSummary = true;
      paperSummaryLines = [];
      return;
    }

    if (line === "[/paper-summary]") {
      closePaperSummary();
      return;
    }

    if (inCctCycle) {
      cctCycleLines.push(rawLine);
      return;
    }

    if (inPaperSummary) {
      paperSummaryLines.push(rawLine);
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
  closePaperSummary();

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
.article {
  position: relative;
}

.article-body {
  color: #1f2937;
}

.article-body > p {
  line-height: 2;
  margin: 1.1rem 0 1.35rem;
}

.article-body > p + h2,
.article-body > ul + h2,
.article-body > blockquote + h2,
.article-body > .cct-flow-wrap + h2,
.article-body > .paper-summary-block + h2 {
  margin-top: 2.5rem;
}

.article-body h2 {
  position: relative;
  margin-bottom: 1rem;
  padding: 0.9rem 1rem 0.85rem 1.15rem;
  border-radius: 18px;
  line-height: 1.45;
  background:
    linear-gradient(90deg, rgba(127, 153, 141, 0.14), rgba(127, 153, 141, 0.03));
  color: #17212b;
}

.article-body h2::before {
  content: "";
  position: absolute;
  left: 0.7rem;
  top: 0.9rem;
  bottom: 0.9rem;
  width: 4px;
  border-radius: 999px;
  background: #7a9689;
}

.article-body h3 {
  margin: 2rem 0 0.8rem;
  color: #304236;
}

.article-body blockquote {
  margin: 1.1rem 0 1.4rem;
  padding: 0.95rem 1rem 0.95rem 1.1rem;
  border-left: 4px solid #7a9689;
  background: rgba(127, 153, 141, 0.08);
  border-radius: 14px;
}

.article-body blockquote p {
  margin: 0.45rem 0;
  line-height: 1.9;
}

.article-body ul {
  margin: 0.85rem 0 1.3rem;
  padding-left: 1.25rem;
}

.article-body li {
  margin: 0.45rem 0;
  line-height: 1.85;
}

.article-body strong {
  color: #0f172a;
}

.article-body code {
  padding: 0.12rem 0.38rem;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.92em;
}

.cct-flow-wrap {
  margin: 1.5rem 0 1.8rem;
  padding: 1rem;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(127, 153, 141, 0.08), rgba(127, 153, 141, 0.03));
  border: 1px solid rgba(127, 153, 141, 0.18);
}

.cct-flow-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cct-flow-box {
  fill: #ffffff;
  stroke: #d9e4de;
  stroke-width: 1.5;
}

.cct-flow-line {
  stroke: #7a9689;
  stroke-width: 3.6;
  stroke-linecap: round;
}

.cct-flow-head {
  fill: #7a9689;
}

.cct-flow-label {
  fill: #617c70;
  font-size: 13px;
  font-weight: 700;
}

.cct-flow-value {
  fill: #1b2430;
  font-size: 16px;
  font-weight: 600;
}

.paper-summary-block {
  margin: 2rem 0 1.2rem;
  padding: 1rem;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(122, 150, 137, 0.1), rgba(122, 150, 137, 0.04));
  border: 1px solid rgba(122, 150, 137, 0.18);
}

.paper-summary-head {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  margin-bottom: 0.9rem;
}

.paper-summary-kicker {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b8579;
  font-weight: 700;
}

.paper-summary-head h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #203126;
}

.paper-summary-grid {
  display: grid;
  gap: 0.65rem;
}

.paper-summary-row {
  display: grid;
  grid-template-columns: 7.2rem 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.72rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(122, 150, 137, 0.12);
}

.paper-summary-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #5d786b;
  line-height: 1.6;
}

.paper-summary-value {
  font-size: 0.96rem;
  color: #1f2937;
  line-height: 1.75;
  word-break: break-word;
}

@media (max-width: 640px) {
  .article-body h2 {
    padding: 0.85rem 0.9rem 0.82rem 1.05rem;
    border-radius: 16px;
  }

  .cct-flow-wrap {
    padding: 0.8rem;
  }

  .paper-summary-block {
    padding: 0.85rem;
  }

  .paper-summary-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
    padding: 0.7rem 0.75rem;
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