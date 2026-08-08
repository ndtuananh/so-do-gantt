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

    // Mirror the Sheet exactly: a project row removed from the Sheet should
    // disappear from the dashboard too, not linger as a stale entry.
    const currentKeys = new Set(rows.map((r) => r.row_key));
    const { data: existing } = await supabase.from("gantt_items").select("row_key");
    const staleKeys = (existing ?? [])
      .map((r) => r.row_key as string)
      .filter((k) => !currentKeys.has(k));
    let removed = 0;
    if (staleKeys.length > 0) {
      const { error: deleteError } = await supabase
        .from("gantt_items")
        .delete()
        .in("row_key", staleKeys);
      if (!deleteError) removed = staleKeys.length;
    }

    await supabase.from("sync_log").insert({
      synced_at,
      rows_upserted: rows.length,
      status: "ok",
      message: removed > 0 ? `Đã xoá ${removed} dòng không còn trong Sheet.` : null,
    });

    return {
      status: "ok",
      rows_upserted: rows.length,
      message:
        `Đồng bộ thành công ${rows.length} dòng` +
        (removed > 0 ? `, đã xoá ${removed} dòng không còn trong Sheet.` : "."),
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
