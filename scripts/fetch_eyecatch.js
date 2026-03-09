const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "../articles_src");
const UNSPLASH_API_BASE = "https://api.unsplash.com";
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
const UTM_SOURCE = process.env.UTM_SOURCE || "cctlab";
const UTM_MEDIUM = process.env.UTM_MEDIUM || "referral";

function parseFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return {
      hasFrontMatter: false,
      metaLines: [],
      meta: {},
      body: md
    };
  }

  const metaText = match[1];
  const body = md.slice(match[0].length);
  const metaLines = metaText.split("\n");
  const meta = {};

  metaLines.forEach((line) => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    meta[key] = value;
  });

  return {
    hasFrontMatter: true,
    metaLines,
    meta,
    body
  };
}

function buildFrontMatter(meta, baseOrder = []) {
  const preferredOrder = [
    "title",
    "description",
    "updated",
    "tags",
    "topics",
    "category",
    "readingTime",
    "eyecatchQuery",
    "eyecatch",
    "eyecatchAlt",
    "eyecatchPhotoBy",
    "eyecatchPhotoUrl",
    "eyecatchSourceUrl"
  ];

  const orderedKeys = [];
  const seen = new Set();

  [...preferredOrder, ...baseOrder, ...Object.keys(meta)].forEach((key) => {
    if (seen.has(key)) return;
    if (!(key in meta)) return;
    seen.add(key);
    orderedKeys.push(key);
  });

  const lines = orderedKeys
    .filter((key) => String(meta[key] ?? "").trim() !== "")
    .map((key) => `${key}: ${meta[key]}`);

  return `---\n${lines.join("\n")}\n---\n`;
}

function appendUtm(url) {
  const u = new URL(url);
  u.searchParams.set("utm_source", UTM_SOURCE);
  u.searchParams.set("utm_medium", UTM_MEDIUM);
  return u.toString();
}

function buildHeaders() {
  return {
    Authorization: `Client-ID ${ACCESS_KEY}`,
    "Accept-Version": "v1"
  };
}

async function trackDownload(downloadLocation) {
  if (!downloadLocation || !ACCESS_KEY) return;

  try {
    await fetch(downloadLocation, {
      method: "GET",
      headers: buildHeaders()
    });
  } catch (error) {
    console.warn("download tracking failed:", error.message);
  }
}

async function searchPhoto(query) {
  if (!ACCESS_KEY || !query) return null;

  const url = new URL(`${UNSPLASH_API_BASE}/search/photos`);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders()
  });

  if (!res.ok) {
    throw new Error(`Unsplash search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const photo = data?.results?.[0];

  if (!photo) return null;

  await trackDownload(photo?.links?.download_location || "");

  return {
    eyecatch: photo?.urls?.regular || photo?.urls?.full || "",
    eyecatchAlt: photo?.alt_description || photo?.description || "",
    eyecatchPhotoBy: photo?.user?.name || "",
    eyecatchPhotoUrl: photo?.user?.links?.html ? appendUtm(photo.user.links.html) : "",
    eyecatchSourceUrl: appendUtm("https://unsplash.com/")
  };
}

function shouldFetch(meta) {
  if (!meta.eyecatchQuery) return false;

  const hasResolved =
    meta.eyecatch &&
    meta.eyecatchAlt &&
    meta.eyecatchPhotoBy &&
    meta.eyecatchPhotoUrl &&
    meta.eyecatchSourceUrl;

  return !hasResolved;
}

async function processArticle(articlePath) {
  const raw = fs.readFileSync(articlePath, "utf8");
  const parsed = parseFrontMatter(raw);

  if (!parsed.hasFrontMatter) return false;
  if (!shouldFetch(parsed.meta)) return false;

  const result = await searchPhoto(parsed.meta.eyecatchQuery);
  if (!result || !result.eyecatch) {
    console.warn("no eyecatch found:", articlePath);
    return false;
  }

  const nextMeta = {
    ...parsed.meta,
    ...result
  };

  const nextFrontMatter = buildFrontMatter(
    nextMeta,
    parsed.metaLines.map((line) => {
      const i = line.indexOf(":");
      return i === -1 ? "" : line.slice(0, i).trim();
    })
  );

  const nextRaw = `${nextFrontMatter}\n${parsed.body.replace(/^\n*/, "")}`;

  if (nextRaw === raw) return false;

  fs.writeFileSync(articlePath, nextRaw, "utf8");
  console.log("eyecatch updated:", articlePath);
  return true;
}

async function run() {
  const dirs = fs.readdirSync(SRC_DIR, { withFileTypes: true });

  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;

    const articlePath = path.join(SRC_DIR, entry.name, "article.md");
    if (!fs.existsSync(articlePath)) continue;

    try {
      await processArticle(articlePath);
    } catch (error) {
      console.warn("eyecatch fetch failed:", entry.name, error.message);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});