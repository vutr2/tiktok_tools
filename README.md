# Bộ công cụ bán hàng — ảnh, mô tả, kịch bản

Ba chức năng cho người bán Shopee / TikTok Shop tại Việt Nam. Không hơn.

1. **Ảnh sản phẩm** — ảnh chụp điện thoại → tách nền → ghép vào 4 bối cảnh studio
   dựng sẵn theo ngành hàng.
2. **Mô tả sàn** — ảnh + vài dòng thông tin → tiêu đề chuẩn ký tự Shopee/TikTok +
   mô tả + hashtag.
3. **Kịch bản video 30s** — 5 kịch bản, mỗi cái có hook 3 giây, lời thoại, gợi ý
   cảnh quay — **xem thử ngay trong khung điện thoại dọc 9:16**: chữ on-screen
   nhảy đúng giây, chạy trên chính ảnh studio vừa dựng ở bước 1.

Không có: quản lý đơn, quản lý kho, chat tự động, đăng bài tự động lên sàn.
Lý do và ranh giới: [`docs/scope.md`](docs/scope.md).

Điểm khác biệt duy nhất được đầu tư: **bộ prompt riêng cho từng ngành hàng**
(mỹ phẩm / thời trang / gia dụng / mẹ&bé / phụ kiện) — giọng bán, nỗi lo người
mua, cụm từ bị cấm, mẫu hook và bối cảnh ảnh đều khác nhau theo ngành.

## Chạy thử

```bash
cp .env.example .env       # dán 2 chuỗi kết nối Supabase + đặt AUTH_SECRET
npm install
npm run types:db           # sinh kiểu TS từ database
npm run dev
```

Database là **Supabase Postgres** (Prisma giữ nguyên, chỉ đổi chuỗi kết nối).
Lấy `DATABASE_URL` + `DIRECT_URL` ở Dashboard > Connect > ORMs > Prisma. Sau
`db:push` nhớ chạy `prisma/rls.sql` — không bật RLS thì 6 bảng này đọc được từ
ngoài bằng `anon key`. Chi tiết và các bẫy khác: [`docs/supabase.md`](docs/supabase.md).

Mặc định `IMAGE_PROVIDER=mock` nên chạy được ngay, không cần credential và không
tốn tiền — toàn bộ luồng trừ credit / hoàn credit / lưu file / hiển thị đều thật,
chỉ có ảnh trả về là ảnh gốc. Sinh ảnh thật cần `GEMINI_API_KEY` +
`IMAGE_PROVIDER=gemini`; sinh text cần `ANTHROPIC_API_KEY`.

```bash
npm test          # 90 test, không cần DB
npm run typecheck
npm run economics # in bảng kinh tế đơn vị, exit 1 nếu chưa đo giá ảnh
```

## Kinh tế đơn vị

**Không có credit.** Người dùng mới có **6 lượt sinh miễn phí** — đúng một sản
phẩm trọn bộ (4 ảnh + mô tả + kịch bản) để xem thử kết quả. Hết lượt thì mua
**gói trọn đời $200**, sau đó dùng không giới hạn.

Quyền dùng đếm trực tiếp từ bảng `generations` (chỉ tính `SUCCEEDED`), xem
`src/lib/entitlement.ts`. Không sổ cái, không transaction, không gì để trôi lệch
— và lần gọi hỏng tự động không tính vào hạn mức.

Mỗi người dùng thử tốn ~7.118đ giá vốn provider. Hoà vốn gói trọn đời ở ~592 sản
phẩm, xem `lifetimeBreakEven()` trong `src/lib/pricing.ts`.

## Bản đồ code

```
supabase/schema.sql       12 bảng — 6 lõi nghiệp vụ + 6 vận hành
supabase/rls.sql          ★ đóng REST API Supabase — CHẠY LẠI sau mỗi lần thêm bảng
src/prompts/              ★ bộ prompt theo ngành — chỗ tạo khác biệt
  <ngành>.ts              giọng, nỗi lo, cụm cấm, hook, cảnh quay, 4 bối cảnh
  types.ts                kiểu PromptPack + lintClaims (hậu kiểm cụm cấm)
src/components/
  script-player.tsx       ★ trình phát kịch bản 9:16 — chức năng đinh
  account-menu.tsx        menu tài khoản + đăng xuất
src/lib/
  descope.ts              Descope làm cửa trước, app vẫn tự phát phiên
src/lib/
  timeline.ts             dòng thời gian kịch bản (seconds = thời lượng, phải cộng dồn)
  pricing.ts              ★ mọi con số tiền, một nguồn duy nhất
  credits.ts              sổ credit append-only, trừ nguyên tử
  generation.ts           ★ vòng đời trừ-trước / hoàn-khi-lỗi
  features.ts             3 chức năng
  marketplace.ts          giới hạn ký tự sàn + kiểm tiêu đề
  ai/text.ts              ★ chọn provider text (claude | deepseek)
  ai/text-core.ts         schema + hậu kiểm dùng chung cho mọi provider
  ai/claude.ts            Claude Opus 5 (structured output ràng buộc schema)
  ai/deepseek.ts          DeepSeek V4 (json_object + tự kiểm Zod + retry)
  ai/image.ts             provider ảnh (mock | gemini "nano banana" | kling)
scripts/
  unit-economics.ts       npm run economics
  probe-image-cost.ts     npm run probe:image-cost — đo giá thật
```

## Trước khi mở cho người dùng thật

- [ ] Quyết định giá cho kịch bản video — ở 1 credit đang lỗ ~849đ/lần chạy, xem
      `docs/unit-economics.md`.
- [ ] Cân nhắc hạ ảnh từ 5 xuống 3 credit — biên vẫn 60%+ và trọn bộ một sản phẩm
      còn 14 credit thay vì 22.
- [ ] Sau vài trăm ảnh đầu: đối soát hoá đơn Google, điền `IMAGE_COST_VND_PER_SCENE`.
- [ ] Đối chiếu lại giới hạn ký tự Shopee/TikTok trên Seller Center
      (`src/lib/marketplace.ts`) — sàn đổi không báo trước.
- [ ] Đổi lưu file từ đĩa local sang Supabase Storage (`src/lib/storage.ts`) — trên
      Vercel thư mục `./storage` không sống qua lần deploy, ảnh sẽ mất.
- [ ] Lên Supabase Pro + bật PITR trước khi có doanh thu thật — `credit_transactions`
      là sổ tiền, backup 7 ngày của free tier không đủ.
- [ ] Bật Descope: điền `NEXT_PUBLIC_DESCOPE_PROJECT_ID` là màn đăng nhập tự đổi
      sang flow đã xác minh email. Bỏ trống thì vẫn chạy form email như cũ.
- [ ] Thay webhook secret dùng chung bằng chữ ký cổng thanh toán thật.
