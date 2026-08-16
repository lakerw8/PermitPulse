import { NextResponse } from "next/server";
import type { Permit, Trade, PermitStatus, ContactConfidence } from "@/lib/types";

const SODA_ENDPOINT =
  "https://data.cityofchicago.org/resource/ydr8-5enu.json";

const TRADE_KEYWORDS: Record<Trade, string[]> = {
  HVAC: ["hvac", "heating", "ventilation", "air condition", "cooling", "ductwork", "rooftop unit", "ahu", "chiller", "boiler", "furnace"],
  Electrical: ["electrical", "electric", "wiring", "panel", "switchgear", "generator", "transformer", "circuit", "conduit", "lighting"],
  Plumbing: ["plumbing", "plumb", "pipe", "water", "sewer", "drain", "fixture", "backflow", "grease trap", "sump"],
  Roofing: ["roof", "roofing", "membrane", "shingle", "tpo", "epdm", "flashing", "parapet"],
  "Fire Suppression": ["fire", "sprinkler", "suppression", "standpipe", "fire alarm", "smoke detector", "fire pump", "extinguish"],
  "Glass & Glazing": ["glass", "glazing", "window", "curtain wall", "storefront", "skylight"],
  Concrete: ["concrete", "foundation", "slab", "footing", "masonry", "block", "cement"],
  "Structural Steel": ["structural steel", "steel frame", "steel beam", "steel column", "iron work", "welding"],
  Demolition: ["demolition", "demo", "abatement", "tear down", "wrecking"],
  "General Construction": ["renovation", "remodel", "buildout", "build-out", "tenant improvement", "interior finish", "construction"],
};

const COMMERCIAL_KEYWORDS = [
  "commercial", "office", "retail", "restaurant", "hotel", "hospital",
  "medical", "warehouse", "industrial", "mixed-use", "multi-family",
  "apartment", "condo", "parking", "garage", "school", "church",
  "theater", "gym", "fitness", "data center", "laboratory", "lab",
];

const RESIDENTIAL_KEYWORDS = [
  "single family", "single-family", "sfh", "1-story residence",
  "2-story residence", "residential garage", "deck", "porch",
  "backyard", "driveway",
];

function classifyTrades(description: string): Trade[] {
  const lower = description.toLowerCase();
  const trades: Trade[] = [];
  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      trades.push(trade as Trade);
    }
  }
  if (trades.length === 0) {
    trades.push("General Construction");
  }
  return trades;
}

function isCommercial(record: Record<string, string>): boolean {
  const desc = (record.work_description || record._description || "").toLowerCase();
  const permitType = (record.permit_type || "").toLowerCase();

  if (RESIDENTIAL_KEYWORDS.some((kw) => desc.includes(kw))) return false;

  if (COMMERCIAL_KEYWORDS.some((kw) => desc.includes(kw))) return true;
  if (permitType.includes("permit - new construction")) return true;

  const value = parseFloat(record.reported_cost || record.estimated_cost || "0");
  if (value >= 200000) return true;

  return false;
}

function mapStatus(status: string | undefined): PermitStatus {
  if (!status) return "Issued";
  const s = status.toLowerCase();
  if (s.includes("issue")) return "Issued";
  if (s.includes("review") || s.includes("pending")) return "Under Review";
  if (s.includes("complete")) return "Completed";
  if (s.includes("approve")) return "Approved";
  return "Issued";
}

function extractGCName(record: Record<string, string>): string {
  return (
    record.contractor_1_name ||
    record.general_contractor ||
    record.contact_1_name ||
    "Unknown Contractor"
  );
}

interface SodaRecord {
  id: string;
  permit_: string;
  permit_type: string;
  work_description: string;
  _description?: string;
  street_number: string;
  street_direction: string;
  street_name: string;
  suffix: string;
  reported_cost: string;
  estimated_cost?: string;
  issue_date: string;
  permit_status?: string;
  contractor_1_name?: string;
  general_contractor?: string;
  contact_1_name?: string;
  contact_1_type?: string;
  contact_1_city?: string;
  contact_1_state?: string;
  contact_1_zipcode?: string;
  latitude: string;
  longitude: string;
  [key: string]: string | undefined;
}

export async function GET() {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateStr = fourteenDaysAgo.toISOString().split("T")[0];

    const params = new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND reported_cost > 100000`,
      $order: "issue_date DESC",
      $limit: "100",
    });

    const res = await fetch(`${SODA_ENDPOINT}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const records: SodaRecord[] = await res.json();

    const permits: Permit[] = records
      .filter((r) => isCommercial(r as unknown as Record<string, string>))
      .map((record, idx): Permit => {
        const address = [
          record.street_number,
          record.street_direction,
          record.street_name,
          record.suffix,
        ]
          .filter(Boolean)
          .join(" ");

        const description =
          record.work_description || record._description || "Commercial construction work";
        const value = parseFloat(record.reported_cost || record.estimated_cost || "0");
        const gcName = extractGCName(record as unknown as Record<string, string>);

        let confidence: ContactConfidence = "Low";
        if (gcName !== "Unknown Contractor") {
          confidence = record.contractor_1_name ? "High" : "Medium";
        }

        return {
          id: `live-${record.id || idx}`,
          permitNumber: record.permit_ || `CHI-${idx}`,
          address,
          city: "Chicago",
          state: "IL",
          zip: record.contact_1_zipcode || "60601",
          latitude: parseFloat(record.latitude || "41.8781"),
          longitude: parseFloat(record.longitude || "-87.6298"),
          filingDate: record.issue_date
            ? record.issue_date.split("T")[0]
            : new Date().toISOString().split("T")[0],
          description,
          estimatedValue: value,
          status: mapStatus(record.permit_status),
          trades: classifyTrades(description),
          gcContact: {
            companyName: gcName,
            contactName: null,
            phone: null,
            email: null,
            confidence,
          },
          source: "data.cityofchicago.org",
          sourceUpdatedAt: new Date().toISOString().split("T")[0],
        };
      })
      .slice(0, 50);

    return NextResponse.json(permits);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
