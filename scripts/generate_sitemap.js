const fs = require("fs");
const path = require("path");

const SITE_URL = "https://corecycletune.com";

const POSTS_FILE = path.join(__dirname, "../data/posts.json");
const OUTPUT_FILE = path.join(__dirname, "../sitemap.xml");

function escXml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toIsoDate(yyyyMmDd) {
  // Accept "YYYY-MM-DD" only; otherwise return empty.
  if (!yyyyMmDd) return "";
  const m = String(yyyyMmDd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function ensureLeadingSlash(p) {
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

function readPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  const raw = fs.readFileSync(POSTS_FILE, "utf8");
  const json = JSON.parse(raw);
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.posts)) return json.posts;
  return [];
}

function buildUrls(posts) {
  const urls = [];

  // Static pages (add more if you like)
  urls.push({ loc: "/", lastmod: "" });
  urls.push({ loc: "/articles/", lastmod: "" });
  urls.push({ loc: "/topics/", lastmod: "" });
  urls.push({ loc: "/about/", lastmod: "" });
  urls.push({ loc: "/disclaimer/", lastmod: "" });

  // Articles from posts.json
  posts.forEach((p) => {
    const loc = ensureLeadingSlash(p.path || "");
    if (!loc || loc === "/") return;

    const lastmod = toIsoDate(p.updated || "");
    urls.push({ loc, lastmod });
  });

  // De-dup by loc
  const seen = new Set();
  const unique = [];
  for (const u of urls) {
    if (seen.has(u.loc)) continue;
    seen.add(u.loc);
    unique.push(u);
  }
  return unique;
}

function generateSitemap(urls) {
  const body = urls
    .map((u) => {
      const locAbs = `${SITE_URL}${u.loc}`;
      const lastmodLine = u.lastmod ? `    <lastmod>${escXml(u.lastmod)}</lastmod>\n` : "";
      return (
        "  <url>\n" +
        `    <loc>${escXml(locAbs)}</loc>\n` +
        lastmodLine +
        "  </url>"
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

function run() {
  const posts = readPosts();
  const urls = buildUrls(posts);
  const xml = generateSitemap(urls);

  fs.writeFileSync(OUTPUT_FILE, xml, "utf8");
  console.log("sitemap.xml generated:", urls.length);
}

run();
