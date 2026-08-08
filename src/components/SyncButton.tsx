"use client";

import { useState, useTransition } from "react";
import { syncNowAction } from "@/app/actions";

export default function SyncButton() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function handleClick() {
    setFeedback(null);
    startTransition(async () => {
      const result = await syncNowAction();
      setFeedback({ ok: result.status === "ok", text: result.message });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Đang đồng bộ…" : "Đồng bộ ngay"}
      </button>
      {feedback && (
        <span
          className={
            "text-sm " + (feedback.ok ? "text-[var(--status-good)]" : "text-[var(--status-critical)]")
          }
        >
          {feedback.text}
        </span>
      )}
    </div>
  );
}
