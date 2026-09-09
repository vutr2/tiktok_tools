# Schema trên Supabase

Prisma đã gỡ hẳn. Không còn `db:push`, không còn `DATABASE_URL` lúc chạy.

## Đổi schema như thế nào

1. Viết file SQL mới trong `migrations/`, đặt tên theo thứ tự thời gian:
   `migrations/20260905-them-cot-abc.sql`
2. Dán vào **Supabase Dashboard → SQL Editor** → Run.
3. Bảng mới thì chạy lại `rls.sql` — **bảng mới luôn sinh ra với RLS TẮT**.
4. Sinh lại kiểu TypeScript: `npm run types:db`

## Vì sao kiểu đọc từ database, không đọc từ file

`npm run types:db` gọi `GET /rest/v1/` — PostgREST phơi toàn bộ schema qua
OpenAPI kèm kiểu cột, enum, default và cột nào NOT NULL.

Đọc thẳng từ database thì kiểu không bao giờ lệch với thực tế. Đọc từ file
schema thì file có thể quên cập nhật, còn database thì không.

## Các file

| | |
|---|---|
| `schema.sql` | Toàn bộ DDL. **Chạy lại được vô hại** — dựng đủ trên DB rỗng, không đổi gì trên DB đã có. |
| `rls.sql` | Bật RLS cho mọi bảng. **Chạy lại sau mỗi lần thêm bảng.** |
| `migrations/` | Từng thay đổi schema, theo thứ tự. |

## Biến môi trường

Lúc chạy chỉ cần hai biến:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

**Đừng đặt tên có tiền tố `NEXT_PUBLIC_`.** Next nướng cứng mọi tham chiếu tĩnh
`process.env.NEXT_PUBLIC_X` vào lúc build; biến chưa có lúc build thì `undefined`
bị đóng băng vĩnh viễn, đặt lại trên hosting cũng vô ích cho tới khi deploy lại.
Cả ba biến trên chỉ dùng phía server nên không cần tiền tố.

(`NEXT_PUBLIC_SUPABASE_URL` vẫn được chấp nhận để tương thích ngược.)

`SUPABASE_SERVICE_ROLE_KEY` bỏ qua RLS — tương đương quyền role `postgres`.
Nó chỉ được dùng phía server; `src/lib/supabase.ts` có `import "server-only"`
để lộ ra bundle trình duyệt là build gãy ngay.
