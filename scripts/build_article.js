const fs = require("fs");
const path = require("path");

const SRC_DIR = "articles_src";
const OUT_DIR = "articles";
const TEMPLATE_PATH = "templates/article.html";

const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

function parseFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { meta: {}, body: md };

  const metaLines = match[1].split("\n");
  const meta = {};

  metaLines.forEach(line => {
    const [key, ...rest] = line.split(":");
    if (!key) return;
    meta[key.trim()] = rest.join(":").trim();
  });

  const body = md.replace(/^---[\s\S]*?---/, "").trim();

  return { meta, body };
}

const dirs = fs.readdirSync(SRC_DIR);

dirs.forEach(slug => {

  // 👇 追加：_templateなど除外
  if (slug.startsWith("_")) return;

  const mdPath = path.join(SRC_DIR, slug, "article.md");

  if (!fs.existsSync(mdPath)) return;

  const md = fs.readFileSync(mdPath, "utf8");

  const { meta, body } = parseFrontMatter(md);

  const html = template
    .replace("{{title}}", meta.title || "")
    .replace("{{content}}", body)
    .replace("{{updated}}", meta.updated || "");

  const outDir = path.join(OUT_DIR, slug);

  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "index.html"),
    html
  );

  console.log("build:", slug);
});