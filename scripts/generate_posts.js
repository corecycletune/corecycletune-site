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

const dirs = fs.readdirSync(SRC_DIR);

const posts = [];

dirs.forEach(slug => {

  // 👇 _template除外
  if (slug.startsWith("_")) return;

  const mdPath = path.join(SRC_DIR, slug, "article.md");

  if (!fs.existsSync(mdPath)) return;

  const md = fs.readFileSync(mdPath, "utf8");

  const meta = parseFrontMatter(md);

  posts.push({
    slug,
    title: meta.title,
    description: meta.description,
    updated: meta.updated,
    tags: meta.tags
      ? meta.tags.split(",").map(t => t.trim())
      : [],
    category: meta.category || "",
    readingTime: meta.readingTime || ""
  });
});

fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(posts, null, 2)
);

console.log("posts.json generated:", posts.length);