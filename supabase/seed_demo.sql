-- OPTIONAL: run this after schema.sql if you want to see the dashboard
-- populated before the real Google Sheet sync is turned on. These are
-- illustrative placeholder rows, not real project data — delete them any
-- time with: delete from gantt_items where row_key like 'DEMO-%';

insert into gantt_items
  (row_key, stt, ten_du_an, ma_code, hang_muc, giam_sat, to_gia_cong, tinh_trang_gia_cong,
   so_luong_cau_kien, khoi_luong_ban_hanh, khoi_luong_chua_gia_cong, ngay_bat_dau, ngay_ket_thuc, raw)
values
  ('DEMO-1', '1', 'DEMO — Dự án Nhà máy A', 'DEMO-001', 'Kết cấu khung thép', 'Tùng', 'Xưởng AH9', 'Đang gia công',
   120, 85.5, 32.0, '2026-08-01', '2026-08-25', '{}'),
  ('DEMO-2', '2', 'DEMO — Dự án Nhà máy A', 'DEMO-002', 'Bản mái', 'Tùng', 'Xưởng AH9', 'Chưa gia công',
   60, 40.2, 40.2, '2026-08-20', '2026-09-10', '{}'),
  ('DEMO-3', '3', 'DEMO — Dự án Cầu vượt B', 'DEMO-003', 'Dầm chính nhịp 1', 'Nghĩa', 'Gia công ngoài', 'Đã gia công',
   30, 122.9, 0, '2026-07-05', '2026-07-28', '{}'),
  ('DEMO-4', '4', 'DEMO — Dự án Cầu vượt B', 'DEMO-004', 'Dầm chính nhịp 2', 'Nghĩa', 'Gia công ngoài', 'Đang gia công',
   29, 109.3, 45.0, '2026-08-05', '2026-08-30', '{}'),
  ('DEMO-5', '5', 'DEMO — Dự án Kho vận C', 'DEMO-005', 'Cột chính', 'Thắng', 'Xưởng AH9', 'Chưa gia công',
   9, 0.5, 0.5, null, null, '{}')
on conflict (row_key) do nothing;
