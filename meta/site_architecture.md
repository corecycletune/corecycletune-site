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

CCT Lab は今後の **AI記事生成・アイキャッチ自動取得・テンプレ共通化** を見据え、  
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

加えて、必要に応じてアイキャッチ情報を Source に補完する。

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
    <slug>/
      index.html

  articles_src/
    _template/
      article.md
    <slug>/
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
    fetch_eyecatch.js
    generate_posts.js
    generate_sitemap.js

  templates/
    article.html

  topics/
    index.html

---

# 3) URLルール

フォルダURLは index.html に統一する。

例

/about/
/articles/<slug>/

slug ルール

- 英小文字
- ハイフン区切り
- kebab-case

記事URLは必ず以下に統一する。

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
- eyecatchQuery
- eyecatch
- eyecatchAlt
- eyecatchPhotoBy
- eyecatchPhotoUrl
- eyecatchSourceUrl

ここが **記事内容と記事メタの唯一の正本**

重要

- 人間が最初に書くのは基本 `eyecatchQuery`
- `eyecatch` 以下の確定値は自動補完される前提

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

全ページ共通の基本スタイル。

重要

- 見た目の責務は **assets/style.css に集約**する
- 記事用コンポーネントのスタイルもここで管理する
- `build_article.js` は見た目を埋め込まず、構造だけを生成する

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

- 手編集しない
- 生成元は `articles_src/<slug>/article.md`
- HTML は読まない
- Source のみを入力とする

---

# 5) Build Scripts

## fetch_eyecatch.js

入力

articles_src/<slug>/article.md

処理

- `eyecatchQuery` を読む
- Unsplash API で画像を検索する
- 利用規約に沿って採用画像を確定する
- 必要な attribution 情報を取得する
- Source の front matter に以下を書き戻す
  - `eyecatch`
  - `eyecatchAlt`
  - `eyecatchPhotoBy`
  - `eyecatchPhotoUrl`
  - `eyecatchSourceUrl`

出力

articles_src/<slug>/article.md を更新

重要

- 画像取得の責務はこのファイルに集約する
- `build_article.js` に API 呼び出しを入れない
- 将来的に AI を導入する場合も、検索語生成の入口はここに寄せる

---

## build_article.js

入力

articles_src/<slug>/article.md

処理

- front matter 解析
- Markdown → HTML
- templates/article.html へ差し込み
- canonical / OGP / JSON-LD を埋め込み
- HTML先頭にメタコメントを付与
- 専用構文を解釈して記事用コンポーネントへ変換する
- 確定済みのアイキャッチ情報をHTMLに出力する
- アイキャッチの `photo-credit` は `figure` の外側に出力する

出力

articles/<slug>/index.html

補足

- `_` で始まるディレクトリは除外する
- `articles_src/_template/` は build対象外
- 現在の専用構文として `[cct-cycle type="dissonance"] ... [/cct-cycle]` を解釈する
- 現在の専用構文として `[cct-cycle type="resolution"] ... [/cct-cycle]` を解釈する
- `cct-cycle` は循環図用の専用オブジェクトとしてHTML/SVGへ変換される
- `type="dissonance"` は悪循環の見た目で表示する
- `type="resolution"` は好循環の見た目で表示する
- 現在の専用構文として `[paper-summary] ... [/paper-summary]` を解釈する
- `paper-summary` は論文概要カード用のHTMLへ変換される
- 現在の専用構文として `[quote] ... [/quote]` を解釈する
- `quote` は英語引用＋日本語訳のカードブロックへ変換される
- 最後の行が `（` で始まり `）` で終わる場合、日本語訳として分離してスタイルを変える
- 見た目のCSSは埋め込まず、クラス名だけを出力する
- 外部APIは呼ばない

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

# 6) Markdown対応範囲

現行の `build_article.js` で対応している主な要素

- 見出し
  - `#`
  - `##`
  - `###`
- 段落
- 箇条書き
  - `- `
- 引用
  - `> `
- 太字
  - `**text**`
- 斜体
  - `*text*`
- インラインコード
  - `` `code` ``
- 専用構文
  - `[cct-cycle type="dissonance"] ... [/cct-cycle]`
  - `[cct-cycle type="resolution"] ... [/cct-cycle]`
  - `[paper-summary] ... [/paper-summary]`
  - `[quote] ... [/quote]`

未保証または未対応として扱うもの

- 表
- 番号付きリスト
- 画像Markdown記法
- 脚注記法
- 深いネスト
- 複雑な埋め込み

重要

記事は **現行buildが対応しているMarkdown範囲** に収める。

---

# 7) 検索エンジン

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

# 8) プロンプト保存

prompts/

目的

AI記事生成の設計保存

---

## base_cct_concept.md

循環調律（コアサイクルチューン）の思想辞書

---

## article_structure.md

記事構造設計

- 見出し設計
- ブロック役割
- 記事の流れ
- 表現ルール

---

## generate_article.md

記事生成プロンプト

AIは最終的に

articles_src/<slug>/article.md

形式で出力する。

---

# 9) 記事追加手順

1  
articles_src/<slug>/article.md 作成

2  
必要なら `eyecatchQuery` を書く

3  
fetch_eyecatch.js 実行

4  
build_article.js 実行

5  
generate_posts.js 実行

6  
generate_sitemap.js 実行

7  
commit

---

# 10) 記事削除手順

1  
articles_src/<slug>/ を削除

2  
articles/<slug>/ を削除

3  
commit

4  
workflow により posts.json / sitemap.xml を更新

重要

- Source だけ消しても公開HTMLが残る場合がある
- 記事削除時は **source と output の両方** を削除する

---

# 11) Single Source of Truth

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

見た目  
assets/style.css

---

# 12) ファイル増殖防止ルール

似た役割のファイルを増やさない。

構造説明は

meta/site_architecture.md

のみ。

記事構造の説明と記事雛形は役割を分ける。

- `prompts/article_structure.md`
  - 設計書
- `articles_src/_template/article.md`
  - 実物の雛形

見た目の責務も分ける。

- `assets/style.css`
  - 見た目
- `build_article.js`
  - 構造生成

画像取得の責務も分ける。

- `fetch_eyecatch.js`
  - アイキャッチ取得と確定
- `build_article.js`
  - 確定済みデータのHTML化

---

# 13) 変更履歴

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

2026-03-xx  
`[paper-summary]` を専用構文として導入

2026-03-xx  
記事用コンポーネントの見た目責務を `assets/style.css` に集約

2026-03-xx  
`eyecatchQuery` を導入し、`fetch_eyecatch.js` にアイキャッチ取得責務を分離

2026-03-xx  
`cct-cycle` を後半のCCTパート専用に再定義し、`type="dissonance"` / `type="resolution"` を導入

2026-03-17  
アイキャッチの `photo-credit` を `figure` 外へ移動し、`overflow: hidden` によるクリップを解消

2026-03-17  
`[quote] ... [/quote]` を専用構文として導入。英語引用＋日本語訳のカードブロックへ変換。`.article-quote` 系クラスを `assets/style.css` に追加

---

# 9) Git運用ルール

## 9.1 安定版ブランチ

`main` は公開中サイトの安定版ブランチとして扱う。

重要

- いきなり `main` でデザイン変更を始めない
- 戻し先として `main` を残す
- 公開反映の基準は原則 `main`

---

## 9.2 作業ブランチ

大きめの見た目変更、導線整理、実験的なUI変更は作業ブランチで行う。

今回のデザイン改修用ブランチ

- `design/refresh-ui`

重要

- デザイン修正は原則このブランチで行う
- 崩れた場合でも `main` を見れば安定状態に戻れる
- 作業内容が固まってから `main` へ統合する

---

## 9.3 この運用を採用する理由

CCT Lab はスマホ中心で作業することが多く、  
大きめのデザイン修正では「一度触ってみて戻す」可能性が高い。

そのため、公開中の安定状態と作業中の試行錯誤を分離するために、

- `main` = 安定版
- 作業ブランチ = 検証版

の運用を採用する。

これは破壊的変更を避けるための運用ルールであり、  
SSOT を壊さず安全に見た目改善を進めるための前提とする。
