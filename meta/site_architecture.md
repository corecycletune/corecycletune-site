<!-- File: meta/site_architecture.md -->

# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは、CCT Lab の「現行のサイト構造」と「運用ルール」を忘れないための唯一の記録です。  
構造を変えるときは **必ずこのファイルも同時に更新**します（類似ファイルは増やしません）。

---

## 1) 現行のディレクトリ構造（実ファイルに一致）
~~~text
/
  index.html
  README.md

  about/
    index.html

  articles/
    index.html
    sample-001/
      index.html

  assets/
    app.js
    style.css

  data/
    posts.json

  disclaimer/
    index.html

  meta/
    site_architecture.md

  prompts/
    article_template.md
    base_cct_concept.md

  topics/
    index.html
~~~

---

## 2) URL ルール（静的サイトの基本）

- フォルダ配下は `index.html` に統一（URLが綺麗になる）
  - `/about/` → `about/index.html`
  - `/articles/sample-001/` → `articles/sample-001/index.html`
- ルートは `/index.html`

---

## 3) 役割まとめ（どれが何をするか）

### 3.1 画面（HTML）
- `index.html`：トップページ（入口）
- `about/index.html`：サイトについて（方針・説明）
- `disclaimer/index.html`：免責
- `topics/index.html`：カテゴリ/トピック一覧（入口）
- `articles/index.html`：記事一覧（入口）
- `articles/<slug>/index.html`：記事本文

### 3.2 見た目（CSS）
- `assets/style.css`：全ページ共通のスタイル（青緑〜エメラルド寄りの方向性）

### 3.3 振る舞い（JS）
- `assets/app.js`：全ページ共通で読み込む（軽いCMS的な役割を担う）
  - 記事一覧の生成
  - 関連リンク等の自動化（今後拡張）

### 3.4 データ
- `data/posts.json`：記事メタ情報のソース（一覧生成・カテゴリ分け等に使用）
  - ここが「記事一覧の台帳（index）」になる

### 3.5 生成用プロンプト（将来の自動化のために保存）
- `prompts/base_cct_concept.md`：CCTのベースコンセプト（全記事の前提）
- `prompts/article_template.md`：記事テンプレ（構成・SEO・読みやすさ方針）

---

## 4) 運用ルール（迷ったらここ）

### 4.1 新規ファイルを増やす判断基準
- 原則：**増やさない**
- 例外：明確に役割が違う場合のみ
- 「似た目的のファイル」は絶対に量産しない（混乱の元）

### 4.2 記事を1本追加する手順（現行）
1. `articles/<slug>/index.html` を作る（slugは英小文字＋ハイフン推奨）
2. `data/posts.json` に1件追記（タイトル、slug、topics、date など）
3. トップ/一覧が `posts.json` を参照して自動表示されるようにする（app.js 側で対応）

※記事内の「関連記事リンク」を手作業で増やさない方向で設計する（app.js + posts.json で寄せる）

---

## 5) 変更履歴（このファイルの更新理由を残す）

- 2026-03-03: 構造を「posts.json + app.js で軽いCMS化」する方針を採用し、`data/posts.json` と `assets/app.js` を中核に位置付けた。
- 2026-03-03: 生成用プロンプトを `prompts/` に集約（`base_cct_concept.md`, `article_template.md`）。
