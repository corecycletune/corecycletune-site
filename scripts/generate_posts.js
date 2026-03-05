const fs = require("fs");
const path = require("path");

const ARTICLES_DIR = path.join(__dirname, "../articles");
const OUTPUT_FILE = path.join(__dirname, "../data/posts.json");

// ---------- Parsers ----------
function parseCommentMeta(content) {
  // first HTML comment block: <!-- ... -->
  const match = content.match(/<!--([\s\S]*?)-->/);
  if (!match) return null;

  const lines = match[1]
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const meta = {};

  lines.forEach((line) => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    meta[key] = value;
  });

  if (meta.tags) meta.tags = meta.tags.split(",").map((v) => v.trim()).filter(Boolean);
  if (meta.topics) meta.topics = meta.topics.split(",").map((v) => v.trim()).filter(Boolean);

  return meta;
}

function parseHeadMeta(content) {
  const meta = {};

  // <title>...</title>
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch) meta.title = decodeHtml(titleMatch[1]).trim();

  // <meta name="description" content="...">
  const descMatch =
    content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i) ||
    content.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']\s*\/?>/i);
  if (descMatch) meta.description = decodeHtml(descMatch[1]).trim();

  // 任意：og:description がある場合の保険
  if (!meta.description) {
    const ogDescMatch =
      content.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i) ||
      content.match(/<meta\s+content=["']([\s\S]*?)["']\s+property=["']og:description["']\s*\/?>/i);
    if (ogDescMatch) meta.description = decodeHtml(ogDescMatch[1]).trim();
  }

  return Object.keys(meta).length ? meta : null;
}

function parseBodyHints(content) {
  // tags: <span class="tag">sleep</span>
  const tagMatches = [...content.matchAll(/<span[^>]*class=["'][^"']*\btag\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)];
  const tags = tagMatches.map((m) => decodeHtml(m[1]).trim()).filter(Boolean);

  // updated: "更新: 2026-03-03" など
  const updatedMatch = content.match(/更新:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  const updated = updatedMatch ? updatedMatch[1] : "";

  // reading time: "読了目安: 6分" など（ゆるく）
  const rtMatch = content.match(/読了目安:\s*([^<\n\r]+)/);
  const readingTime = rtMatch ? decodeHtml(rtMatch[1]).trim() : "";

  return {
    tags: uniq(tags),
    updated,
    readingTime
  };
}

// 超軽量デコード（title/description程度で十分）
function decodeHtml(s) {
  return String(s ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// ---------- Main ----------
function run() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error("ARTICLES_DIR not found:", ARTICLES_DIR);
    process.exit(1);
  }

  const entries = fs.readdirSync(ARTICLES_DIR, { withFileTypes: true });

  const posts = [];

  entries.forEach((ent) => {
    if (!ent.isDirectory()) return;

    const slug = ent.name;
    const file = path.join(ARTICLES_DIR, slug, "index.html");
    if (!fs.existsSync(file)) return;

    const html = fs.readFileSync(file, "utf8");

    // 1) コメントメタ（従来仕様）
    const commentMeta = parseCommentMeta(html);

    // 2) headメタ（title/description）
    const headMeta = parseHeadMeta(html);

    // 3) 本文ヒント（表示から拾える範囲）
    const bodyHints = parseBodyHints(html);

    // 統合（優先：コメント > head > body）
    const meta = {
      ...(headMeta || {}),
      ...(commentMeta || {})
    };

    const title = meta.title || slug;
    const description = meta.description || "";

    // tags/topics/category はコメントメタがあればそれを最優先。
    // 無ければ本文ヒントの tags を tags として採用（topics は空でOK）
    const tags = Array.isArray(meta.tags) ? meta.tags : (bodyHints.tags || []);
    const topics = Array.isArray(meta.topics) ? meta.topics : [];
    const category = meta.category || "";

    // updated/readingTime はコメントメタがあればそれを優先。無ければ本文ヒント。
    const updated = meta.updated || bodyHints.updated || "";
    const readingTime = meta.readingTime || bodyHints.readingTime || "";

    posts.push({
      title,
      path: `/articles/${slug}/`,
      description,
      updated,
      tags,
      topics,
      category,
      readingTime
    });
  });

  // 更新日の降順にしておく（無いものは最後）
  posts.sort((a, b) => {
    const da = Date.parse(a.updated || "") || 0;
    const db = Date.parse(b.updated || "") || 0;
    return db - da;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2));
  console.log("posts.json generated:", posts.length);
}

run();
