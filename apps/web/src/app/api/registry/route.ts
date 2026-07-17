import { NextResponse, type NextRequest } from "next/server";
import { memberRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";

/**
 * Player lookup for signup forms and the arbiter's registration desk.
 * Public by design: the data is the public rating list. ?q= prefix-matches
 * a name part; &extended=1 switches to substring search.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);
  const registry = memberRegistry();
  const players =
    request.nextUrl.searchParams.get("extended") === "1"
      ? await registry.searchExtended(q)
      : await registry.search(q);
  return NextResponse.json(players);
}
