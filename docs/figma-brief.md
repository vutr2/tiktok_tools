# Studio bán hàng — UI design brief

> Upload or paste this whole file into Figma Make as a single prompt.
> Written in English because Figma understands English instructions better; every
> string that appears on screen is given verbatim in Vietnamese so it is never
> translated or replaced with Lorem Ipsum.

---

## 1. What you are designing

A mobile-first web app called **"Studio bán hàng"** (Selling Studio) — a content
tool for small Vietnamese sellers on Shopee and TikTok Shop.

**The interface language is Vietnamese.** Use the exact Vietnamese strings given
in section 9. Never translate them to English, never use Lorem Ipsum, never
invent placeholder product names.

### Who it is for

Home-based sellers in Vietnam, mostly women aged 25–45, running a shop from a
phone. They photograph products on a kitchen table under a yellow ceiling light.
They are not designers and they are not patient. Assume one-handed use, often
outdoors in daylight, on a mid-range Android phone.

### What it does — exactly three things

1. **Ảnh studio** — a phone snapshot becomes 4 studio product photos. The
   background is removed, then the product is composited into scene presets
   written specifically for the seller's industry.
2. **Mô tả sàn** — generates a marketplace title, description and hashtags.
   Titles are hard-capped at 120 characters for Shopee and 255 for TikTok Shop;
   the character counter is part of the design, not an afterthought.
3. **Kịch bản video** — five 30-second video scripts, each with a 3-second hook,
   previewed in a playable 9:16 phone frame.

**Deliberately absent:** order management, inventory, chat, analytics dashboards,
auto-posting to marketplaces. Do not design screens for them. If you find
yourself adding a fourth feature, stop — the three-feature boundary is the
product decision.

---

## 2. Visual direction

Dark and TikTok-native. Near-black ground so product photos glow against it. Two
accents used sparingly, only on things that are interactive or currently playing:
a hot pink-red and an electric cyan. Rounded corners (12–24px), generous spacing,
big tap targets. Bold, tight headings.

This is a creative app, not a SaaS dashboard — no sidebar, no data grid, no muted
corporate blue, no card with a coloured left rail.

### Colour tokens — use these exactly

| Token  | Hex       | Used for                        |
| ------ | --------- | ------------------------------- |
| ground | `#08080b` | page background                 |
| panel  | `#121217` | cards                           |
| raise  | `#1b1b22` | inputs, chips, inner surfaces   |
| line   | `#272730` | borders                         |
| ink    | `#f4f4f6` | primary text                    |
| muted  | `#8d8d99` | secondary text                  |
| dim    | `#5f5f6b` | captions                        |
| brand  | `#fe2c55` | primary actions, active states  |
| neon   | `#25f4ee` | highlights, links, success      |

Gradients: pink-red → cyan for logo tiles, avatars and the balance figure;
pink-red → `#ff5b7f` for primary buttons.

### Typography

Must render Vietnamese diacritics correctly. Use **Be Vietnam Pro**, or another
family with a full Vietnamese subset. Before committing to a face, set this
string and check that no mark collides or disappears:

```
Kịch bản video 30 giây — dựng ảnh studio, mô tả sàn
```

---

## 3. Credit economy — visible, never hidden

The app runs on credits and the seller must always see the price before they
spend.

- Show the balance in the header on **every** screen.
- Every button that costs money states the cost **in its own label**, e.g.
  `✨ Dựng 4 ảnh · 20 credit`. Do not move the price elsewhere or hide it.
- Prices: **5 credits** per photo, **1 credit** per text generation.
- The 99.000đ pack gives 60 credits. New accounts get 10 free credits.
- Failed generations are refunded automatically — say so where it reassures.

---

## 4. Five industries

The seller picks one, and it changes the prompts, the sales voice and the photo
scenes downstream. Design the picker as a grid of tappable cards, never a
dropdown.

```
💄 Mỹ phẩm    👗 Thời trang    🏠 Gia dụng    🍼 Mẹ & Bé    ⌚ Phụ kiện
```

---

## 5. Screens — seven, in this order

### 5.1 Đăng nhập / Đăng ký

The very first thing on opening the app. It fills the viewport; no marketing
content above it. Centred column, max 420px:

- A 56px rounded-square logo tile with a pink-red to cyan gradient
- Wordmark "Studio bán hàng"
- Tagline `Ảnh chụp ở bàn bếp, lên sàn như ảnh studio.` — set the second half in
  the gradient
- A card holding a two-tab segmented control: **Đăng ký** and **Đăng nhập**. The
  active tab is a filled gradient pill.
  - *Đăng ký* shows an email field, then the five industry cards, then a
    full-width button `Tạo tài khoản — tặng 10 credit`
  - *Đăng nhập* shows only the email field and a button `Vào studio`
- **No password field anywhere.** Under the card:
  `Không cần mật khẩu, không cần thẻ. Bắt đầu bằng email là đủ.`
- Design the duplicate-account error: a red-tinted message
  `Email này đã có tài khoản. Chuyển sang tab Đăng nhập.` with a cyan text link
  `→ Chuyển sang Đăng nhập`
- Far below the fold, a quiet link `App làm được gì ↓` leading to three short
  feature cards

### 5.2 Chọn ngành hàng

One question, nothing else. Heading `Bạn bán ngành gì?`, subtext
`Mỗi ngành một bộ prompt, giọng bán và bối cảnh ảnh riêng — đây là chỗ tạo ra khác biệt. Đổi lại sau trong Hồ sơ.`
Then the five industry cards in a grid, each with a large emoji and its label.
Button `Vào studio →`, disabled until one is chosen.

### 5.3 Sản phẩm

A 2-column grid on mobile, 4 on desktop. Each card is a square product photo with
a dark gradient fading up from the bottom, the product name in semibold below it,
and the industry label in dim text under that. Header: `Sản phẩm` as a large bold
heading, with a `＋ Thêm sản phẩm` button on desktop only.

Design the **empty state** properly — it is the first thing a new seller sees. A
dashed-border panel, a large camera emoji, then `Chưa có sản phẩm nào`, then
`Chụp một tấm bằng điện thoại, đặt trên nền trơn. Phần studio để máy lo.`, then a
gradient button `✨ Bắt đầu`.

### 5.4 Thêm sản phẩm

A single column form, max 640px:

- A large square photo drop zone, **not** a plain file input.
  - Empty: dashed border, camera emoji, `Chọn ảnh sản phẩm`, and dim helper text
    `Chụp bằng điện thoại là được — máy sẽ tách nền rồi ghép bối cảnh`
  - Filled: the photo itself with a rounded pink-red border and a floating dark
    pill in the lower-left reading `Đổi ảnh khác`
- Fields: `Ngành hàng` (select), `Tên sản phẩm` with placeholder
  `Serum niacinamide 10%` and hint `Tên bạn hay gọi, không cần chuẩn SEO.`, then
  a two-column grid of industry-specific fields such as Giá bán, Dung tích, Loại
  da, Thành phần chính
- Submit `Lưu sản phẩm`, full width on mobile

### 5.5 Bàn làm việc

The screen where a seller works on one product.

Header: a 64px rounded product thumbnail, the product name in bold beside it,
industry label underneath, and a small back link `← Sản phẩm` above.

Below that, a segmented tab bar sitting inside a rounded panel — **not**
underlined tabs. Three tabs, each with an icon and a label that collapses to
icon-only on narrow screens:

```
✨ Ảnh studio     📝 Mô tả sàn     🎬 Kịch bản
```

#### Tab 1 — Ảnh studio

Heading `Chọn bối cảnh` with the price on the right: `5 credit / ảnh · còn 10`.
Then four selectable scene cards in a 2-column grid, each with a checkbox square,
a bold scene name and a dim one-line use case. For cosmetics:

| Scene | Use case |
| --- | --- |
| Bục đá cẩm thạch | Ảnh bìa listing — sạch, sang, dễ nhìn trên thumbnail nhỏ. |
| Đá ướt & giọt nước | Nhấn cảm giác cấp ẩm, mát da — hợp serum, toner, gel. |
| Lụa pastel | Ảnh cảm xúc cho quảng cáo và ảnh phụ, hợp dòng dịu nhẹ. |
| Flatlay bàn trang điểm | Ảnh phụ kể chuyện dùng hằng ngày. |

Selected cards get a pink-red border and a tinted background. Below: a gradient
button `✨ Dựng 4 ảnh · 20 credit`.

Then a results section titled `Trước & sau`: the seller's original photo first at
reduced opacity captioned `Ảnh bạn chụp`, followed by the four generated photos,
each with its scene name and a cyan `Tải` link. Under the results, an outlined
button `🎬 Xem kịch bản chạy trên ảnh này →`.

Also design the loading state: four shimmering square placeholders.

#### Tab 2 — Mô tả sàn

Button `📝 Viết mô tả · 1 credit`. Results as stacked cards, each with a `Chép`
button in its header:

- `Tiêu đề Shopee` — the generated title, a thin progress bar showing length
  against the 120-character cap, and a counter `98/120 ký tự`. The bar turns red
  when over.
- `Tiêu đề TikTok Shop` — the same, against 255
- `Mô tả` — body copy and bullet points
- `Hashtag` — Shopee and TikTok rows in cyan
- An amber-tinted warning card titled `⚠ Cụm từ có rủi ro bị gỡ listing`, listing
  a flagged phrase, why it is risky, and a suggested replacement

#### Tab 3 — Kịch bản

Button `🎬 Viết 5 kịch bản · 1 credit`, then the player in section 6.

Also design the **out-of-credits state**: the action button disabled, with a
message offering to top up.

### 5.6 Ví credit

The balance is the hero: the number `10` rendered very large and extra-bold in a
pink-red to cyan gradient, with `credit còn lại` beneath it in muted text. Then:

- A `Giá` card listing `Mô tả sàn: 1 credit`, `Kịch bản video: 1 credit`,
  `Ảnh sản phẩm: 5 credit / bối cảnh`
- Pack cards in a two-column grid. The live one: `Gói 99k`, `99.000đ`,
  `60 credit`, and a full-width `Mua` button. After tapping, show the
  bank-transfer state with a transfer note code to copy.
- A `Lịch sử` card: a divided list of transactions. Credits added are cyan-green
  with a leading plus, spends are plain. Each row shows a note and the balance
  after, right-aligned in tabular figures:

```
+10   Tặng khi đăng ký          còn 10
−20   Dựng 4 ảnh studio         còn 40
+60   Nạp gói 99k               còn 100
```

Empty history state: `Chưa có giao dịch nào.`

### 5.7 Hồ sơ

A 64px rounded avatar tile with the email's first letter on a pink-red to cyan
gradient, the display name beside it, email underneath in muted text. Then three
stat cards in a row: `Sản phẩm 12`, `Lần sinh xong 47`, `Credit đã dùng 210`.

Below, a form card titled `Thông tin`: fields `Tên` (placeholder `Chị Hoa`),
`Số điện thoại` (placeholder `09xx xxx xxx`), and the five industry cards again
as the current selection. Add the note
`Đổi ngành chỉ đổi bộ prompt cho những lần sinh sau. Sản phẩm đã tạo giữ nguyên ngành cũ.`
A `Lưu thay đổi` button, disabled until something changes.

Separated below a divider: an outlined pink-red button `↪ Đăng xuất`.

Footer line in dim text:
`Thành viên từ 1 tháng 9, 2026. Đăng nhập bằng email, không có mật khẩu để đổi.`

Also design the **account menu** that drops from the avatar in the header: email,
industry, credit balance, then Hồ sơ / Ví credit / Đăng xuất.

---

## 6. The signature screen — 9:16 script player

**Spend most of your effort here.** This screen is the product's whole argument:
it turns a written script into something you can watch before you shoot it. Treat
it as a creative tool, not a document viewer.

Layout: on mobile the phone frame is centred and roughly 300px wide, with the
beat timeline below it. On desktop, frame on the left, timeline on the right.

Above the frame: a horizontally scrolling row of five pills, one per script,
labelled with its angle. The active pill is filled pink-red; the others are
outlined on the raised surface.

Inside the 9:16 frame, layered back to front:

1. The seller's generated studio photo, filling the frame, slowly zooming in over
   about 7 seconds
2. A vertical gradient scrim — dark at top and bottom, transparent in the middle
3. Top edge: segmented progress bars, one per beat, 2px tall, white at 25%
   opacity, filling to solid white
4. Below them: a pill on the left reading `HOOK · 3s` (pink-red fill for the
   hook, white-translucent for later beats), and on the right a clock
   `0:07 / 0:30`
5. Centre: the on-screen caption in very large extra-bold white text, centred,
   two or three lines, with a soft drop shadow so it survives a bright photo
6. Bottom: the spoken line in quotes at ~14px white, and under it a smaller 11px
   director note prefixed with a film-clapper icon
7. When paused: a translucent dark circle with a play triangle, centred

Below the frame: three round controls — previous beat, a larger gradient
play/pause button, restart.

Beside or below: the **beat timeline**. Each row shows the start time in tabular
figures on the left, then a small bold label (`HOOK`, `CẢNH 1`…), its duration,
the spoken line, the caption and the shot note. The active row is outlined in
pink-red with a tinted background. Under the list, a CTA card and, if present, a
warning card listing timing problems.

Use these real strings:

```
Angle pill:      Da dầu vẫn khô
Caption:         Da dầu mà vẫn khô?!
Spoken line:     Mình từng nghĩ da dầu thì khỏi cần dưỡng ẩm.
Director note:   Cận mặt, ánh sáng cửa sổ, tay chạm má
CTA:             Link giỏ hàng ngay dưới video nha
Warning:         Cảnh 3: 24 chữ trong 7s — đọc không kịp (tối đa ~19).
Empty state:     Dựng ảnh studio trước để xem kịch bản chạy trên ảnh thật của bạn.
```

---

## 7. Deliverables and rules

- Design **mobile first at 390×844**, then a **1440 desktop** variant of each
  screen
- Mobile gets a fixed bottom tab bar: `Sản phẩm` · `Thêm` · `Ví` · `Tôi`
- Show real states, not just the happy path: **empty, loading, error, and
  out-of-credits**
- Every screen must work with a thumb on a phone held one-handed
- No Lorem Ipsum anywhere — use section 9

---

## 8. Photo scenes — four per industry

```
Mỹ phẩm      Bục đá cẩm thạch · Đá ướt & giọt nước · Lụa pastel · Flatlay bàn trang điểm
Thời trang   Phông liền studio · Loft bê tông · Móc gỗ tường trung tính · Flatlay phối đồ
Gia dụng     Mặt bếp hiện đại · Kệ phòng khách tối giản · Phông trắng vô cực · Bàn ăn gỗ buổi sáng
Mẹ & Bé      Phòng bé tông pastel · Flatlay khăn cotton · Thảm chơi & sàn gỗ sáng · Phông gradient pastel
Phụ kiện     Acrylic đen phản chiếu · Bàn làm việc da · Gradient neon gaming · Khối hình học tối giản
```

---

## 9. Content bank — use only these strings

### Products

```
Serum niacinamide 10%              Mỹ phẩm
Áo khoác dù chống nắng UPF50       Thời trang
Nồi chiên không dầu 5L             Gia dụng
Bình sữa cổ rộng 240ml             Mẹ & Bé
Dây đồng hồ da bò thủ công         Phụ kiện
```

### Buttons

```
✨ Dựng 4 ảnh · 20 credit
📝 Viết mô tả · 1 credit
🎬 Viết 5 kịch bản · 1 credit
🎬 Xem kịch bản chạy trên ảnh này →
Tạo tài khoản — tặng 10 credit
Vào studio · Lưu sản phẩm · Lưu thay đổi · Chép · Tải · Mua
```

### Loading

```
Đang dựng ảnh...   Đang viết...   Đang viết kịch bản...   Đang tải lên...
```

### Errors

```
Email này đã có tài khoản. Chuyển sang tab Đăng nhập.
Chưa có tài khoản nào dùng email này. Chuyển sang tab Đăng ký.
Cần 20 credit nhưng ví chỉ còn 10.
Lỗi — đã hoàn credit
Đang quá tải, thử lại sau ít phút.
```

### Sample listing output

```
Shopee title:   Serum Niacinamide 10% Zinc 1% 30ml Giảm Thâm Mụn Se Khít Lỗ Chân Lông   (98/120 ký tự)
TikTok title:   Serum Niacinamide 10% - Dưỡng sáng, mờ thâm, kiềm dầu cho da mụn 30ml     (69/255 ký tự)
Hashtags:       #serum #niacinamide #duongda #skincare #tribiethamnam
Risky phrase:   "trị mụn tận gốc" — cụm mang tính cam kết chữa khỏi, dễ bị gỡ listing
Suggested fix:  đổi thành "hỗ trợ giảm mụn"
```

### Microcopy

```
Chưa có sản phẩm nào
Chụp một tấm bằng điện thoại, đặt trên nền trơn. Phần studio để máy lo.
Sinh lỗi thì credit tự động hoàn lại ví.
Không cần mật khẩu, không cần thẻ. Bắt đầu bằng email là đủ.
Đặt sản phẩm trên nền trơn, đủ sáng. Tối đa 12MB.
```
