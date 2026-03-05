<!-- File: meta/site_architecture.md -->

# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは、CCT Lab の **現行のサイト構造** と **運用ルール** を忘れないための唯一の記録です。  
構造を変えるときは **必ずこのファイルも同時に更新**します（類似ファイルは増やしません）。

---

## 0) Base URL（このサイトの正）

- https://corecycletune.com

※ sitemap.xml などの絶対URL生成に使用する

---

## 1) 現行のディレクトリ構造（実ファイルに一致）

※GitHub 上の現状（あなたのスクショ）に合わせた構造です。

    /
      index.html
      README.md
      sitemap.xml

      .github/
        workflows/
          generate-posts.yml

      about/
        index.html

      articles/
        index.html
        post-meal-sleepiness/
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
        base_cct_concept.md
        article_structure.md
        generate_article.md

      scripts/
        generate_posts.js
        generate_sitemap.js

      topics/
        index.html

---

## 2) URLルール（静的サイトの基本）

- フォルダ配下は `index.html` に統一（URLが綺麗になる）
  - `/about/` → `about/index.html`
  - `/articles/post-meal-sleepiness/` → `articles/post-meal-sleepiness/index.html`
- ルートは `/index.html`

---

## 3) 役割まとめ（どれが何をするか）

### 3.1 画面（HTML）
- `index.html`：トップページ（入口）
- `about/index.html`：サイトについて（方針・説明）
- `disclaimer/index.html`：免責
- `topics/index.html`：カテゴリ一覧（入口）
- `articles/index.html`：記事一覧（入口）
- `articles/<slug>/index.html`：記事本文

### 3.2 見た目（CSS）
- `assets/style.css`：全ページ共通のスタイル

### 3.3 振る舞い（JS）
- `assets/app.js`：全ページ共通で読み込む（軽いCMS的な役割）
  - ヘッダー/フッター注入
  - パンくず生成
  - 記事一覧生成（`data/posts.json` をソースに描画）
  - 関連記事（`data/posts.json` のタグ/カテゴリを使って自動表示）

### 3.4 データ（記事台帳）
- `data/posts.json`：記事メタ情報の **唯一の台帳（index）**
  - 記事一覧、トップの最新記事、関連記事、カテゴリ表示のソースになる
  - 原則として **手でいじらない運用**（下の自動生成で更新）

### 3.5 自動生成（GitHub Actions + Node）
- `.github/workflows/generate-posts.yml`
  - リポジトリ内の状態から `data/posts.json` と `sitemap.xml` を生成/更新するワークフロー
- `scripts/generate_posts.js`
  - `data/posts.json` を生成する実体（Nodeスクリプト）
  - 記事追加時の「カテゴリ（タグ）」もここで自動集計して `posts.json` に反映する（カテゴリ自動登録は必須要件）
- `scripts/generate_sitemap.js`
  - `data/posts.json` を読み、`sitemap.xml` を生成する実体
- `sitemap.xml`
  - 検索エンジン向けのサイトマップ（記事追加に追随して自動更新される）

### 3.6 生成用プロンプト（将来の自動化のために保存）
- `prompts/base_cct_concept.md`：CCTのベースコンセプト（全記事の前提）
- `prompts/article_structure.md`：記事構造テンプレ（見出し設計・SEO語句・各ブロックの役割）
- `prompts/generate_article.md`：記事生成の「実行プロンプト」（上2つを参照して本文を作る）

---

## 4) 運用ルール（迷ったらここ）

### 4.1 新規ファイルを増やす判断基準
- 原則：増やさない
- 例外：明確に役割が違う場合のみ
- 「似た目的のファイル」は絶対に量産しない（混乱の元）
- サイト構造の記録は **meta/site_architecture.md のみ**（Single Source of Truth）

### 4.2 記事を1本追加する手順（現行）
1. `articles/<slug>/index.html` を追加（slugは英小文字＋ハイフン推奨）
2. `scripts/generate_posts.js`（＋workflow）で `data/posts.json` を更新
3. `scripts/generate_sitemap.js`（＋workflow）で `sitemap.xml` を更新
4. サイト側は `assets/app.js` が `data/posts.json` を読んで自動反映する
   - トップの「最新記事」
   - 記事一覧
   - カテゴリ一覧
   - 記事ページの関連記事

※記事内の「関連記事リンク」を手作業で増やさない（`app.js + posts.json` に寄せる）

---

## 5) 変更履歴（このファイルの更新理由を残す）

- 2026-03-03: `data/posts.json + assets/app.js` を中核にして軽いCMS化を採用。
- 2026-03-xx: プロンプト構成を整理（`prompts/article_structure.md`, `prompts/generate_article.md` を追加し、テンプレ/生成の役割を分離）。
- 2026-03-xx: `scripts/generate_posts.js` と GitHub Actions（`.github/workflows/generate-posts.yml`）による posts.json 自動生成を運用に組み込み。
- 2026-03-xx: カテゴリ（タグ）自動登録を必須要件として明記（記事追加→自動集計→表示までを一貫させる）。
- 2026-03-xx: `scripts/generate_sitemap.js` と `sitemap.xml` を追加し、サイトマップを記事追加に追随して自動更新する構成を採用（Base URL: https://corecycletune.com）。
