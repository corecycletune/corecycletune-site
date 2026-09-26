const fs = require("fs");

const BASE_URL = "https://corecycletune.com";

const posts = JSON.parse(
  fs.readFileSync("data/posts.json")
);

const conceptPages = ["life-conditions","body-responses","feelings-desires","actions","life-rhythm","next-state","dissonance","resolution","how-to"];

const staticPages = ["/", "/articles/", "/topics/", "/concept/", "/about/", "/disclaimer/", "/privacy/"];

const urls = posts.map(p => {

  return `
  <url>
    <loc>${BASE_URL}/articles/${p.slug}/</loc>
  </url>
`;

}).join("") + [...staticPages, ...conceptPages.map(slug => `/concept/${slug}/`)].map(path => `
  <url>
    <loc>${BASE_URL}${path}</loc>
  </url>
`).join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>`;

fs.writeFileSync("sitemap.xml", xml);

console.log("sitemap generated");