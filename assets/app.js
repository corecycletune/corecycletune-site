/* CCT Lab - minimal "CMS-like" client script
   - Inject header/footer
   - Build breadcrumbs
   - Render: topics list, topic posts, latest articles, articles list, related posts
   - Source of truth: /data/posts.json
*/

(function () {
  "use strict";

  // ---------- Small utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizePath(pathname) {
    let p = pathname || "/";
    if (!p.startsWith("/")) p = "/" + p;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }

  function isActivePath(href) {
    const cur = normalizePath(location.pathname);
    const target = normalizePath(href);
    if (target === "/") return cur === "/";
    return cur === target || cur.startsWith(target + "/");
  }

  function toArrayMaybe(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    if (Array.isArray(obj.posts)) return obj.posts;
    if (Array.isArray(obj.items)) return obj.items;
    return [];
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function sortByDateDesc(posts) {
    return [...posts].sort((a, b) => {
      const da = Date.parse(a.updated || a.date || a.published || "") || 0;
      const db = Date.parse(b.updated || b.date || b.published || "") || 0;
      return db - da;
    });
  }

  function getPathSegments() {
    const p = normalizePath(location.pathname);
    if (p === "/") return [];
    return p.split("/").filter(Boolean);
  }

  function getQueryParam(name) {
    try {
      const u = new URL(location.href);
      return u.searchParams.get(name);
    } catch {
      return null;
    }
  }

  function setQueryParam(name, value) {
    const u = new URL(location.href);
    if (!value) u.searchParams.delete(name);
    else u.searchParams.set(name, value);
    return u.toString();
  }

  // ---------- Header / Footer ----------
  function injectHeaderFooter() {
    const header = $("#site-header");
    const footer = $("#site-footer");

    if (header) {
      header.innerHTML = `
        <div class="container header-inner">
          <a class="brand" href="/" aria-label="CCT Lab ホーム">
            <span class="brand-mark">CCT</span><span class="brand-gap"></span><span class="brand-mark">Lab</span>
          </a>

          <nav class="nav" aria-label="グローバルナビ">
            <a class="nav-link" href="/articles/">記事</a>
            <a class="nav-link" href="/topics/">カテゴリ</a>
            <a class="nav-link" href="/about/">About</a>
          </nav>
        </div>
      `;

      header.querySelectorAll("a.nav-link").forEach((a) => {
        if (isActivePath(a.getAttribute("href"))) a.classList.add("is-active");
      });
    }

    if (footer) {
      const year = new Date().getFullYear();
      footer.innerHTML = `
        <div class="container footer-inner">
          <div class="footer-links">
            <a href="/about/">About</a>
            <span class="dot">•</span>
            <a href="/disclaimer/">免責</a>
            <span class="dot">•</span>
            <a href="/articles/">記事</a>
            <span class="dot">•</span>
            <a href="/topics/">カテゴリ</a>
          </div>
          <div class="footer-note">© ${year} CCT Lab</div>
        </div>
      `;
    }
  }

  // ---------- Data loading ----------
  async function loadPosts() {
    const res = await fetch("/data/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch /data/posts.json");
    const json = await res.json();
    const posts = toArrayMaybe(json);

    return posts
      .map((p) => {
        const path =
          p.path ||
          p.url ||
          (p.slug ? `/articles/${String(p.slug).replace(/^\/+|\/+$/g, "")}/` : "");

        return {
          title: p.title || p.name || "",
          description: p.description || p.excerpt || p.lead || "",
          path,
          slug: p.slug || path.split("/").filter(Boolean).slice(-1)[0] || "",
          tags: Array.isArray(p.tags) ? p.tags : p.tags ? [p.tags] : [],
          topics: Array.isArray(p.topics) ? p.topics : p.topics ? [p.topics] : [],
          category: p.category || "",
          updated: p.updated || p.date || p.published || "",
          readingTime: p.readingTime || p.reading_time || p.readTime || p.read || "",
        };
      })
      .filter((p) => p.path && p.title);
  }

  function indexPostsByPath(posts) {
    const m = new Map();
    posts.forEach((p) => {
      let key = p.path;
      if (!key.endsWith("/")) key += "/";
      if (!key.startsWith("/")) key = "/" + key;
      m.set(key, p);
    });
    return m;
  }

  // ---------- Topic helpers ----------
  function collectTopics(posts) {
    const fromTags = posts.flatMap((p) => (p.tags || []).map(String));
    const fromTopics = posts.flatMap((p) => (p.topics || []).map(String));
    const fromCategory = posts.map((p) => String(p.category || "")).filter(Boolean);

    return uniq([...fromTags, ...fromTopics, ...fromCategory])
      .map((t) => t.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ja"));
  }

  function postHasTopic(post, topicLabel) {
    const label = String(topicLabel || "").trim();
    if (!label) return false;

    const tags = (post.tags || []).map(String);
    const topics = (post.topics || []).map(String);
    const category = post.category ? [String(post.category)] : [];

    return [...tags, ...topics, ...category].some((x) => String(x).trim() === label);
  }

  // ---------- Breadcrumbs ----------
  function buildBreadcrumbs(postsIndexByPath) {
    const el = $("#breadcrumbs");
    if (!el) return;

    const segs = getPathSegments();
    const crumbs = [{ name: "Home", href: "/" }];

    if (segs.length >= 1) {
      const first = segs[0];

      if (first === "articles") {
        crumbs.push({ name: "記事", href: "/articles/" });

        const t = getQueryParam("t");
        if (t && segs.length === 1) {
          crumbs.push({ name: t, href: "/articles/?t=" + encodeURIComponent(t) });
        }

        if (segs.length >= 2) {
          const slug = segs[1];
          const key = "/articles/" + slug + "/";
          const post = postsIndexByPath.get(key);
          crumbs.push({
            name: post?.title ? post.title : slug,
            href: key,
          });
        }
      } else if (first === "topics") {
        crumbs.push({ name: "カテゴリ", href: "/topics/" });

        const t = getQueryParam("t");
        if (t) crumbs.push({ name: t, href: "/topics/?t=" + encodeURIComponent(t) });
      } else if (first === "about") {
        crumbs.push({ name: "About", href: "/about/" });
      } else if (first === "disclaimer") {
        crumbs.push({ name: "免責", href: "/disclaimer/" });
      } else {
        crumbs.push({ name: esc(first), href: "/" + first + "/" });
      }
    }

    el.innerHTML = `
      <ol class="breadcrumbs-list">
        ${crumbs
          .map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return `<li class="breadcrumbs-item">
              ${
                isLast
                  ? `<span aria-current="page">${esc(c.name)}</span>`
                  : `<a href="${esc(c.href)}">${esc(c.name)}</a>`
              }
            </li>`;
          })
          .join("")}
      </ol>
    `;
  }

  // ---------- Rendering: Topics page ----------
  function renderTopicsList(posts) {
    const target = $("#topics-list");
    if (!target) return;

    const topics = collectTopics(posts);
    const selected = getQueryParam("t");

    if (topics.length === 0) {
      target.innerHTML = `<p class="muted">カテゴリは準備中です。</p>`;
      return;
    }

    target.innerHTML = `
      <ul class="topics">
        ${topics
          .map((t) => {
            const href = "/topics/?t=" + encodeURIComponent(t);
            const isSel = selected && String(selected) === String(t);
            return `<li class="topic-pill ${isSel ? "is-selected" : ""}">
              <a class="topic-link" href="${esc(href)}">${esc(t)}</a>
            </li>`;
          })
          .join("")}
      </ul>
      <p class="muted small">※カテゴリは posts.json の tags / topics / category から自動生成されます。</p>
    `;
  }

  function renderTopicPosts(posts) {
    const target = $("#topic-posts");
    if (!target) return;

    const selected = getQueryParam("t");

    if (!selected) {
      target.innerHTML = `
        <section class="card">
          <h2>カテゴリ別の記事</h2>
          <p class="muted">上のカテゴリをタップすると、そのカテゴリの記事がここに表示されます。</p>
        </section>
      `;
      return;
    }

    const filtered = sortByDateDesc(posts).filter((p) => postHasTopic(p, selected));

    if (filtered.length === 0) {
      target.innerHTML = `
        <section class="card">
          <h2>「${esc(selected)}」の記事</h2>
          <p class="muted">このカテゴリの記事はまだありません。</p>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <section class="card">
        <h2>「${esc(selected)}」の記事</h2>
        <div class="list">
          ${filtered
            .map((p) => {
              const meta = [
                p.updated ? `更新: ${esc(p.updated)}` : "",
                p.readingTime ? `読了目安: ${esc(p.readingTime)}` : "",
              ]
                .filter(Boolean)
                .join(" ・ ");

              return `
                <article class="list-item">
                  <a class="list-title" href="${esc(p.path)}">${esc(p.title)}</a>
                  ${p.description ? `<div class="list-desc">${esc(p.description)}</div>` : ""}
                  ${meta ? `<div class="list-meta">${meta}</div>` : ""}
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  // ---------- Rendering: Articles page filters ----------
  function renderArticlesFilters(posts) {
    const target = $("#articles-filters");
    if (!target) return;

    const topics = collectTopics(posts);
    const selected = getQueryParam("t");

    if (topics.length === 0) {
      target.innerHTML = `<p class="muted">絞り込みカテゴリは準備中です。</p>`;
      return;
    }

    // "All" link removes t param
    const allHref = new URL(location.href);
    allHref.searchParams.delete("t");

    target.innerHTML = `
      <div class="filters">
        <div class="filters-row">
          <a class="filter-pill ${!selected ? "is-selected" : ""}" href="${esc(allHref.toString())}">すべて</a>
          ${topics
            .map((t) => {
              const href = "/articles/?t=" + encodeURIComponent(t);
              const isSel = selected && String(selected) === String(t);
              return `<a class="filter-pill ${isSel ? "is-selected" : ""}" href="${esc(href)}">${esc(t)}</a>`;
            })
            .join("")}
        </div>
        <p class="muted small">※絞り込みは posts.json の tags / topics / category から自動生成されます。</p>
      </div>
    `;
  }

  // ---------- Rendering: Latest / List ----------
  function renderLatestArticles(posts) {
    const target = $("#latest-articles");
    if (!target) return;

    const latest = sortByDateDesc(posts).slice(0, 5);

    target.innerHTML = `
      <div class="list">
        ${latest
          .map((p) => {
            const meta = [
              p.updated ? `更新: ${esc(p.updated)}` : "",
              p.readingTime ? `読了目安: ${esc(p.readingTime)}` : "",
            ]
              .filter(Boolean)
              .join(" ・ ");

            return `
              <article class="list-item">
                <a class="list-title" href="${esc(p.path)}">${esc(p.title)}</a>
                ${p.description ? `<div class="list-desc">${esc(p.description)}</div>` : ""}
                ${meta ? `<div class="list-meta">${meta}</div>` : ""}
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderArticlesList(posts) {
    const target = $("#articles-list");
    if (!target) return;

    const selected = getQueryParam("t");
    const sorted = sortByDateDesc(posts);
    const shown = selected ? sorted.filter((p) => postHasTopic(p, selected)) : sorted;

    if (selected && shown.length === 0) {
      target.innerHTML = `
        <section class="card">
          <h2>「${esc(selected)}」の記事</h2>
          <p class="muted">このカテゴリの記事はまだありません。</p>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <div class="list">
        ${shown
          .map((p) => {
            const tags = uniq([...(p.tags || []), ...(p.topics || []), p.category].filter(Boolean));
            const tagHtml = tags.length
              ? `<div class="list-tags">${tags
                  .slice(0, 3)
                  .map((t) => `<span class="tag">${esc(t)}</span>`)
                  .join("")}</div>`
              : "";

            const meta = [
              p.updated ? `更新: ${esc(p.updated)}` : "",
              p.readingTime ? `読了目安: ${esc(p.readingTime)}` : "",
            ]
              .filter(Boolean)
              .join(" ・ ");

            return `
              <article class="list-item">
                <a class="list-title" href="${esc(p.path)}">${esc(p.title)}</a>
                ${p.description ? `<div class="list-desc">${esc(p.description)}</div>` : ""}
                ${tagHtml}
                ${meta ? `<div class="list-meta">${meta}</div>` : ""}
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  // ---------- Rendering: Related posts ----------
  function renderRelatedPosts(posts, postsIndexByPath) {
    const target = $("#related-posts");
    if (!target) return;

    const curPath = normalizePath(location.pathname) + "/";
    const cur = postsIndexByPath.get(curPath);

    if (!cur) {
      target.innerHTML = "";
      return;
    }

    const curTopics = new Set(
      uniq([...(cur.tags || []), ...(cur.topics || []), cur.category].filter(Boolean)).map(String)
    );

    const candidates = posts
      .filter((p) => {
        let pPath = p.path;
        if (!pPath.endsWith("/")) pPath += "/";
        return pPath !== curPath;
      })
      .map((p) => {
        const pTopics = uniq([...(p.tags || []), ...(p.topics || []), p.category].filter(Boolean)).map(String);
        const score = pTopics.reduce((acc, t) => acc + (curTopics.has(t) ? 1 : 0), 0);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.p);

    if (candidates.length === 0) {
      target.innerHTML = `
        <section class="card related">
          <h2>関連記事</h2>
          <p class="muted">関連記事は準備中です。</p>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <section class="card related">
        <h2>関連記事</h2>
        <div class="list compact">
          ${candidates
            .map(
              (p) => `
            <article class="list-item">
              <a class="list-title" href="${esc(p.path)}">${esc(p.title)}</a>
              ${p.description ? `<div class="list-desc">${esc(p.description)}</div>` : ""}
            </article>
          `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  // ---------- Main ----------
  async function main() {
    injectHeaderFooter();

    let posts = [];
    let postsIndexByPath = new Map();

    const needsPosts =
      $("#topics-list") ||
      $("#topic-posts") ||
      $("#articles-filters") ||
      $("#latest-articles") ||
      $("#articles-list") ||
      $("#related-posts") ||
      $("#breadcrumbs");

    if (needsPosts) {
      try {
        posts = await loadPosts();
        postsIndexByPath = indexPostsByPath(posts);
      } catch (e) {
        console.warn(e);
      }
    }

    buildBreadcrumbs(postsIndexByPath);

    if (posts.length) {
      renderTopicsList(posts);
      renderTopicPosts(posts);
      renderArticlesFilters(posts);
      renderLatestArticles(posts);
      renderArticlesList(posts);
      renderRelatedPosts(posts, postsIndexByPath);
    } else {
      const a = $("#articles-list");
      if (a) a.innerHTML = `<p class="muted">記事一覧を読み込めませんでした（/data/posts.json を確認してください）。</p>`;
      const t = $("#topics-list");
      if (t) t.innerHTML = `<p class="muted">カテゴリを読み込めませんでした（/data/posts.json を確認してください）。</p>`;
      const tp = $("#topic-posts");
      if (tp) tp.innerHTML = `<p class="muted">記事一覧を読み込めませんでした（/data/posts.json を確認してください）。</p>`;
      const f = $("#articles-filters");
      if (f) f.innerHTML = `<p class="muted">絞り込みを読み込めませんでした（/data/posts.json を確認してください）。</p>`;
      const l = $("#latest-articles");
      if (l) l.innerHTML = `<p class="muted">最新記事を読み込めませんでした（/data/posts.json を確認してください）。</p>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
