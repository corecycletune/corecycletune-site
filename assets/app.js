/* File: assets/app.js
 * CCT Lab - lightweight client-side rendering (no build)
 * Source of truth: /data/posts.json
 */

(async function () {
  const POSTS_URL = "/data/posts.json";

  async function loadPosts() {
    const res = await fetch(POSTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load posts.json");
    const posts = await res.json();
    // updated desc
    posts.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    return posts;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function postCard(p) {
    const tags = (p.tags || []).map(t => `<a class="tag" href="/tags/${esc(t)}/">${esc(t)}</a>`).join(" ");
    return `
      <article class="post-card">
        <h3 class="post-card__title">
          <a href="/articles/${esc(p.slug)}/">${esc(p.title)}</a>
        </h3>
        <div class="post-meta">
          <span class="post-meta__date">更新: ${esc(p.updated)}</span>
          ${p.readingMinutes ? `<span class="post-meta__read">読了目安: ${esc(p.readingMinutes)}分</span>` : ""}
          ${p.category ? `<a class="post-meta__cat" href="/categories/${esc(p.category)}/">${esc(p.categoryLabel || p.category)}</a>` : ""}
        </div>
        ${p.excerpt ? `<p class="post-card__excerpt">${esc(p.excerpt)}</p>` : ""}
        ${tags ? `<div class="post-tags">${tags}</div>` : ""}
      </article>
    `;
  }

  function groupByCategory(posts) {
    const map = new Map();
    for (const p of posts) {
      const key = p.category || "uncategorized";
      if (!map.has(key)) map.set(key, { label: p.categoryLabel || key, posts: [] });
      map.get(key).posts.push(p);
    }
    return map;
  }

  function renderLatest(posts) {
    const el = document.getElementById("js-latest-posts");
    if (!el) return;
    const latest = posts.slice(0, 6);
    el.innerHTML = latest.map(postCard).join("");
  }

  function renderArticles(posts) {
    const el = document.getElementById("js-article-list");
    if (!el) return;
    el.innerHTML = posts.map(postCard).join("");
  }

  function renderCategories(posts) {
    const el = document.getElementById("js-category-list");
    if (!el) return;

    const map = groupByCategory(posts);
    const items = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([slug, v]) => {
        return `
          <li>
            <a href="/categories/${esc(slug)}/">${esc(v.label)}</a>
            <span class="count">(${v.posts.length})</span>
          </li>
        `;
      })
      .join("");

    el.innerHTML = `<ul class="link-list">${items}</ul>`;
  }

  function renderCategoryPage(posts) {
    const el = document.getElementById("js-category-posts");
    if (!el) return;

    const slug = el.getAttribute("data-category");
    if (!slug) return;

    const filtered = posts.filter(p => p.category === slug);
    el.innerHTML = filtered.length
      ? filtered.map(postCard).join("")
      : `<p class="muted">このカテゴリの記事はまだありません。</p>`;
  }

  function renderRelated(posts) {
    const el = document.getElementById("js-related-posts");
    if (!el) return;

    const slug = el.getAttribute("data-slug");
    if (!slug) return;

    const current = posts.find(p => p.slug === slug);
    if (!current) return;

    const related = posts
      .filter(p => p.slug !== slug)
      .map(p => {
        let score = 0;
        if (p.category && current.category && p.category === current.category) score += 3;
        const ct = new Set(current.tags || []);
        for (const t of (p.tags || [])) if (ct.has(t)) score += 1;
        return { p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(x => x.p);

    el.innerHTML = related.length
      ? related.map(postCard).join("")
      : `<p class="muted">関連記事はまだありません。</p>`;
  }

  try {
    const posts = await loadPosts();
    renderLatest(posts);
    renderArticles(posts);
    renderCategories(posts);
    renderCategoryPage(posts);
    renderRelated(posts);
  } catch (e) {
    // fail silently (static fallback remains)
    console.warn(e);
  }
})();
