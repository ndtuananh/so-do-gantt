import { getSupabaseServerClient } from "./supabase";
import { fetchSheetCsv, mapSheetToRows } from "./sheet";
import type { SyncResult } from "./types";

export async function runSync(): Promise<SyncResult> {
  const synced_at = new Date().toISOString();
  try {
    const csv = await fetchSheetCsv();
    const rows = mapSheetToRows(csv);

    if (rows.length === 0) {
      throw new Error("Không đọc được dòng dữ liệu nào từ Sheet.");
    }

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
