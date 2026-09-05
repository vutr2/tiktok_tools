-- Đóng cửa REST API (PostgREST) trên MỌI bảng của app.
--
-- Supabase phơi schema `public` ra REST API bằng `anon key` — key này vốn được
-- thiết kế để lộ công khai. Không bật RLS thì ai cầm key cũng đọc được.
--
-- App không dùng PostgREST: mọi truy vấn đi qua Prisma bằng role `postgres`
-- (có BYPASSRLS). Nên bật RLS và KHÔNG viết policy nào là đủ.
--
-- ⚠ CHẠY LẠI SAU MỖI LẦN `npm run db:push` TẠO BẢNG MỚI.
-- Bảng mới luôn sinh ra với RLS TẮT. Bảng rỗng trả `[]` giống hệt bảng bị
-- chặn, nên đừng lấy `[]` làm bằng chứng — kiểm bằng truy vấn cuối file.

-- Lõi nghiệp vụ
alter table public.users               enable row level security;
alter table public.credit_wallet       enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.products            enable row level security;
alter table public.generations         enable row level security;
alter table public.payments            enable row level security;

-- Vận hành
alter table public.sessions            enable row level security;
alter table public.saved_scripts       enable row level security;
alter table public.generated_assets    enable row level security;
alter table public.api_usage           enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.notifications       enable row level security;

-- Kiểm tra: PHẢI không còn dòng nào. Có dòng nào hiện ra là bảng đó đang hở.
select tablename as "BẢNG CÒN HỞ"
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;
