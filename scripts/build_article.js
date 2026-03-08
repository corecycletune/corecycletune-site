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

  s = s.replace(/$begin:math:display$\(\[\^$end:math:display$]+)\]$begin:math:text$\(\[\^\)\]\+\)$end:math:text$/g, '<a href="$2">$1</a>');
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

function extractPaperSummaryData(rawLines) {
  const pairs = rawLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const label = (parts[0] || "").trim();
      const value = parts.slice(1).join("|").trim();
      return { label, value };
    })
    .filter((item) => item.label && item.value);

  const map = {};
  pairs.forEach((item) => {
    map[item.label] = item.value;
  });

  return { pairs, map };
}

function buildPaperSummaryBlock(rawLines) {
  const { pairs, map } = extractPaperSummaryData(rawLines);
  if (!pairs.length) return "";

  const title = map["論文タイトル"] || "";
  const authors = map["著者"] || "";
  const year = map["年"] || "";
  const link = map["論文リンク"] || "";

  const detailOrder = [
    "どこの研究か",
    "どんな内容か",
    "対象・条件",
    "限界"
  ];

  const detailHtml = detailOrder
    .filter((label) => map[label])
    .map((label) => {
      return `
<div class="paper-card-item">
  <div class="paper-card-item-label">${inlineFormat(label)}</div>
  <div class="paper-card-item-value">${inlineFormat(map[label])}</div>
</div>`.trim();
    })
    .join("\n");

  const chips = [
    year ? `<span class="paper-card-chip">${inlineFormat(year)}</span>` : "",
    authors ? `<span class="paper-card-chip">${inlineFormat(authors)}</span>` : ""
  ].filter(Boolean).join("\n");

  const linkHtml = link
    ? `<a class="paper-card-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">論文リンクを見る</a>`
    : "";

  return `
<section class="paper-card" aria-label="論文概要">
  <div class="paper-card-top">
    <div class="paper-card-kicker">Research Note</div>
    <h3 class="paper-card-title">${inlineFormat(title || "論文概要")}</h3>
    <div class="paper-card-chips">
      ${chips}
    </div>
    ${linkHtml}
  </div>
  <div class="paper-card-bottom">
    ${detailHtml}
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

.article-header {
  position: relative;
  padding: 1.15rem 1.1rem 0.4rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(122, 150, 137, 0.14), transparent 36%),
    linear-gradient(180deg, rgba(122, 150, 137, 0.06), rgba(122, 150, 137, 0.01));
  border: 1px solid rgba(122, 150, 137, 0.1);
  margin-bottom: 1.1rem;
}

.kicker {
  color: #6a8578;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.article-header h1 {
  line-height: 1.35;
}

.article-body {
  color: #1f2937;
}

.article-body > p {
  line-height: 2;
  margin: 1.15rem 0 1.4rem;
}

.article-body > p:first-of-type {
  font-size: 1.03rem;
  line-height: 2.02;
}

.article-body > p + h2,
.article-body > ul + h2,
.article-body > blockquote + h2,
.article-body > .cct-flow-wrap + h2,
.article-body > .paper-card + h2 {
  margin-top: 2.65rem;
}

.article-body h2 {
  position: relative;
  margin-bottom: 1rem;
  padding: 0.95rem 1rem 0.92rem 1.15rem;
  border-radius: 18px;
  line-height: 1.45;
  background:
    linear-gradient(90deg, rgba(122, 150, 137, 0.16), rgba(122, 150, 137, 0.03));
  color: #17212b;
  box-shadow: 0 10px 24px rgba(122, 150, 137, 0.08);
}

.article-body h2::before {
  content: "";
  position: absolute;
  left: 0.72rem;
  top: 0.92rem;
  bottom: 0.92rem;
  width: 4px;
  border-radius: 999px;
  background: #7a9689;
}

.article-body h3 {
  margin: 2rem 0 0.8rem;
  color: #304236;
}

.article-body blockquote {
  margin: 1.2rem 0 1.45rem;
  padding: 1rem 1rem 1rem 1.15rem;
  border-left: 4px solid #7a9689;
  background:
    linear-gradient(180deg, rgba(122, 150, 137, 0.1), rgba(122, 150, 137, 0.05));
  border-radius: 16px;
}

.article-body blockquote p {
  margin: 0.45rem 0;
  line-height: 1.9;
}

.article-body ul {
  margin: 0.95rem 0 1.35rem;
  padding-left: 1.25rem;
}

.article-body li {
  margin: 0.46rem 0;
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
  margin: 1.55rem 0 1.9rem;
  padding: 1rem;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(122, 150, 137, 0.1), rgba(122, 150, 137, 0.04));
  border: 1px solid rgba(122, 150, 137, 0.18);
  box-shadow: 0 14px 34px rgba(122, 150, 137, 0.08);
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

.paper-card {
  margin: 2.4rem 0 1.25rem;
  border-radius: 26px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(18, 37, 30, 0.96), rgba(32, 58, 48, 0.94));
  color: #f4f8f6;
  box-shadow: 0 18px 40px rgba(18, 37, 30, 0.24);
}

.paper-card-top {
  padding: 1.2rem 1.1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top right, rgba(164, 199, 183, 0.22), transparent 34%);
}

.paper-card-kicker {
  display: inline-block;
  margin-bottom: 0.45rem;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c5d8cf;
  font-weight: 700;
}

.paper-card-title {
  margin: 0;
  line-height: 1.45;
  font-size: 1.06rem;
  color: #ffffff;
}

.paper-card-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.8rem;
}

.paper-card-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.34rem 0.62rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #edf5f1;
  font-size: 0.8rem;
  line-height: 1.2;
}

.paper-card-link {
  display: inline-block;
  margin-top: 0.9rem;
  padding: 0.58rem 0.82rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  text-decoration: none;
  font-weight: 700;
}

.paper-card-link:hover {
  background: rgba(255, 255, 255, 0.18);
}

.paper-card-bottom {
  display: grid;
  gap: 0.7rem;
  padding: 0.95rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
}

.paper-card-item {
  padding: 0.82rem 0.86rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.paper-card-item-label {
  margin-bottom: 0.28rem;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  color: #c1d4cb;
  font-weight: 700;
}

.paper-card-item-value {
  font-size: 0.95rem;
  line-height: 1.8;
  color: #f5f8f7;
  word-break: break-word;
}

@media (max-width: 640px) {
  .article-header {
    padding: 1rem 0.92rem 0.35rem;
    border-radius: 22px;
  }

  .article-body h2 {
    padding: 0.88rem 0.9rem 0.84rem 1.05rem;
    border-radius: 16px;
  }

  .cct-flow-wrap {
    padding: 0.8rem;
  }

  .paper-card-top {
    padding: 1rem 0.92rem 0.9rem;
  }

  .paper-card-bottom {
    padding: 0.82rem;
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