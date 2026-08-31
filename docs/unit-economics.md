# Kinh tế đơn vị

> Ảnh là chỗ đốt tiền. Tính trước khi code thêm.

## Tỷ lệ đang đặt

| | credit | doanh thu (99k/60cr = 1.650đ/credit) |
|---|---|---|
| 1 lần sinh text (mô tả) | 1 | 1.650đ |
| 1 lần sinh text (5 kịch bản) | 1 | 1.650đ |
| 1 ảnh (1 bối cảnh) | 5 | 8.250đ |
| **Trọn bộ 1 sản phẩm** (4 ảnh + mô tả + kịch bản) | **22** | 36.300đ |

22 credit là **37% của gói 99k**. Một người bán làm 3 sản phẩm là hết gói. Con số
này phơi ngay trên màn hình chọn bối cảnh để người bán tự quyết chạy mấy ảnh.

Sửa tỷ lệ ở đúng một chỗ: `CREDIT_COST` trong `src/lib/pricing.ts`.

## Đo giá thật, không đoán

`npm run economics` đọc giá vốn theo thứ tự ưu tiên:

1. **`generations.providerCostVnd`** — chi phí thật của từng lần chạy, ghi lại
   mỗi lần gọi provider. Đây là nguồn đúng nhất.
2. **`IMAGE_COST_VND_PER_SCENE` trong `.env`** — số đo tay.
3. **Không có gì** → script báo đỏ và **exit 1**. Nó không tự bịa một con số.

### Đo giá Higgsfield

```bash
IMAGE_PROVIDER=higgsfield npm run probe:image-cost -- ./mau.jpg 5
```

Chạy 5 ảnh thật, in chi phí từng lần. Nếu response của Higgsfield không kèm chi
phí, script nói thẳng là không đọc được và bảo mở bảng billing chia tay. Sau đó:

```bash
# .env
IMAGE_COST_VND_PER_SCENE=<số vừa đo>
npm run economics
```

### Trước khi bật provider thật

`src/lib/ai/image.ts` viết theo mẫu submit-job-rồi-poll và tự nhận cả hai dạng
response (trả ảnh ngay / trả job id). Đường dẫn endpoint và tên field để trong
env chứ **không hardcode**, vì phải mở tài liệu Higgsfield đối chiếu trước:

```
HIGGSFIELD_API_BASE
HIGGSFIELD_GENERATE_PATH
HIGGSFIELD_JOB_PATH
HIGGSFIELD_REMOVE_BG_PATH
```

Chưa đối chiếu thì để `IMAGE_PROVIDER=mock` — toàn bộ luồng (trừ credit, hoàn
credit, lưu file, hiển thị) vẫn chạy được và không tốn một đồng nào.

## Số hiện có: text

Giá vốn text tính được từ bảng giá token, không cần đo. Kết quả `npm run economics`
với model `claude-opus-5`:

| | giá vốn ước tính | doanh thu | biên |
|---|---|---|---|
| Mô tả sàn (1 credit) | ~986đ | 1.650đ | **40%** 🟡 |
| 5 kịch bản video (1 credit) | ~2.499đ | 1.650đ | **−51%** 🔴 |

**Hai việc này không nên cùng giá.** "1 credit = 1 lần sinh text" đúng với mô tả,
nhưng kịch bản video là 5 kịch bản trong một lần gọi — output gấp ~3,5 lần, và ở
1 credit thì mỗi lần chạy **lỗ khoảng 849đ**.

Ba đường xử lý, chọn một:

1. **Kịch bản video lên 2–4 credit.** Sạch nhất. 2 credit đưa biên về hoà vốn +
   nhẹ, 4 credit đạt mục tiêu 60%.
2. **Hạ `effort` xuống `medium`/`low` cho kịch bản** (`src/lib/ai/claude.ts`).
   Giảm token sinh ra, giữ nguyên 1 credit. Phải đo lại chất lượng trước.
3. **Chấp nhận lỗ có chủ đích** — coi text là mồi kéo người dùng, lấy lại ở ảnh.
   Chỉ đúng nếu biên ảnh đủ dày, mà biên ảnh thì **chưa đo**.

Code đang để đúng 1 credit như đã chốt; `npm run economics` in cảnh báo mỗi lần
chạy cho tới khi có quyết định.

## Nếu biên ảnh mỏng

`PACKS` trong `src/lib/pricing.ts` đã dựng sẵn gói ảnh riêng (`image_99k`,
`kind: "IMAGE_ONLY"`) nhưng để `enabled: false`. Bật khi số đo cho thấy biên ảnh
trong gói MIXED xuống dưới ngưỡng — lúc đó text làm mồi kéo người dùng, ảnh bán
riêng.

## Chi phí ẩn phải nhớ

- **Tách nền** tính vào giá vốn ảnh nhưng chỉ chạy một lần cho mỗi sản phẩm
  (cache ở `products.cutoutImageKey`). Ảnh thứ hai trở đi không tốn khoản này.
- **Hoàn credit khi lỗi** nghĩa là mình chịu chi phí API của lần chạy hỏng. Tỷ lệ
  lỗi của provider đi thẳng vào biên — theo dõi bằng
  `SELECT status, count(*) FROM generations GROUP BY status`.
- **Prompt cache**: prompt hệ thống theo ngành là hằng số và đã đánh
  `cache_control`. Nhiều người bán cùng ngành dùng chung prefix. Kiểm bằng
  `usage.cache_read_input_tokens` — nếu luôn bằng 0 là cache hỏng ở đâu đó và
  giá vốn text đang cao hơn cần thiết.
- **Tỷ giá** `USD_VND` trong env, mặc định 26.300. Đổi khi tỷ giá lệch nhiều.
