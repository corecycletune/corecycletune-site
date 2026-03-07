const fs = require("fs");

const BASE_URL = "https://corecycletune.com";

const posts = JSON.parse(
  fs.readFileSync("data/posts.json")
);

const urls = posts.map(p => {

  return `
  <url>
    <loc>${BASE_URL}/articles/${p.slug}/</loc>
  </url>
`;

}).join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>`;

fs.writeFileSync("sitemap.xml", xml);

console.log("sitemap generated");