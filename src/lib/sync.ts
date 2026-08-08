import { getSupabaseServerClient } from "./supabase";
import { fetchSheetCsv, mapSheetToRows } from "./sheet";
import type { SyncResult } from "./types";

export async function runSync(): Promise<SyncResult> {
  const synced_at = new Date().toISOString();
  try {
    const csv = await fetchSheetCsv();
    const parsedRows = mapSheetToRows(csv);

    if (parsedRows.length === 0) {
      throw new Error("Không đọc được dòng dữ liệu nào từ Sheet.");
    }

    // Defense in depth: a single upsert batch fails outright if two rows
    // share the same conflict key (e.g. Sheet cells that produce identical
    // fallback keys), so de-duplicate by row_key before sending.
    const byRowKey = new Map<string, (typeof parsedRows)[number]>();
    for (const row of parsedRows) byRowKey.set(row.row_key, row);
    const rows = Array.from(byRowKey.values());

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("gantt_items")
      .upsert(
        rows.map((r) => ({ ...r, updated_at: synced_at })),
        { onConflict: "row_key" }
      );
    if (error) throw new Error(error.message);

    await supabase.from("sync_log").insert({
      synced_at,
      rows_upserted: rows.length,
      status: "ok",
      message: null,
    });

    return {
      status: "ok",
      rows_upserted: rows.length,
      message: `Đồng bộ thành công ${rows.length} dòng.`,
      synced_at,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("sync_log")
        .insert({ synced_at, rows_upserted: 0, status: "error", message });
    } catch {
      // best-effort logging only
    }
    return { status: "error", rows_upserted: 0, message, synced_at };
  }
}
