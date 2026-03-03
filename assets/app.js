/* CCT Lab - app.js
   目的:
   - data/posts.json を Single Source of Truth として読み込み
   - 各ページは「入れ物」だけ置けば、記事一覧・最新記事・カテゴリ一覧を自動描画できるようにする
   使い方:
   - 記事一覧ページ:  <div id="js-articles-list"></div>
   - 最新記事(数件): <div id="js-latest-posts" data-limit="5"></div>
   - カテゴリ一覧:    <div id="js-topics-list"></div>
*/

(() => {
  "use strict";

  const POSTS_URL = "/data/posts.json";

  /** @returns {string} */
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  /** @returns {string} */
  function formatDateISOToJP(iso) {
    if (!iso) return "";
    // "YYYY-MM-DD" 前提。違う形式でも極力壊れないようにする。
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return escapeHtml(iso);
    return `${m[1]}-${m[2]}-${m[3]}`;
  }

  /** posts.json の揺れを吸収して正規化 */
  function normalizePost(raw) {
    const slug = raw.slug ?? raw.id ?? raw.path;
    const title = raw.title ?? raw.h1 ?? "";
    const summary = raw.summary ?? raw.lead ?? raw.description ?? "";
    const date = raw.date ?? raw.published ?? raw.created ?? "";
    const updated = raw.updated ?? raw.modified ?? "";
    const minutes = raw.reading_minutes ?? raw.readingMinutes ?? raw.minutes ?? raw.readTime ?? null;

    // categories / topics / tags を全部 categories に寄せる（配列化）
    const catRaw = raw.categories ?? raw.topics ?? raw.tags ?? [];
    const categories = Array.isArray(catRaw)
      ? catRaw.filter(Boolean).map(String)
      : String(catRaw).split(",").map(s => s.trim()).filter(Boolean);

    return {
      slug: slug ? String(slug) : "",
      title: String(title),
      summary: String(summary),
      date: String(date),
      updated: String(updated),
      minutes: minutes == null ? null : Number(minutes),
      categories,
    };
  }

  async function fetchPosts() {
    // iPhone/Cloudflare のキャッシュで「反映遅い」体感が出やすいので軽い bust を入れる
    const bust = `v=${Date.now()}`;
    const res = await fetch(`${POSTS_URL}?${bust}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch posts.json: ${res.status}`);
    const json = await res.json();

    const rawList = Array.isArray(json) ? json : (json.posts ?? json.items ?? []);
    const posts = rawList.map(normalizePost).filter(p => p.slug && p.title);

    // 日付で降順。date が無い場合は末尾へ。
    posts.sort((a, b) => {
      const ad = a.date ? Date.parse(a.date) : 0;
      const bd = b.date ? Date.parse(b.date) : 0;
      return bd - ad;
    });

    return posts;
  }

  function postUrl(slug) {
    // 記事URLは /articles/<slug>/ に統一（Cloudflare Pages なら index.html を省略できる）
    return `/articles/${encodeURIComponent(slug)}/`;
  }

  function renderPostCard(p) {
    const cats = (p.categories || []).slice(0, 3).map(c => {
      const label = escapeHtml(c);
      // いまは topic ページは静的なままでもOK。後で topics 連動する。
      const href = `/topics/#${encodeURIComponent(c)}`;
      return `<a class="tag" href="${href}">${label}</a>`;
    }).join("");

    const metaParts = [];
    if (p.updated) metaParts.push(`更新: ${escapeHtml(formatDateISOToJP(p.updated))}`);
    else if (p.date) metaParts.push(`更新: ${escapeHtml(formatDateISOToJP(p.date))}`);
    if (Number.isFinite(p.minutes) && p.minutes > 0) metaParts.push(`読了目安: ${escapeHtml(p.minutes)}分`);

    const meta = metaParts.length ? `<div class="post-meta">${metaParts.join(" ・ ")}</div>` : "";

    const summary = p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : "";

    return `
      <article class="post-card">
        <h2 class="post-title">
          <a href="${postUrl(p.slug)}">${escapeHtml(p.title)}</a>
        </h2>
        ${meta}
        ${summary}
        ${cats ? `<div class="post-tags">${cats}</div>` : ""}
      </article>
    `.trim();
  }

  function mountArticlesList(posts) {
    const el = document.getElementById("js-articles-list");
    if (!el) return;

    if (!posts.length) {
      el.innerHTML = `<p>記事がまだありません。</p>`;
      return;
    }

    el.innerHTML = posts.map(renderPostCard).join("\n");
  }

  function mountLatestPosts(posts) {
    const el = document.getElementById("js-latest-posts");
    if (!el) return;

    const limitAttr = el.getAttribute("data-limit");
    const limit = limitAttr ? Math.max(1, Number(limitAttr)) : 5;

    const list = posts.slice(0, limit);
    if (!list.length) {
      el.innerHTML = `<p>まだ記事がありません。</p>`;
      return;
    }

    el.innerHTML = `
      <div class="post-list">
        ${list.map(renderPostCard).join("\n")}
      </div>
    `.trim();
  }

  function mountTopicsList(posts) {
    const el = document.getElementById("js-topics-list");
    if (!el) return;

    // 集計
    const map = new Map(); // topic -> count
    for (const p of posts) {
      for (const c of (p.categories || [])) {
        map.set(c, (map.get(c) || 0) + 1);
      }
    }

    const topics = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    if (!topics.length) {
      el.innerHTML = `<p>カテゴリがまだありません。</p>`;
      return;
    }

    el.innerHTML = `
      <ul class="topic-list">
        ${topics.map(t => {
          const label = escapeHtml(t.name);
          const href = `/topics/#${encodeURIComponent(t.name)}`;
          return `<li><a href="${href}">${label}</a> <span class="topic-count">(${t.count})</span></li>`;
        }).join("\n")}
      </ul>
    `.trim();
  }

  async function init() {
    try {
      const posts = await fetchPosts();

      // “入れ物”があるページだけ描画される
      mountArticlesList(posts);
      mountLatestPosts(posts);
      mountTopicsList(posts);
    } catch (e) {
      // 壊れたときに静かに死ぬより、最低限のエラーを出す
      console.error(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
