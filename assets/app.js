/* CCT Lab - minimal "CMS-like" client script
   - Inject header/footer
   - Build breadcrumbs
   - Render: topics list, topic posts, latest articles, articles list, related posts
   - Source of truth: /data/posts.json
*/

(function () {
  "use strict";

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

  // ---------- Category helpers ----------
  // フィルターUIはcategoryのみ使用
  // tags / topics は記事カード表示と関連記事スコアリング専用
  function collectCategories(posts) {
    return uniq(
      posts
        .map((p) => String(p.category || "").trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }

  function postMatchesCategory(post, category) {
    if (!category) return true;
    return String(post.category || "").trim() === String(category).trim();
  }

  // 関連記事スコアリング用：tags / topics / category を全部使う
  function postAllLabels(post) {
    return uniq([
      ...(post.tags || []),
      ...(post.topics || []),
      post.category,
    ].filter(Boolean).map(String));
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

    const categories = collectCategories(posts);
    const selected = getQueryParam("t");

    if (categories.length === 0) {
      target.innerHTML = `<p class="muted">カテゴリは準備中です。</p>`;
      return;
    }

    target.innerHTML = `
      <ul class="topics">
        ${categories
          .map((t) => {
            const href = "/topics/?t=" + encodeURIComponent(t);
            const isSel = selected && String(selected) === String(t);
            return `<li class="topic-pill ${isSel ? "is-selected" : ""}">
              <a class="topic-link" href="${esc(href)}">${esc(t)}</a>
            </li>`;
          })
          .join("")}
      </ul>
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

    const filtered = sortByDateDesc(posts).filter((p) => postMatchesCategory(p, selected));

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

    const categories = collectCategories(posts);
    const selected = getQueryParam("t");

    if (categories.length === 0) {
      target.innerHTML = `<p class="muted">絞り込みカテゴリは準備中です。</p>`;
      return;
    }

    const allHref = new URL(location.href);
    allHref.searchParams.delete("t");

    target.innerHTML = `
      <div class="filters">
        <div class="filters-row">
          <a class="filter-pill ${!selected ? "is-selected" : ""}" href="${esc(allHref.toString())}">すべて</a>
          ${categories
            .map((t) => {
              const href = "/articles/?t=" + encodeURIComponent(t);
              const isSel = selected && String(selected) === String(t);
              return `<a class="filter-pill ${isSel ? "is-selected" : ""}" href="${esc(href)}">${esc(t)}</a>`;
            })
            .join("")}
        </div>
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
    const shown = selected
      ? sorted.filter((p) => postMatchesCategory(p, selected))
      : sorted;

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
            const tagHtml = p.tags && p.tags.length
              ? `<div class="list-tags">${p.tags
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

    const curLabels = new Set(postAllLabels(cur));

    const candidates = posts
      .filter((p) => {
        let pPath = p.path;
        if (!pPath.endsWith("/")) pPath += "/";
        return pPath !== curPath;
      })
      .map((p) => {
        const score = postAllLabels(p).reduce(
          (acc, t) => acc + (curLabels.has(t) ? 1 : 0),
          0
        );
        return { p, score };
      })
      .filter​​​​​​​​​​​​​​​​
