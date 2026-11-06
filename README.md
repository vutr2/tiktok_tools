# Studio bán hàng — ảnh, mô tả, kịch bản

Web app giúp người bán **Shopee / TikTok Shop** tại Việt Nam làm xong nội dung cho
một sản phẩm trong vài phút: ảnh studio, mô tả chuẩn sàn và kịch bản video ngắn.

**Next.js 15 · React 19 · TypeScript · Supabase · Claude / DeepSeek · Gemini · SePay**

---

## Tính năng

| | Đầu vào | Đầu ra |
|---|---|---|
| 📸 **Ảnh sản phẩm** | Ảnh chụp bằng điện thoại | Tách nền rồi ghép vào tối đa 4 bối cảnh studio dựng sẵn theo ngành hàng. Người bán chọn bối cảnh nào muốn dựng. |
| 📝 **Mô tả sàn** | Ảnh + vài dòng thông tin | Tiêu đề cắt đúng giới hạn ký tự (Shopee 120, TikTok Shop 25–255), mô tả và hashtag. Có lọc các cụm từ dễ bị sàn gỡ listing. |
| 🎬 **Kịch bản video 30 giây** | Sản phẩm đã tạo | 5 kịch bản, mỗi kịch bản có hook 3 giây, lời thoại và gợi ý cảnh quay. Xem thử ngay trong khung điện thoại dọc 9:16: chữ trên màn hình hiện đúng giây, chạy trên chính ảnh studio vừa dựng. |

### Prompt riêng cho từng ngành hàng

Đây là điểm khác biệt chính. Người dùng chọn ngành ngay khi đăng ký, và mọi kết
quả đều dựa trên bộ prompt của ngành đó:

**Mỹ phẩm · Thời trang · Gia dụng · Mẹ & bé · Phụ kiện**

Mỗi bộ trong [`src/prompts/`](src/prompts/) định nghĩa giọng bán, điều người mua
quan tâm, các phản đối hay gặp, cách người mua gõ tìm kiếm, cụm từ bị cấm, ràng
buộc chính sách sàn, mẫu hook, từ vựng cảnh quay và 4 bối cảnh ảnh.

Kết quả từ model luôn được code kiểm lại trước khi tới tay người bán: cắt cứng
giới hạn ký tự, lọc cụm từ cấm, kiểm thời lượng kịch bản và độ dài hook. Model
đếm ký tự và đếm giây không đáng tin, nên phần này không giao cho model.

### Cố ý không làm

Quản lý đơn, quản lý kho, chat tự động, đăng bài tự động lên sàn. Lý do và ranh
giới: [`docs/scope.md`](docs/scope.md).

---

## Mô hình giá

- **Dùng thử:** 3 ngày, mỗi ngày 3 lượt (tính theo giờ Việt Nam). Lượt sinh bị
  lỗi không bị trừ vào hạn mức.
- **Gói trọn đời:** $200 (quy ra VND theo tỷ giá `USD_VND`), thanh toán qua SePay,
  dùng không giới hạn.

Quyền dùng được tính trực tiếp từ bảng `generations`, xem
[`src/lib/entitlement.ts`](src/lib/entitlement.ts). Mọi con số liên quan tới tiền
nằm ở một chỗ duy nhất: [`src/lib/pricing.ts`](src/lib/pricing.ts). Phân tích
giá vốn: [`docs/unit-economics.md`](docs/unit-economics.md).

---

## Công nghệ

| Phần | Dùng |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | Supabase Postgres, truy cập qua `supabase-js` từ phía server |
| Lưu ảnh | Supabase Storage (bucket riêng tư, xem ảnh qua signed URL) |
| Đăng nhập | JWT trong cookie httpOnly; Descope để xác minh email |
| Sinh text | Claude (mặc định) hoặc DeepSeek |
| Sinh ảnh | Gemini 3.1 Flash Image, Kling, hoặc `mock` để chạy không tốn tiền |
| Thanh toán | SePay |
| Kiểm thử | Vitest |

---

## Chạy trên máy

### Yêu cầu

- **Node.js 20.6 trở lên** (script `types:db` dùng `node --env-file`)
- Một project **Supabase** (gói miễn phí là đủ để phát triển)
- API key **Anthropic** (hoặc DeepSeek) để sinh text

### 1. Dựng database trên Supabase

1. Tạo project trên [supabase.com](https://supabase.com). Nên chọn region
   **Singapore** cho gần Việt Nam.
2. Vào **SQL Editor**, chạy lần lượt:
   - [`supabase/schema.sql`](supabase/schema.sql): tạo toàn bộ bảng. Chạy lại
     nhiều lần vẫn an toàn.
   - [`supabase/rls.sql`](supabase/rls.sql): bật RLS cho mọi bảng để đóng REST
     API công khai của Supabase. **Mỗi lần thêm bảng mới phải chạy lại file này.**
3. Vào **Storage**, tạo một bucket **riêng tư** tên `product-images`. Muốn đặt tên
   khác thì khai báo trong `SUPABASE_STORAGE_BUCKET`.

### 2. Tạo file `.env`

Tạo file `.env` ở thư mục gốc, tối thiểu gồm:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
AUTH_SECRET=<chuỗi ngẫu nhiên, tối thiểu 32 ký tự>
ANTHROPIC_API_KEY=<anthropic api key>
```

Tạo `AUTH_SECRET` bằng lệnh `openssl rand -base64 48`.

Danh sách đầy đủ ở phần [Biến môi trường](#biến-môi-trường).

### 3. Cài và chạy

```bash
npm install
npm run dev
```

Mở <http://localhost:3000>.

Mặc định `IMAGE_PROVIDER=mock`: app chạy được ngay mà không tốn tiền sinh ảnh.
Toàn bộ luồng (đếm lượt, lưu file, hiển thị) đều chạy thật, chỉ có ảnh trả về là
ảnh gốc. Muốn sinh ảnh thật thì đặt `IMAGE_PROVIDER=gemini` và `GEMINI_API_KEY`.

---

## Biến môi trường

### Bắt buộc

| Biến | Ý nghĩa |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key service role. Có toàn quyền và bỏ qua RLS, chỉ dùng phía server. **Không bao giờ để lộ.** |
| `AUTH_SECRET` | Khoá ký phiên đăng nhập, tối thiểu 32 ký tự |
| `ANTHROPIC_API_KEY` | Bắt buộc khi `TEXT_PROVIDER=claude` (mặc định) |

### Tuỳ chọn

| Nhóm | Biến | Mặc định / ghi chú |
|---|---|---|
| Sinh text | `TEXT_PROVIDER` | `claude` · hoặc `deepseek` |
| | `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` | Khi dùng DeepSeek |
| | `DEEPSEEK_TEXT_MODEL` | `deepseek-v4-flash` |
| | `DEEPSEEK_VISION_MODEL` | `deepseek-v4-flash-vision-exp` |
| Sinh ảnh | `IMAGE_PROVIDER` | `mock` · hoặc `gemini`, `kling` |
| | `GEMINI_API_KEY` | Khi dùng Gemini |
| | `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image-preview` |
| | `KLING_API_KEY`, `KLING_BASE_URL` | Khi dùng Kling |
| | `KLING_IMAGE_MODEL` | `kling-v2-1` |
| Lưu trữ | `SUPABASE_STORAGE_BUCKET` | `product-images` |
| Đăng nhập | `NEXT_PUBLIC_DESCOPE_PROJECT_ID` | Bật màn đăng nhập Descope có xác minh email |
| | `NEXT_PUBLIC_DESCOPE_BASE_URL`, `NEXT_PUBLIC_DESCOPE_FLOW_ID` | Tuỳ chỉnh Descope |
| Thanh toán | `SEPAY_ENV` | `sandbox` · đặt `production` khi nhận tiền thật |
| | `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY` | Bỏ trống thì trang thanh toán báo chưa cấu hình |
| | `NEXT_PUBLIC_BASE_URL` | Địa chỉ gốc để SePay chuyển người dùng về. Bỏ trống thì dùng `VERCEL_URL`, rồi `http://localhost:3000` |
| | `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER` | Thông tin tài khoản ngân hàng hiển thị ở trang ví |
| Dùng thử & giá | `TRIAL_DAYS` | `3` · đặt `0` để tắt dùng thử |
| | `TRIAL_PER_DAY` | `3` |
| | `TRIAL_TIMEZONE` | `Asia/Ho_Chi_Minh` |
| | `USD_VND` | `26300` |
| | `IMAGE_COST_VND_PER_SCENE` | Giá vốn mỗi ảnh lấy từ hoá đơn provider, dùng cho `npm run economics` |
| Theo dõi | `META_PIXEL_ID` | Meta Pixel. Chỉ chạy khi `NODE_ENV=production` |

> **Lưu ý về biến `NEXT_PUBLIC_*`:** Next.js nhúng giá trị của chúng vào bundle
> **lúc build**, không phải lúc chạy. Biến phải có trong môi trường build, và đổi
> giá trị thì phải build lại. Các biến chỉ dùng phía server không nên đặt tiền tố
> này.

> **Đăng nhập khi chưa cấu hình Descope:** màn đăng nhập rơi về form chỉ nhập email,
> không xác minh. Chế độ này chỉ dùng cho phát triển trên máy.

---

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy server phát triển |
| `npm run build` / `npm start` | Build và chạy bản production |
| `npm test` | Chạy toàn bộ test (Vitest), không cần database |
| `npm run typecheck` | Kiểm kiểu TypeScript |
| `npm run types:db` | Sinh lại [`src/lib/database.types.ts`](src/lib/database.types.ts) từ schema Supabase đang chạy. Chạy sau mỗi lần đổi schema. |
| `npm run economics` | In bảng kinh tế đơn vị. Thoát với mã 1 nếu chưa có số đo giá ảnh thật. |
| `npm run probe:image-cost -- <ảnh> <số lần>` | Gọi provider ảnh thật để đo giá vốn. **Lệnh này tốn tiền.** |

---

## Cấu trúc thư mục

```
src/
  app/
    page.tsx                Trang giới thiệu + đăng nhập
    onboarding/             Chọn ngành hàng
    app/                    Khu vực đã đăng nhập
      new/                  Tạo sản phẩm mới
      p/[id]/               Bàn làm việc của một sản phẩm: ảnh, mô tả, kịch bản
      wallet/  pay/[id]/    Mua gói, thanh toán
      profile/              Hồ sơ
    api/                    auth, products, payments (SePay callback + IPN), wallet, me
  components/
    script-player.tsx       Trình phát kịch bản 9:16
  lib/
    features.ts             Ba chức năng chính
    generation.ts           Vòng đời một lần sinh. Mọi lệnh gọi AI đều đi qua đây.
    entitlement.ts          Quyền dùng: dùng thử hoặc trọn đời
    pricing.ts              Mọi con số tiền
    marketplace.ts          Giới hạn ký tự Shopee / TikTok Shop
    timeline.ts             Dòng thời gian kịch bản
    ai/                     Provider text (claude, deepseek) và ảnh (gemini, kling, mock)
    auth.ts, descope.ts     Phiên đăng nhập
    storage.ts              Lưu ảnh trên Supabase Storage
    sepay.ts, payments.ts   Thanh toán
  prompts/                  Bộ prompt theo ngành hàng
supabase/
  schema.sql                Toàn bộ DDL
  rls.sql                   Bật RLS cho mọi bảng
scripts/                    Kinh tế đơn vị, đo giá ảnh, sinh kiểu DB
tests/                      Test Vitest
docs/                       Scope, kinh tế đơn vị
```

**Thêm provider AI mới:** implement `TextProvider` trong
[`src/lib/ai/text.ts`](src/lib/ai/text.ts) hoặc `ImageProvider` trong
[`src/lib/ai/image.ts`](src/lib/ai/image.ts), rồi thêm một `case` vào hàm chọn
provider. Phần còn lại của app không cần biết provider nào đang chạy.

**Đổi schema:** xem quy trình trong [`supabase/README.md`](supabase/README.md).

---

## Deploy lên Vercel

1. Import repo vào Vercel và khai báo các biến môi trường ở trên.
2. Đặt `NEXT_PUBLIC_BASE_URL` thành domain chính thức. `VERCEL_URL` đổi theo từng
   lần deploy nên không dùng làm địa chỉ quay về cố định được.
3. Trong dashboard SePay, trỏ IPN về `https://<domain>/api/payments/ipn`. Đây là
   đường xác nhận thanh toán đáng tin cậy, vì callback trên trình duyệt có thể không
   bao giờ chạy (người dùng đóng tab, chuyển sang app ngân hàng…).
4. Đặt `SEPAY_ENV=production` khi bắt đầu nhận tiền thật.
5. Trước khi có doanh thu thật, nên nâng Supabase lên gói Pro và bật
   Point-in-Time Recovery. Gói miễn phí chỉ giữ backup 7 ngày.

---

## Tài liệu thêm

- [`docs/scope.md`](docs/scope.md): phạm vi sản phẩm và lý do bỏ từng tính năng
- [`docs/unit-economics.md`](docs/unit-economics.md): giá vốn, biên lợi nhuận, lựa chọn provider ảnh
- [`supabase/README.md`](supabase/README.md): cách đổi schema và sinh kiểu TypeScript
