# CCT Lab｜サイト構造（Single Source of Truth）

このファイルは「サイトの現状の構造」を忘れないための **唯一の正本**です。  
構造に変更が入った場合は、必ずこのファイルも同時に更新します（同種ファイルの増殖は禁止）。

---

## 0. 目的（このサイトは何をするか）

- 公開論文・一次情報を土台に、日常行動へ翻訳する「個人研究ラボ」サイト
- 医療助言はしない（免責を明記）
- 記事は「読む人が迷わない」ことを優先（造語・略語は記事本文で使わない）
- 将来的に自動化（AI生成）を見据え、**静的サイト＋最小JSでCMSっぽく**運用する

---

## 1. デプロイ（現状）

- GitHub のリポジトリを Cloudflare（Workers & Pages）へ接続
- GitHub へ commit すると Cloudflare が自動デプロイ
- 公開URLは `corecycletune.com`

---

## 2. ディレクトリ構造（現状）

リポジトリ直下に以下が存在する（※ GitHub上の表示に準拠）。

- `index.html`（トップページ）
- `README.md`

フォルダ：

- `about/`
- `articles/`
- `assets/`
- `data/`
- `disclaimer/`
- `meta/`
- `prompts/`
- `topics/`

---

## 3. ルーティング規約（重要）

- **各ページは「フォルダ＋index.html」** で作る  
  例：`/articles/` は `articles/index.html`  
  例：個別記事は `articles/<slug>/index.html`
- URLは「フォルダ名」がそのままパスになる  
  例：`/articles/sample/` は `articles/sample/index.html`

---

## 4. 共通アセット

- `assets/style.css`：全ページ共通CSS
- `assets/app.js`：全ページ共通JS（CMS風の自動生成担当）

### 4.1 app.js 読み込み（現状）
- **全HTMLで `assets/app.js` を読み込むのは完了（A完了）**

---

## 5. “CMSっぽくする”方針（静的＋小JS）

目的：
- 記事一覧、カテゴリ一覧、関連記事などを **手作業で毎回編集しない**  
- 「構造（HTML）」と「本文（Markdown/テキスト）」を分離して、将来のAI自動生成コスト（トークン）を抑える

現状（方針）：
- HTML側には **差し込み口（placeholder）** を置く
- `assets/app.js` が `data/` の情報から一覧やリンクを生成して差し込む

---

## 6. HTML側に置く “差し込み口” の規約（B〜F）

### 6.1 全ページ共通（B）
各HTMLの `<body>` 内に、以下の差し込み口を置く：
- `<div id="site-header"></div>`：`<body>`直後（`<main>`より上）
- `<div id="site-footer"></div>`：`</body>`直前

目的：
- ヘッダー/フッターの共通化（同じ内容を全ページに手で貼らない）

---

### 6.2 トップページ（C）
対象：`index.html`

トップの適切な位置に以下を置く：
- カテゴリ一覧：`<div id="js-category-list"></div>`
- 最新記事：`<div id="js-latest-articles"></div>`

目的：
- カテゴリや最新記事の更新をJS側で完結させる

---

### 6.3 記事一覧ページ（D）
対象：`articles/index.html`

`<main>`内の適切な位置に以下を置く：
- `<div id="js-articles-list" data-scope="all"></div>`

目的：
- 全記事一覧を自動生成する

---

### 6.4 カテゴリ別ページ（E）
対象：`topics/<topic>/index.html`（topics配下の各カテゴリページ）

`<main>`内の適切な位置に以下を置く：
- `<div id="js-topic-articles" data-topic="<topic>"></div>`
  - 例：睡眠なら `data-topic="sleep"`

目的：
- カテゴリ別の記事一覧を自動生成する

---

### 6.5 個別記事ページ（F）
対象：`articles/<slug>/index.html`（個別記事すべて）

記事テンプレに以下の差し込み口を置く（位置は推奨）：

- パンくず：`<div id="js-breadcrumb"></div>`（タイトルの上）
- 記事メタ：`<div id="js-article-meta"></div>`（リード文の下）
- 関連研究：`<aside id="js-research-box"></aside>`（本文の途中：研究要約枠）
- 関連記事：`<div id="js-related-articles"></div>`（本文末尾）

目的：
- パンくず、メタ情報、研究要約、関連記事の自動生成

---

## 7. データ（data/）の位置づけ（予定）

- 記事一覧やカテゴリの「正」は `data/` 配下のデータ（JSON等）に寄せる
- `app.js` は `data/` を読んで一覧・リンクを生成する

（※ 具体ファイル名や形式は、確定したらこのファイルに追記する）

---

## 8. 更新ルール（運用）

- 構造を変えたら **必ずこのファイルも同時に更新**
- 同目的のメモファイルを増やさない（ここだけが正）
- 変更した場合、コミットメッセージ or 会話内で
  - 「何を」「どこに」「なぜ」変えたかを必ず明記する

---

## 9. 現在の確認ポイント（実態一致チェック用）

このファイルの内容と、GitHub上の実ファイルが一致しているか確認するチェックリスト：

- [ ] ルート直下に `index.html` がある
- [ ] フォルダ：`about/ articles/ assets/ data/ disclaimer/ meta/ prompts/ topics/` がある
- [ ] `assets/app.js` が存在する
- [ ] 全ページのHTMLで `assets/app.js` を読み込んでいる（A完了）
- [ ] これから差し込み口（B〜F）を順次追加していく（未完了なら未完了でOK）

（差し込み口を入れ終えたら、ここも更新して「完了」にする）
