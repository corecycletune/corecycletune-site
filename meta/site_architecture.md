<!-- File: meta/site_architecture.md -->

# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは、CCT Lab の **現行のサイト構造** と **運用ルール** を忘れないための唯一の記録です。  
構造を変えるときは **必ずこのファイルも同時に更新**します（類似ファイルは増やしません）。

---

## 0) Base URL（このサイトの正）

- https://corecycletune.com

※ sitemap.xml などの絶対URL生成に使用する

---

## 1) 採用する構造方針（最重要）

CCT Lab は、今後の自動化・広告差し込み・テンプレ共通化を見据えて、以下の3層構造を採用する。

### 1.1 Source（記事の元データ）
- 記事本文は Markdown を正とする
- 記事メタ情報も記事ソース側に持つ
- Source の置き場は `articles_src/`

### 1.2 Build（生成工程）
- Markdown を HTML に変換する
- 共通テンプレに流し込む
- `posts.json` を生成する
- `sitemap.xml` を生成する

### 1.3 Published（公開物）
- 公開される記事は `articles/<slug>/index.html`
- サイトが参照するのは公開HTMLと `data/posts.json`

---

## 2) 現行〜移行後のディレクトリ構造

今後の正とする構造は以下。

    /
      index.html
      README.md
      sitemap.xml
      robots.txt

      .github/
        workflows/
          generate-posts.yml

      about/
        index.html

      articles/
        index.html
        post-meal-sleepiness/
          index.html

      articles_src/
        post-meal-sleepiness/
          article.md

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
        build_article.js
        generate_posts.js
        generate_sitemap.js

      templates/
        article.html

      topics/
        index.html

---

## 3) URLルール（静的サイトの基本）

- フォルダ配下は `index.html` に統一（URLが綺麗になる）
  - `/about/` → `about/index.html`
  - `/articles/post-meal-sleepiness/` → `articles/post-meal-sleepiness/index.html`
- ルートは `/index.html`
- 記事URLは必ず `/articles/<slug>/` 形式に統一する
- slug は英小文字 + ハイフン（kebab-case）を基本とする

---

## 4) 役割まとめ（どれが何をするか）

### 4.1 Source（記事の元データ）

#### `articles_src/<slug>/article.md`
- 記事本文の正本
- 今後のAI生成対象
- 人間が読み書きしやすい形式
- front matter または先頭メタブロックを持つ想定

このファイルが **記事内容のSingle Source of Truth** になる。

---

### 4.2 Template（共通HTML構造）

#### `templates/article.html`
- 記事ページの共通テンプレ
- head 要素
- OGP基本構造
- アイキャッチ表示枠
- 計測タグ挿入位置
- 広告挿入位置
- 関連記事枠
- 共通フッター構造

ここに以下を集約する。

- Search Console verification
- Analytics
- AdSense
- Amazon導線
- 構造化データの挿入位置
- 共通UI

※記事ごとに重複して持たない

---

### 4.3 Published（公開HTML）

#### `articles/<slug>/index.html`
- 公開される完成HTML
- Source と Template を元に build された成果物
- ブラウザが実際に読むページ

※このファイルは **出力物** であり、将来的には直接手編集しない前提に寄せる

---

### 4.4 見た目（CSS）

#### `assets/style.css`
- 全ページ共通のスタイル

---

### 4.5 振る舞い（JS）

#### `assets/app.js`
- 全ページ共通で読み込む
- 軽いCMS的な役割を担う

主な機能

- ヘッダー/フッター注入
- パンくず生成
- 記事一覧生成（`data/posts.json` をソースに描画）
- 関連記事生成（`data/posts.json` のタグ/カテゴリを使って自動表示）
- トピック一覧の自動生成

---

### 4.6 データ（記事台帳）

#### `data/posts.json`
- 記事メタ情報の **唯一の集約台帳**
- 記事一覧、トップの最新記事、関連記事、カテゴリ表示のソースになる
- 原則として **手でいじらない運用**
- `articles_src` または生成済み記事からスクリプトが自動生成する

※記事本文の正本ではなく、あくまで「台帳」

---

### 4.7 自動生成（GitHub Actions + Node）

#### `.github/workflows/generate-posts.yml`
- リポジトリ内の状態から `data/posts.json` と `sitemap.xml` を生成/更新するワークフロー

#### `scripts/build_article.js`
- `articles_src/<slug>/article.md` を HTML に変換
- `templates/article.html` に差し込む
- `articles/<slug>/index.html` を生成する

#### `scripts/generate_posts.js`
- 記事メタを集約して `data/posts.json` を生成する

#### `scripts/generate_sitemap.js`
- `data/posts.json` を読み、`sitemap.xml` を生成する

#### `sitemap.xml`
- 検索エンジン向けのサイトマップ
- 記事追加に追随して自動更新される

#### `robots.txt`
- sitemap の場所を検索エンジンに知らせる

---

### 4.8 生成用プロンプト（将来の自動化のために保存）

#### `prompts/base_cct_concept.md`
- CCTのベースコンセプト（全記事の前提）

#### `prompts/article_structure.md`
- 記事構造テンプレ
- 見出し設計
- ブロック役割

#### `prompts/generate_article.md`
- 記事生成の実行プロンプト
- 将来的には Markdown source を返す前提に寄せる

---

## 5) 重複・過不足の整理

### 5.1 解消したい重複

#### ① 記事本文の重複
現状  
- `articles/<slug>/index.html` が source 兼 output になっている

問題  
- テンプレ変更時に全記事修正が必要
- 広告/計測差し込み位置が記事ごとにバラつく
- AI生成との相性が悪い

解決  
- `articles_src/<slug>/article.md` を source
- `articles/<slug>/index.html` を output に分離

---

#### ② 記事メタの重複
現状  
- HTML内コメント
- `posts.json`
の両方に存在しやすい

解決  
- Source 側メタを正とする
- `posts.json` は生成物とする

---

### 5.2 不足していたもの

#### ① テンプレ責務
- アイキャッチ
- 広告
- Analytics
- Search Console
- OGP
をどこで持つか不明瞭だった

解決  
- `templates/article.html` に集約する

#### ② ビルド工程
Markdown → HTML の流れが未定義だった

解決  
- `scripts/build_article.js` を追加する前提を明記

#### ③ robots.txt
検索エンジン向け導線が未定義だった

解決  
- ルート直下に配置する

---

## 6) 運用ルール（迷ったらここ）

### 6.1 新規ファイルを増やす判断基準
- 原則：増やさない
- 例外：明確に役割が違う場合のみ
- 「似た目的のファイル」は絶対に量産しない（混乱の元）
- サイト構造の記録は **meta/site_architecture.md のみ**（Single Source of Truth）

---

### 6.2 記事を1本追加する手順（今後の正）

1. `articles_src/<slug>/article.md` を追加
2. `scripts/build_article.js` で `articles/<slug>/index.html` を生成
3. `scripts/generate_posts.js` で `data/posts.json` を更新
4. `scripts/generate_sitemap.js` で `sitemap.xml` を更新
5. サイト側は `assets/app.js` が `data/posts.json` を読んで自動反映する
   - トップの「最新記事」
   - 記事一覧
   - カテゴリ一覧
   - 記事ページの関連記事

※記事内の「関連記事リンク」を手作業で増やさない  
※テンプレ内の広告や計測タグは記事側に重複して書かない

---

### 6.3 しばらくの暫定運用

完全移行までは、既存の `articles/<slug>/index.html` を手動で増やしてよい。  
ただし将来的には以下に寄せる。

- source は Markdown
- HTMLは生成物
- `posts.json` は生成物
- `sitemap.xml` は生成物

---

## 7) 変更履歴（このファイルの更新理由を残す）

- 2026-03-03: `data/posts.json + assets/app.js` を中核にして軽いCMS化を採用。
- 2026-03-xx: プロンプト構成を整理（`prompts/article_structure.md`, `prompts/generate_article.md` を追加し、テンプレ/生成の役割を分離）。
- 2026-03-xx: `scripts/generate_posts.js` と GitHub Actions（`.github/workflows/generate-posts.yml`）による posts.json 自動生成を運用に組み込み。
- 2026-03-xx: カテゴリ（タグ）自動登録を必須要件として明記（記事追加→自動集計→表示までを一貫させる）。
- 2026-03-xx: `scripts/generate_sitemap.js` と `sitemap.xml` を追加し、サイトマップを記事追加に追随して自動更新する構成を採用。
- 2026-03-xx: 将来の広告・計測・アイキャッチ共通化を見据え、`articles_src/` と `templates/` を導入する方針に整理。
