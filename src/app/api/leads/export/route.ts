import { NextResponse } from "next/server";
import { getViewer } from "@/lib/entitlements-server";
import { fetchSavedLeads } from "@/lib/saved-leads-server";
import { buildLeadsCsv } from "@/lib/csv";

/**
 * CSV of every saved lead for the signed-in user.
 *
 * Server-side because the browser version could only export the permits that
 * happened to be loaded in `PermitsContext`, so an export of 40 saved leads
 * routinely produced a file with 12 rows and no indication that anything was
 * missing.
 *
 * Export is a paid feature, and contacts are redacted independently of that
 * check: if the gate is ever relaxed, the file still cannot carry contact
 * details to someone who is not entitled to them.
 */
export async function GET() {
  const { userId, entitled } = await getViewer();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!entitled) {
    return NextResponse.json(
      { error: "CSV export is available on paid plans" },
      { status: 403 }
    );
  }

  let csv: string;
  try {
    const leads = await fetchSavedLeads(userId, entitled);
    csv = buildLeadsCsv(leads);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[leads] export failed:", message);
    return NextResponse.json({ error: "Could not build export" }, { status: 503 });
  }

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="permitpulse-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
