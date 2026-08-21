import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getViewer } from "@/lib/entitlements-server";
import { mapRowToPermit, selectColumns } from "@/lib/permit-columns";

/**
 * One permit by id, with contact details resolved for the caller.
 *
 * This exists so `/permits/[id]` works on a cold load. The detail page used to
 * read from `PermitsContext`, which meant a bookmarked or shared link showed
 * "Permit not found" in any session that had not already browsed to it.
 *
 * Cache only. A permit that exists solely in a live adapter response has no
 * stable home to fetch it from — its id prefix identifies the adapter, not a
 * queryable key — so a miss is reported honestly rather than guessed at.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing permit id" }, { status: 400 });
  }

  const { entitled } = await getViewer();

  const { data, error } = await supabaseAdmin
    .from("permits")
    .select(selectColumns(entitled))
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[permits] lookup failed for", id, error.code);
    return NextResponse.json(
      { error: "Permit lookup is temporarily unavailable" },
      { status: 503 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  return NextResponse.json({
    permit: mapRowToPermit(data as unknown as Record<string, unknown>, entitled),
  });
}
