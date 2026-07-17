import type { NextRequest } from "next/server";
import { tournamentAccess } from "@/lib/access";
import { tournamentStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const POLL_MS = 3000;
const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events: one `data:` event whenever the tournament changes,
 * plus comment heartbeats so proxies keep the connection open. Clients
 * (LiveRefresh) re-render on each event. Same visibility rule as the page;
 * the event carries only the change timestamp, never tournament data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!(await tournamentAccess(id))) return new Response(null, { status: 404 });

  const store = tournamentStore();
  let known = await store.lastModified(id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const finish = () => {
        clearInterval(poll);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };

      const poll = setInterval(() => {
        void store
          .lastModified(id)
          .then((current) => {
            if (current !== known) {
              known = current;
              controller.enqueue(encoder.encode(`data: ${current ?? "deleted"}\n\n`));
            }
          })
          .catch(finish);
      }, POLL_MS);
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          finish();
        }
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", finish);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
