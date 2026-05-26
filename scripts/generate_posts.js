const fs = require("fs");
const path = require("path");

const SRC_DIR = "articles_src";
const OUT_FILE = "data/posts.json";

function parseFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const metaLines = match[1].split("\n");
  const meta = {};

  metaLines.forEach(line => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();

    if (!key) return;
    meta[key] = value;
  });

  return meta;
}

function splitCsv(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}

const dirs = fs.readdirSync(SRC_DIR, { withFileTypes: true });

const posts = [];

dirs.forEach((entry) => {
  if (!entry.isDirectory()) return;

  const slug = entry.name;

  // _template 除外
  if (slug.startsWith("_")) return;

  const mdPath = path.join(SRC_DIR, slug, "article.md");
  if (!fs.existsSync(mdPath)) return;

  const md = fs.readFileSync(mdPath, "utf8");
  const meta = parseFrontMatter(md);

  posts.push({
    slug,
    title: meta.title || "",
    description: meta.description || "",
    updated: meta.updated || "",
    tags: splitCsv(meta.tags),
    topics: splitCsv(meta.topics),
    category: meta.category || "",
    readingTime: meta.readingTime || "",
    eyecatch: meta.eyecatch || "",
    eyecatchAlt: meta.eyecatchAlt || meta.title || ""
  });
});

fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(posts, null, 2) + "\n"
);

console.log("posts.json generated:", posts.length);