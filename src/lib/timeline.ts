import type { GanttItem, ProjectGroup } from "./types";

const DAY_MS = 86_400_000;

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

export type TimelineScale = {
  startMs: number;
  endMs: number;
  months: { label: string; leftPct: number }[];
  todayPct: number | null;
};

export function buildTimelineScale(items: GanttItem[]): TimelineScale {
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
    const pad = Math.max((maxMs - minMs) * 0.05, 7 * DAY_MS);
    start = new Date(minMs - pad);
    end = new Date(maxMs + pad);
  }

  const startMs = start.getTime();
  const endMs = end.getTime();
  const span = endMs - startMs;

  const months: { label: string; leftPct: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor.getTime() <= endMs) {
    const leftPct = ((cursor.getTime() - startMs) / span) * 100;
    if (leftPct >= 0 && leftPct <= 100) {
      months.push({
        label: `Th${cursor.getMonth() + 1}/${cursor.getFullYear()}`,
        leftPct,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const now = Date.now();
  const todayPct = now >= startMs && now <= endMs ? ((now - startMs) / span) * 100 : null;

  return { startMs, endMs, months, todayPct };
}

export function dateToPct(iso: string, scale: TimelineScale): number {
  const ms = new Date(iso).getTime();
  const span = scale.endMs - scale.startMs;
  const pct = ((ms - scale.startMs) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function barStyle(
  startIso: string,
  endIso: string,
  scale: TimelineScale
): { leftPct: number; widthPct: number } {
  const leftPct = dateToPct(startIso, scale);
  const rightPct = dateToPct(endIso, scale);
  const widthPct = Math.max(rightPct - leftPct, 0.8);
  return { leftPct, widthPct };
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
