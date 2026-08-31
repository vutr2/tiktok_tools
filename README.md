# Bộ công cụ bán hàng — ảnh, mô tả, kịch bản

Ba chức năng cho người bán Shopee / TikTok Shop tại Việt Nam. Không hơn.

1. **Ảnh sản phẩm** — ảnh chụp điện thoại → tách nền → ghép vào 4 bối cảnh studio
   dựng sẵn theo ngành hàng.
2. **Mô tả sàn** — ảnh + vài dòng thông tin → tiêu đề chuẩn ký tự Shopee/TikTok +
   mô tả + hashtag.
3. **Kịch bản video 30s** — 5 kịch bản, mỗi cái có hook 3 giây, lời thoại, gợi ý
   cảnh quay.

Không có: quản lý đơn, quản lý kho, chat tự động, đăng bài tự động lên sàn.
Lý do và ranh giới: [`docs/scope.md`](docs/scope.md).

Điểm khác biệt duy nhất được đầu tư: **bộ prompt riêng cho từng ngành hàng**
(mỹ phẩm / thời trang / gia dụng / mẹ&bé / phụ kiện) — giọng bán, nỗi lo người
mua, cụm từ bị cấm, mẫu hook và bối cảnh ảnh đều khác nhau theo ngành.

## Chạy thử

```bash
cp .env.example .env       # sửa DATABASE_URL và AUTH_SECRET
npm install
npm run db:push            # cần một Postgres đang chạy
npm run dev
```

Mặc định `IMAGE_PROVIDER=mock` nên chạy được ngay, không cần credential và không
tốn tiền — toàn bộ luồng trừ credit / hoàn credit / lưu file / hiển thị đều thật,
chỉ có ảnh trả về là ảnh gốc. Sinh text cần `ANTHROPIC_API_KEY`.

```bash
npm test          # 34 test, không cần DB
npm run typecheck
npm run economics # in bảng kinh tế đơn vị, exit 1 nếu chưa đo giá ảnh
```

## Kinh tế đơn vị

| | credit |
|---|---|
| 1 lần sinh text | 1 |
| 1 ảnh (1 bối cảnh) | 5 |
| Gói 99k | 60 credit |

Chi tiết, cách đo giá thật của provider ảnh, và **hai cảnh báo biên đang mở**:
[`docs/unit-economics.md`](docs/unit-economics.md).

Nguyên tắc: **trừ credit trước khi gọi API, hoàn lại nếu lỗi.** Cài ở
`src/lib/generation.ts`, cả hai chiều đều idempotent.

## Bản đồ code

```
prisma/schema.prisma      6 bảng, không hơn
src/prompts/              ★ bộ prompt theo ngành — chỗ tạo khác biệt
  <ngành>.ts              giọng, nỗi lo, cụm cấm, hook, cảnh quay, 4 bối cảnh
  types.ts                kiểu PromptPack + lintClaims (hậu kiểm cụm cấm)
src/lib/
  pricing.ts              ★ mọi con số tiền, một nguồn duy nhất
  credits.ts              sổ credit append-only, trừ nguyên tử
  generation.ts           ★ vòng đời trừ-trước / hoàn-khi-lỗi
  features.ts             3 chức năng
  marketplace.ts          giới hạn ký tự sàn + kiểm tiêu đề
  ai/claude.ts            sinh text (structured output + hậu kiểm)
  ai/image.ts             provider ảnh (mock | higgsfield)
scripts/
  unit-economics.ts       npm run economics
  probe-image-cost.ts     npm run probe:image-cost — đo giá thật
```

## Trước khi mở cho người dùng thật

- [ ] Đo giá ảnh thật của Higgsfield, chốt tỷ lệ credit (`npm run economics` đang
      exit 1 vì việc này).
- [ ] Quyết định giá cho kịch bản video — ở 1 credit đang lỗ, xem
      `docs/unit-economics.md`.
- [ ] Đối chiếu lại giới hạn ký tự Shopee/TikTok trên Seller Center
      (`src/lib/marketplace.ts`) — sàn đổi không báo trước.
- [ ] Đối chiếu endpoint Higgsfield với tài liệu của họ (`src/lib/ai/image.ts`).
- [ ] Đổi lưu file từ đĩa local sang S3/R2 (`src/lib/storage.ts`).
- [ ] Thêm OTP SMS/Zalo trước bước phát cookie (`src/lib/auth.ts`) — không thêm bảng.
- [ ] Thay webhook secret dùng chung bằng chữ ký cổng thanh toán thật.
