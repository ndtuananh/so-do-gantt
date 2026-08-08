-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists gantt_items (
  id bigserial primary key,
  row_key text unique not null,
  stt text,
  ten_du_an text not null,
  ma_code text,
  hang_muc text,
  giam_sat text,
  tinh_trang_ban_ve text,
  to_gia_cong text,
  tinh_trang_gia_cong text,
  so_luong_cau_kien numeric,
  khoi_luong_ban_hanh numeric,
  khoi_luong_chua_gia_cong numeric,
  ngay_bat_dau date,
  ngay_ket_thuc date,
  rap_tho_khoi_luong_con_lai numeric,
  han_tho_khoi_luong_con_lai numeric,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Safe to re-run: adds the two công đoạn columns if this table already
-- existed from an earlier version of schema.sql.
alter table gantt_items add column if not exists rap_tho_khoi_luong_con_lai numeric;
alter table gantt_items add column if not exists han_tho_khoi_luong_con_lai numeric;

create index if not exists gantt_items_ten_du_an_idx on gantt_items (ten_du_an);
create index if not exists gantt_items_dates_idx on gantt_items (ngay_bat_dau, ngay_ket_thuc);

create table if not exists sync_log (
  id bigserial primary key,
  synced_at timestamptz not null default now(),
  rows_upserted int not null,
  status text not null,
  message text
);

-- RLS stays off: all reads/writes go through the server (Next.js Server
-- Components / route handlers) using the Supabase secret key, never from
-- the browser.
