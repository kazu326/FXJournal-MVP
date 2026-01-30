# PC と iOS で表示が違う原因（グラスモーフィズム・ニューモーフィズム）

## 現象

- **ヘッダー**: 透明で、ロゴ・名前・ハンバーガーのみ見える。ヘッダーバーにグラスモーフィズムが効いていない。
- **カード**: 全体が黒い縁取りになり、ニューモーフィズムが効いていない。
- **取引前30秒 CTA・次にやることカード・ボトムタブ**: 今回の修正ではスタイルの変更はしていない（原因対応のみ）。

## 原因

### 1. テーマ変数と Tailwind の優先

- **theme.css** の `:root` で `--color-bg: #0f1115`（暗い）、`@media (prefers-color-scheme: dark)` で `--color-border: #30363d`（黒に近い）が定義されている。
- **Card コンポーネント**（`ui/card.tsx`）はデフォルトで `border border-border bg-card` を付与している。
- `border-border` / `bg-card` はテーマの `--color-border` / `--color-card` を参照するため、
  - ダークモードやテーマの影響で **枠が黒く** なる。
  - 背景がテーマ色になり、**グラス/ニューモーフィズムの白っぽい背景が上書き**される。

### 2. ヘッダーが透明に見える理由

- ヘッダーには `glass-header` が付与され、`background: rgba(255,255,255,0.8)` が指定されている。
- しかし **テーマの `--color-bg` や、Tailwind のユーティリティ・レイヤー** が後から当たり、優先度で負けて **背景が実質透明** になっていた可能性がある。
- その結果、ヘッダーバー部分だけグラスモーフィズムが効いていないように見える。

### 3. カードが黒枠になる理由

- 次にやることカードなどは **Card**（`border border-border`）に **glass-panel / hero-card** を追加している。
- `.glass-panel` / `.hero-card` の `border` や `background` が、Tailwind の `border-border` / `bg-card` より **詳細度や読み込み順で負け**、テーマの暗い色がそのまま効いていた。
- そのため **ニューモーフィズムの白い枠・影ではなく、黒い縁取り** に見えていた。

### 4. iOS での backdrop-filter

- 以前の対応で `translateZ(0)` や `isolation: isolate` を追加しているが、これらは **backdrop-filter を効かせるためのもの**。
- 上記 1〜3 の「テーマ/Tailwind による上書き」が解消されないと、**ヘッダー・カードの見た目は PC と iOS で同じように崩れる**。

## 対応内容（index.css）

1. **`.glass-header`**  
   - `background` と `border-bottom` に `!important` を付与し、テーマや他スタイルより **常にグラスモーフィズムの見た目** が適用されるようにした。

2. **`.glass-panel`**  
   - `background` と `border` に `!important` を付与し、Card の `border-border` / `bg-card` に **負けないように** した。

3. **`.hero-card`**  
   - `border` を明示し `!important` で指定。Card の `border-border` を上書きし、**黒枠にならない** ようにした。

これにより、

- ヘッダーバーにグラスモーフィズムが効く。
- カードはニューモーフィズムの白い枠・影が効き、黒い縁取りにならない。

取引前30秒 CTA・次にやることカード・ボトムタブの「見た目の仕様」は変えておらず、**表示が崩れていた原因（テーマ/Tailwind の優先）の修正** のみ行っている。
