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
.cct-flow-wrap {
  margin: 1.5rem 0 1.7rem;
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