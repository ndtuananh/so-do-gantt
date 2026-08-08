import { getSupabaseServerClient } from "@/lib/supabase";
import GanttBoard from "@/components/GanttBoard";
import SyncButton from "@/components/SyncButton";
import type { GanttItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadData(): Promise<
  | { ok: true; items: GanttItem[]; lastSync: string | null }
  | { ok: false; message: string }
> {
  try {
    const supabase = getSupabaseServerClient();
    const [{ data: items, error: itemsError }, { data: logs }] = await Promise.all([
      supabase.from("gantt_items").select("*").order("ten_du_an").order("stt"),
      supabase.from("sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
    ]);
    if (itemsError) throw new Error(itemsError.message);
    return { ok: true, items: (items ?? []) as GanttItem[], lastSync: logs?.[0]?.synced_at ?? null };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export default async function Home() {
  const result = await loadData();

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Sơ đồ Gantt gia công — Xưởng AH9
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {result.ok
              ? `${result.items.length} hạng mục · ${
                  result.lastSync
                    ? `Đồng bộ lần cuối: ${new Date(result.lastSync).toLocaleString("vi-VN")}`
                    : "Chưa đồng bộ lần nào"
                }`
              : "Chưa kết nối được dữ liệu"}
          </p>
        </div>
        <SyncButton />
      </header>

      {result.ok ? (
        <GanttBoard items={result.items} />
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)]">
          <p className="mb-2 font-medium text-[var(--text-primary)]">Chưa thể tải dữ liệu.</p>
          <p className="mb-3">{result.message}</p>
          <p>
            Kiểm tra: đã chạy{" "}
            <code className="rounded bg-[var(--chip)] px-1 py-0.5">supabase/schema.sql</code> trong Supabase SQL
            Editor, và đã khai báo các biến môi trường{" "}
            <code className="rounded bg-[var(--chip)] px-1 py-0.5">SUPABASE_URL</code>,{" "}
            <code className="rounded bg-[var(--chip)] px-1 py-0.5">SUPABASE_SECRET_KEY</code> trên Vercel chưa.
          </p>
        </div>
      )}
    </main>
  );
}
