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

  return lines;
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

function buildArrow(fromX, fromY, toX, toY) {
  const isHorizontal = fromY === toY;
  const arrowSize = 8;

  if (isHorizontal) {
    const dir = toX > fromX ? 1 : -1;
    const endX = toX - dir * 14;
    const startX = fromX + dir * 14;

    return `
<line x1="${startX}" y1="${fromY}" x2="${endX}" y2="${toY}" class="cct-flow-line" />
<polygon points="${endX},${toY} ${endX - dir * arrowSize},${toY - arrowSize / 1.6} ${endX - dir * arrowSize},${toY + arrowSize / 1.6}" class="cct-flow-head" />
`.trim();
  }

  const dir = toY > fromY ? 1 : -1;
  const endY = toY - dir * 14;
  const startY = fromY + dir * 14;

  return `
<line x1="${fromX}" y1="${startY}" x2="${toX}" y2="${endY}" class="cct-flow-line" />
<polygon points="${toX},${endY} ${toX - arrowSize / 1.6},${endY - dir * arrowSize} ${toX + arrowSize / 1.6},${endY - dir * arrowSize}" class="cct-flow-head" />
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

  const boxW = 190;
  const boxH = 92;
  const gapX = 42;
  const gapY = 54;
  const margin = 24;

  const topCount = Math.ceil(items.length / 2);
  const bottomCount = items.length - topCount;

  const topXs = Array.from({ length: topCount }, (_, i) => margin + i * (boxW + gapX));
  const bottomXs = Array.from({ length: bottomCount }, (_, i) => margin + i * (boxW + gapX));

  const topY = margin;
  const bottomY = margin + boxH + gapY;

  const coords = items.map((item, index) => {
    if (index < topCount) {
      return {
        ...item,
        x: topXs[index],
        y: topY
      };
    }

    const j = index - topCount;
    const reversed = bottomCount - 1 - j;

    return {
      ...item,
      x: bottomXs[reversed],
      y: bottomY
    };
  });

  const maxRight = Math.max(...coords.map((c) => c.x + boxW));
  const maxBottom = Math.max(...coords.map((c) => c.y + boxH));
  const viewW = maxRight + margin;
  const viewH = maxBottom + margin;

  const boxesHtml = coords
    .map((item) => {
      const labelLines = wrapText(item.label, 8, 1);
      const valueLines = wrapText(item.value, 14, 3);

      const labelX = item.x + 16;
      const labelY = item.y + 28;
      const valueX = item.x + 16;
      const valueY = item.y + 58;

      return `
<rect x="${item.x}" y="${item.y}" rx="16" ry="16" width="${boxW}" height="${boxH}" class="cct-flow-box" />
${buildTextBlock(labelX, labelY, labelLines, { className: "cct-flow-label", lineHeight: 18 })}
${buildTextBlock(valueX, valueY, valueLines, { className: "cct-flow-value", lineHeight: 22 })}
`.trim();
    })
    .join("\n");

  const arrowsHtml = coords
    .slice(0, -1)
    .map((item, index) => {
      const next = coords[index + 1];

      const fromX = item.x + boxW / 2;
      const fromY = item.y + boxH / 2;
      const toX = next.x + boxW / 2;
      const toY = next.y + boxH / 2;

      if (item.y === next.y) {
        return buildArrow(item.x + boxW, fromY, next.x, toY);
      }

      return buildArrow(fromX, item.y + boxH, toX, next.y);
    })
    .join("\n");

  return `
<div class="cct-flow-wrap">
  <svg class="cct-flow-svg" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="循環調律の流れ図" preserveAspectRatio="xMidYMid meet">
    <defs>
      <filter id="cct-flow-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#9db1a8" flood-opacity="0.18" />
      </filter>
    </defs>
    <g class="cct-flow-group" filter="url(#cct-flow-shadow)">
      ${arrowsHtml}
      ${boxesHtml}
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
  margin: 1.4rem 0 1.6rem;
}

.cct-flow-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cct-flow-box {
  fill: #ffffff;
  stroke: #d7e3dd;
  stroke-width: 1.4;
}

.cct-flow-line {
  stroke: #7d998d;
  stroke-width: 3.2;
  stroke-linecap: round;
}

.cct-flow-head {
  fill: #7d998d;
}

.cct-flow-label {
  fill: #617d71;
  font-size: 14px;
  font-weight: 700;
}

.cct-flow-value {
  fill: #1b2430;
  font-size: 18px;
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