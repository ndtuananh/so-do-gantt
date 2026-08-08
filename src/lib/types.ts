export type GanttItem = {
  id: number;
  row_key: string;
  stt: string | null;
  ten_du_an: string;
  ma_code: string | null;
  hang_muc: string | null;
  giam_sat: string | null;
  tinh_trang_ban_ve: string | null;
  to_gia_cong: string | null;
  tinh_trang_gia_cong: string | null;
  so_luong_cau_kien: number | null;
  khoi_luong_ban_hanh: number | null;
  khoi_luong_chua_gia_cong: number | null;
  ngay_bat_dau: string | null; // ISO date
  ngay_ket_thuc: string | null; // ISO date
  rap_tho_khoi_luong_con_lai: number | null;
  han_tho_khoi_luong_con_lai: number | null;
  raw: Record<string, string>;
  updated_at: string;
};

export type StageProgress = {
  key: string;
  label: string;
  percent: number; // 0-100
  daDat: number;
  tong: number;
};

export type ProjectGroup = {
  ten_du_an: string;
  ma_code: string | null;
  items: GanttItem[];
  minDate: string | null;
  maxDate: string | null;
  totalKhoiLuong: number;
  totalConLai: number;
};

export type SyncResult = {
  status: "ok" | "error";
  rows_upserted: number;
  message: string;
  synced_at: string;
};
