"use client";

import { Fragment, useMemo, useState } from "react";
import type { GanttItem } from "@/lib/types";
import {
  groupByProject,
  buildTimelineScale,
  barStyle,
  formatDate,
  formatNumber,
  computeStageProgress,
} from "@/lib/timeline";
import { statusMeta, STATUS_LEGEND } from "@/lib/status";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function GanttBoard({ items }: { items: GanttItem[] }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GanttItem | null>(null);

  const scale = useMemo(() => buildTimelineScale(items), [items]);

  const filteredItems = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return items;
    return items.filter((i) =>
      normalize(
        [i.ten_du_an, i.ma_code, i.hang_muc, i.to_gia_cong, i.giam_sat, i.tinh_trang_gia_cong]
          .filter(Boolean)
          .join(" ")
      ).includes(q)
    );
  }, [items, search]);

  const groups = useMemo(() => groupByProject(filteredItems), [filteredItems]);

  function toggleGroup(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo dự án, mã code, hạng mục, tổ gia công…"
          className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)]"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
          {STATUS_LEGEND.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
        {/* Timeline header */}
        <div className="grid grid-cols-[minmax(220px,280px)_1fr] border-b border-[var(--border)]">
          <div className="border-r border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
            Dự án / Hạng mục
          </div>
          <div className="relative h-9">
            {scale.months.map((m, idx) => (
              <div
                key={idx}
                className="absolute top-0 h-full border-l border-[var(--grid)] pl-1.5 text-[11px] text-[var(--text-secondary)]"
                style={{ left: `${m.leftPct}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {groups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            Không tìm thấy dữ liệu phù hợp.
          </div>
        )}

        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.ten_du_an);
          return (
            <div key={group.ten_du_an} className="border-b border-[var(--border)] last:border-b-0">
              <button
                onClick={() => toggleGroup(group.ten_du_an)}
                className="grid w-full grid-cols-[minmax(220px,280px)_1fr] items-center bg-[var(--page)] text-left hover:opacity-90"
              >
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <span className="text-[var(--text-secondary)]">{isCollapsed ? "▸" : "▾"}</span>
                  <span className="truncate text-sm font-semibold text-[var(--text-primary)]" title={group.ten_du_an}>
                    {group.ten_du_an}
                  </span>
                  {group.ma_code && (
                    <span className="shrink-0 rounded bg-[var(--chip)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                      {group.ma_code}
                    </span>
                  )}
                </div>
                <div className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">
                  {group.items.length} hạng mục · Còn lại {formatNumber(group.totalConLai)} / {formatNumber(group.totalKhoiLuong)} tấn
                </div>
              </button>

              {!isCollapsed &&
                group.items.map((item) => {
                  const status = statusMeta(item.tinh_trang_gia_cong, item.khoi_luong_chua_gia_cong);
                  const hasDates = item.ngay_bat_dau && item.ngay_ket_thuc;
                  const bar = hasDates
                    ? barStyle(item.ngay_bat_dau as string, item.ngay_ket_thuc as string, scale)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(220px,280px)_1fr] items-center border-t border-[var(--grid)] hover:bg-[var(--page)]"
                    >
                      <button
                        onClick={() => setSelected(item)}
                        className="flex min-w-0 flex-col gap-0.5 px-4 py-2 text-left"
                      >
                        <span className="truncate text-sm text-[var(--text-primary)]" title={item.hang_muc ?? undefined}>
                          {item.hang_muc || "(chưa đặt tên hạng mục)"}
                        </span>
                        <span className="truncate text-[11px] text-[var(--text-secondary)]">
                          {item.to_gia_cong || "—"}
                        </span>
                      </button>
                      <div className="relative h-11 px-0">
                        {scale.months.map((m, idx) => (
                          <div
                            key={idx}
                            className="absolute top-0 h-full border-l border-[var(--grid)]"
                            style={{ left: `${m.leftPct}%` }}
                          />
                        ))}
                        {scale.todayPct !== null && (
                          <div
                            className="absolute top-0 h-full w-px bg-[var(--series-1)]"
                            style={{ left: `${scale.todayPct}%` }}
                          />
                        )}
                        {bar ? (
                          <button
                            onClick={() => setSelected(item)}
                            className="group absolute top-1/2 h-4 -translate-y-1/2 rounded-full"
                            style={{
                              left: `${bar.leftPct}%`,
                              width: `${bar.widthPct}%`,
                              background: status.color,
                            }}
                          >
                            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden w-max max-w-64 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-left text-[11px] text-[var(--text-primary)] shadow-lg group-hover:block">
                              <strong className="block truncate">{item.hang_muc}</strong>
                              {formatDate(item.ngay_bat_dau)} → {formatDate(item.ngay_ket_thuc)}
                              <br />
                              {status.label} · {formatNumber(item.khoi_luong_chua_gia_cong)} tấn còn lại
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelected(item)}
                            className="group absolute left-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5"
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                            <span className="text-[11px] text-[var(--text-secondary)]">{status.label} · Chưa có kế hoạch</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailPanel({ item, onClose }: { item: GanttItem; onClose: () => void }) {
  const status = statusMeta(item.tinh_trang_gia_cong, item.khoi_luong_chua_gia_cong);
  const rawEntries = Object.entries(item.raw ?? {});
  const hasDates = Boolean(item.ngay_bat_dau && item.ngay_ket_thuc);
  const stages = computeStageProgress(item);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-[var(--surface-1)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{item.hang_muc || item.ten_du_an}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{item.ten_du_an}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ✕
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            style={{ background: status.color + "22", color: status.color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs " +
              (hasDates
                ? "bg-[var(--series-1)]/15 text-[var(--series-1)]"
                : "bg-[var(--chip)] text-[var(--text-secondary)]")
            }
          >
            {hasDates ? "Có kế hoạch" : "Chưa có kế hoạch"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-[var(--text-secondary)]">Mã code</dt>
          <dd className="text-[var(--text-primary)]">{item.ma_code || "—"}</dd>
          <dt className="text-[var(--text-secondary)]">Tổ gia công</dt>
          <dd className="text-[var(--text-primary)]">{item.to_gia_cong || "—"}</dd>
          <dt className="text-[var(--text-secondary)]">Giám sát</dt>
          <dd className="text-[var(--text-primary)]">{item.giam_sat || "—"}</dd>
          <dt className="text-[var(--text-secondary)]">Ngày bắt đầu</dt>
          <dd className="text-[var(--text-primary)]">{formatDate(item.ngay_bat_dau)}</dd>
          <dt className="text-[var(--text-secondary)]">Ngày kết thúc</dt>
          <dd className="text-[var(--text-primary)]">{formatDate(item.ngay_ket_thuc)}</dd>
          <dt className="text-[var(--text-secondary)]">Số lượng cấu kiện</dt>
          <dd className="text-[var(--text-primary)]">{formatNumber(item.so_luong_cau_kien)}</dd>
          <dt className="text-[var(--text-secondary)]">Khối lượng ban hành</dt>
          <dd className="text-[var(--text-primary)]">{formatNumber(item.khoi_luong_ban_hanh)} tấn</dd>
          <dt className="text-[var(--text-secondary)]">Khối lượng còn lại</dt>
          <dd className="text-[var(--text-primary)]">{formatNumber(item.khoi_luong_chua_gia_cong)} tấn</dd>
        </dl>

        {stages.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Tiến độ theo công đoạn</h3>
            <div className="flex flex-col gap-3">
              {stages.map((s) => {
                const stageColor = s.percent >= 100 ? "#0ca30c" : "#2a78d6";
                return (
                  <div key={s.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--text-primary)]">{s.label}</span>
                      <span className="text-[var(--text-secondary)]">
                        {formatNumber(s.daDat)} / {formatNumber(s.tong)} tấn · {s.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--chip)]">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${s.percent}%`, background: stageColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rawEntries.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
              Toàn bộ dữ liệu gốc từ Sheet ({rawEntries.length} cột)
            </summary>
            <dl className="mt-2 grid grid-cols-[1fr_1fr] gap-x-3 gap-y-1.5 text-xs">
              {rawEntries.map(([k, v]) => (
                <Fragment key={k}>
                  <dt className="truncate text-[var(--text-secondary)]" title={k}>
                    {k}
                  </dt>
                  <dd className="truncate text-[var(--text-primary)]" title={v}>
                    {v}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </details>
        )}
      </div>
    </div>
  );
}
