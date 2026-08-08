import type { GanttItem, ProjectGroup, StageProgress } from "./types";

const DAY_MS = 86_400_000;

export function computeStageProgress(item: GanttItem): StageProgress[] {
  const tong = item.khoi_luong_ban_hanh ?? 0;
  const stages: { key: string; label: string; conLai: number | null }[] = [
    { key: "tong", label: "Tổng gia công", conLai: item.khoi_luong_chua_gia_cong },
    { key: "rap_tho", label: "Ráp thô / 2D", conLai: item.rap_tho_khoi_luong_con_lai },
    { key: "han_tho", label: "Hàn thô / 2D", conLai: item.han_tho_khoi_luong_con_lai },
  ];

  return stages
    .filter((s) => s.conLai !== null && tong > 0)
    .map((s) => {
      const conLai = Math.max(0, Math.min(s.conLai as number, tong));
      const daDat = tong - conLai;
      const percent = Math.max(0, Math.min(100, (daDat / tong) * 100));
      return { key: s.key, label: s.label, percent, daDat, tong };
    });
}

export function groupByProject(items: GanttItem[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  for (const item of items) {
    const key = item.ten_du_an;
    let group = map.get(key);
    if (!group) {
      group = {
        ten_du_an: item.ten_du_an,
        ma_code: item.ma_code,
        items: [],
        minDate: null,
        maxDate: null,
        totalKhoiLuong: 0,
        totalConLai: 0,
      };
      map.set(key, group);
    }
    group.items.push(item);
    if (item.ngay_bat_dau && (!group.minDate || item.ngay_bat_dau < group.minDate)) {
      group.minDate = item.ngay_bat_dau;
    }
    if (item.ngay_ket_thuc && (!group.maxDate || item.ngay_ket_thuc > group.maxDate)) {
      group.maxDate = item.ngay_ket_thuc;
    }
    group.totalKhoiLuong += item.khoi_luong_ban_hanh ?? 0;
    group.totalConLai += item.khoi_luong_chua_gia_cong ?? 0;
  }
  return Array.from(map.values()).sort((a, b) => a.ten_du_an.localeCompare(b.ten_du_an, "vi"));
}

export type ZoomLevel = { label: string; dayWidth: number };

export const ZOOM_LEVELS: ZoomLevel[] = [
  { label: "Thu gọn", dayWidth: 3 },
  { label: "Vừa", dayWidth: 6 },
  { label: "Rộng", dayWidth: 12 },
  { label: "Chi tiết", dayWidth: 22 },
];

export type TimelineScale = {
  startMs: number;
  endMs: number;
  dayWidth: number;
  totalWidth: number;
  months: { label: string; leftPx: number; widthPx: number }[];
  todayLeftPx: number | null;
};

export function buildTimelineScale(items: GanttItem[], dayWidth: number): TimelineScale {
  const dated = items.filter((i) => i.ngay_bat_dau && i.ngay_ket_thuc);
  let start: Date;
  let end: Date;

  if (dated.length === 0) {
    const today = new Date();
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  } else {
    const starts = dated.map((i) => new Date(i.ngay_bat_dau as string).getTime());
    const ends = dated.map((i) => new Date(i.ngay_ket_thuc as string).getTime());
    const minMs = Math.min(...starts);
    const maxMs = Math.max(...ends);
    const pad = Math.max((maxMs - minMs) * 0.05, 14 * DAY_MS);
    start = new Date(new Date(minMs - pad).getFullYear(), new Date(minMs - pad).getMonth(), 1);
    end = new Date(maxMs + pad);
  }

  const startMs = start.getTime();
  const endMs = end.getTime();
  const totalWidth = Math.max(((endMs - startMs) / DAY_MS) * dayWidth, dayWidth);

  const months: { label: string; leftPx: number; widthPx: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor.getTime() <= endMs) {
    const monthStart = cursor.getTime();
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
    const leftPx = ((monthStart - startMs) / DAY_MS) * dayWidth;
    const widthPx = ((Math.min(nextMonth, endMs) - Math.max(monthStart, startMs)) / DAY_MS) * dayWidth;
    if (leftPx + widthPx >= 0 && leftPx <= totalWidth) {
      months.push({ label: `Th${cursor.getMonth() + 1}/${cursor.getFullYear()}`, leftPx, widthPx });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const now = Date.now();
  const todayLeftPx = now >= startMs && now <= endMs ? ((now - startMs) / DAY_MS) * dayWidth : null;

  return { startMs, endMs, dayWidth, totalWidth, months, todayLeftPx };
}

export function dateToPx(iso: string, scale: TimelineScale): number {
  const ms = new Date(iso).getTime();
  const px = ((ms - scale.startMs) / DAY_MS) * scale.dayWidth;
  return Math.min(scale.totalWidth, Math.max(0, px));
}

export function barStyle(
  startIso: string,
  endIso: string,
  scale: TimelineScale
): { leftPx: number; widthPx: number } {
  const leftPx = dateToPx(startIso, scale);
  const rightPx = dateToPx(endIso, scale);
  const widthPx = Math.max(rightPx - leftPx, 6);
  return { leftPx, widthPx };
}

// Assigns overlapping items within the same project to separate visual
// lanes (like a real Gantt chart) so concurrent hạng mục don't draw on top
// of each other when a project group is collapsed into a shared band.
export function assignLanes(items: GanttItem[]): Map<number, number> {
  const lanes: number[] = []; // lane[i] = end time (ms) of the last item placed there
  const laneOf = new Map<number, number>();
  const sorted = [...items]
    .filter((i) => i.ngay_bat_dau && i.ngay_ket_thuc)
    .sort((a, b) => (a.ngay_bat_dau as string).localeCompare(b.ngay_bat_dau as string));

  for (const item of sorted) {
    const startMs = new Date(item.ngay_bat_dau as string).getTime();
    const endMs = new Date(item.ngay_ket_thuc as string).getTime();
    let lane = lanes.findIndex((laneEnd) => laneEnd <= startMs);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(endMs);
    } else {
      lanes[lane] = endMs;
    }
    laneOf.set(item.id, lane);
  }
  return laneOf;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}

export function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
