const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const WORKFLOW_MODE = process.env.WORKFLOW_MODE || "review";
const MANUAL_REQUEST = (process.env.MANUAL_REQUEST || "").trim();

const MAX_ARTICLES_PER_RUN = 1;
const MAX_EXISTING_POSTS_FOR_CONTEXT = 80;
const OUTPUT_DIR_REVIEW = "articles_draft";
const OUTPUT_DIR_PUBLISH = "articles_src";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.warn(`Failed to read: ${filePath}`, error);
    return "";
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function findFirstExistingPath(candidates) {
  for (const rel of candidates) {
    const abs = path.join(ROOT, rel);
    if (fileExists(abs)) return abs;
  }
  return null;
}

function loadPromptFiles() {
  const siteArchitecturePath = findFirstExistingPath([
    "site_architecture.md",
    "meta/site_architecture.md",
  ]);

  const generateArticlePath = findFirstExistingPath([
    "generate_article.md",
    "prompts/generate_article.md",
  ]);

  const articleStructurePath = findFirstExistingPath([
    "article_structure.md",
    "prompts/article_structure.md",
  ]);

  const baseConceptPath = findFirstExistingPath([
    "base_cct_concept.md",
    "prompts/base_cct_concept.md",
  ]);

  const siteArchitecture = siteArchitecturePath
    ? readIfExists(siteArchitecturePath)
    : "";
  const generateArticle = generateArticlePath
    ? readIfExists(generateArticlePath)
    : "";
  const articleStructure = articleStructurePath
    ? readIfExists(articleStructurePath)
    : "";
  const baseConcept = baseConceptPath ? readIfExists(baseConceptPath) : "";

  if (!generateArticle) {
    fail(
      "Missing generate_article.md. Expected one of: generate_article.md or prompts/generate_article.md"
    );
  }

  return {
    siteArchitecture,
    generateArticle,
    articleStructure,
    baseConcept,
    resolvedPaths: {
      siteArchitecturePath,
      generateArticlePath,
      articleStructurePath,
      baseConceptPath,
    },
  };
}

function loadPostsJson() {
  const postsPath = path.join(ROOT, "data", "posts.json");
  if (!fileExists(postsPath)) {
    console.warn("data/posts.json not found. Continuing with empty existing-post context.");
    return [];
  }

  try {
    const raw = fs.readFileSync(postsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse data/posts.json. Continuing with empty existing-post context.", error);
    return [];
  }
}

function listDirectoryNamesIfExists(relDir) {
  const absDir = path.join(ROOT, relDir);
  if (!fileExists(absDir)) return [];
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function collectExistingSlugs(posts) {
  const slugs = new Set();

  for (const post of posts) {
    if (post && typeof post.slug === "string" && post.slug.trim()) {
      slugs.add(post.slug.trim());
    }
  }

  for (const slug of listDirectoryNamesIfExists("articles_src")) {
    slugs.add(slug);
  }

  for (const slug of listDirectoryNamesIfExists("articles_draft")) {
    slugs.add(slug);
  }

  return slugs;
}

function compactPostsForPrompt(posts) {
  return posts.slice(0, MAX_EXISTING_POSTS_FOR_CONTEXT).map((post) => {
    const title = valueOrEmpty(post.title);
    const slug = valueOrEmpty(post.slug);
    const description = valueOrEmpty(post.description);
    const category = valueOrEmpty(post.category);
    const topics = normalizeListForPrompt(post.topics);
    const tags = normalizeListForPrompt(post.tags);
    const updated = valueOrEmpty(post.updated);

    return {
      title,
      slug,
      description,
      category,
      topics,
      tags,
      updated,
    };
  });
}

function valueOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function normalizeListForPrompt(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return "";
}

function getTodayInTokyo() {
  const now = new Date();
  const tokyo = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return tokyo.toISOString().slice(0, 10);
}

function buildRequestPayload({
  promptFiles,
  existingPostsCompactJson,
  manualRequest,
  duplicateRetryNote,
}) {
  const today = getTodayInTokyo();

  const systemInstruction = [
    "You are generating one article source file for a static site called CCT Lab.",
    "Return STRICT JSON only. No markdown fence. No prose outside JSON.",
    'Return exactly this shape: {"slug":"...","article_md":"..."}',
    "The slug must be English kebab-case, 3-5 words preferred, filesystem-safe.",
    "The article_md value must be the exact saveable contents of articles_src/<slug>/article.md.",
    "article_md must include front matter and full markdown body.",
    "Do not include slug in front matter unless it already belongs to the existing format. The save path uses the JSON slug field.",
    "Respect the provided site architecture and prompt files.",
    "Avoid duplicating existing themes, titles, descriptions, slugs, and near-identical angles.",
    "Use natural Japanese for the article body.",
    "The article must be publishable in the site's house style.",
    `Today's date in Asia/Tokyo is ${today}. Use this for updated.`,
    "If a manual request is provided, prioritize it while still making the result fit the site's rules.",
    "If no manual request is provided, autonomously choose a fresh theme that fits the site.",
    "Do not output explanations, apologies, notes, or analysis.",
    duplicateRetryNote || "",
  ]
    .filter(Boolean)
    .join("\n");

  const userInstruction = [
    "Below are the authoritative project files and current site context.",
    "",
    "=== site_architecture.md ===",
    promptFiles.siteArchitecture || "(not provided)",
    "",
    "=== base_cct_concept.md ===",
    promptFiles.baseConcept || "(not provided)",
    "",
    "=== article_structure.md ===",
    promptFiles.articleStructure || "(not provided)",
    "",
    "=== generate_article.md ===",
    promptFiles.generateArticle || "(not provided)",
    "",
    "=== existing posts summary JSON ===",
    existingPostsCompactJson,
    "",
    "=== manual article request ===",
    manualRequest || "(none)",
    "",
    "Generate exactly one article.",
  ].join("\n");

  return {
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 7000,
    messages: [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: userInstruction,
      },
    ],
  };
}

async function callOpenAIChatCompletions(payload) {
  if (!OPENAI_API_KEY) {
    fail("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    fail(`OpenAI API error: ${response.status} ${response.statusText}\n${text}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    fail(`Failed to parse OpenAI API response as JSON.\n${text}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    fail(`OpenAI API returned no message content.\n${text}`);
  }

  return content;
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Model did not return valid JSON.\n${text}`);
  }
}

function sanitizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractTitleFromFrontMatter(articleMd) {
  const frontMatterMatch = articleMd.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) return "";

  const frontMatter = frontMatterMatch[1];
  const titleMatch = frontMatter.match(/^title:\s*(.+)$/m);
  if (!titleMatch) return "";

  return titleMatch[1].trim().replace(/^["']|["']$/g, "");
}

function validateArticleMarkdown(articleMd) {
  if (typeof articleMd !== "string" || !articleMd.trim()) {
    fail("Generated article_md is empty.");
  }

  if (!articleMd.startsWith("---\n")) {
    fail("Generated article_md does not start with front matter.");
  }

  const frontMatterMatch = articleMd.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontMatterMatch) {
    fail("Generated article_md front matter is malformed.");
  }

  const frontMatter = frontMatterMatch[1];

  const requiredKeys = [
    "title",
    "description",
    "updated",
    "tags",
    "topics",
    "category",
    "readingTime",
    "eyecatchQuery",
  ];

  for (const key of requiredKeys) {
    const regex = new RegExp(`^${escapeRegExp(key)}:\\s*.+$`, "m");
    if (!regex.test(frontMatter)) {
      fail(`Generated article_md is missing required front matter key: ${key}`);
    }
  }

  const body = articleMd.slice(frontMatterMatch[0].length).trim();
  if (!body) {
    fail("Generated article_md body is empty.");
  }

  if (!/$begin:math:display$quote$end:math:display$[\s\S]*?$begin:math:display$\\\/quote$end:math:display$/.test(articleMd)) {
    fail("Generated article_md is missing the required [quote]...[/quote] block.");
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function determineOutputBaseDir() {
  if (WORKFLOW_MODE === "auto_publish") {
    return OUTPUT_DIR_PUBLISH;
  }
  return OUTPUT_DIR_REVIEW;
}

function writeArticleFile({ slug, articleMd }) {
  const outputBaseDir = determineOutputBaseDir();
  const articleDir = path.join(ROOT, outputBaseDir, slug);
  const articlePath = path.join(articleDir, "article.md");

  ensureDir(articleDir);
  fs.writeFileSync(articlePath, articleMd, "utf8");

  return {
    outputBaseDir,
    articleDir,
    articlePath,
  };
}

function writeRunSummaryFile(summary) {
  const summaryDir = path.join(ROOT, "tmp");
  ensureDir(summaryDir);
  const summaryPath = path.join(summaryDir, "ai_generation_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  return summaryPath;
}

async function generateOneArticle() {
  const promptFiles = loadPromptFiles();
  const posts = loadPostsJson();
  const existingSlugs = collectExistingSlugs(posts);
  const existingPostsCompact = compactPostsForPrompt(posts);
  const existingPostsCompactJson = JSON.stringify(existingPostsCompact, null, 2);

  let duplicateRetryNote = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const payload = buildRequestPayload({
      promptFiles,
      existingPostsCompactJson,
      manualRequest: MANUAL_REQUEST,
      duplicateRetryNote,
    });

    const rawModelText = await callOpenAIChatCompletions(payload);
    const parsed = parseModelJson(rawModelText);

    const slug = sanitizeSlug(parsed.slug);
    const articleMd = parsed.article_md;

    if (!slug) {
      duplicateRetryNote =
        "Previous attempt failed because the slug was empty or invalid. Return a valid English kebab-case slug.";
      continue;
    }

    if (existingSlugs.has(slug)) {
      duplicateRetryNote =
        `Previous attempt failed because the slug "${slug}" already exists. Choose a meaningfully different theme and slug.`;
      continue;
    }

    validateArticleMarkdown(articleMd);

    const title = extractTitleFromFrontMatter(articleMd);

    const writeResult = writeArticleFile({ slug, articleMd });

    const summary = {
      workflowMode: WORKFLOW_MODE,
      manualRequest: MANUAL_REQUEST,
      model: OPENAI_MODEL,
      slug,
      title,
      outputBaseDir: writeResult.outputBaseDir,
      articlePath: path.relative(ROOT, writeResult.articlePath),
      promptFiles: promptFiles.resolvedPaths,
      generatedAt: new Date().toISOString(),
    };

    const summaryPath = writeRunSummaryFile(summary);

    console.log("AI article generation succeeded.");
    console.log(`slug: ${slug}`);
    console.log(`title: ${title}`);
    console.log(`article path: ${path.relative(ROOT, writeResult.articlePath)}`);
    console.log(`summary path: ${path.relative(ROOT, summaryPath)}`);

    return summary;
  }

  fail("Failed to generate a non-duplicate valid article after 3 attempts.");
}

async function main() {
  if (MAX_ARTICLES_PER_RUN !== 1) {
    fail("This script currently supports exactly one article per run.");
  }

  console.log(`WORKFLOW_MODE=${WORKFLOW_MODE}`);
  console.log(`OPENAI_MODEL=${OPENAI_MODEL}`);
  console.log(`MANUAL_REQUEST=${MANUAL_REQUEST ? "provided" : "none"}`);

  await generateOneArticle();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});