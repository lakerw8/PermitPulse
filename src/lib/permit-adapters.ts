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
    const loc = r.location as unknown as { latitude?: string; longitude?: string } | string | undefined;
    const lat = (typeof loc === "object" && loc?.latitude) || r.latitude || "37.7749";
    const lng = (typeof loc === "object" && loc?.longitude) || r.longitude || "-122.4194";
    return {
      id: `sf-${r.permit_number || `unknown-${idx}`}`,
      permitNumber: r.permit_number || `SF-${idx}`,
      address: address || "San Francisco, CA",
      city: "San Francisco",
      state: "CA",
      zip: r.zipcode || "94102",
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
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

const philadelphia: CityAdapter = {
  domain: "phl.carto.com",
  datasetId: "permits",
  city: "Philadelphia",
  state: "PA",
  buildQuery() {
    return new URLSearchParams();
  },
  buildUrl(dateStr) {
    const q = `SELECT *, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM permits WHERE permitissuedate >= '${dateStr}' AND commercialorresidential = 'COMMERCIAL' ORDER BY permitissuedate DESC LIMIT 200`;
    return `https://phl.carto.com/api/v2/sql?q=${encodeURIComponent(q)}&format=json`;
  },
  parseResponse(json: unknown) {
    const data = json as { rows?: Record<string, string>[] };
    return data?.rows || [];
  },
  toPermit(r, idx) {
    const desc = [r.permitdescription, r.typeofwork, r.approvedscopeofwork].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const gcName = r.contractorname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `phl-${r.permitnumber || `unknown-${idx}`}`,
      permitNumber: r.permitnumber || `PHL-${idx}`,
      address: r.address || "Philadelphia, PA",
      city: "Philadelphia",
      state: "PA",
      zip: r.zip || "19102",
      latitude: parseFloat(r.lat || "39.9526"),
      longitude: parseFloat(r.lng || "-75.1652"),
      filingDate: r.permitissuedate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: 0,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "phl.carto.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const boston: CityAdapter = {
  domain: "data.boston.gov",
  datasetId: "6ddcd912-32a0-43df-9908-63574f8c7e77",
  city: "Boston",
  state: "MA",
  buildQuery() {
    return new URLSearchParams();
  },
  buildUrl(dateStr) {
    return `https://data.boston.gov/api/3/action/datastore_search?resource_id=6ddcd912-32a0-43df-9908-63574f8c7e77&limit=200&sort=issued_date%20desc&filters=${encodeURIComponent(JSON.stringify({}))}`;
  },
  parseResponse(json: unknown) {
    const data = json as { result?: { records?: Record<string, string>[] } };
    return data?.result?.records || [];
  },
  toPermit(r, idx) {
    const desc = r.description || r.comments || r.permittypedescr || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat((r.declared_valuation || "0").replace(/[$,]/g, ""));
    if (value > 0 && value < 50000) return null;
    const gcName = r.applicant || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.issued_date) {
      const parsed = new Date(r.issued_date);
      if (!isNaN(parsed.getTime())) {
        filingDate = parsed.toISOString().split("T")[0];
      }
    }
    return {
      id: `bos-${r.permitnumber || `unknown-${idx}`}`,
      permitNumber: r.permitnumber || `BOS-${idx}`,
      address: r.address || "Boston, MA",
      city: "Boston",
      state: "MA",
      zip: r.zip || "02101",
      latitude: parseFloat(r.y_latitude || "42.3601"),
      longitude: parseFloat(r.x_longitude || "-71.0589"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.boston.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const losAngeles: CityAdapter = {
  domain: "data.lacity.org",
  datasetId: "xnhu-aczu",
  city: "Los Angeles",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_date >= '${dateStr}T00:00:00.000' AND permit_sub_type = 'Commercial' AND valuation > 50000`,
      $order: "issue_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.work_description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.valuation || "0");
    const address = [r.address_start, r.street_direction, r.street_name, r.street_suffix].filter(Boolean).join(" ");
    const gcName = r.contractors_business_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let lat = 34.0522;
    let lng = -118.2437;
    if (r.location_1) {
      try {
        const loc = typeof r.location_1 === "string" ? JSON.parse(r.location_1) : r.location_1;
        if (loc?.coordinates) {
          lng = loc.coordinates[0];
          lat = loc.coordinates[1];
        }
      } catch {}
    }
    return {
      id: `la-${r.pcis_permit || `unknown-${idx}`}`,
      permitNumber: r.pcis_permit || `LA-${idx}`,
      address: address || "Los Angeles, CA",
      city: "Los Angeles",
      state: "CA",
      zip: r.zip_code || "90001",
      latitude: lat,
      longitude: lng,
      filingDate: r.issue_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.latest_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.lacity.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const nashville: CityAdapter = {
  domain: "permits.partner.socrata.com",
  datasetId: "7ky7-xbzp",
  city: "Nashville",
  state: "TN",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND permitclassmapped = 'Non-Residential' AND estprojectcostdec > 50000`,
      $order: "issueddate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.workclassmapped || r.purpose_extra || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estprojectcostdec || "0");
    const gcName = r.contractorcompanyname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    const address = [r.originaladdress1, r.originalcity, r.originalstate, r.originalzip].filter(Boolean).join(", ");
    return {
      id: `nash-${r.permitnum || `unknown-${idx}`}`,
      permitNumber: r.permitnum || `NASH-${idx}`,
      address: address || "Nashville, TN",
      city: "Nashville",
      state: "TN",
      zip: r.originalzip || "37203",
      latitude: parseFloat(r.latitude || "36.1627"),
      longitude: parseFloat(r.longitude || "-86.7816"),
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus("Issued"),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "permits.partner.socrata.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sanDiegoCounty: CityAdapter = {
  domain: "data.sandiegocounty.gov",
  datasetId: "dyzh-7eat",
  city: "San Diego",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND record_category IN ('Commercial Alteration-Addn','New Primary Comm Structure','New Commercial Acc Structure','Commercial Multi-Bldg Parent')`,
      $order: "issued_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.use || r.primary_scope_code || r.record_category || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.valuation || "0");
    const gcName = r.contractor_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let lat = 32.7157;
    let lng = -117.1611;
    if (r.geocoded_column) {
      try {
        const geo = typeof r.geocoded_column === "string" ? JSON.parse(r.geocoded_column) : r.geocoded_column;
        if (geo?.latitude) lat = parseFloat(geo.latitude);
        if (geo?.longitude) lng = parseFloat(geo.longitude);
      } catch {}
    }
    return {
      id: `sd-${r.record_id || `unknown-${idx}`}`,
      permitNumber: r.record_id || `SD-${idx}`,
      address: r.full_address || r.street_address || "San Diego, CA",
      city: r.city || "San Diego",
      state: "CA",
      zip: r.zip_code || "92101",
      latitude: lat,
      longitude: lng,
      filingDate: r.issued_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.record_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.contractor_phone || null, email: null, confidence },
      source: "data.sandiegocounty.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

function parseArcGISResponse(json: unknown): Record<string, string>[] {
  const data = json as { features?: { attributes?: Record<string, string>; geometry?: { x?: number; y?: number } }[] };
  return (data?.features || []).map((f) => ({
    ...f.attributes,
    _geo_x: String(f.geometry?.x ?? ""),
    _geo_y: String(f.geometry?.y ?? ""),
  })) as Record<string, string>[];
}

const denver: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "commercial-permits",
  city: "Denver",
  state: "CO",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`DATE_ISSUED > ${ts}`);
    return `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_DEV_COMMERCIALCONSTPERMIT_P/FeatureServer/317/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=DATE_ISSUED+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.CLASS || "";
    const value = parseFloat(r.VALUATION || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.CONTRACTOR_NAME || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    const address = r.ADDRESS || "Denver, CO";
    let filingDate = dateNDaysAgo(0);
    if (r.DATE_ISSUED) {
      const d = new Date(Number(r.DATE_ISSUED));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `den-${r.PERMIT_NUM || `unknown-${idx}`}`,
      permitNumber: r.PERMIT_NUM || `DEN-${idx}`,
      address,
      city: "Denver",
      state: "CO",
      zip: "80202",
      latitude: parseFloat(r._geo_y || "39.7392"),
      longitude: parseFloat(r._geo_x || "-104.9903"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: r.CANCEL ? "Completed" : r.FINAL_DATE ? "Completed" : "Issued",
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.denvergov.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const minneapolis: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "ccs-permits",
  city: "Minneapolis",
  state: "MN",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`issueDate > ${ts} AND occupancyType = 'Comm'`);
    return `https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/CCS_Permits/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=issueDate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.permitType, r.workType, r.comments].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.value || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.applicantName || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.issueDate) {
      const d = new Date(Number(r.issueDate));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `mpls-${r.permitNumber || `unknown-${idx}`}`,
      permitNumber: r.permitNumber || `MPLS-${idx}`,
      address: r.Display || "Minneapolis, MN",
      city: "Minneapolis",
      state: "MN",
      zip: "55401",
      latitude: parseFloat(r.Latitude || r._geo_y || "44.9778"),
      longitude: parseFloat(r.Longitude || r._geo_x || "-93.2650"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "opendata.minneapolismn.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const washingtonDC: CityAdapter = {
  domain: "maps2.dcgis.dc.gov",
  datasetId: "dc-permits",
  city: "Washington",
  state: "DC",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`ISSUE_DATE >= timestamp '${dateStr}'`);
    return `https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/4/query?where=${where}&outFields=*&f=json&resultRecordCount=200&orderByFields=ISSUE_DATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESC_OF_WORK || r.PERMIT_SUBTYPE_NAME || "";
    if (isLikelyResidential(desc)) return null;
    const gcName = r.PERMIT_APPLICANT || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUE_DATE) {
      const d = new Date(Number(r.ISSUE_DATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `dc-${r.PERMIT_ID || `unknown-${idx}`}`,
      permitNumber: r.PERMIT_ID || `DC-${idx}`,
      address: r.FULL_ADDRESS || "Washington, DC",
      city: "Washington",
      state: "DC",
      zip: r.ZIPCODE || "20001",
      latitude: parseFloat(r.LATITUDE || "38.9072"),
      longitude: parseFloat(r.LONGITUDE || "-77.0369"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: parseFloat(r.FEES_PAID || "0"),
      status: mapStatus(r.APPLICATION_STATUS_NAME),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "opendata.dc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const portland: CityAdapter = {
  domain: "www.portlandmaps.com",
  datasetId: "portland-permits",
  city: "Portland",
  state: "OR",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`ISSUED >= timestamp '${dateStr}'`);
    return `https://www.portlandmaps.com/arcgis/rest/services/Public/BDS_Permit/MapServer/1/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUED+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.WORK_DESCRIPTION, r.DESCRIPTION, r.TYPE].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.SUBMITTEDVALUATION || r.FINALVALUATION || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.CUSTOMER || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    const address = [r.HOUSE, r.DIRECTION, r.PROPSTREET, r.STREETTYPE].filter(Boolean).join(" ");
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUED) {
      const d = new Date(Number(r.ISSUED));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `pdx-${r.APPLICATION || `unknown-${idx}`}`,
      permitNumber: r.APPLICATION || `PDX-${idx}`,
      address: address || "Portland, OR",
      city: r.CITY || "Portland",
      state: "OR",
      zip: "97201",
      latitude: parseFloat(r._geo_y || "45.5152"),
      longitude: parseFloat(r._geo_x || "-122.6784"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "portlandmaps.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const fortWorth: CityAdapter = {
  domain: "mapit.fortworthtexas.gov",
  datasetId: "fort-worth-permits",
  city: "Fort Worth",
  state: "TX",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`File_Date > ${ts} AND Permit_Type = 'Commercial Building Permit'`);
    return `https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Permits/MapServer/0/query?where=${where}&outFields=*&f=json&resultRecordCount=200&orderByFields=File_Date+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.B1_WORK_DESC, r.Permit_SubType, r.Use_Type].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.JobValue || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.Owner_Full_Name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.File_Date) {
      const d = new Date(Number(r.File_Date));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `fw-${r.Permit_No || `unknown-${idx}`}`,
      permitNumber: r.Permit_No || `FW-${idx}`,
      address: r.Address || "Fort Worth, TX",
      city: "Fort Worth",
      state: "TX",
      zip: r.Zip_Code || "76102",
      latitude: parseFloat(r.Latitude || r._geo_y || "32.7555"),
      longitude: parseFloat(r.Longitude || r._geo_x || "-97.3308"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.Current_Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "fortworthtexas.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const orlando: CityAdapter = {
  domain: "data.cityoforlando.net",
  datasetId: "ryhf-m453",
  city: "Orlando",
  state: "FL",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issue_permit_date >= '${dateStr}T00:00:00.000' AND plan_review_type = 'Commercial' AND estimated_cost > 50000`,
      $order: "issue_permit_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = [r.project_name, r.worktype].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estimated_cost || "0");
    const gcName = r.contractor_name || r.contractor || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let lat = 28.5383;
    let lng = -81.3792;
    if (r.geocoded_column) {
      try {
        const geo = typeof r.geocoded_column === "string" ? JSON.parse(r.geocoded_column) : r.geocoded_column;
        if (geo?.coordinates) {
          lng = geo.coordinates[0];
          lat = geo.coordinates[1];
        }
      } catch {}
    }
    return {
      id: `orl-${r.permit_number || `unknown-${idx}`}`,
      permitNumber: r.permit_number || `ORL-${idx}`,
      address: r.permit_address || "Orlando, FL",
      city: "Orlando",
      state: "FL",
      zip: "32801",
      latitude: lat,
      longitude: lng,
      filingDate: r.issue_permit_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.application_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.contractor || null, phone: r.contractor_phone_number || null, email: null, confidence },
      source: "data.cityoforlando.net",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const columbus: CityAdapter = {
  domain: "maps2.columbus.gov",
  datasetId: "columbus-permits",
  city: "Columbus",
  state: "OH",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`ISSUED_DT > ${ts} AND B1_PER_TYPE = 'Commercial'`);
    return `https://maps2.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUED_DT+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.B1_PER_CATEGORY, r.GENERAL_TYPE, r.VALUE_DESC].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.G3_VALUE_TTL || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.APPLICANT_BUS_NAME || r.APPLICANT_FULL_NAME || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.APPLICANT_BUS_NAME ? "High" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUED_DT) {
      const d = new Date(Number(r.ISSUED_DT));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `cmh-${r.B1_ALT_ID || `unknown-${idx}`}`,
      permitNumber: r.B1_ALT_ID || `CMH-${idx}`,
      address: r.SITE_ADDRESS || "Columbus, OH",
      city: "Columbus",
      state: "OH",
      zip: r.B1_SITUS_ZIP || "43215",
      latitude: parseFloat(r._geo_y || "39.9612"),
      longitude: parseFloat(r._geo_x || "-82.9988"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.PERMIT_STATUS || r.B1_APPL_STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.APPLICANT_FULL_NAME || null, phone: null, email: null, confidence },
      source: "opendata.columbus.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const lasVegas: CityAdapter = {
  domain: "mapdata.lasvegasnevada.gov",
  datasetId: "las-vegas-permits",
  city: "Las Vegas",
  state: "NV",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const d = new Date(dateStr);
    const mmm = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const yy = String(d.getFullYear()).slice(2);
    const dd = String(d.getDate()).padStart(2, "0");
    const dateFilter = `${dd}-${mmm}-${yy}`;
    const where = encodeURIComponent(`APTYPE = 'Com' AND ISSUE_DT >= '${dateFilter}'`);
    return `https://mapdata.lasvegasnevada.gov/clvgis/rest/services/DevelopmentServices/BuildingPermits/MapServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUE_DT+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.WORKDESC, r.DESCRIPTION, r.WORKTYPE].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.VALUATION || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.APPLICANT || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" || gcName === "OWNER" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUE_DT) {
      const parts = String(r.ISSUE_DT).match(/(\d{2})-([A-Z]{3})-(\d{2})/);
      if (parts) {
        const months: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
        const yr = parseInt(parts[3]) < 50 ? `20${parts[3]}` : `19${parts[3]}`;
        filingDate = `${yr}-${months[parts[2]] || "01"}-${parts[1]}`;
      }
    }
    return {
      id: `lv-${r.APNO || `unknown-${idx}`}`,
      permitNumber: r.APNO || `LV-${idx}`,
      address: r.PROPERTY || r.ADDR || "Las Vegas, NV",
      city: "Las Vegas",
      state: "NV",
      zip: "89101",
      latitude: parseFloat(r._geo_y || "36.1699"),
      longitude: parseFloat(r._geo_x || "-115.1398"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.STAT),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.APNAME || null, phone: null, email: null, confidence },
      source: "mapdata.lasvegasnevada.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const phoenix: CityAdapter = {
  domain: "maps.phoenix.gov",
  datasetId: "phoenix-permits",
  city: "Phoenix",
  state: "AZ",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`SCOPE_DESC LIKE '%COMMERCIAL%' AND PER_ISSUE_DATE >= ${ts}`);
    return `https://maps.phoenix.gov/pub/rest/services/Public/Planning_Permit/MapServer/1/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=PER_ISSUE_DATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.PERMIT_NAME, r.SCOPE_DESC, r.WORKDESC].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const gcName = r.PROFESS_NAME || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" || gcName === "OWNER" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.PER_ISSUE_DATE) {
      const d = new Date(Number(r.PER_ISSUE_DATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `phx-${r.PER_NUM || `unknown-${idx}`}`,
      permitNumber: r.PER_NUM || `PHX-${idx}`,
      address: r.STREET_FULL_NAME || "Phoenix, AZ",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      latitude: parseFloat(r._geo_y || "33.4484"),
      longitude: parseFloat(r._geo_x || "-112.0740"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: 0,
      status: mapStatus(r.PERMIT_STAT),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "maps.phoenix.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const raleigh: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "raleigh-permits",
  city: "Raleigh",
  state: "NC",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`permitclassmapped = 'Non-Residential' AND issueddate >= ${ts}`);
    return `https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Building_Permits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=issueddate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.proposedworkdescription, r.workclass, r.permittypemapped].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estprojectcost || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.contractorcompanyname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "High";
    let filingDate = dateNDaysAgo(0);
    if (r.issueddate) {
      const d = new Date(Number(r.issueddate));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `ral-${r.permitnum || `unknown-${idx}`}`,
      permitNumber: r.permitnum || `RAL-${idx}`,
      address: r.originaladdress1 || "Raleigh, NC",
      city: "Raleigh",
      state: "NC",
      zip: "27601",
      latitude: parseFloat(r.latitude_perm || r._geo_y || "35.7796"),
      longitude: parseFloat(r.longitude_perm || r._geo_x || "-78.6382"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statuscurrentmapped),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.contractorphone || null, email: r.contractoremail || null, confidence },
      source: "data.raleighnc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const tampa: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "tampa-permits",
  city: "Tampa",
  state: "FL",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`TYPE LIKE '%Commercial%' AND ISSUED_DATE >= ${ts}`);
    return `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/AccelaDashBoard_MapService20211019/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUED_DATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.DESCRIPTION, r.TYPE].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.Value || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = "Unknown Contractor";
    const confidence: ContactConfidence = "Low";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUED_DATE) {
      const d = new Date(Number(r.ISSUED_DATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `tpa-${r.PERMIT__ || `unknown-${idx}`}`,
      permitNumber: r.PERMIT__ || `TPA-${idx}`,
      address: r.ADDRESS || "Tampa, FL",
      city: "Tampa",
      state: "FL",
      zip: "33602",
      latitude: parseFloat(r._geo_y || "27.9506"),
      longitude: parseFloat(r._geo_x || "-82.4572"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.STATUS_1),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "hillsborough.maps.arcgis.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const cincinnati: CityAdapter = {
  domain: "data.cincinnati-oh.gov",
  datasetId: "uhjb-xac9",
  city: "Cincinnati",
  state: "OH",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND estprojectcostdec > 50000`,
      $order: "issueddate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.permittypemapped || "";
    if (isLikelyResidential(desc)) return null;
    if ((r.permitclass || "").toLowerCase().includes("residential")) return null;
    const value = parseFloat(r.estprojectcostdec || "0");
    const gcName = (r.companyname || "").replace(/^"|"$/g, "") || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `cin-${r.permitnum || idx}`,
      permitNumber: r.permitnum || `CIN-${idx}`,
      address: r.originaladdress1 || "Cincinnati, OH",
      city: r.originalcity || "Cincinnati",
      state: r.originalstate || "OH",
      zip: "45202",
      latitude: 39.1031,
      longitude: -84.512,
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statuscurrentmapped),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.cincinnati-oh.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const batonRouge: CityAdapter = {
  domain: "data.brla.gov",
  datasetId: "7fq7-8j7r",
  city: "Baton Rouge",
  state: "LA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND projectvalue > 50000 AND designation != 'Residential'`,
      $order: "issueddate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.projectdescription || r.permittype || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.projectvalue || "0");
    const gcName = r.contractorname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" || gcName.includes("HOMEOWNER") ? "Low" : "Medium";
    return {
      id: `btr-${r.permitnumber || idx}`,
      permitNumber: r.permitnumber || `BTR-${idx}`,
      address: r.streetaddress || r.address || "Baton Rouge, LA",
      city: r.city1 || "Baton Rouge",
      state: r.state1 || "LA",
      zip: r.zip || "70801",
      latitude: parseFloat(r.lat || "30.4515"),
      longitude: parseFloat(r.long || "-91.1871"),
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.brla.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const montgomeryCounty: CityAdapter = {
  domain: "data.montgomerycountymd.gov",
  datasetId: "i26v-w6bd",
  city: "Montgomery County",
  state: "MD",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND applicationtype = 'COMMERCIAL BUILDING'`,
      $order: "issueddate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.declaredvaluation || "0");
    const address = [r.stno, r.stname, r.suffix].filter(Boolean).join(" ");
    const loc = r.location as unknown as { latitude?: string; longitude?: string } | undefined;
    return {
      id: `moco-${r.permitno || idx}`,
      permitNumber: r.permitno || `MOCO-${idx}`,
      address: address || "Montgomery County, MD",
      city: r.city || "Bethesda",
      state: r.state || "MD",
      zip: r.zip || "20814",
      latitude: parseFloat(loc?.latitude || "39.084"),
      longitude: parseFloat(loc?.longitude || "-77.1528"),
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.montgomerycountymd.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const mesa: CityAdapter = {
  domain: "citydata.mesaaz.gov",
  datasetId: "dzpk-hxfb",
  city: "Mesa",
  state: "AZ",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issued_date >= '${dateStr}T00:00:00.000' AND permit_type = 'COM' AND total_valuation > 50000`,
      $order: "issued_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description_of_work || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.total_valuation || "0");
    const gcName = r.contractor_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `mesa-${r.permit_number || idx}`,
      permitNumber: r.permit_number || `MESA-${idx}`,
      address: r.property_address || "Mesa, AZ",
      city: "Mesa",
      state: "AZ",
      zip: "85201",
      latitude: parseFloat(r.latitude || "33.4152"),
      longitude: parseFloat(r.longitude || "-111.8315"),
      filingDate: r.issued_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "citydata.mesaaz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const newOrleans: CityAdapter = {
  domain: "data.nola.gov",
  datasetId: "nbcf-m6c2",
  city: "New Orleans",
  state: "LA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issuedate >= '${dateStr}T00:00:00.000' AND topcat = 'Business'`,
      $order: "issuedate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.descr || r.permittype || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.constructionval || "0");
    if (value > 0 && value < 50000) return null;
    const geo = r.the_geom as unknown as { coordinates?: number[] } | undefined;
    return {
      id: `nola-${r.prmtid || r.numstring || idx}`,
      permitNumber: r.numstring || `NOLA-${idx}`,
      address: r.address || "New Orleans, LA",
      city: "New Orleans",
      state: "LA",
      zip: "70112",
      latitude: geo?.coordinates?.[1] || 29.9511,
      longitude: geo?.coordinates?.[0] || -90.0715,
      filingDate: r.issuedate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.nola.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const kansasCity: CityAdapter = {
  domain: "data.kcmo.org",
  datasetId: "ntw8-aacc",
  city: "Kansas City",
  state: "MO",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issueddate >= '${dateStr}T00:00:00.000' AND permitclassmapped != 'RESIDENTIAL' AND estprojectcost > 50000`,
      $order: "issueddate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.projectname || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.estprojectcost || "0");
    const gcName = r.contractorcompanyname === "Needs Contact" ? "Unknown Contractor" : r.contractorcompanyname || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `kc-${r.permitnum || idx}`,
      permitNumber: r.permitnum || `KC-${idx}`,
      address: r.originaladdress1 || "Kansas City, MO",
      city: r.originalcity || "Kansas City",
      state: r.originalstate || "MO",
      zip: r.originalzip || "64106",
      latitude: parseFloat(r.latitude || "39.0997"),
      longitude: parseFloat(r.longitude || "-94.5786"),
      filingDate: r.issueddate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statuscurrent),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.kcmo.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const honolulu: CityAdapter = {
  domain: "data.honolulu.gov",
  datasetId: "4vab-c87q",
  city: "Honolulu",
  state: "HI",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issuedate >= '${dateStr}T00:00:00.000' AND commercialresidential = 'Commercial'`,
      $order: "issuedate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = [r.proposeduse, r.structurecode].filter(Boolean).join(" - ");
    const value = parseFloat(r.estimatedvalueofwork || r.acceptedvalue || "0");
    if (value > 0 && value < 50000) return null;
    const raw = r.contractor || r.applicant || "";
    const gcName = raw.split("/")[0]?.split(",")[0]?.trim() || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" || gcName === "NONE" ? "Low" : "Medium";
    return {
      id: `hnl-${r.buildingpermitno || idx}`,
      permitNumber: r.buildingpermitno || r.externalfilenum || `HNL-${idx}`,
      address: r.joblocation || "Honolulu, HI",
      city: "Honolulu",
      state: "HI",
      zip: "96813",
      latitude: 21.3069,
      longitude: -157.8583,
      filingDate: r.issuedate?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statusdescription),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.honolulu.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const princeGeorges: CityAdapter = {
  domain: "data.princegeorgescountymd.gov",
  datasetId: "weik-ttee",
  city: "Prince George's County",
  state: "MD",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `permit_issuance_date >= '${dateStr}T00:00:00.000'`,
      $order: "permit_issuance_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.case_name || r.permit_type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.expected_construction_cost || "0");
    if (value > 0 && value < 50000) return null;
    return {
      id: `pgc-${r.permit_case_id || idx}`,
      permitNumber: r.permit_case_id || `PGC-${idx}`,
      address: r.street_address || "Prince George's County, MD",
      city: r.city || "Largo",
      state: "MD",
      zip: r.zip_code || "20774",
      latitude: 38.8816,
      longitude: -76.7794,
      filingDate: r.permit_issuance_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.princegeorgescountymd.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const louisville: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "louisville-permits",
  city: "Louisville",
  state: "KY",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`PERMIT_TYPE LIKE '%Commercial%' AND ISSUE_DATE >= ${ts}`);
    return `https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/active_construction_permits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUE_DATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = [r.WORK_TYPE, r.CATEGORY_NAME].filter(Boolean).join(" - ");
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.PROJECT_COSTS || r.PERMIT_FEE || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.CONTRACTOR || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUE_DATE) {
      const d = new Date(Number(r.ISSUE_DATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `lou-${r.PERMIT_NUMBER || `unknown-${idx}`}`,
      permitNumber: r.PERMIT_NUMBER || `LOU-${idx}`,
      address: r.ADDRESS || "Louisville, KY",
      city: r.CITY || "Louisville",
      state: r.STATE || "KY",
      zip: (r.ZIPCODE || "40202").split("-")[0],
      latitude: parseFloat(r.LATITUDE || r._geo_y || "38.2527"),
      longitude: parseFloat(r.LONGITUDE || r._geo_x || "-85.7585"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.PERMIT_STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.louisvilleky.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sacramento: CityAdapter = {
  domain: "services5.arcgis.com",
  datasetId: "sacramento-permits",
  city: "Sacramento",
  state: "CA",
  buildQuery() { return new URLSearchParams(); },
  buildUrl() {
    const where = encodeURIComponent(`Type LIKE '%Commercial%' AND Valuation > 50000`);
    return `https://services5.arcgis.com/54falWtcpty3V47Z/arcgis/rest/services/BldgPermitIssued_CurrentYear/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=OBJECTID+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Work_Desc || r.Category || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.Valuation || "0");
    const gcName = r.Contractor || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.Status_Date) {
      const parts = r.Status_Date.split("/");
      if (parts.length === 3) filingDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
    return {
      id: `sac-${r.Application || `unknown-${idx}`}`,
      permitNumber: r.Application || `SAC-${idx}`,
      address: r.Address || "Sacramento, CA",
      city: "Sacramento",
      state: "CA",
      zip: r.ZIP || "95814",
      latitude: parseFloat(r._geo_y || "38.5816"),
      longitude: parseFloat(r._geo_x || "-121.4944"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.Current_Status || r.Rpt_Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.cityofsacramento.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sanAntonio: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "sa-permits",
  city: "San Antonio",
  state: "TX",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`Declared_Valuation > 50000 AND Date_Issued >= ${ts}`);
    return `https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/Permits_Issued/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=Date_Issued+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Project_Name || r.Work_Type || "";
    if (isLikelyResidential(desc)) return null;
    const pType = (r.Permit_Type || "").toLowerCase();
    if (pType.includes("garage sale") || pType.includes("fence") || pType.includes("trench")) return null;
    const value = parseFloat(r.Declared_Valuation || "0");
    const gcName = r.Primary_Contact || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.Date_Issued) {
      const d = new Date(Number(r.Date_Issued));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `sa-${r.Permit_Number || `unknown-${idx}`}`,
      permitNumber: r.Permit_Number || `SA-${idx}`,
      address: r.Address || "San Antonio, TX",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      latitude: parseFloat(r.Y_COORD || r._geo_y || "29.4241"),
      longitude: parseFloat(r.X_COORD || r._geo_x || "-98.4936"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.sanantonio.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const baltimore: CityAdapter = {
  domain: "services5.arcgis.com",
  datasetId: "baltimore-permits",
  city: "Baltimore",
  state: "MD",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`issue_dt >= '${dateStr}' AND pmt_cat LIKE '%Non-Residential%' AND jurisdiction = 'Baltimore City'`);
    return `https://services5.arcgis.com/viVzbt0JWVlYD2i9/arcgis/rest/services/BPDS_2025/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=issue_dt+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.descrip || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.amount || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.cntr_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `bal-${r.permit_no || `unknown-${idx}`}`,
      permitNumber: r.permit_no || `BAL-${idx}`,
      address: r.site_addr || "Baltimore, MD",
      city: "Baltimore",
      state: "MD",
      zip: "21201",
      latitude: parseFloat(r.ycoord || r._geo_y || "39.2904"),
      longitude: parseFloat(r.xcoord || r._geo_x || "-76.6122"),
      filingDate: r.issue_dt || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "geodata.baltimorecity.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const miami: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "miami-permits",
  city: "Miami",
  state: "FL",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`PermitIssuedDate >= '${dateStr}' AND ResidentialCommercial = 'C'`);
    return `https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/miamidade_permit_data/FeatureServer/0/query?where=${where}&outFields=*&f=json&resultRecordCount=200&orderByFields=PermitIssuedDate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DetailDescriptionComments || r.ApplicationTypeDescription || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.EstimatedValue || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.ContractorName || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : r.ContractorPhone ? "High" : "Medium";
    return {
      id: `mia-${r.PermitNumber || `unknown-${idx}`}`,
      permitNumber: r.PermitNumber || `MIA-${idx}`,
      address: r.PropertyAddress || "Miami, FL",
      city: r.City || "Miami",
      state: r.State || "FL",
      zip: "33101",
      latitude: 25.7617,
      longitude: -80.1918,
      filingDate: r.PermitIssuedDate || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.ContractorPhone || null, email: null, confidence },
      source: "miamidade.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const charlotte: CityAdapter = {
  domain: "meckgis.mecklenburgcountync.gov",
  datasetId: "charlotte-permits",
  city: "Charlotte",
  state: "NC",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`permittype = 'Commercial' AND issuedate >= ${ts} AND bldgcost > 50000`);
    return `https://meckgis.mecklenburgcountync.gov/server/rest/services/BuildingPermits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=issuedate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.workdesc || r.permitdesc || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.bldgcost || "0");
    const gcName = "Unknown Contractor";
    const confidence: ContactConfidence = "Low";
    let filingDate = dateNDaysAgo(0);
    if (r.issuedate) {
      const d = new Date(Number(r.issuedate));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `clt-${r.permitnum || `unknown-${idx}`}`,
      permitNumber: r.permitnum || `CLT-${idx}`,
      address: r.projadd || "Charlotte, NC",
      city: "Charlotte",
      state: "NC",
      zip: r.zipcode || "28202",
      latitude: parseFloat(r._geo_y || "35.2271"),
      longitude: parseFloat(r._geo_x || "-80.8431"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.permitstat),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.charlottenc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const detroit: CityAdapter = {
  domain: "services2.arcgis.com",
  datasetId: "detroit-permits",
  city: "Detroit",
  state: "MI",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`Contractor_Estimated_Cost > 50000 AND Issued_Date >= '${dateStr}'`);
    return `https://services2.arcgis.com/HsXtOCMp1Nis1Ogr/arcgis/rest/services/building_permits_202505_20250724/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=Issued_Date+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description_of_Work || r.Permit_Type || "";
    if (isLikelyResidential(desc)) return null;
    const useType = (r.Current_Building_Use_Type || "").toUpperCase();
    if (useType === "SFR" || useType.includes("SINGLE FAMILY")) return null;
    const value = parseFloat(r.Contractor_Estimated_Cost || r.Department_Estimated_Cost || "0");
    return {
      id: `det-${r.Record_ID || `unknown-${idx}`}`,
      permitNumber: r.Record_ID || `DET-${idx}`,
      address: r.Address || "Detroit, MI",
      city: "Detroit",
      state: "MI",
      zip: r.ZIP_Code || "48226",
      latitude: parseFloat(r.Latitude || r._geo_y || "42.3314"),
      longitude: parseFloat(r.Longitude || r._geo_x || "-83.0458"),
      filingDate: r.Issued_Date || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.detroitmi.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const tucson: CityAdapter = {
  domain: "gis.tucsonaz.gov",
  datasetId: "tucson-permits",
  city: "Tucson",
  state: "AZ",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`ISSUEDATE >= ${ts} AND VALUE > 50000`);
    return `https://gis.tucsonaz.gov/public/rest/services/PublicMaps/PermitsCode/MapServer/81/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.WORKCLASS || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.VALUE || "0");
    const gcName = r.BUSINESSNAME || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDATE) {
      const d = new Date(Number(r.ISSUEDATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `tuc-${r.NUMBER || `unknown-${idx}`}`,
      permitNumber: r.NUMBER || `TUC-${idx}`,
      address: r.ADDRESS || "Tucson, AZ",
      city: "Tucson",
      state: "AZ",
      zip: r.POSTALCODE || "85701",
      latitude: parseFloat(r.LAT || r._geo_y || "32.2226"),
      longitude: parseFloat(r.LON || r._geo_x || "-110.9747"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "gis.tucsonaz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const memphis: CityAdapter = {
  domain: "services2.arcgis.com",
  datasetId: "memphis-permits",
  city: "Memphis",
  state: "TN",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`(Sub_Type = 'Commercial' OR Sub_Type = 'COM') AND Issued_Date >= ${ts} AND Valuation > 50000`);
    return `https://services2.arcgis.com/saWmpKJIUAjyyNVc/arcgis/rest/services/DPD_Building_Permits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=Issued_Date+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.Construction_Type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.Valuation || "0");
    let filingDate = dateNDaysAgo(0);
    if (r.Issued_Date) {
      const d = new Date(Number(r.Issued_Date));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `mem-${r.Record_ID || `unknown-${idx}`}`,
      permitNumber: r.Record_ID || `MEM-${idx}`,
      address: r.Address || "Memphis, TN",
      city: r.City || "Memphis",
      state: r.State || "TN",
      zip: r.ZIP_Code || "38103",
      latitude: parseFloat(r.Latitude || r._geo_y || "35.1495"),
      longitude: parseFloat(r.Longitude || r._geo_x || "-90.049"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.memphistn.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const pittsburgh: CityAdapter = {
  domain: "data.wprdc.org",
  datasetId: "f4d1177a-f597-4c32-8cbf-7885f56253f6",
  city: "Pittsburgh",
  state: "PA",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const filters = JSON.stringify({ commercial_or_residential: "Commercial" });
    const sql = encodeURIComponent(`SELECT * FROM "f4d1177a-f597-4c32-8cbf-7885f56253f6" WHERE "commercial_or_residential" = 'Commercial' AND "issue_date" >= '${dateStr}' AND "total_project_value" > 50000 ORDER BY "issue_date" DESC LIMIT 200`);
    return `https://data.wprdc.org/api/3/action/datastore_search_sql?sql=${sql}`;
  },
  parseResponse(json: unknown) {
    const data = json as { result?: { records?: Record<string, string>[] } };
    return (data?.result?.records || []) as Record<string, string>[];
  },
  toPermit(r, idx) {
    const desc = r.work_description || r.work_type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.total_project_value || "0");
    const gcName = r.contractor_name || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    return {
      id: `pgh-${r.permit_id || `unknown-${idx}`}`,
      permitNumber: r.permit_id || `PGH-${idx}`,
      address: r.address || "Pittsburgh, PA",
      city: "Pittsburgh",
      state: "PA",
      zip: r.zip_code || "15222",
      latitude: parseFloat(r.latitude || "40.4406"),
      longitude: parseFloat(r.longitude || "-79.9959"),
      filingDate: r.issue_date || dateNDaysAgo(0),
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "data.wprdc.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const albuquerque: CityAdapter = {
  domain: "coageo.cabq.gov",
  datasetId: "albuquerque-permits",
  city: "Albuquerque",
  state: "NM",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`GeneralCategory = 'Commercial' AND DateIssued >= ${ts} AND Valuation > 50000`);
    return `https://coageo.cabq.gov/cabqgeo/rest/services/agis/City_Building_Permits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=DateIssued+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.WorkDescription || r.TypeofWork || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.Valuation || "0");
    const gcName = r.Contractor || "Unknown Contractor";
    const confidence: ContactConfidence = gcName === "Unknown Contractor" ? "Low" : "Medium";
    let filingDate = dateNDaysAgo(0);
    if (r.DateIssued) {
      const d = new Date(Number(r.DateIssued));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `abq-${r.PermitNumber || `unknown-${idx}`}`,
      permitNumber: r.PermitNumber || `ABQ-${idx}`,
      address: r.CalculatedAddress || "Albuquerque, NM",
      city: "Albuquerque",
      state: "NM",
      zip: "87102",
      latitude: parseFloat(r._geo_y || "35.0844"),
      longitude: parseFloat(r._geo_x || "-106.6504"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(undefined),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence },
      source: "cabq.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const virginiaBeach: CityAdapter = {
  domain: "services2.arcgis.com",
  datasetId: "vb-permits",
  city: "Virginia Beach",
  state: "VA",
  buildQuery() { return new URLSearchParams(); },
  buildUrl() {
    const where = encodeURIComponent(`ConstructionType = 'Commercial'`);
    return `https://services2.arcgis.com/CyVvlIiUfRBmMQuu/arcgis/rest/services/Building_Permits_Applications_view/FeatureServer/0/query?where=${where}&outFields=*&f=json&resultRecordCount=200&orderByFields=IssueDate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.WorkDesc || r.WorkType || "";
    if (isLikelyResidential(desc)) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.IssueDate) {
      filingDate = r.IssueDate.replace(/\//g, "-").split(" ")[0];
    }
    return {
      id: `vb-${r.PermitNumber || `unknown-${idx}`}`,
      permitNumber: r.PermitNumber || `VB-${idx}`,
      address: r.StreetAddress || "Virginia Beach, VA",
      city: r.City || "Virginia Beach",
      state: r.State || "VA",
      zip: r.Zip || "23451",
      latitude: 36.8529,
      longitude: -75.978,
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: 0,
      status: mapStatus(r.Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.virginiabeach.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const elPaso: CityAdapter = {
  domain: "gis.elpasotexas.gov",
  datasetId: "elpaso-permits",
  city: "El Paso",
  state: "TX",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`ISSUEDATE >= ${ts} AND JOBVALUE > 50000`);
    return `https://gis.elpasotexas.gov/arcgis/rest/services/Planning/NewCommercial/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Descriptio || r.B1_SPECIAL || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.JOBVALUE || "0");
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDATE) {
      const d = new Date(Number(r.ISSUEDATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `elp-${r.B1_ALT_ID || `unknown-${idx}`}`,
      permitNumber: r.B1_ALT_ID || `ELP-${idx}`,
      address: r.SITEADDR_S || r.Address || "El Paso, TX",
      city: "El Paso",
      state: "TX",
      zip: "79901",
      latitude: parseFloat(r._geo_y || "31.7619"),
      longitude: parseFloat(r._geo_x || "-106.485"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.B1_APPL_ST),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "gis.elpasotexas.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const atlanta: CityAdapter = {
  domain: "services5.arcgis.com",
  datasetId: "atlanta-permits",
  city: "Atlanta",
  state: "GA",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`Use_ = 'Commercial' AND OrigOpened >= ${ts}`);
    return `https://services5.arcgis.com/5RxyIIJ9boPdptdo/arcgis/rest/services/Building_Permit_latest/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=OrigOpened+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Name || r.TypeCombo || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.JOB_VALUE || "0");
    if (value > 0 && value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.OrigOpened) {
      const d = new Date(Number(r.OrigOpened));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `atl-${r.RecordID || `unknown-${idx}`}`,
      permitNumber: r.RecordID || `ATL-${idx}`,
      address: r.Address || "Atlanta, GA",
      city: "Atlanta",
      state: "GA",
      zip: "30303",
      latitude: parseFloat(r._geo_y || r.DisplayY || "33.749"),
      longitude: parseFloat(r._geo_x || r.DisplayX || "-84.388"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.statusP || r.Status_1),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "gis.atlantaga.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const milwaukee: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "milwaukee-permits",
  city: "Milwaukee",
  state: "WI",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const ts = new Date(dateStr).getTime();
    const where = encodeURIComponent(`PERMIT_TYPE = 'Commercial' AND RECORD_OPEN_DATE >= ${ts}`);
    return `https://services1.arcgis.com/5ly0cVV70qsN8Soc/arcgis/rest/services/Commercial_and_Residential_Permits/FeatureServer/0/query?where=${where}&outFields=*&returnGeometry=true&outSR=4326&f=json&resultRecordCount=200&orderByFields=RECORD_OPEN_DATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.RECORD_TYPE || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.JOB_Cost || "0");
    if (value > 0 && value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.RECORD_OPEN_DATE) {
      const d = new Date(Number(r.RECORD_OPEN_DATE));
      if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0];
    }
    return {
      id: `mke-${r.OBJECTID || `unknown-${idx}`}`,
      permitNumber: `MKE-${r.OBJECTID || idx}`,
      address: r.ADDRESS || "Milwaukee, WI",
      city: "Milwaukee",
      state: "WI",
      zip: "53202",
      latitude: parseFloat(r._geo_y || "43.0389"),
      longitude: parseFloat(r._geo_x || "-87.9065"),
      filingDate,
      description: desc || "Commercial construction work",
      estimatedValue: value,
      status: mapStatus(r.RECORD_STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.milwaukee.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const durham: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Durham",
  state: "NC",
  buildUrl(dateStr: string) {
    const epoch = new Date(dateStr).getTime();
    return `https://webgis.durhamnc.gov/server/rest/services/PublicServices/Inspections/MapServer/12/query?where=ISSUE_DATE>=${epoch}+AND+Occupancy+IN+('Business','Mercantile','Mixed+Use+Commercial','Factory+Industrial','Storage','Assembly')&outFields=PermitNum,ISSUE_DATE,DESCRIPTION,PROJECT_NAME,BLD_Cost,PmtStatus,Occupancy,BLDB_ACTIVITY&outSR=4326&f=json&resultRecordCount=200`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.PROJECT_NAME || "";
    if (!desc) return null;
    const cost = parseFloat(r.BLD_Cost || "0");
    const lat = parseFloat(r._geo_y || "35.9940");
    const lng = parseFloat(r._geo_x || "-78.8986");
    const issued = r.ISSUE_DATE ? new Date(parseInt(r.ISSUE_DATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("CO Issued") || s?.includes("Finaled")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `dur-${r.PermitNum || idx}`,
      permitNumber: r.PermitNum || `DUR-${idx}`,
      address: `Durham, NC`,
      city: "Durham",
      state: "NC",
      zip: "27701",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: cost || 100000,
      status: mapStatus(r.PmtStatus || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "webgis.durhamnc.gov",
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
  philadelphia: [philadelphia],
  boston: [boston],
  "los-angeles": [losAngeles],
  nashville: [nashville],
  "san-diego": [sanDiegoCounty],
  denver: [denver],
  minneapolis: [minneapolis],
  "washington-dc": [washingtonDC],
  portland: [portland],
  orlando: [orlando],
  columbus: [columbus],
  "fort-worth": [fortWorth],
  "las-vegas": [lasVegas],
  phoenix: [phoenix],
  raleigh: [raleigh],
  tampa: [tampa],
  cincinnati: [cincinnati],
  "baton-rouge": [batonRouge],
  "montgomery-county": [montgomeryCounty],
  mesa: [mesa],
  "new-orleans": [newOrleans],
  "kansas-city": [kansasCity],
  honolulu: [honolulu],
  "prince-georges": [princeGeorges],
  louisville: [louisville],
  sacramento: [sacramento],
  "san-antonio": [sanAntonio],
  baltimore: [baltimore],
  miami: [miami],
  charlotte: [charlotte],
  detroit: [detroit],
  tucson: [tucson],
  atlanta: [atlanta],
  milwaukee: [milwaukee],
  albuquerque: [albuquerque],
  "virginia-beach": [virginiaBeach],
  "el-paso": [elPaso],
  memphis: [memphis],
  pittsburgh: [pittsburgh],
  durham: [durham],
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
