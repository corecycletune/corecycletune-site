<!-- File: meta/site_architecture.md -->

# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは、CCT Lab の **現行のサイト構造** と **運用ルール** を忘れないための唯一の記録です。  
構造を変えるときは **必ずこのファイルも同時に更新**します（類似ファイルは増やしません）。

---

# 0) Base URL（このサイトの正）

https://corecycletune.com

※ canonical URL / sitemap.xml / robots.txt などの絶対URL生成に使用する

---

# 1) 採用する構造方針（最重要）

CCT Lab は今後の **AI記事生成・広告挿入・テンプレ共通化** を見据え、  
以下の **3層構造** を採用する。

---

## 1.1 Source（記事の元データ）

記事の **唯一の正本**

articles_src/<slug>/article.md

役割

- 記事本文
- 記事メタ
- AI生成対象
- 人間が編集する対象

このファイルが **記事内容と記事メタの Single Source of Truth** になる。

---

## 1.2 Build（生成工程）

Source を元に以下を生成する。

- HTML記事
- posts.json
- sitemap.xml

---

## 1.3 Published（公開物）

公開されるファイル

articles/<slug>/index.html

サイトが実際に参照するデータ

data/posts.json

---

# 2) ディレクトリ構造（現行）

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
    walking-creativity/
      index.html
    nature-brain-recovery/
      index.html

  articles_src/
    _template/
      article.md
    post-meal-sleepiness/
      article.md
    walking-creativity/
      article.md
    nature-brain-recovery/
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

# 3) URLルール

フォルダURLは index.html に統一

例

/about/
/articles/post-meal-sleepiness/

slugルール

英小文字 + ハイフン  
kebab-case

記事URLは必ず以下に統一する

/articles/<slug>/

---

# 4) 各コンポーネントの責務

## 4.1 記事Source

articles_src/<slug>/article.md

内容

- 記事本文
- 記事メタ
- tags
- topics
- category
- updated
- readingTime
- eyecatch

ここが **記事内容と記事メタの唯一の正本**

---

## 4.2 記事雛形

articles_src/_template/article.md

役割

- 人間用・AI用の雛形
- 記事フォーマットの見本
- 実記事を作る時のテンプレ

重要

- build対象ではない
- posts.json 生成対象ではない
- `_` で始まるディレクトリは source の補助用途として扱う

---

## 4.3 テンプレート

templates/article.html

役割

記事ページの **静的HTMLテンプレート**

含むもの

- title
- description
- robots meta
- canonical
- OGP
- Twitter Card
- JSON-LD 差し込み口
- アイキャッチ表示枠
- 関連記事表示枠
- 共通フッター構造

将来的にここへ集約するもの

- Analytics
- AdSense
- Search Console verification
- Amazon導線
- 共通UI

重要

- 静的構造のみを持つ
- 記事ごとに重複させない

---

## 4.4 公開HTML

articles/<slug>/index.html

これは

article.md + article.html

から生成された **出力物**

原則

直接編集しない

---

## 4.5 CSS

assets/style.css

全ページ共通のスタイル。

---

## 4.6 JS（軽いCMS機能）

assets/app.js

役割

サイトの **動的描画**

例

- ヘッダー注入
- フッター注入
- パンくず生成
- 記事一覧生成
- 関連記事生成
- トピック一覧生成

データソース

data/posts.json

重要

- `templates/article.html` は静的な器
- `assets/app.js` は動的描画担当
- 役割を混ぜない

---

## 4.7 記事台帳

data/posts.json

役割

記事メタの **集約台帳**

用途

- 記事一覧
- 最新記事
- 関連記事
- トピック一覧

重要

手編集しない

生成元

articles_src/<slug>/article.md

※ HTML は読まない  
※ Source のみを入力とする

---

# 5) Build Scripts

## build_article.js

入力

articles_src/<slug>/article.md

処理

- front matter 解析
- Markdown → HTML
- templates/article.html へ差し込み
- canonical / OGP / JSON-LD を埋め込み
- HTML先頭にメタコメントを付与

出力

articles/<slug>/index.html

補足

- `_` で始まるディレクトリは除外する
- `articles_src/_template/` は build対象外

---

## generate_posts.js

入力

articles_src/*

処理

記事メタ抽出

出力

data/posts.json

補足

- HTMLは読まない
- Sourceのみが入力
- `_` で始まるディレクトリは除外する
- tags / topics / category / readingTime を含める

---

## generate_sitemap.js

入力

data/posts.json

出力

sitemap.xml

補足

- Base URL は https://corecycletune.com
- 記事URL一覧を自動生成する
- sitemap.xml は生成物として扱う

---

# 6) 検索エンジン

## sitemap.xml

検索エンジン用サイトマップ  
自動生成

---

## robots.txt

検索エンジンへの案内

内容

User-agent: *
Allow: /

Sitemap: https://corecycletune.com/sitemap.xml

---

# 7) プロンプト保存

prompts/

目的

AI記事生成の設計保存

---

## base_cct_concept.md

CCTの思想

---

## article_structure.md

記事構造設計

- 見出し設計
- ブロック役割
- 記事の流れ

---

## generate_article.md

記事生成プロンプト

AIは最終的に

articles_src/<slug>/article.md

形式で出力する。

---

# 8) 記事追加手順

1  
articles_src/<slug>/article.md 作成

2  
build_article.js 実行

3  
generate_posts.js 実行

4  
generate_sitemap.js 実行

5  
commit

---

# 9) Single Source of Truth

記事本文  
articles_src/<slug>/article.md

記事メタ  
articles_src/<slug>/article.md

記事台帳  
data/posts.json

サイトマップ  
sitemap.xml

記事HTML  
build生成

構造説明  
meta/site_architecture.md

---

# 10) ファイル増殖防止ルール

似た役割のファイルを増やさない。

構造説明は

meta/site_architecture.md

のみ。

記事構造の説明と記事雛形は役割を分ける。

- `prompts/article_structure.md`
  - 設計書
- `articles_src/_template/article.md`
  - 実物の雛形

---

# 11) 変更履歴

2026-03-03  
軽量CMS構造を採用

2026-03-xx  
Markdown source 分離

2026-03-xx  
posts.json 自動生成

2026-03-xx  
sitemap 自動生成

2026-03-xx  
テンプレート責務を明確化

2026-03-xx  
`articles_src/_template/` を導入し、記事雛形と実記事を分離

2026-03-xx  
`generate_posts.js` は Source のみを読む方針に統一

2026-03-xx  
`build_article.js` / `generate_posts.js` ともに `_` で始まる補助ディレクトリを除外する方針を明記