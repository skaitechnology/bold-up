"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { runPrecheckAction } from "@/lib/actions/documents";

/**
 * If the coach left the page while a pre-check was pending, finish it when they come back,
 * so a document can never stay stuck in "pre-check in progress".
 */
export function PrecheckResumer({ documentIds }: { documentIds: string[] }) {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current || documentIds.length === 0) return;
    started.current = true;
    (async () => {
      for (const id of documentIds) await runPrecheckAction(id);
      router.refresh();
    })();
  }, [documentIds, router]);
  return null;
}
