"use server";

import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";
import type { SyncResult } from "@/lib/types";

export async function syncNowAction(): Promise<SyncResult> {
  const result = await runSync();
  revalidatePath("/");
  return result;
}
