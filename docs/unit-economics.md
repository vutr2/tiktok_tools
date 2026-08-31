# Kinh tế đơn vị

> Ảnh tưởng là chỗ đốt tiền. Đo xong thì hoá ra không phải — chỗ chảy máu là text.

## Tỷ lệ đang đặt

| | credit | doanh thu (99k/60cr = 1.650đ/credit) |
|---|---|---|
| 1 lần sinh text (mô tả) | 1 | 1.650đ |
| 1 lần sinh text (5 kịch bản) | 1 | 1.650đ |
| 1 ảnh (1 bối cảnh) | 5 | 8.250đ |
| **Trọn bộ 1 sản phẩm** (4 ảnh + mô tả + kịch bản) | **22** | 36.300đ |

Sửa tỷ lệ ở đúng một chỗ: `CREDIT_COST` trong `src/lib/pricing.ts`.

## Chọn provider ảnh

Đã bỏ Higgsfield. Model ảnh mặc định là **`gemini-3.1-flash-image-preview`**
(tên quen thuộc: *nano banana 2*).

| Model | Giá niêm yết / ảnh | ≈ VND | Biên ở 5 credit |
|---|---|---|---|
| **Gemini 3.1 Flash Image** (mặc định) | $0.067 (1K) | ~1.762đ | **79%** |
| Gemini 3 Pro Image (nano banana pro) | $0.134 (1K/2K) | ~3.524đ | 57% |
| Gemini 2.5 Flash Image (nano banana đời đầu) | $0.039 | ~1.026đ | 88% |

**Vì sao không lấy cái rẻ nhất:**

- **Gemini 2.5 Flash Image rẻ hơn thật (~736đ/ảnh) nhưng họ Gemini 2.5 có lịch
  tắt 16/10/2026.** Xây lên nó là chuốc một lần di chuyển bắt buộc trong vòng
  vài tuần. Số tiền tiết kiệm không bù nổi.
- Có model rẻ hơn nữa ngoài Google (FLUX Kontext dev ~$0.015, Seedream Lite
  ~$0.032). Chênh lệch tối đa ~1.400đ/ảnh, tức **biên đi từ 79% lên 93%** — trên
  giá bán 8.250đ thì đó là tiếng ồn. Cái quyết định chức năng này sống hay chết
  là **giữ nguyên được sản phẩm trong ảnh** (không vẽ lại nhãn, không đổi màu,
  không méo hình). Nano banana mạnh đúng chỗ đó. Đổi lấy 14% biên để nhận ảnh
  sai nhãn là lỗ, không phải lời.
- Muốn thử provider khác: implement `ImageProvider` trong `src/lib/ai/image.ts`
  rồi thêm một `case` ở `imageProvider()`. Phần còn lại của app không biết
  provider nào đang chạy.

Giá niêm yết ghi trong `IMAGE_MODELS` (`src/lib/pricing.ts`). Đối chiếu lại bảng
giá Google trước mỗi lần đổi model.

## Đo giá thật, không đoán

`imageCost()` lấy giá vốn theo **thứ tự tin cậy giảm dần**, và nếu không có
nguồn nào thì trả `null` chứ không bịa số:

| Nguồn | Cách bật | Tin được tới đâu |
|---|---|---|
| `INVOICE` | `IMAGE_COST_VND_PER_SCENE` trong `.env` | Số thật. Có cả lần gọi hỏng, retry, thuế. |
| `METERED` | `GEMINI_IMAGE_USD_PER_MTOK` | Tính từ token API trả về mỗi lần gọi. |
| `LIST_PRICE` | mặc định | Giá niêm yết. `npm run economics` báo 🟡. |

Trên tất cả: `npm run economics` **ưu tiên số trong `generations.providerCostVnd`**
nếu đã có lần chạy thật. Mỗi lần sinh ảnh đều ghi chi phí vào cột này, nên số đo
tự tích luỹ khi có người dùng — không cần chạy script riêng.

Quy trình chốt số:

```bash
IMAGE_PROVIDER=gemini npm run probe:image-cost -- ./mau.jpg 5
# → chạy 5 ảnh thật, in chi phí từng lần

# sau vài trăm ảnh đầu: mở billing của Google, chia cho số lần gọi
echo 'IMAGE_COST_VND_PER_SCENE=<vnd mỗi ảnh>' >> .env
npm run economics
```

## Số hiện có

Chạy `npm run economics` (giá niêm yết, tỷ giá 26.300):

| | giá vốn | doanh thu | biên |
|---|---|---|---|
| Ảnh sản phẩm (5 credit) | ~1.762đ | 8.250đ | **79%** 🟢 |
| Mô tả sàn (1 credit) | ~986đ | 1.650đ | **40%** 🟡 |
| 5 kịch bản video (1 credit) | ~2.499đ | 1.650đ | **−51%** 🔴 |
| **Trọn bộ 1 sản phẩm** | 12.295đ | 36.300đ | **66%** |

**Kết luận ngược với giả định ban đầu: ảnh không phải chỗ đốt tiền.** Ở 5 credit,
biên ảnh là 79% — thoải mái. Chỗ lỗ là kịch bản video.

### Hai việc cần quyết

**1. Kịch bản video ở 1 credit đang lỗ ~849đ mỗi lần chạy.**
"1 credit = 1 lần sinh text" đúng với mô tả, nhưng kịch bản là 5 kịch bản trong
một lần gọi — output gấp ~3,5 lần. Ba đường:

- Nâng lên **2–4 credit** (2 = hoà vốn nhẹ, 4 = đạt mục tiêu 60%). Sạch nhất.
- Hạ `effort` của kịch bản từ `high` xuống `medium` (`src/lib/ai/claude.ts`).
  Giữ 1 credit, phải đo lại chất lượng trước.
- Chấp nhận lỗ có chủ đích, coi text là mồi kéo người dùng, lấy lại ở ảnh.
  **Giờ đường này đã khả thi** vì biên ảnh 79% gánh được.

**2. Ảnh có thể HẠ giá xuống 3 credit mà vẫn đạt 60%.**
Ở 5 credit, chạy đủ 4 bối cảnh tốn 20 credit = 1/3 gói 99k, ba sản phẩm là hết
gói — dễ làm người dùng chùn tay ngay lần đầu. Hạ xuống 3 credit thì trọn bộ một
sản phẩm còn **14 credit (23% gói)**, cùng lúc gánh được khoản lỗ của text.
Đây là lựa chọn định giá, không phải lựa chọn kỹ thuật — code đang để 5 như đã chốt.

## Nếu biên ảnh mỏng

`PACKS` trong `src/lib/pricing.ts` đã dựng sẵn gói ảnh riêng (`image_99k`,
`kind: "IMAGE_ONLY"`) nhưng để `enabled: false`. Với số hiện tại thì **chưa cần
bật** — biên ảnh đang là phần khoẻ nhất của mô hình.

## Chi phí ẩn phải nhớ

- **Một sản phẩm trọn bộ tốn 5 lần gọi ảnh, không phải 4**: 1 lần tách nền + 4
  bối cảnh. Lần tách nền được cache vào `products.cutoutImageKey` nên chỉ chạy
  một lần cho mỗi sản phẩm, sinh lại ảnh lần hai không tốn thêm.
- **Hoàn credit khi lỗi** nghĩa là mình chịu chi phí API của lần chạy hỏng. Tỷ lệ
  lỗi của provider đi thẳng vào biên — theo dõi bằng
  `SELECT status, count(*) FROM generations GROUP BY status`.
- **Ảnh bị chặn vì nội dung** (`SAFETY`, `PROHIBITED_CONTENT`) được đánh dấu
  không retry — thử lại chỉ tốn thêm tiền cho cùng một kết quả.
- **Prompt cache của text**: prompt hệ thống theo ngành là hằng số và đã đánh
  `cache_control`. Kiểm bằng `usage.cache_read_input_tokens` — nếu luôn bằng 0
  là cache hỏng ở đâu đó và giá vốn text đang cao hơn cần thiết.
- **Tỷ giá** `USD_VND` trong env, mặc định 26.300.
