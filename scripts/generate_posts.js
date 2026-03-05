const fs = require("fs")
const path = require("path")

const ARTICLES_DIR = path.join(__dirname, "../articles")
const OUTPUT_FILE = path.join(__dirname, "../data/posts.json")

function parseMeta(content) {

  const match = content.match(/<!--([\s\S]*?)-->/)

  if (!match) return null

  const lines = match[1]
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)

  const meta = {}

  lines.forEach(line => {

    const i = line.indexOf(":")

    if (i === -1) return

    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()

    meta[key] = value

  })

  if (meta.tags) {
    meta.tags = meta.tags.split(",").map(v => v.trim())
  }

  if (meta.topics) {
    meta.topics = meta.topics.split(",").map(v => v.trim())
  }

  return meta
}

function run() {

  const dirs = fs.readdirSync(ARTICLES_DIR)

  const posts = []

  dirs.forEach(slug => {

    const file = path.join(ARTICLES_DIR, slug, "index.html")

    if (!fs.existsSync(file)) return

    const html = fs.readFileSync(file, "utf8")

    const meta = parseMeta(html)

    if (!meta) return

    posts.push({
      title: meta.title || slug,
      path: `/articles/${slug}/`,
      description: meta.description || "",
      updated: meta.updated || "",
      tags: meta.tags || [],
      topics: meta.topics || [],
      category: meta.category || "",
      readingTime: meta.readingTime || ""
    })

  })

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(posts, null, 2)
  )

  console.log("posts.json generated:", posts.length)

}

run()
