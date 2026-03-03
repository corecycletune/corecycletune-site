# CCT Lab｜サイト構造管理ファイル

このファイルは、CCT Labの構造を正確に保つための唯一の管理記録である。
設計変更があった場合は必ず本ファイルを更新する。

---

## 1. 現在のコア構造

### 公開領域

index.html
about/index.html
articles/index.html
articles/sample-001/index.html
topics/index.html
disclaimer/index.html

assets/style.css

---

### 非公開設計領域（生成用）

prompts/base_cct_concept.md
prompts/article_template.md
prompts/glossary.md

---

### サイト管理領域（公開しない）

meta/site_architecture.md

---

## 2. 削除済みファイル記録

（削除時に追記）

---

## 3. 運用ルール

- 新規ファイルは必ずルートからのパスで記録
- 不要ファイルは削除し、本ファイルに記録
- 記事テンプレ変更時は prompts/article_template.md を更新
- CCT思想変更時は prompts/base_cct_concept.md を更新
- 用語変更時は prompts/glossary.md を更新

---

## 4. 将来追加予定

- SEO構造化データ
- GA設定
- OGP設定
- 記事自動生成パイプライン
- 内部リンク自動生成

---

最終更新日：手動更新
