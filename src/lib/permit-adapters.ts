import type { Permit, Trade, PermitStatus, ContactConfidence } from "@/lib/types";

const TRADE_KEYWORDS: Record<Trade, string[]> = {
  HVAC: ["hvac", "heating", "ventilation", "air condition", "cooling", "ductwork", "rooftop unit", "ahu", "chiller", "boiler", "furnace", "mechanical"],
  Electrical: ["electrical", "electric", "wiring", "panel", "switchgear", "generator", "transformer", "circuit", "conduit", "lighting"],
  Plumbing: ["plumbing", "plumb", "pipe", "water heater", "water line", "water service", "water meter", "sewer", "drain", "fixture", "backflow", "grease trap", "sump"],
  Roofing: ["roof", "roofing", "membrane", "shingle", "tpo", "epdm", "flashing", "parapet"],
  "Fire Suppression": ["sprinkler", "fire suppression", "fire alarm", "fire protection", "standpipe", "smoke detector", "fire pump", "extinguish"],
  "Glass & Glazing": ["glass", "glazing", "window", "curtain wall", "storefront", "skylight"],
  Concrete: ["concrete", "foundation", "slab", "footing", "masonry", "block", "cement"],
  "Structural Steel": ["structural steel", "steel frame", "steel beam", "steel column", "iron work", "welding"],
  Demolition: ["demolition", "abatement", "tear down", "wrecking"],
  "General Construction": ["renovation", "remodel", "buildout", "build-out", "tenant improvement", "interior finish"],
};

const RESIDENTIAL_KEYWORDS = [
  "single family", "single-family", "sfh", "1-story residence",
  "2-story residence", "residential garage", "deck", "porch",
  "backyard", "driveway", "one-family dwelling", "one family dwelling",
  "two-family dwelling", "two family dwelling", "duplex",
  "townhouse", "detached house", "residential", "home improvement",
  "single dwelling", "condominium", "condo unit",
];

export function classifyTrades(description: string): Trade[] {
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

export function mapStatus(status: string | undefined): PermitStatus {
  if (!status) return "Issued";
  const s = status.toLowerCase();
  if (s.includes("issue")) return "Issued";
  if (s.includes("review") || s.includes("pending")) return "Under Review";
  if (s.includes("denied") || s.includes("reject") || s.includes("revok")) return "Under Review";
  if (s.includes("approve")) return "Approved";
  if (s.includes("complete") || s.includes("finaled") || s.includes("final inspection")) return "Completed";
  if (s.includes("expire") || s.includes("cancel") || s.includes("withdraw") || s.includes("closed")) return "Completed";
  if (s.includes("active")) return "Issued";
  return "Issued";
}

export function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export interface CityAdapter {
  domain: string;
  datasetId: string;
  city: string;
  state: string;
  buildQuery(dateStr: string): URLSearchParams;
  toPermit(record: Record<string, string>, idx: number): Permit | null;
  enrichContacts?(permits: Permit[]): Promise<void>;
  buildUrl?(dateStr: string): string;
  parseResponse?(json: unknown): Record<string, string>[];
}

const chicago: CityAdapter = {
  domain: "data.cityofchicago.org",
  datasetId: "ydr8-5enu",
  city: "Chicago",
  state: "IL",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND reported_cost > 50000`,
      $order: "issue_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.work_description || r._description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.reported_cost || "0");
    const address = [r.street_number, r.street_direction, r.street_name, r.suffix].filter(Boolean).join(" ");
    let gcName = "Unknown Contractor";
    for (let i = 1; i <= 15; i++) {
      const type = (r[`contact_${i}_type`] || "").toUpperCase();
      if (type.includes("GENERAL CONTRACTOR") || type.includes("CONTRACTOR")) {
        gcName = r[`contact_${i}_name`] || gcName;
        break;
      }
    }
    if (gcName === "Unknown Contractor") gcName = r.contact_1_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
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

const austin: CityAdapter = {
  domain: "data.austintexas.gov",
  datasetId: "3syk-w9eu",
  city: "Austin",
  state: "TX",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND total_job_valuation > 50000`,
      $order: "issue_date DESC",
      $limit: "200",
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
      gcContact: { companyName: gcName, contactName: r.contractor_full_name || null, phone: r.contractor_phone || null, email: null, confidence },
      source: "data.austintexas.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sanFrancisco: CityAdapter = {
  domain: "data.sfgov.org",
  datasetId: "i98e-djp9",
  city: "San Francisco",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND estimated_cost::number > 50000`,
      $order: "issued_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estimated_cost || r.revised_cost || "0");
    const address = [r.street_number, r.street_name, r.street_suffix].filter(Boolean).join(" ");
    return {
      id: `sf-${r.permit_number || `unknown-${idx}`}`,
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
  async enrichContacts(permits) {
    if (permits.length === 0) return;
    const permitNumbers = permits.map((p) => `'${p.permitNumber}'`).join(",");
    const params = new URLSearchParams({
      $where: `permit_number IN (${permitNumbers}) AND role='contractor'`,
      $limit: "500",
      $select: "permit_number, firm_name, first_name, last_name",
    });
    try {
      const res = await fetch(
        `https://data.sfgov.org/resource/3pee-9qhc.json?${params}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const contacts: Record<string, string>[] = await res.json();
      const lookup = new Map<string, Record<string, string>>();
      for (const c of contacts) {
        if (c.permit_number) {
          lookup.set(c.permit_number, c);
        }
      }
      for (const permit of permits) {
        const contact = lookup.get(permit.permitNumber);
        if (contact) {
          const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null;
          permit.gcContact = {
            companyName: contact.firm_name || contactName || "Contact via SF DBI",
            contactName,
            phone: null,
            email: null,
            confidence: contact.firm_name ? "High" : contactName ? "Medium" : "Low",
          };
        }
      }
    } catch {}
  },
};

const marinCounty: CityAdapter = {
  domain: "data.marincounty.gov",
  datasetId: "mkbn-caye",
  city: "Marin County",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND construction_value::number > 50000`,
      $order: "issued_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || "";
    if (isLikelyResidential(desc)) return null;
    const typePermit = (r.type_permit || "").toLowerCase();
    if (typePermit === "residential") return null;
    const value = parseFloat(r.construction_value || "0");
    const fullAddr = r.address || "";
    const streetParts = fullAddr.split(",");
    const address = streetParts[0]?.trim() || fullAddr;
    const city = r.city_town || "Marin County";
    const gcName = r.contractor || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `marin-${r.permit_number || r.permit_tracking_id || `unknown-${idx}`}`,
      permitNumber: r.permit_number || r.permit_tracking_id || `MARIN-${idx}`,
      address,
      city,
      state: "CA",
      zip: r.zipcode || "94901",
      latitude: parseFloat(r.latitude || "38.0834"),
      longitude: parseFloat(r.longitude || "-122.7633"),
      filingDate: r.issued_date?.split("T")[0] || r.received_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.marincounty.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sanJose: CityAdapter = {
  domain: "data.sanjoseca.gov",
  datasetId: "045b3678-e923-4002-b696-300955bc6d06",
  city: "San Jose",
  state: "CA",
  buildQuery() {
    return new URLSearchParams();
  },
  buildUrl() {
    return `https://data.sanjoseca.gov/api/3/action/datastore_search?resource_id=045b3678-e923-4002-b696-300955bc6d06&limit=200&sort=ISSUEDATE%20desc`;
  },
  parseResponse(json: unknown) {
    const data = json as { result?: { records?: Record<string, string>[] } };
    return data?.result?.records || [];
  },
  toPermit(r, idx) {
    const desc = [r.FOLDERDESC, r.SUBTYPEDESCRIPTION, r.WORKDESCRIPTION].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.PERMITVALUATION || "0");
    if (value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDATE) {
      const parsed = new Date(r.ISSUEDATE);
      if (!isNaN(parsed.getTime())) {
        filingDate = parsed.toISOString().split("T")[0];
      }
    }
    const rawAddress = r.gx_location || "";
    const address = rawAddress.replace(/\s*,?\s*SAN JOSE\s+CA\s+\d{5}(-\d{4})?/i, "").trim() || "San Jose, CA";
    const zipMatch = rawAddress.match(/(\d{5})(-\d{4})?/);
    const zip = zipMatch ? zipMatch[1] : "95101";
    const gcName = r.CONTRACTOR || r.APPLICANT || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.CONTRACTOR ? "High" : "Medium";
    return {
      id: `sj-${r.FOLDERNUMBER || `unknown-${idx}`}`,
      permitNumber: r.FOLDERNUMBER || `SJ-${idx}`,
      address,
      city: "San Jose",
      state: "CA",
      zip,
      latitude: 37.3382,
      longitude: -121.8863,
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.APPLICANT || null, phone: null, email: null, confidence },
      source: "data.sanjoseca.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const seattle: CityAdapter = {
  domain: "data.seattle.gov",
  datasetId: "76t5-zqzr",
  city: "Seattle",
  state: "WA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND estprojectcost > 50000`,
      $order: "issueddate DESC",
      $limit: "200",
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

const newYork: CityAdapter = {
  domain: "data.cityofnewyork.us",
  datasetId: "rbx6-tga4",
  city: "New York",
  state: "NY",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND issued_date IS NOT NULL AND estimated_job_costs::number > 50000`,
      $order: "issued_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.job_description || r.work_type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estimated_job_costs || "0");
    const address = [r.house_no, r.street_name].filter(Boolean).join(" ");
    const borough = r.borough || "";
    const gcName = r.applicant_business_name || r.filing_representative_business_name || [r.applicant_first_name, r.applicant_last_name].filter(Boolean).join(" ") || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.applicant_business_name ? "High" : "Medium";
    return {
      id: `nyc-${r.job_filing_number || r.work_permit || `unknown-${idx}`}`,
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

export const METRO_ADAPTERS: Record<string, CityAdapter[]> = {
  chicago: [chicago],
  austin: [austin],
  "sf-bay-area": [sanFrancisco, marinCounty, sanJose],
  seattle: [seattle],
  "new-york": [newYork],
};

export async function fetchAdapter(adapter: CityAdapter, dateStr: string): Promise<Permit[]> {
  const url = adapter.buildUrl
    ? adapter.buildUrl(dateStr)
    : `https://${adapter.domain}/resource/${adapter.datasetId}.json?${adapter.buildQuery(dateStr)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const json = await res.json();
  const records: Record<string, string>[] = adapter.parseResponse
    ? adapter.parseResponse(json)
    : json;

  const permits: Permit[] = records
    .map((r, i) => adapter.toPermit(r, i))
    .filter((p): p is Permit => p !== null);

  if (adapter.enrichContacts) {
    await adapter.enrichContacts(permits);
  }

  return permits;
}

export async function fetchLivePermits(metroIds: string[], days: number): Promise<Permit[]> {
  const adapters: CityAdapter[] = [];
  for (const id of metroIds) {
    const a = METRO_ADAPTERS[id];
    if (a) adapters.push(...a);
  }

  if (adapters.length === 0) return [];

  const dateStr = dateNDaysAgo(days);
  const results = await Promise.allSettled(
    adapters.map((adapter) => fetchAdapter(adapter, dateStr))
  );

  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<Permit[]> => r.status === "fulfilled")
    .map((r) => r.value);

  const cap = Math.min(500, 150 * metroIds.length);
  const byDate = (a: Permit, b: Permit) =>
    new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime();

  if (fulfilled.length <= 1) {
    return (fulfilled[0] || []).sort(byDate).slice(0, cap);
  }

  const perSource = Math.max(10, Math.floor(cap / fulfilled.length));
  const reserved: Permit[] = [];
  const reservedIds = new Set<string>();
  for (const src of fulfilled) {
    const top = src.sort(byDate).slice(0, perSource);
    for (const p of top) {
      reserved.push(p);
      reservedIds.add(p.id);
    }
  }
  const remaining = cap - reserved.length;
  const overflow = fulfilled
    .flatMap((src) => src.filter((p) => !reservedIds.has(p.id)))
    .sort(byDate)
    .slice(0, remaining);

  return [...reserved, ...overflow].sort(byDate);
}
