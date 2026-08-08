# KHGC AH9 — Sơ đồ Gantt gia công

Dashboard theo dõi tiến độ gia công các dự án tại Xưởng AH9, đồng bộ dữ liệu
từ Google Sheet. Next.js (App Router) + Supabase + Vercel Cron.

Deploy tự động qua GitHub → Vercel: mỗi lần push lên nhánh `main`, Vercel tự build và deploy.

## Kiến trúc

- **Next.js 16** (App Router, TypeScript, Tailwind) — giao diện Server + Client Components.
- **Supabase (Postgres)** — lưu dữ liệu đã đồng bộ trong bảng `gantt_items`, chỉ được truy cập
  từ phía server (Server Components / Route Handlers) bằng secret key. Không key nào lộ ra trình duyệt.
- **Google Sheet → CSV export** (`src/lib/sheet.ts`) — đọc dữ liệu công khai qua link export CSV,
  tự nhận diện cột theo từ khóa tiêu đề (không phụ thuộc thứ tự cột).
- **`/api/sync`** — route được gọi bởi Vercel Cron mỗi 30 phút (`vercel.json`), và bởi nút
  "Đồng bộ ngay" trên giao diện (Server Action, `src/app/actions.ts`).

## Việc cần làm 1 lần để chạy được (không thể tự động hoá vì cần quyền của bạn)

1. **Tạo bảng trong Supabase**: mở SQL Editor trong dashboard Supabase, dán và chạy nội dung
   `supabase/schema.sql`. (Tùy chọn: chạy thêm `supabase/seed_demo.sql` để xem giao diện có
   dữ liệu minh hoạ ngay, có thể xoá bất cứ lúc nào.)
2. **Chia sẻ Google Sheet công khai xem**: File > Chia sẻ > "Bất kỳ ai có đường liên kết" > Người xem.
   Không cần Service Account — sync đọc qua link export CSV công khai.
3. **Khai báo biến môi trường trên Vercel** (Project Settings > Environment Variables), xem
   `.env.example` để biết danh sách đầy đủ:
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   - `SHEET_ID`, `SHEET_GID`
   - `CRON_SECRET` (tuỳ chọn, chặn người ngoài gọi `/api/sync`)

## Phát triển local

```bash
npm install
cp .env.example .env.local   # điền giá trị thật
npm run dev
```

## Build

```bash
npm run build
```
