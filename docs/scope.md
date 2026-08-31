# Scope MVP — chốt

## Ba chức năng, không hơn

### 1. Ảnh sản phẩm
Upload ảnh chụp điện thoại → tách nền → ghép vào **4 bối cảnh studio dựng sẵn theo
ngành hàng**.

- Code: `src/lib/features.ts` → `generateProductPhotos`
- Bối cảnh: `src/prompts/<ngành>.ts` → `scenes` (đúng 4 mỗi ngành)
- Tách nền chạy một lần rồi cache vào `products.cutoutImageKey`.
- Người bán chọn bối cảnh nào muốn dựng — không ép chạy đủ 4, vì mỗi ảnh là tiền.

### 2. Mô tả sàn
Ảnh + vài dòng thông tin → tiêu đề **chuẩn ký tự Shopee/TikTok** + mô tả + hashtag.

- Code: `src/lib/features.ts` → `generateListing`
- Giới hạn ký tự: `src/lib/marketplace.ts` (Shopee 120, TikTok Shop 25–255)
- Model đếm ký tự không đáng tin, nên tầng code cắt cứng lần nữa rồi mới trả về.
- Output đi qua bộ lint cụm cấm theo ngành trước khi tới tay người bán.

### 3. Kịch bản video 30s
5 kịch bản, mỗi cái có **hook 3 giây**, lời thoại, gợi ý cảnh quay.

- Code: `src/lib/features.ts` → `generateScripts`
- Ràng buộc 30s / hook 3s / tốc độ đọc do code kiểm (`auditScript`), không tin model tự đếm.
- Gợi ý cảnh quay lấy từ `shotVocabulary` của ngành, không viết chung chung.

## Bỏ — và lý do

| Bỏ | Lý do |
|---|---|
| Quản lý đơn | Không phải chỗ tạo khác biệt. Sàn làm rồi. |
| Quản lý kho | Như trên. |
| Chat tự động | Cần API sàn. |
| Đăng bài tự động lên sàn | **Đụng vào API sàn là chết 2 tháng ở khâu duyệt.** |

Ranh giới này nằm trong code, không chỉ trong tài liệu: schema đúng 6 bảng, và
`GenerationType` chỉ có 3 giá trị. Thêm chức năng thứ tư sẽ phải sửa schema —
đó là ma sát cố ý.

## Điểm khác biệt duy nhất đáng đầu tư

**Prompt riêng theo ngành hàng.** Bắt chọn ngành ngay bước đầu (màn hình đăng
nhập không cho qua nếu chưa chọn).

Năm ngành: `MY_PHAM`, `THOI_TRANG`, `GIA_DUNG`, `ME_VA_BE`, `PHU_KIEN`.

Mỗi ngành có bộ riêng trong `src/prompts/<ngành>.ts`:

| Trường | Là gì | Dùng ở đâu |
|---|---|---|
| `voice` | Giọng bán của ngành | Cả mô tả lẫn kịch bản |
| `buyerCares` | Người mua thật sự cân nhắc gì | Mô tả |
| `objections` | Phản đối hay gặp | Kịch bản — mỗi kịch bản đập một cái |
| `searchPatterns` | Cách người mua gõ tìm kiếm | Cấu trúc tiêu đề |
| `bannedClaims` | Cụm bị cấm + cách sửa | Nhét vào prompt **và** hậu kiểm output |
| `compliance` | Ràng buộc pháp lý / chính sách sàn | Cả hai |
| `hookPatterns` | Mẫu hook 3 giây | Kịch bản |
| `shotVocabulary` | Từ vựng cảnh quay | Kịch bản |
| `scenes` | 4 bối cảnh studio | Ảnh |

`bannedClaims` là thứ đối thủ dùng prompt chung không có. Nó chạy hai chiều: đưa
vào prompt để model tránh, và quét lại output để bắt cái model vẫn viết ra. Ví dụ
đang bắt được:

- Mỹ phẩm: "trị mụn", "an toàn tuyệt đối" → gợi ý đổi thành "hỗ trợ giảm"
- Thời trang: tên thương hiệu khác (Zara, Nike…), "freesize" không kèm dải cân
- Gia dụng: "diệt khuẩn 99.9%" không có phiếu kiểm nghiệm, "bảo hành trọn đời"
- Mẹ & bé: mọi thứ dính tới sữa cho trẻ dưới 24 tháng (Nghị định 100/2014)
- Phụ kiện: ghi tên hãng kiểu gây hiểu là hàng hãng, "chống nước tuyệt đối"

Thêm ngành mới = thêm một file pack + một dòng trong `src/prompts/index.ts`.
Không sửa chỗ nào khác.

## Schema — đúng 6 bảng

`users`, `credit_wallet`, `credit_transactions`, `products`, `generations`, `payments`.

Không có bảng `sessions` (auth dùng JWT trong cookie). Không có bảng `scenes`
(bối cảnh là code, không phải dữ liệu — sửa bối cảnh là sửa prompt, phải qua
review, không phải sửa một dòng trong DB).

Luật credit nằm ở `src/lib/generation.ts`:

```
PENDING → DEBIT → RUNNING → SUCCEEDED
                     ↓
                  FAILED + REFUND
```

Trừ trước khi gọi API, hoàn lại nếu lỗi. Cả hai chiều đều có `idempotencyKey`
duy nhất nên retry hay webhook bắn lại cũng không trừ/hoàn hai lần.
