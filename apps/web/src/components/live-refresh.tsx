"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to the tournament's SSE stream and re-fetches the server
 * component when a change event arrives. Mounted only for viewers without
 * admin forms, so a refresh never lands under an arbiter's fingers.
 */
export function LiveRefresh({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource(`/turneringer/${tournamentId}/live`);
    let connectedBefore = false;
    source.onmessage = () => router.refresh();
    // EventSource reconnects by itself after a network drop; refresh once
    // on reconnect to catch anything missed while offline.
    source.onopen = () => {
      if (connectedBefore) router.refresh();
      connectedBefore = true;
    };
    return () => source.close();
  }, [tournamentId, router]);

  return null;
}
