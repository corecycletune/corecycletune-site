<!-- File: meta/site_architecture.md -->

# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは、CCT Lab の「現行のサイト構造」と「運用ルール」を忘れないための唯一の記録です。  
構造を変えるときは **必ずこのファイルも同時に更新**します（類似ファイルは増やしません）。

---

# 1) 現行のディレクトリ構造（実ファイルに一致）

/
  index.html
  README.md

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
    generate_article.md
    article_structure.md
    base_cct_concept.md

  topics/
    index.html

---

# 2) URL ルール（静的サイトの基本）

フォルダ配下は index.html に統一する。

例

/about/ → about/index.html  
/articles/post-meal-sleepiness/ → articles/post-meal-sleepiness/index.html  
/topics/ → topics/index.html  

ルート

/ → index.html  

---

# 3) 役割まとめ（どれが何をするか）

## 3.1 画面（HTML）

index.html  
トップページ（入口）

about/index.html  
サイト説明

disclaimer/index.html  
免責

articles/index.html  
記事一覧（入口）

articles/<slug>/index.html  
記事本文

topics/index.html  
カテゴリ一覧（入口）＋カテゴリ別記事一覧（動的表示）

---

## 3.2 見た目（CSS）

assets/style.css  
全ページ共通のスタイル（青緑〜エメラルド方向）

---

## 3.3 振る舞い（JS）

assets/app.js  
全ページ共通で読み込み、軽いCMSの役割を担う。

主な機能

・ヘッダー挿入  
・フッター挿入  
・パンくず生成  
・最新記事生成  
・記事一覧生成  
・関連記事生成  
・カテゴリ自動生成  
・カテゴリ別の記事一覧を動的に表示（/topics/?t=...）

---

## 3.4 データ（SSOT）

data/posts.json  
記事メタデータの唯一のソース（Single Source of Truth）

app.js が posts.json を読み込み

・トップ  
・記事一覧  
・カテゴリ一覧  
・カテゴリ別記事一覧  
・関連記事  
・パンくず（記事タイトル表示）

を生成する。

---

## 3.5 生成用プロンプト

prompts/base_cct_concept.md  
CCTの思想（全記事共通の前提）

prompts/article_structure.md  
記事の構造テンプレート

prompts/generate_article.md  
記事生成ルール（SEO・研究引用・見出しルール）

---

# 4) 運用ルール

## 4.1 新規ファイルを増やす判断基準

原則：増やさない  
例外：役割が明確に違う場合のみ  
禁止：同用途ファイルの量産（混乱の元）

---

## 4.2 記事を1本追加する手順（現行）

1. articles/<slug>/index.html を作る（slugは英小文字＋ハイフン推奨）
2. data/posts.json に1件追記（title, path, tags/topics/category, updated, description 等）
3. app.js が自動で以下を反映する
   ・トップ最新
   ・記事一覧
   ・カテゴリ一覧
   ・カテゴリ別記事一覧（/topics/?t=...）
   ・関連記事
   ・パンくず

---

# 5) 変更履歴

2026-03-03  
posts.json + app.js による軽量CMS型静的サイトを採用。

2026-03-04  
カテゴリは posts.json の tags/topics/category から自動生成し、/topics/?t=... でカテゴリ別の記事一覧を動的表示する方式に更新。
