const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "../articles_src");
const OUT_DIR = path.join(__dirname, "../articles");
const TEMPLATE_FILE = path.join(__dirname, "../templates/article.html");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, body: md };
  }

  const metaText = match[1];
  const body = md.slice(match[0].length);

  const meta = {};

  metaText.split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();

    if (raw.includes(",")) {
      meta[key] = raw.split(",").map((v) => v.trim()).filter(Boolean);
    } else {
      meta[key] = raw;
    }
  });

  return { meta, body };
}

function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMd(text) {
  let s = escHtml(text);

  s = s.replace(/$begin:math:display$\(\[\^$end:math:display$]+)\]$begin:math:text$\(\[\^\)\]\+\)$end:math:text$/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  return s;
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let html = "";
  let paragraph = [];
  let inList = false;
  let inBlockquote = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html += `<p>${inlineMd(paragraph.join(" "))}</p>\n`;
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

  lines.forEach((raw) => {
    const line = raw.trim();

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
      html += `<h3>${inlineMd(line.slice(4))}</h3>\n`;
      return;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html += `<h2>${inlineMd(line.slice(3))}</h2>\n`;
      return;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html += `<h1>${inlineMd(line.slice(2))}</h1>\n`;
      return;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      closeBlockquote();
      if (!inList) {
        html += `<ul>\n`;
        inList = true;
      }
      html += `<li>${inlineMd(line.slice(2))}</li>\n`;
      return;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        html += `<blockquote>\n`;
        inBlockquote = true;
      }
      html += `<p>${inlineMd(line.slice(2))}</p>\n`;
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  closeList();
  closeBlockquote();

  return html;
}

function buildMetaComment(meta) {
  const lines = [
    "<!--",
    `title: ${meta.title || ""}`,
    `description: ${meta.description || ""}`,
    `updated: ${meta.updated || ""}`,
    `tags: ${Array.isArray(meta.tags) ? meta.tags.join(", ") : (meta.tags || "")}`,
    `topics: ${Array.isArray(meta.topics) ? meta.topics.join(", ") : (meta.topics || "")}`,
    `category: ${meta.category || ""}`,
    `readingTime: ${meta.readingTime || ""}`,
    "-->"
  ];

  return lines.join("\n");
}

function buildEyecatch(meta) {
  if (!meta.eyecatch) return "";
  return `<figure class="article-eyecatch"><img src="${meta.eyecatch}" alt="${escHtml(meta.title || "")}"></figure>`;
}

function replaceAll(template, map) {
  let out = template;
  Object.entries(map).forEach(([key, value]) => {
    out = out.replaceAll(`{{${key}}}`, value);
  });
  return out;
}

function run() {
  const template = fs.readFileSync(TEMPLATE_FILE, "utf8");
  const entries = fs.readdirSync(SRC_DIR, { withFileTypes: true });

  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;

    const slug = entry.name;
    const srcFile = path.join(SRC_DIR, slug, "article.md");
    if (!fs.existsSync(srcFile)) return;

    const md = fs.readFileSync(srcFile, "utf8");
    const { meta, body } = parseFrontMatter(md);
    const contentHtml = markdownToHtml(body);

    const html = replaceAll(template, {
      TITLE: escHtml(meta.title || slug),
      DESCRIPTION: escHtml(meta.description || ""),
      UPDATED: escHtml(meta.updated || ""),
      READING_TIME: escHtml(meta.readingTime || ""),
      EYECATCH: buildEyecatch(meta),
      CONTENT: contentHtml
    });

    const outDir = path.join(OUT_DIR, slug);
    ensureDir(outDir);

    const finalHtml = `${buildMetaComment(meta)}\n${html}`;
    fs.writeFileSync(path.join(outDir, "index.html"), finalHtml, "utf8");

    console.log("built:", slug);
  });
}

run();
