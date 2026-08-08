import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

// Called by Vercel Cron (see vercel.json) and can be hit manually for
// debugging. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
// on cron-triggered requests when CRON_SECRET is set as an env var.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await runSync();
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 500 });
}
