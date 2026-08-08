export type StatusKey = "good" | "warning" | "serious" | "critical" | "muted";

export type StatusMeta = {
  key: StatusKey;
  label: string;
  color: string; // fixed status palette, same in light/dark
};

const STATUS_COLORS: Record<StatusKey, string> = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  muted: "#898781",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function statusMeta(raw: string | null): StatusMeta {
  const label = (raw ?? "").trim() || "Chưa cập nhật";
  const n = normalize(label);

  let key: StatusKey = "muted";
  if (n.includes("hoan thanh") || n.includes("da gia cong") || n.includes("xong")) {
    key = "good";
  } else if (n.includes("dang gia cong") || n.includes("dang ")) {
    key = "warning";
  } else if (n.includes("cho ")) {
    key = "serious";
  } else if (n.includes("chua")) {
    key = "critical";
  }

  return { key, label, color: STATUS_COLORS[key] };
}

export const STATUS_LEGEND: { key: StatusKey; label: string; color: string }[] = [
  { key: "good", label: "Đã gia công / hoàn thành", color: STATUS_COLORS.good },
  { key: "warning", label: "Đang gia công", color: STATUS_COLORS.warning },
  { key: "serious", label: "Chờ xử lý", color: STATUS_COLORS.serious },
  { key: "critical", label: "Chưa gia công", color: STATUS_COLORS.critical },
  { key: "muted", label: "Chưa cập nhật trạng thái", color: STATUS_COLORS.muted },
];
