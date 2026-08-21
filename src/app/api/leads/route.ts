import { NextResponse } from "next/server";
import { getViewer } from "@/lib/entitlements-server";
import { fetchSavedLeads } from "@/lib/saved-leads-server";

/**
 * Every saved lead for the signed-in user, joined with its permit.
 *
 * Contact fields follow the same entitlement rule as the permit list, so the
 * dashboard cannot become a side door around the paywall.
 */
export async function GET() {
  const { userId, entitled } = await getViewer();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const leads = await fetchSavedLeads(userId, entitled);
    return NextResponse.json({ leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[leads] read failed:", message);
    return NextResponse.json(
      { error: "Could not load your saved leads" },
      { status: 503 }
    );
  }
}
