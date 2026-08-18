import { NextRequest, NextResponse } from "next/server";
import type { Permit, Trade, PermitStatus, ContactConfidence } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchLivePermits, dateNDaysAgo } from "@/lib/permit-adapters";

function mapRowToPermit(row: Record<string, unknown>): Permit {
  return {
    id: row.id as string,
    permitNumber: row.permit_number as string,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    zip: row.zip as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    filingDate: row.filing_date as string,
    description: row.description as string,
    estimatedValue: Number(row.estimated_value),
    status: (row.status as PermitStatus) || "Issued",
    trades: (row.trades as Trade[]) || [],
    gcContact: {
      companyName: (row.gc_company_name as string) || "Unknown Contractor",
      contactName: (row.gc_contact_name as string) || null,
      phone: (row.gc_phone as string) || null,
      email: (row.gc_email as string) || null,
      confidence: ((row.gc_confidence as string) || "Low") as ContactConfidence,
    },
    source: row.source as string,
    sourceUpdatedAt: (row.source_updated_at as string) || "",
  };
}

export async function GET(request: NextRequest) {
  const metrosParam = request.nextUrl.searchParams.get("metros") || request.nextUrl.searchParams.get("metro") || "chicago";
  const days = Math.min(Number(request.nextUrl.searchParams.get("days") || "30"), 90);
  const source = request.nextUrl.searchParams.get("source");

  const metroIds = metrosParam.split(",").filter(Boolean);

  if (metroIds.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  if (source !== "live") {
    try {
      const cutoff = dateNDaysAgo(days);
      const { data, error } = await supabaseAdmin
        .from("permits")
        .select("*")
        .in("metro", metroIds)
        .gte("filing_date", cutoff)
        .order("filing_date", { ascending: false })
        .limit(500);

      if (!error && data && data.length > 0) {
        return NextResponse.json(data.map(mapRowToPermit));
      }
    } catch {}
  }

  try {
    const permits = await fetchLivePermits(metroIds, days);
    return NextResponse.json(permits);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
