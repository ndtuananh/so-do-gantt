// Parses the AH9 tracking Google Sheet (exported as CSV) into typed rows.
//
// The sheet's headers span two merged rows and column order can shift as
// columns get hidden/added, so instead of hardcoding column positions we
// scan the first few rows for header text and match by keyword. Every
// column is also kept verbatim in `raw` so nothing is lost even if a
// keyword match misses.

export type ParsedRow = {
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
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  raw: Record<string, string>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  stt: ["stt"],
  ten_du_an: ["tên dự án", "ten du an"],
  ma_code: ["mã code", "ma code"],
  hang_muc: ["hạng mục", "hang muc"],
  giam_sat: ["giám sát", "giam sat"],
  tinh_trang_ban_ve: ["bản vẽ", "ban ve"],
  to_gia_cong: ["tổ gia công", "to gia cong"],
  tinh_trang_gia_cong: ["tình trạng gia công", "tinh trang gia cong"],
  so_luong_cau_kien: ["số lượng cấu kiện", "so luong cau kien"],
  khoi_luong_ban_hanh: ["khối lượng ban hành", "khoi luong ban hanh"],
  khoi_luong_chua_gia_cong: [
    "khối lượng chưa gia công",
    "khoi luong chua gia cong",
  ],
  ngay_bat_dau: ["ngày bắt đầu", "ngay bat dau"],
  ngay_ket_thuc: ["ngày kết thúc", "ngay ket thuc"],
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function buildColumnMap(headerRows: string[][]): Map<string, number> {
  // Merge up to 2 header rows so text split across a merged cell (row 2/3
  // in the sheet) still matches, e.g. "KHỐI LƯỢNG" / "BAN HÀNH BẢN VẼ".
  const width = Math.max(...headerRows.map((r) => r.length));
  const combined: string[] = [];
  for (let col = 0; col < width; col++) {
    combined.push(
      headerRows
        .map((r) => r[col] ?? "")
        .join(" ")
        .trim()
    );
  }

  const map = new Map<string, number>();
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    let bestCol = -1;
    for (let col = 0; col < combined.length; col++) {
      const normalized = normalize(combined[col]);
      if (keywords.some((k) => normalized.includes(normalize(k)))) {
        // Prefer the first (leftmost) match, but for fields with a more
        // specific keyword downstream, later exact matches can still win
        // when the earlier one was only a loose substring.
        if (bestCol === -1) bestCol = col;
      }
    }
    if (bestCol !== -1) map.set(field, bestCol);
  }
  return map;
}

function parseNumber(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\./g, "").replace(/,/g, ".").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo] = m;
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    const iso = `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : iso;
  }
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

export function mapSheetToRows(csvText: string): ParsedRow[] {
  const rows = parseCsv(csvText).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return [];

  // Find the header block: the first row that contains "TÊN DỰ ÁN" or
  // "HẠNG MỤC", plus the row right after it (headers are merged across 2
  // rows in the source sheet).
  let headerIdx = rows.findIndex((r) =>
    r.some((cell) => {
      const n = normalize(cell);
      return n.includes("ten du an") || n.includes("hang muc");
    })
  );
  if (headerIdx === -1) headerIdx = 0;

  const headerRows = [rows[headerIdx], rows[headerIdx + 1] ?? []];
  const colMap = buildColumnMap(headerRows);
  const dataRows = rows.slice(headerIdx + 2);

  const get = (r: string[], field: string): string | undefined => {
    const col = colMap.get(field);
    return col === undefined ? undefined : r[col];
  };

  const rawHeader = headerRows[0].map((h, i) => h || headerRows[1]?.[i] || `col_${i}`);

  const out: ParsedRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const ten_du_an = (get(r, "ten_du_an") ?? "").trim();
    if (!ten_du_an) continue; // skip section/blank rows with no project name

    const ma_code = (get(r, "ma_code") ?? "").trim() || null;
    const stt = (get(r, "stt") ?? "").trim() || null;
    const hang_muc = (get(r, "hang_muc") ?? "").trim() || null;

    const raw: Record<string, string> = {};
    rawHeader.forEach((h, idx) => {
      if (r[idx] !== undefined && r[idx] !== "") raw[h] = r[idx];
    });

    // Absolute sheet row number as fallback identity — guaranteed unique per
    // row (stt/ten_du_an/hang_muc can repeat when Sheet cells are merged).
    const sheetRowNumber = headerIdx + 2 + i + 1;
    const row_key = ma_code || `row-${sheetRowNumber}`;

    out.push({
      row_key,
      stt,
      ten_du_an,
      ma_code,
      hang_muc,
      giam_sat: (get(r, "giam_sat") ?? "").trim() || null,
      tinh_trang_ban_ve: (get(r, "tinh_trang_ban_ve") ?? "").trim() || null,
      to_gia_cong: (get(r, "to_gia_cong") ?? "").trim() || null,
      tinh_trang_gia_cong: (get(r, "tinh_trang_gia_cong") ?? "").trim() || null,
      so_luong_cau_kien: parseNumber(get(r, "so_luong_cau_kien")),
      khoi_luong_ban_hanh: parseNumber(get(r, "khoi_luong_ban_hanh")),
      khoi_luong_chua_gia_cong: parseNumber(get(r, "khoi_luong_chua_gia_cong")),
      ngay_bat_dau: parseDate(get(r, "ngay_bat_dau")),
      ngay_ket_thuc: parseDate(get(r, "ngay_ket_thuc")),
      raw,
    });
  }
  return out;
}

export async function fetchSheetCsv(): Promise<string> {
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? "0";
  if (!sheetId) throw new Error("Missing required env var: SHEET_ID");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Không tải được Google Sheet (HTTP ${res.status}). Kiểm tra Sheet đã bật chia sẻ "Anyone with the link – Viewer" chưa.`
    );
  }
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    throw new Error(
      'Google trả về trang HTML thay vì CSV — Sheet chưa được chia sẻ công khai. Vào Chia sẻ > "Bất kỳ ai có đường liên kết" > Người xem.'
    );
  }
  return text;
}
