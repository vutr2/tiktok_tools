-- Đóng cửa REST API (PostgREST) trên 6 bảng của app.
--
-- Supabase phơi schema `public` ra REST API bằng `anon key` — key này vốn được
-- thiết kế để lộ công khai. Không bật RLS thì ai cầm key cũng đọc được `users`,
-- `payments`, `credit_transactions`.
--
-- App không dùng PostgREST: mọi truy vấn đi qua Prisma bằng role `postgres`
-- (có BYPASSRLS). Nên bật RLS và KHÔNG viết policy nào là đủ — cửa đóng với
-- người ngoài, Prisma vẫn vào bình thường.
--
-- Chạy lại sau mỗi lần `npm run db:push` tạo bảng mới.
-- Dashboard > SQL Editor > dán file này > Run.

alter table public.users               enable row level security;
alter table public.credit_wallet       enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.products            enable row level security;
alter table public.generations         enable row level security;
alter table public.payments            enable row level security;

-- Kiểm tra: cả 6 dòng phải có rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
