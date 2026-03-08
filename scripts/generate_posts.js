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
    const [key, ...rest] = line.split(":");
    if (!key) return;
    meta[key.trim()] = rest.join(":").trim();
  });

  return meta;
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
    tags: meta.tags
      ? meta.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [],
    topics: meta.topics
      ? meta.topics.split(",").map(t => t.trim()).filter(Boolean)
      : [],
    category: meta.category || "",
    readingTime: meta.readingTime || ""
  });
});

fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(posts, null, 2) + "\n"
);

console.log("posts.json generated:", posts.length);