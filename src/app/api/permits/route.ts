import { NextRequest, NextResponse } from "next/server";
import type { Permit, Trade, PermitStatus, ContactConfidence } from "@/lib/types";

const TRADE_KEYWORDS: Record<Trade, string[]> = {
  HVAC: ["hvac", "heating", "ventilation", "air condition", "cooling", "ductwork", "rooftop unit", "ahu", "chiller", "boiler", "furnace", "mechanical"],
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

const RESIDENTIAL_KEYWORDS = [
  "single family", "single-family", "sfh", "1-story residence",
  "2-story residence", "residential garage", "deck", "porch",
  "backyard", "driveway", "one-family dwelling", "one family dwelling",
  "two-family dwelling", "two family dwelling", "duplex",
  "townhouse", "detached house",
];

function classifyTrades(description: string): Trade[] {
  const lower = description.toLowerCase();
  const trades: Trade[] = [];
  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      trades.push(trade as Trade);
    }
  }
  if (trades.length === 0) trades.push("General Construction");
  return trades;
}

function isLikelyResidential(description: string): boolean {
  const lower = description.toLowerCase();
  return RESIDENTIAL_KEYWORDS.some((kw) => lower.includes(kw));
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

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

interface CityAdapter {
  domain: string;
  datasetId: string;
  city: string;
  state: string;
  buildQuery(dateStr: string): URLSearchParams;
  toPermit(record: Record<string, string>, idx: number): Permit | null;
}

// ---------- CHICAGO ----------
const chicago: CityAdapter = {
  domain: "data.cityofchicago.org",
  datasetId: "ydr8-5enu",
  city: "Chicago",
  state: "IL",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND reported_cost > 100000`,
      $order: "issue_date DESC",
      $limit: "100",
    });
  },
  toPermit(r, idx) {
    const desc = r.work_description || r._description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.reported_cost || "0");
    const address = [r.street_number, r.street_direction, r.street_name, r.suffix].filter(Boolean).join(" ");
    const gcName = r.contractor_1_name || r.general_contractor || r.contact_1_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.contractor_1_name ? "High" : "Medium";
    return {
      id: `chi-${r.id || idx}`,
      permitNumber: r.permit_ || `CHI-${idx}`,
      address,
      city: "Chicago",
      state: "IL",
      zip: r.contact_1_zipcode || "60601",
      latitude: parseFloat(r.latitude || "41.8781"),
      longitude: parseFloat(r.longitude || "-87.6298"),
      filingDate: r.issue_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.permit_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.cityofchicago.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

// ---------- AUSTIN ----------
const austin: CityAdapter = {
  domain: "data.austintexas.gov",
  datasetId: "3syk-w9eu",
  city: "Austin",
  state: "TX",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND total_job_valuation > 100000`,
      $order: "issue_date DESC",
      $limit: "100",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.work_class || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.total_job_valuation || "0");
    const gcName = r.contractor_company_name || r.contractor_full_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.contractor_company_name ? "High" : "Medium";
    return {
      id: `aus-${r.permit_number || idx}`,
      permitNumber: r.permit_number || `AUS-${idx}`,
      address: r.permit_location || r.original_address || "Austin, TX",
      city: "Austin",
      state: "TX",
      zip: "78701",
      latitude: parseFloat(r.latitude || "30.2672"),
      longitude: parseFloat(r.longitude || "-97.7431"),
      filingDate: r.issue_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status_current),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.contractor_full_name || null, phone: null, email: null, confidence },
      source: "data.austintexas.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

// ---------- SAN FRANCISCO ----------
const sanFrancisco: CityAdapter = {
  domain: "data.sfgov.org",
  datasetId: "i98e-djp9",
  city: "San Francisco",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND estimated_cost::number > 100000`,
      $order: "issued_date DESC",
      $limit: "100",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estimated_cost || r.revised_cost || "0");
    const address = [r.street_number, r.street_name, r.street_suffix].filter(Boolean).join(" ");
    return {
      id: `sf-${r.permit_number || idx}`,
      permitNumber: r.permit_number || `SF-${idx}`,
      address: address || "San Francisco, CA",
      city: "San Francisco",
      state: "CA",
      zip: r.zipcode || "94102",
      latitude: parseFloat(r.location?.latitude || r.latitude || "37.7749"),
      longitude: parseFloat(r.location?.longitude || r.longitude || "-122.4194"),
      filingDate: r.issued_date?.split("T")[0] || r.filed_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Contact via SF DBI", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "data.sfgov.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

// ---------- SEATTLE ----------
const seattle: CityAdapter = {
  domain: "data.seattle.gov",
  datasetId: "76t5-zqzr",
  city: "Seattle",
  state: "WA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND estprojectcost > 100000`,
      $order: "issueddate DESC",
      $limit: "100",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.permittypedesc || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estprojectcost || "0");
    const gcName = r.contractorcompanyname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `sea-${r.permitnum || idx}`,
      permitNumber: r.permitnum || `SEA-${idx}`,
      address: r.originaladdress1 || "Seattle, WA",
      city: "Seattle",
      state: "WA",
      zip: r.originalzip || "98101",
      latitude: parseFloat(r.latitude || "47.6062"),
      longitude: parseFloat(r.longitude || "-122.3321"),
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statuscurrent),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.seattle.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

// ---------- NEW YORK CITY ----------
const newYork: CityAdapter = {
  domain: "data.cityofnewyork.us",
  datasetId: "rbx6-tga4",
  city: "New York",
  state: "NY",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND issued_date IS NOT NULL AND estimated_job_costs::number > 100000`,
      $order: "issued_date DESC",
      $limit: "100",
    });
  },
  toPermit(r, idx) {
    const desc = r.job_description || r.work_type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estimated_job_costs || "0");
    const address = [r.house_no, r.street_name].filter(Boolean).join(" ");
    const borough = r.borough || "";
    const gcName = r.applicant_business_name || [r.applicant_first_name, r.applicant_last_name].filter(Boolean).join(" ") || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.applicant_business_name ? "High" : "Medium";
    return {
      id: `nyc-${r.job_filing_number || r.work_permit || idx}`,
      permitNumber: r.job_filing_number || r.work_permit || `NYC-${idx}`,
      address: address ? `${address}, ${borough}` : `${borough || "New York"}, NY`,
      city: "New York",
      state: "NY",
      zip: "10001",
      latitude: 40.7128,
      longitude: -74.006,
      filingDate: r.issued_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.permit_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.applicant_first_name ? `${r.applicant_first_name} ${r.applicant_last_name || ""}`.trim() : null, phone: null, email: null, confidence },
      source: "data.cityofnewyork.us",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const ADAPTERS: Record<string, CityAdapter> = {
  chicago,
  austin,
  "san-francisco": sanFrancisco,
  seattle,
  "new-york": newYork,
};

export async function GET(request: NextRequest) {
  const metro = request.nextUrl.searchParams.get("metro") || "chicago";
  const adapter = ADAPTERS[metro];

  if (!adapter) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const dateStr = dateNDaysAgo(14);
    const params = adapter.buildQuery(dateStr);
    const url = `https://${adapter.domain}/resource/${adapter.datasetId}.json?${params}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const records: Record<string, string>[] = await res.json();

    const permits: Permit[] = records
      .map((r, i) => adapter.toPermit(r, i))
      .filter((p): p is Permit => p !== null)
      .slice(0, 50);

    return NextResponse.json(permits);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
