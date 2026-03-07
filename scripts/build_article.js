const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "../articles_src");
const OUT_DIR = path.join(__dirname, "../articles");
const TEMPLATE_FILE = path.join(__dirname, "../templates/article.html");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escHtml(s) {
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
    return {
      meta: {},
      body: md
    };
  }

  const metaText = match[1];
  const body = md.slice(match[0].length);
  const meta = {};

  metaText.split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();

    if (value.includes(",")) {
      meta[key] = value.split(",").map((v) => v.trim()).filter(Boolean);
    } else {
      meta[key] = value;
    }
  });

  return { meta, body };
}

function inlineFormat(text) {
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
  let inList = false;
  let paragraph = [];

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

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      closeList();
      html += `<h3>${inlineFormat(line.slice(4))}</h3>\n`;
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      closeList();
      html += `<h2>${inlineFormat(line.slice(3))}</h2>\n`;
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      html += `<h1>${inlineFormat(line.slice(2))}</h1>\n`;
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      if (!inList) {
        html += `<ul>\n`;
        inList = true;
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>\n`;
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return html;
}

function buildMetaComment(meta) {
  const tags = Array.isArray(meta.tags) ? meta.tags.join(", ") : (meta.tags || "");
  const topics = Array.isArray(meta.topics) ? meta.topics.join(", ") : (meta.topics || "");

  return [
    "<!--",
    `title: ${meta.title || ""}`,
    `description: ${meta.description || ""}`,
    `updated: ${meta.updated || ""}`,
    `tags: ${tags}`,
    `topics: ${topics}`,
    `category: ${meta.category || ""}`,
    `readingTime: ${meta.readingTime || ""}`,
    "-->"
  ].join("\n");
}

function buildEyecatch(meta) {
  if (!meta.eyecatch) return "";
  return `<figure class="article-eyecatch"><img src="${meta.eyecatch}" alt="${escHtml(meta.title || "")}"></figure>`;
}

function replaceTemplate(template, values) {
  let out = template;

  Object.entries(values).forEach(([key, value]) => {
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

    const pageHtml = replaceTemplate(template, {
      TITLE: escHtml(meta.title || slug),
      DESCRIPTION: escHtml(meta.description || ""),
      UPDATED: escHtml(meta.updated || ""),
      READING_TIME: escHtml(meta.readingTime || ""),
      EYECATCH: buildEyecatch(meta),
      CONTENT: contentHtml
    });

    const outDir = path.join(OUT_DIR, slug);
    ensureDir(outDir);

    const finalHtml = `${buildMetaComment(meta)}\n${pageHtml}`;
    fs.writeFileSync(path.join(outDir, "index.html"), finalHtml, "utf8");

    console.log("built:", slug);
  });
}

run();
