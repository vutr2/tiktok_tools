# Supabase làm database

Supabase **là** Postgres. Prisma, 6 bảng, sổ credit, `$transaction` — giữ nguyên
hết, không viết lại tầng dữ liệu. Thứ duy nhất đổi là chuỗi kết nối.

Cụ thể **không** dùng: `supabase-js`, Supabase Auth, Supabase Realtime. App đã có
auth JWT-cookie ở `src/lib/auth.ts` và mọi truy vấn chạy phía server. Thêm một
client thứ hai vào chỉ tạo hai đường vào cùng một bảng, mỗi đường một luật.

## Cắm vào

1. Tạo project ở [supabase.com](https://supabase.com) — chọn region **Singapore**
   (gần Việt Nam nhất, tiết kiệm ~150ms mỗi truy vấn so với us-east).
2. Dashboard > nút **Connect** > tab **ORMs** > **Prisma**. Copy hai chuỗi, dán
   vào `.env`:
   - `DATABASE_URL` — cổng **6543**, có `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — cổng **5432**
3. Dựng bảng:

```bash
npm run db:push
```

4. Bật RLS (xem phần dưới — **đừng bỏ qua**):

```bash
# Dashboard > SQL Editor > dán nội dung file này > Run
cat prisma/rls.sql
```

5. `npm run dev`. Đăng nhập thử; vào Dashboard > Table Editor xem có bản ghi ở
   `users` và `credit_wallet` không.

## Vì sao hai chuỗi kết nối

| | cổng | dùng cho | vì sao |
|---|---|---|---|
| `DATABASE_URL` | 6543 | app lúc chạy | Next.js serverless: mỗi request một lambda. Nối thẳng thì vài chục người dùng đồng thời là hết connection của Postgres. |
| `DIRECT_URL` | 5432 | `db:push`, `migrate` | Pooler ở transaction mode không chạy được DDL. |

`?pgbouncer=true` là **bắt buộc** trên chuỗi 6543: pooler không giữ được prepared
statement giữa các request. Thiếu nó thì app chạy ngon lúc dev một mình rồi chết
ngẫu nhiên khi có tải thật, lỗi `prepared statement "s0" already exists`.
`src/lib/db.ts` chặn sẵn lúc khởi động ba trường hợp: chưa có `.env`, chuỗi kết nối còn là mẫu, và chuỗi 6543 thiếu `pgbouncer=true`.

Mật khẩu phải **URL-encode**: `@` → `%40`, `#` → `%23`, `/` → `%2F`. Dấu `@` thô
là bẫy tệ nhất — chuỗi vẫn trông đúng và `prisma db push` vẫn chạy (nó cắt ở `@`
cuối), nhưng bộ phân tích khác cắt ở `@` đầu rồi đi tìm hostname là đoạn giữa mật
khẩu. `src/lib/db-url.ts` bắt trường hợp này, có test ở `tests/db-url.test.ts`.

Đừng dùng chuỗi direct `db.<ref>.supabase.co:5432` cho `DIRECT_URL` — nó chỉ có
IPv6, muốn IPv4 phải mua add-on. Chuỗi session pooler (`...pooler.supabase.com:5432`)
làm đúng việc đó mà không tốn thêm.

## RLS — chỗ dễ mất sạch dữ liệu

Supabase phơi **toàn bộ schema `public`** ra REST API (PostgREST). Prisma tạo 6
bảng vào đúng `public` và không bật RLS. Nghĩa là: ai cầm `anon key` — thứ vốn
được thiết kế để lộ công khai — đều đọc/ghi được `users`, `payments`,
`credit_transactions`.

App này không bao giờ gọi PostgREST, nên cách xử lý gọn nhất là **đóng hẳn cửa đó**:
bật RLS trên cả 6 bảng, không viết policy nào. `anon` và `authenticated` mất sạch
quyền; Prisma kết nối bằng role `postgres` (có `BYPASSRLS`) nên không hề bị ảnh hưởng.

Chạy `prisma/rls.sql` **sau mỗi lần `db:push` tạo bảng mới**.

## `$transaction` qua pooler

`src/lib/credits.ts` dùng interactive transaction để trừ credit nguyên tử. Cái này
chạy được qua transaction pooler vì pooler ghim một connection suốt thời gian
transaction mở. Nếu về sau gặp lỗi lạ quanh transaction, đổi `DATABASE_URL` sang
chuỗi **session pooler** (cổng 5432) và giảm `connection_limit` — chậm hơn nhưng
hành xử y hệt Postgres thường.

Giữ transaction ngắn. Tuyệt đối không gọi API sinh ảnh/text bên trong
`$transaction` — mỗi giây giữ transaction là một connection của pool bị khoá.
Hiện `generation.ts` làm đúng: trừ credit (transaction ngắn) → đóng → mới gọi provider.

## Đối soát và backup

- Free tier: backup 7 ngày, không point-in-time. Có doanh thu thật thì lên Pro
  và bật PITR — `credit_transactions` là sổ tiền, mất là không dựng lại được.
- Xem drift ví bằng `auditWallet()` trong `src/lib/credits.ts`. Query nhanh trong
  SQL Editor:

```sql
select w."userId", w.balance, coalesce(sum(t.delta), 0) as ledger,
       w.balance - coalesce(sum(t.delta), 0) as drift
from credit_wallet w
left join credit_transactions t on t."userId" = w."userId"
group by w."userId", w.balance
having w.balance <> coalesce(sum(t.delta), 0);
```

Trả về 0 dòng là khớp sổ.

## Còn lại trên đĩa local

`src/lib/storage.ts` vẫn ghi ảnh xuống `./storage`. Trên Vercel thư mục này
không tồn tại giữa các lần deploy — ảnh sẽ mất. Supabase Storage là chỗ thay thế
hợp lý (cùng project, cùng credential), chỉ cần viết lại thân 3 hàm
`putImage` / `getImage` / `publicUrl`. Chưa làm trong lần đổi này.
