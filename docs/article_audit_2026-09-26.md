# 既存記事棚卸し 2026-09-26

この棚卸しは、CCT Lab の56記事を「検索資産」「読者価値」「CCT独自性」「重複」の観点で整理したもの。
削除判断は Search Console の表示ゼロだけでは行わない。

## 2026-09-27 URL Inspection 実測更新

GSC Wizard 経由で56記事すべてを Google URL Inspection API で確認した。

### Submitted and indexed: 6本

- blue-light-headache-strain
- brief-nap-recovery
- music-tempo-eating-speed
- nasal-breathing-humidity-sleep
- oral-gut-axis-morning-care
- ultra-processed-satiety

この6URLは検索資産として維持し、削除しない。

### Crawled - currently not indexed: 16本

- alcohol-fat-oxidation-diet
- bedtime-procrastination-stress
- breakfast-window-metabolism
- coffee-afternoon-sleep
- evening-scent-sleep-switch
- fermented-foods-microbiome
- gut-brain-probiotics-mood
- hydration-attention-fatigue
- lifestyle-changes-brain-use
- mental-fatigue-posture-slump
- microbreak-fatigue-reset
- nature-brain-recovery
- obesity-allergy-inflammation
- post-meal-sleepiness
- slow-breathing-stress-reset
- social-support-stress-buffer

Google は実際に取得したが現時点ではインデックスしていない。
テーマ価値の高いページは削除より先にリライト・統合・内部リンク改善を行う。

### URL is unknown to Google: 34本

Google の検査結果上、クロール履歴・インデックス資産を確認できない。
ただし「unknown」だけを削除理由にせず、重複・検索意図・CCT独自価値と合わせて判断する。

### 第2統合・URL整理バッチ

Google URL Inspection で `URL is unknown to Google` だったページを、検索意図と親記事の役割から再整理した。

| 旧slug | 処理 |
|---|---|
| green-exercise-mood | nature-brain-recovery へグリーンエクササイズ研究（10研究・1,252人）を統合し削除 |
| stairs-break-alertness | microbreak-fatigue-reset へ階段10分 vs 50mgカフェイン試験を統合し削除 |
| paper-books-mental-calm | 誇張していた「リラックス」主張を撤去し paper-vs-smartphone-reading へ改名・再構成 |
| self-control-night-hunger | 自己統制枯渇中心の説明を撤去し evening-hunger-circadian へ改名。概日食欲研究へ置換 |
| social-jetend-fatigue | typo URL と誤った書誌を修正し social-jetlag-fatigue へ改名。Wittmann 2006 PMID 16687322 を原点に再構成 |
| meal-timing-jet-lag | URL維持。5時間の食事時刻シフト実験 PMID 28578930 を中心に「主時計と末梢時計のずれ」へ再構成 |

このバッチ後の記事数は48本。

### 第1統合バッチ

以下6本はすべて URL is unknown to Google であり、重複または独立検索価値が弱いため整理した。

| 削除slug | 処理 |
|---|---|
| protein-breakfast-cravings | protein-breakfast-appetite-control へ研究・検索意図を統合 |
| slow-exhale-stress-reset | slow-breathing-stress-reset へ統合。呼気延長の追加効果が一貫しない研究も反映 |
| posture-mood-fatigue | mental-fatigue-posture-slump へ姿勢→気分のRCTを統合 |
| nostril-breathing-memory-sleep | indexed の nasal-breathing-humidity-sleep と役割が近く、認知・睡眠への飛躍が大きいため削除 |
| weekend-nature-inflammation | nature-brain-recovery と自然系クラスターへ役割を集約 |
| mouth-rinse-brain-boost | 運動生理の糖質マウスリンスから日常集中への距離が大きく、検索意図も弱いため削除 |

56本から50本へ整理。

## Search Consoleで表示実績がある記事

直近90日。表示実績があるURLは、少なくともGoogle検索結果へ出た実績があるため、原則URLを維持してリライトする。

| slug | impressions | clicks | avg position | 方針 |
|---|---:|---:|---:|---|
| music-tempo-eating-speed | 83 | 2 | 8.0 | URL維持。現状の検索意図を壊さず軽〜中規模リライト |
| brief-nap-recovery | 37 | 0 | 71.6 | URL維持。検索需要あり。内容・タイトル・検索意図を重点改善 |
| nasal-breathing-humidity-sleep | 3 | 0 | 30.0 | URL維持。根拠を監査しつつ厚みを残す |
| oral-gut-axis-morning-care | 3 | 0 | 5.0 | URL維持。強い順位シグナル。主張を精密化してリライト |
| nature-brain-recovery | 2 | 0 | 4.5 | URL維持。自然系クラスターの中心候補 |
| obesity-allergy-inflammation | 2 | 0 | 8.0 | URL維持。医療的な射程を精密化 |
| ultra-processed-satiety | 2 | 0 | 4.5 | URL維持。食欲クラスターの中心候補 |
| blue-light-headache-strain | 1 | 0 | 5.0 | URL維持。アイキャッチ含め改善 |
| gut-brain-probiotics-mood | 1 | 0 | 11.0 | URL維持。医療記事として根拠監査 |
| microbreak-fatigue-reset | 1 | 0 | 2.0 | URL維持。仕事疲労クラスターの中心候補 |

### 注意

2026-09-27から GSC Wizard の URL Inspection API を併用している。
Search Analytics の表示有無と URL Inspection のインデックス状態は別物として扱う。
「表示ゼロ」だけで削除せず、URL Inspection・重複・検索意図・CCT独自価値を合わせて判断する。

## 強い統合候補

### 高たんぱく朝食

- protein-breakfast-appetite-control
- protein-breakfast-cravings

検索意図と主張が近すぎる。
どちらかのインデックス・内部リンク状況を確認し、強いURLへ統合するのが第一候補。
pfc-protein-leverage は「たんぱく質割合と総摂取」の別テーマとして残せる。

### ゆっくりした呼吸

- slow-breathing-stress-reset
- slow-exhale-stress-reset

検索意図・介入・説明がほぼ重なる。
一方を主記事にし、もう一方は統合・リダイレクト候補。

### 姿勢と疲労

- mental-fatigue-posture-slump
- posture-mood-fatigue

完全同一ではないが、現状の説明範囲が重なる可能性が高い。
片方を「認知疲労→姿勢」、片方を「姿勢→感情」に明確に分けられなければ統合。

### 鼻呼吸

- nasal-breathing-humidity-sleep
- nostril-breathing-memory-sleep

前者は検索表示実績があるため維持。
後者は「鼻呼吸と瞬間的な認知課題」という限定的テーマへ再定義できなければ、統合または削除候補。

## 削除・統合を検討する低優先記事

以下は現時点で削除しない。個別のインデックス状態を確認し、未インデックスかつ内部リンク資産も乏しい場合に整理する。

- mouth-rinse-brain-boost
  - 運動生理の糖質マウスリンスから日常集中へ広げる距離が大きい
  - 検索者の困りごとが弱い
- evening-scent-sleep-switch
  - ニッチ。睡眠記事群の中で独立URLを持つ検索意図があるか再確認
- nostril-breathing-memory-sleep
  - 上記の通り nasal-breathing-humidity-sleep との役割整理が必要
- weekend-nature-inflammation
  - nature-brain-recovery / green-exercise-mood と合わせて自然系クラスターで役割を再設計
- lifestyle-changes-brain-use
  - 削除候補ではないが、論文SEO記事ではなくCCTの読み物・思想記事へ転換する方が自然

## 全56記事の暫定方針

| slug | 方針 | 主な理由 |
|---|---|---|
| alcohol-fat-oxidation-diet | KEEP/REWRITE | 検索意図は強い。代謝の断定を監査 |
| bedtime-procrastination-stress | KEEP/PRIORITY | CCTを見せやすい代表テーマ |
| blue-light-headache-strain | PRESERVE/REWRITE | Search表示あり |
| breakfast-window-metabolism | KEEP/REWRITE | 食事時刻の独立意図あり |
| brief-nap-recovery | PRESERVE/PRIORITY | 37 impressions。需要シグナル強 |
| chewing-speed-appetite | KEEP/REWRITE | 食行動クラスター |
| choice-overload-mental-fatigue | KEEP/REWRITE | CCTと相性が良い |
| clutter-stress-recovery | KEEP/REWRITE | 困りごとが明確 |
| coffee-afternoon-sleep | KEEP/REWRITE | 強い検索意図を作りやすい |
| cold-room-sleep-onset | KEEP/REWRITE | 睡眠環境として独立 |
| daylight-mood-stability | KEEP/REWRITE | 光クラスター |
| evening-scent-sleep-switch | HOLD | ニッチ。index確認後判断 |
| fermented-foods-microbiome | KEEP/REWRITE | 腸活需要。誇張を避ける |
| food-noise-appetite-cues | KEEP/REWRITE | 食欲×環境刺激として独自 |
| green-exercise-mood | KEEP/CLUSTER | 自然×運動の役割を明確化 |
| gut-brain-probiotics-mood | PRESERVE/REWRITE | Search表示あり。YMYL監査 |
| hydration-attention-fatigue | KEEP/REWRITE | 日常困りごとが明確 |
| if-then-planning-action-friction | KEEP/REWRITE | CCTの介入点と相性が良い |
| indoor-co2-focus-drop | KEEP/REWRITE | 室内環境の強い問い |
| lifestyle-changes-brain-use | REFRAME/FEATURE | 架空一人称を撤去しCCT読み物へ |
| loneliness-sleep-quality | KEEP/REWRITE | 社会×睡眠の独立テーマ |
| meal-timing-jet-lag | KEEP/REWRITE | 食事時刻×概日リズム |
| mental-fatigue-posture-slump | MERGE-REVIEW | posture-mood と重複確認 |
| microbreak-fatigue-reset | PRESERVE/PRIORITY | Search表示あり |
| mind-wandering-mood | KEEP/REWRITE | デジタル逃避の上流として有用 |
| morning-light-body-clock | KEEP/REWRITE | 睡眠ハブの重要記事 |
| mouth-rinse-brain-boost | HOLD/DELETE-REVIEW | 検索意図・日常への距離が弱い |
| music-tempo-eating-speed | PRESERVE/PRIORITY | 83 impressions / position 8 |
| music-walking-effort | KEEP/REWRITE | 運動開始の摩擦に接続可能 |
| nasal-breathing-humidity-sleep | PRESERVE/REWRITE | Search表示あり |
| nature-brain-recovery | PRESERVE/PRIORITY | Search表示あり |
| nostril-breathing-memory-sleep | MERGE/DELETE-REVIEW | 鼻呼吸記事との役割が弱い |
| obesity-allergy-inflammation | PRESERVE/REWRITE | Search表示あり。YMYL監査 |
| oral-gut-axis-morning-care | PRESERVE/PRIORITY | Search position 5 |
| paper-books-mental-calm | KEEP/REWRITE | 紙vs画面の検索意図へ再設計 |
| pfc-protein-leverage | KEEP/REWRITE | 朝食記事とは別の栄養テーマ |
| phone-meals-satiety | KEEP/REWRITE | ながら食べの困りごとが明確 |
| post-meal-sleepiness | KEEP/BASELINE | 研究の射程を明示した既存良例 |
| posture-mood-fatigue | MERGE-REVIEW | mental-fatigue-posture と整理 |
| protein-breakfast-appetite-control | MERGE | cravings と統合候補 |
| protein-breakfast-cravings | MERGE | appetite-control と統合候補 |
| screen-tilt-neck-breathing | KEEP/REWRITE | スマホ姿勢として独立。画像要改善 |
| self-compassion-stress-cortisol | KEEP/EVIDENCE-REPAIR | テーマ価値あり。根拠混線修正 |
| self-control-night-hunger | KEEP/REWRITE | 夜食の循環テーマ |
| sleep-inertia-light-move | KEEP/REWRITE | 朝の困りごとが明確 |
| slow-breathing-stress-reset | MERGE | slow-exhale と統合 |
| slow-exhale-stress-reset | MERGE | slow-breathing と統合 |
| social-jetend-fatigue | KEEP/REWRITE | slug誤字はURL資産確認後に扱う |
| social-support-stress-buffer | KEEP/REWRITE | 社会カテゴリの重要記事 |
| stairs-break-alertness | KEEP/REWRITE | microbreak と内部リンクで棲み分け |
| standing-breaks-glucose-mood | KEEP/REWRITE | 食後×座位の独立意図 |
| ultra-processed-satiety | PRESERVE/PRIORITY | Search表示あり |
| video-binge-reward-loop | KEEP/PRIORITY | CCTブランドを最も見せやすい |
| walking-ideas-boost | KEEP/REWRITE | 創造性×歩行の独立意図 |
| warm-light-evening-sleep | KEEP/REWRITE | 「食欲」への飛躍を再監査 |
| weekend-nature-inflammation | CLUSTER-REVIEW | 自然系3記事の役割を整理 |

## 記事クラスター再設計

### 睡眠・リズム
brief-nap / bedtime-procrastination / coffee-afternoon / cold-room / morning-light / sleep-inertia / social-jetlag / warm-light / nasal-humidity

### 食事・食欲
music-tempo / chewing-speed / phone-meals / ultra-processed / food-noise / breakfast-window / protein / protein-leverage / self-control-night / alcohol / post-meal

### デジタル・認知疲労
video-binge / mind-wandering / choice-overload / microbreak / if-then / indoor-co2

### 呼吸・姿勢
screen-tilt / posture / mental-fatigue-posture / slow-breathing / nasal

### 環境・回復
clutter / nature-brain / green-exercise / weekend-nature / daylight / evening-scent

### 感情・社会
self-compassion / loneliness / social-support / gut-brain

## 横断的な修正

- front matter の外側引用符がそのままtitle/descriptionへ残る問題をパーサー側で修正
- missing eyecatch:
  - hydration-attention-fatigue
  - music-tempo-eating-speed
  - screen-tilt-neck-breathing
- eyecatchAlt が本文と無関係な記事を順次修正
- 「論文の研究」型タイトルを全記事の固定形にしない
- 同じCCT固定文・同じ東洋医学導入・同じ「今日の1アクション」を撤廃
- 関連記事は単なるタグ一致ではなく、同じ困りごとの次の読み物として接続する

## 実施順

1. 編集方針・生成系を修正
2. 前回の薄いP0リライトを元へ戻す
3. Search表示上位の記事を新方式で少数リライト
4. 品質確認後、検索表示あり記事へ展開
5. 近似記事を統合
6. index状態を確認できた低価値記事のみ削除
7. 残りをクラスター単位でリライト
