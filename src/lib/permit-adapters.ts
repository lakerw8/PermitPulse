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
  headers?: Record<string, string>;
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
    const q = `SELECT *, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM permits WHERE permitissuedate >= '${dateStr}' AND commercialorresidential = 'Commercial' ORDER BY permitissuedate DESC LIMIT 200`;
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
  return (data?.features || []).map((f) => {
    const gx = f.geometry?.x;
    const gy = f.geometry?.y;
    return {
      ...f.attributes,
      _geo_x: (typeof gx === "number" && !isNaN(gx)) ? String(gx) : "",
      _geo_y: (typeof gy === "number" && !isNaN(gy)) ? String(gy) : "",
    };
  }) as Record<string, string>[];
}

const denver: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "commercial-permits",
  city: "Denver",
  state: "CO",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`DATE_ISSUED > timestamp '${dateStr} 00:00:00'`);
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
    const where = encodeURIComponent(`File_Date > timestamp '${dateStr} 00:00:00' AND Permit_Type = 'Commercial Building Permit'`);
    return `https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Permits/MapServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=File_Date+DESC`;
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
    const where = encodeURIComponent(`SCOPE_DESC LIKE '%COMMERCIAL%' AND PER_ISSUE_DATE > timestamp '${dateStr} 00:00:00'`);
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
  datasetId: "rcm3-fn58",
  city: "New Orleans",
  state: "LA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `issuedate >= '${dateStr}T00:00:00.000' AND landuseshort = 'COMM'`,
      $order: "issuedate DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.type || "";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.constrval || "0");
    const loc = r.location_1 as unknown as { latitude?: string; longitude?: string } | undefined;
    const lat = parseFloat(loc?.latitude || "29.9511");
    const lng = parseFloat(loc?.longitude || "-90.0715");
    const gcName = (r.contractors || "").split(" dba ")[0] || "Unknown Contractor";
    return {
      id: `nola-${r.numstring || idx}`,
      permitNumber: r.numstring || `NOLA-${idx}`,
      address: r.address || "New Orleans, LA",
      city: "New Orleans",
      state: "LA",
      zip: "70112",
      latitude: lat,
      longitude: lng,
      filingDate: r.issuedate?.split("T")[0] || dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.currentstatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
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
    const where = encodeURIComponent(`ISSUE_DATE > timestamp '${dateStr} 00:00:00' AND Occupancy IN ('Business','Mercantile','Mixed Use Commercial','Factory Industrial','Storage','Assembly')`);
    return `https://webgis.durhamnc.gov/server/rest/services/PublicServices/Inspections/MapServer/12/query?where=${where}&outFields=PermitNum,ISSUE_DATE,DESCRIPTION,PROJECT_NAME,BLD_Cost,PmtStatus,Occupancy,BLDB_ACTIVITY&outSR=4326&f=json&resultRecordCount=200`;
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

const buffalo: CityAdapter = {
  domain: "data.buffalony.gov",
  datasetId: "9p2d-f3yt",
  city: "Buffalo",
  state: "NY",
  buildQuery(dateStr: string) {
    const params = new URLSearchParams();
    params.set("$where", `issued >= '${dateStr}' AND aptype IN ('NEW COM','GC','INTBLDOUT','COMMADDN','COMMALTR')`);
    params.set("$limit", "200");
    params.set("$order", "issued DESC");
    return params;
  },
  toPermit(r, idx) {
    const desc = r.descofwork || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.value || "0");
    const lat = parseFloat(r.latitude || "42.8864");
    const lng = parseFloat(r.longitude || "-78.8784");
    return {
      id: `buf-${r.apno || idx}`,
      permitNumber: r.apno || `BUF-${idx}`,
      address: [r.stname, r.city, r.state, r.zip].filter(Boolean).join(", ") || "Buffalo, NY",
      city: "Buffalo",
      state: "NY",
      zip: r.zip || "14202",
      latitude: lat,
      longitude: lng,
      filingDate: r.issued?.split("T")[0] || dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: "Issued" as const,
      trades: classifyTrades(desc),
      gcContact: { companyName: r.applicant || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r.applicant ? "Medium" : "Low") as ContactConfidence },
      source: "data.buffalony.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const wichita: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Wichita",
  state: "KS",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`ApplicationDate > timestamp '${dateStr} 00:00:00' AND OccupancyType='BUSINESS' AND Jurisdiction='Wichita'`);
    return `https://gismaps.wichita.gov/ageweb/rest/services/MISC/MABCD/FeatureServer/1/query?where=${where}&outFields=PermitNumber,InwardAddress,City,State,PostalCode,ApplicationDate,PermitDesc,DeclaredValuation,OccupancyType,PermitStatus,CustomName&outSR=4326&f=json&resultRecordCount=200&orderByFields=ApplicationDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.PermitDesc || "";
    if (!desc) return null;
    const value = parseFloat(r.DeclaredValuation || "0");
    const lat = parseFloat(r._geo_y || "37.6872");
    const lng = parseFloat(r._geo_x || "-97.3301");
    const issued = r.ApplicationDate ? new Date(parseInt(r.ApplicationDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Complete") || s?.includes("Finaled")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.CustomName || "Unknown Contractor";
    return {
      id: `wich-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `WICH-${idx}`,
      address: [r.InwardAddress, r.City, r.State, r.PostalCode].filter(Boolean).join(", ") || "Wichita, KS",
      city: "Wichita",
      state: "KS",
      zip: r.PostalCode || "67202",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "gismaps.wichita.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const spokane: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Spokane",
  state: "WA",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`OpenDate > timestamp '${dateStr} 00:00:00' AND PermitType='Commercial'`);
    return `https://services.spokanegis.org/arcgis/rest/services/Permit/Permit_WM_Dynamic2/MapServer/0/query?where=${where}&outFields=SpokanePermitID,FullAddress,OpenDate,DetailShortNotes,Status,PermitCategory,Neighborhood&outSR=4326&f=json&resultRecordCount=200&orderByFields=OpenDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DetailShortNotes || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "47.6588");
    const lng = parseFloat(r._geo_x || "-117.4260");
    const issued = r.OpenDate ? new Date(parseInt(r.OpenDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Final")) return "Completed" as const;
      if (s?.includes("Issued") || s?.includes("Active")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `spk-${r.SpokanePermitID || idx}`,
      permitNumber: r.SpokanePermitID || `SPK-${idx}`,
      address: r.FullAddress || "Spokane, WA",
      city: "Spokane",
      state: "WA",
      zip: "99201",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 100000,
      status: mapStatus(r.Status || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "spokanegis.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const charleston: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Charleston",
  state: "SC",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`ISSUE_DATE > timestamp '${dateStr} 00:00:00' AND PERMIT_TYPE='Building Commercial'`);
    return `https://services2.arcgis.com/tQaXW7Zb1Vphzvgd/arcgis/rest/services/New_Construction_Permits/FeatureServer/0/query?where=${where}&outFields=PERMIT_NUMBER,PARCELADDR_LINE1,APPLICATION_DATE,ISSUE_DATE,DESCRIPTION,VALUATION,PERMIT_STATUS&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUE_DATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || "";
    if (!desc) return null;
    const value = parseFloat(r.VALUATION || "0");
    const lat = parseFloat(r._geo_y || "32.7765");
    const lng = parseFloat(r._geo_x || "-79.9311");
    const issued = r.ISSUE_DATE ? new Date(parseInt(r.ISSUE_DATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Complete") || s?.includes("Final") || s?.includes("CO")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `chs-${r.PERMIT_NUMBER || idx}`,
      permitNumber: r.PERMIT_NUMBER || `CHS-${idx}`,
      address: r.PARCELADDR_LINE1 || "Charleston, SC",
      city: "Charleston",
      state: "SC",
      zip: "29401",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PERMIT_STATUS || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "charleston-sc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const hartford: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Hartford",
  state: "CT",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`DateIssued > timestamp '${dateStr} 00:00:00' AND RECORD_TYPE_TYPE='Commercial'`);
    return `https://utility.arcgis.com/usrsvcs/servers/d595ae995fb049d3ac54919ebf24b1ac/rest/services/HartfordOpenDataTables/FeatureServer/0/query?where=${where}&outFields=RECORD_ID,PROPERTY_ADDRESS,DateIssued,DATE_OPENED,DESCRIPTION,Total_Construction_Cost,RECORD_STATUS&f=json&resultRecordCount=200&orderByFields=DateIssued+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || "";
    if (!desc) return null;
    const value = parseFloat(r.Total_Construction_Cost || "0");
    const issued = r.DateIssued ? new Date(parseInt(r.DateIssued)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Complete") || s?.includes("Final") || s?.includes("Closed")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `htf-${r.RECORD_ID || idx}`,
      permitNumber: r.RECORD_ID || `HTF-${idx}`,
      address: r.PROPERTY_ADDRESS || "Hartford, CT",
      city: "Hartford",
      state: "CT",
      zip: "06103",
      latitude: 41.7637,
      longitude: -72.6851,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.RECORD_STATUS || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "gis.hartford.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const cleveland: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Cleveland",
  state: "OH",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`FILE_DATE > timestamp '${dateStr} 00:00:00' AND PERMIT_SUBTYPE='Commercial'`);
    return `https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services/Building_Permits/FeatureServer/0/query?where=${where}&outFields=PERMIT_ID,PRIMARY_ADDRESS,FILE_DATE,ISSUE_DATE,JOB_DESCRIPTION,WORK_DESCRIPTION,JOB_VALUE,CONTRACTOR_NAME,CONTRATOR_BUSINESS_NAME,CURRENT_TASK_STATUS,LAT,LON&f=json&resultRecordCount=200&orderByFields=FILE_DATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.JOB_DESCRIPTION || r.WORK_DESCRIPTION || "";
    if (!desc) return null;
    const value = parseFloat(r.JOB_VALUE || "0");
    const lat = parseFloat(r.LAT || "41.4993");
    const lng = parseFloat(r.LON || "-81.6944");
    const issued = r.FILE_DATE ? new Date(parseInt(r.FILE_DATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Closed") || s?.includes("Final") || s?.includes("Certificate")) return "Completed" as const;
      if (s?.includes("Issued") || s?.includes("Issuance Approved")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.CONTRATOR_BUSINESS_NAME || r.CONTRACTOR_NAME || "Unknown Contractor";
    return {
      id: `cle-${r.PERMIT_ID || idx}`,
      permitNumber: r.PERMIT_ID || `CLE-${idx}`,
      address: r.PRIMARY_ADDRESS || "Cleveland, OH",
      city: "Cleveland",
      state: "OH",
      zip: "44114",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.CURRENT_TASK_STATUS || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.CONTRACTOR_NAME || null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "data.clevelandohio.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const coloradoSprings: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Colorado Springs",
  state: "CO",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`PermitDate > timestamp '${dateStr} 00:00:00' AND Jurisdiction='COLORADO SPRINGS' AND IsResidential=0`);
    return `https://maps.pprbd.org/server/rest/services/Permits_Full_B_WM/MapServer/0/query?where=${where}&outFields=PermitNum,FullAddress1,FullAddress2,PermitDate,ProjectDesc,Valuation,ContractorName,PermitStatus,ProjectType&outSR=4326&f=json&resultRecordCount=200&orderByFields=PermitDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.ProjectDesc || "";
    if (!desc) return null;
    const value = parseFloat(r.Valuation || "0");
    const lat = parseFloat(r._geo_y || "38.8339");
    const lng = parseFloat(r._geo_x || "-104.8214");
    const issued = r.PermitDate ? new Date(parseInt(r.PermitDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s === "F") return "Completed" as const;
      if (s === "O" || s === "L") return "Issued" as const;
      if (s === "P") return "Under Review" as const;
      return "Under Review" as const;
    };
    const gcName = r.ContractorName || "Unknown Contractor";
    return {
      id: `cos-${r.PermitNum || idx}`,
      permitNumber: r.PermitNum || `COS-${idx}`,
      address: [r.FullAddress1, r.FullAddress2].filter(Boolean).join(", ") || "Colorado Springs, CO",
      city: "Colorado Springs",
      state: "CO",
      zip: "80903",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "maps.pprbd.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const boise: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Boise",
  state: "ID",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssuedDate > timestamp '${dateStr} 00:00:00' AND TypeOfUse='Commercial'`);
    return `https://services1.arcgis.com/WHM6qC35aMtyAAlN/arcgis/rest/services/PDS_BuildingPermits_HighImpact/FeatureServer/0/query?where=${where}&outFields=RecordID,PropertyAddress,IssuedDate,RecordName,Description,JobValue,PermitStatus,TypeOfPermit,TypeOfWork&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssuedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.RecordName || "";
    if (!desc) return null;
    const value = parseFloat(r.JobValue || "0");
    const lat = parseFloat(r._geo_y || "43.6150");
    const lng = parseFloat(r._geo_x || "-116.2023");
    const issued = r.IssuedDate ? new Date(parseInt(r.IssuedDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Final")) return "Completed" as const;
      if (s?.includes("Issued") || s?.includes("Active")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `boi-${r.RecordID || idx}`,
      permitNumber: r.RecordID || `BOI-${idx}`,
      address: r.PropertyAddress || "Boise, ID",
      city: "Boise",
      state: "ID",
      zip: "83702",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "opendata.cityofboise.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const greensboro: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Greensboro",
  state: "NC",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssuedDate > timestamp '${dateStr} 00:00:00' AND BP_COMM_RESID_MULT='C'`);
    return `https://gis.greensboro-nc.gov/arcgis/rest/services/EngineeringInspections/BuildingPermits_MS/MapServer/0/query?where=${where}&outFields=PermitNum,FullAddress,Contractor,IssuedDate,Description,TotalCost,StatusCurrent,OccupancyDescCombo,ApplicationType&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssuedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || "";
    if (!desc) return null;
    const value = parseFloat(r.TotalCost || "0");
    const lat = parseFloat(r._geo_y || "36.0726");
    const lng = parseFloat(r._geo_x || "-79.7920");
    const issued = r.IssuedDate ? new Date(parseInt(r.IssuedDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Final")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.Contractor || "Unknown Contractor";
    return {
      id: `gso-${r.PermitNum || idx}`,
      permitNumber: String(r.PermitNum || `GSO-${idx}`),
      address: r.FullAddress || "Greensboro, NC",
      city: "Greensboro",
      state: "NC",
      zip: "27401",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.StatusCurrent || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "gis.greensboro-nc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const stPetersburg: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "St. Petersburg",
  state: "FL",
  buildUrl(dateStr: string) {
    const d = new Date(dateStr);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateFormatted = `${yy}${mm}${dd}`;
    return `https://egis.stpete.org/arcgis/rest/services/ServicesDSD/PermitsExternal/FeatureServer/4/query?where=PERMITISSUEDATE>='${dateFormatted}'+AND+APPLICATIONTYPE='ACOM'&outFields=APPLICATIONPARAM,ADDRESS,PERMITISSUEDATE,APPLICATIONDESC,PERMITDESCRIPTION,CONSTRUCTIONVALUE,CONTRACTOR,APPLICATIONSTATUS&outSR=4326&f=json&resultRecordCount=200&orderByFields=PERMITISSUEDATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.APPLICATIONDESC || r.PERMITDESCRIPTION || "";
    if (!desc) return null;
    const value = parseFloat(r.CONSTRUCTIONVALUE || "0");
    const lat = parseFloat(r._geo_y || "27.7676");
    const lng = parseFloat(r._geo_x || "-82.6403");
    const dateStr = r.PERMITISSUEDATE || "";
    let issued = dateNDaysAgo(0);
    if (dateStr.length === 6) {
      issued = `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`;
    }
    const mapStatus = (s: string) => {
      if (s === "FN" || s === "CO") return "Completed" as const;
      if (s === "IS") return "Issued" as const;
      if (s === "AP") return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.CONTRACTOR || "Unknown Contractor";
    return {
      id: `stp-${r.APPLICATIONPARAM || idx}`,
      permitNumber: r.APPLICATIONPARAM || `STP-${idx}`,
      address: r.ADDRESS || "St. Petersburg, FL",
      city: "St. Petersburg",
      state: "FL",
      zip: "33701",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.APPLICATIONSTATUS || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "egis.stpete.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const aurora: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Aurora",
  state: "CO",
  buildUrl(dateStr: string) {
    return `https://ags.auroragov.org/aurora/rest/services/OpenData/MapServer/156/query?where=FolderType='CM'+AND+IssueDate>=timestamp+'${dateStr}+00:00:00'&outFields=Permit_,Address,IssueDate,FolderDescription,SubDesc,valuation,Status_1&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssueDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.FolderDescription || r.SubDesc || "";
    if (!desc) return null;
    const value = parseFloat(r.valuation || "0");
    const lat = parseFloat(r._geo_y || "0") || 39.7294;
    const lng = parseFloat(r._geo_x || "0") || -104.8319;
    const issued = r.IssueDate ? new Date(parseInt(r.IssueDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Final") || s?.includes("Certificate") || s?.includes("Closed")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `aur-${r.Permit_ || idx}`,
      permitNumber: r.Permit_ || `AUR-${idx}`,
      address: (r.Address || "Aurora, CO").trim(),
      city: "Aurora",
      state: "CO",
      zip: "80012",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.Status_1 || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.auroragov.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const knoxville: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Knoxville",
  state: "TN",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`DATEISSUED > timestamp '${dateStr} 00:00:00' AND RESNONRES='Non-Res'`);
    return `https://services1.arcgis.com/QWaOgwdmpqI9HUzf/arcgis/rest/services/BuildingPermits_KNO/FeatureServer/0/query?where=${where}&outFields=PERMITNUMBER,ADDRESS,DATEISSUED,DESCRIPTION,PERMITVALUE,CONTRACTOR,OWNER,PERMITTYPE,CLASSWORK&outSR=4326&f=json&resultRecordCount=200&orderByFields=DATEISSUED+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.CLASSWORK || "";
    if (!desc) return null;
    const value = parseFloat(r.PERMITVALUE || "0");
    const lat = parseFloat(r._geo_y || "35.9606");
    const lng = parseFloat(r._geo_x || "-83.9207");
    const issued = r.DATEISSUED ? new Date(parseInt(r.DATEISSUED)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const gcName = r.CONTRACTOR || "Unknown Contractor";
    return {
      id: `knx-${r.PERMITNUMBER || idx}`,
      permitNumber: r.PERMITNUMBER || `KNX-${idx}`,
      address: r.ADDRESS || "Knoxville, TN",
      city: "Knoxville",
      state: "TN",
      zip: "37902",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: "Issued" as const,
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "kgis.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const chattanooga: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Chattanooga",
  state: "TN",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`PERMIT_DAT > timestamp '${dateStr} 00:00:00' AND P_TYPE='Non-Residential' AND CITY='Chattanooga'`);
    return `https://services2.arcgis.com/cclAu9OKhOfjeUdr/arcgis/rest/services/Building_Permits_to_April_2021/FeatureServer/0/query?where=${where}&outFields=PERMIT_NUM,ADDRESS,PERMIT_DAT,VALUATION,P_DESC,DEV_TYPE_C,PERMIT_YEAR&outSR=4326&f=json&resultRecordCount=200&orderByFields=PERMIT_DAT+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.P_DESC || r.DEV_TYPE_C || "";
    if (!desc) return null;
    const value = parseFloat(r.VALUATION || "0");
    const lat = parseFloat(r._geo_y || "35.0456");
    const lng = parseFloat(r._geo_x || "-85.3097");
    const issued = r.PERMIT_DAT ? new Date(parseInt(r.PERMIT_DAT)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `cha-${r.PERMIT_NUM || idx}`,
      permitNumber: r.PERMIT_NUM || `CHA-${idx}`,
      address: r.ADDRESS || "Chattanooga, TN",
      city: "Chattanooga",
      state: "TN",
      zip: "37402",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: "Issued" as const,
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" },
      source: "data.chattanooga.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const anaheim: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Anaheim",
  state: "CA",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`applicationreceived > timestamp '${dateStr} 00:00:00' AND comres LIKE 'Commercial%'`);
    return `https://services3.arcgis.com/hPs600I3X0RTaaaq/arcgis/rest/services/Accela_Building_Permits/FeatureServer/0/query?where=${where}&outFields=casenumber,address,applicationreceived,description,jobvaluation,contractorsname,contractorsphone,casestatus,typeofwork&outSR=4326&f=json&resultRecordCount=200&orderByFields=applicationreceived+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.description || r.typeofwork || "";
    if (!desc) return null;
    const value = parseFloat(r.jobvaluation || "0");
    const lat = parseFloat(r._geo_y || "33.8366");
    const lng = parseFloat(r._geo_x || "-117.9143");
    const issued = r.applicationreceived ? new Date(parseInt(r.applicationreceived)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Final")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.contractorsname || "Unknown Contractor";
    return {
      id: `ana-${r.casenumber || idx}`,
      permitNumber: r.casenumber || `ANA-${idx}`,
      address: r.address || "Anaheim, CA",
      city: "Anaheim",
      state: "CA",
      zip: "92805",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.casestatus || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.contractorsphone || null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "anaheim.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const jacksonville: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Jacksonville",
  state: "FL",
  headers: { Referer: "https://maps.coj.net/bid/" },
  buildUrl(dateStr: string) {
    const d = new Date(dateStr);
    const dateFormatted = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    return `https://maps.coj.net/bid/duval.ashx?HTTPS://CMVXDWVZDA.QQQ/Z4/query?where=PaidDay>='${encodeURIComponent(dateFormatted)}'+AND+ProposedUseTypeID=2+AND+PermitTypeID=1&outFields=FullPermitNumber,ADDR,Comments,TotalCost,CompanyName,Status,TypeOfWork,PaidDay,ZIPCODE&outSR=4326&f=json&resultRecordCount=200&orderByFields=PaidDay+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Comments || r.TypeOfWork || "";
    if (!desc) return null;
    const value = parseFloat(r.TotalCost || "0");
    const lat = parseFloat(r._geo_y || "30.3322");
    const lng = parseFloat(r._geo_x || "-81.6557");
    const issued = r.PaidDay ? new Date(parseInt(r.PaidDay)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s === "23" || s === "139") return "Completed" as const;
      if (s === "12" || s === "136") return "Issued" as const;
      if (s === "134") return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.CompanyName || "Unknown Contractor";
    return {
      id: `jax-${r.FullPermitNumber || idx}`,
      permitNumber: r.FullPermitNumber || `JAX-${idx}`,
      address: r.ADDR || "Jacksonville, FL",
      city: "Jacksonville",
      state: "FL",
      zip: r.ZIPCODE || "32202",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(String(r.Status || "")),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "maps.coj.net",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const lincoln: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Lincoln",
  state: "NE",
  buildUrl() {
    return `https://gis.lincoln.ne.gov/public/rest/services/Planning/Commercial_New_Construction_Permits/MapServer/2/query?where=1=1&outFields=PermNo,CurrStatus,Address,PermType,DescWork,Issued,Applied,Value,UseType,ClassCode,ZIP,CITY&outSR=4326&f=json&resultRecordCount=200&orderByFields=Issued+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DescWork || r.PermType || "";
    if (!desc) return null;
    const value = parseFloat(r.Value || "0");
    const lat = parseFloat(r._geo_y || "40.8136");
    const lng = parseFloat(r._geo_x || "-96.7026");
    const raw = (r.Issued || "").trim();
    let issued = dateNDaysAgo(0);
    if (raw.includes("/")) {
      const [mm, dd, yyyy] = raw.split("/");
      if (yyyy && mm && dd) issued = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return {
      id: `lnk-${r.PermNo || idx}`,
      permitNumber: r.PermNo || `LNK-${idx}`,
      address: r.Address || "Lincoln, NE",
      city: "Lincoln",
      state: "NE",
      zip: r.ZIP || "68508",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.CurrStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "gis.lincoln.ne.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const henderson: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Henderson",
  state: "NV",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`APPLICATIONDATE > timestamp '${dateStr} 00:00:00' AND (CASETYPE LIKE '%Commercial%' OR CASETYPE LIKE '%Industrial%' OR CASETYPE LIKE '%Office%')`);
    return `https://maps.cityofhenderson.com/arcgis/rest/services/public/OpenDevPermits/MapServer/2/query?where=${where}&outFields=CASENUMBER,CASETYPE,CASEWORKCLASS,STATUS,MAIN_ADDRESS_LINE1,DESCRIPTION,APPLICATIONDATE,ISSUEDATE,OWNER&outSR=4326&f=json&resultRecordCount=200&orderByFields=APPLICATIONDATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.CASEWORKCLASS || r.CASETYPE || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "36.0395");
    const lng = parseFloat(r._geo_x || "-114.9817");
    const issued = r.APPLICATIONDATE ? new Date(parseInt(r.APPLICATIONDATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `hnd-${r.CASENUMBER || idx}`,
      permitNumber: r.CASENUMBER || `HND-${idx}`,
      address: r.MAIN_ADDRESS_LINE1 || "Henderson, NV",
      city: "Henderson",
      state: "NV",
      zip: "89012",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 150000,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: r.OWNER || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r.OWNER ? "Medium" : "Low") as ContactConfidence },
      source: "maps.cityofhenderson.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const scottsdale: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Scottsdale",
  state: "AZ",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssueDate > timestamp '${dateStr} 00:00:00' AND PermitType LIKE '%COMMERCIAL%'`);
    return `https://maps.scottsdaleaz.gov/arcgis/rest/services/OpenData_Tabular/MapServer/12/query?where=${where}&outFields=PermitNumber,PermitType,PermitStatus,Address,IssueDate,Valuation,Builder,Latitude,Longitude&f=json&resultRecordCount=200&orderByFields=IssueDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.PermitType || "";
    if (!desc) return null;
    const value = parseFloat(r.Valuation || "0");
    const lat = parseFloat(r.Latitude || r._geo_y || "33.4942");
    const lng = parseFloat(r.Longitude || r._geo_x || "-111.9261");
    const issued = r.IssueDate ? new Date(parseInt(r.IssueDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const gcName = r.Builder || "Unknown Contractor";
    return {
      id: `sco-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `SCO-${idx}`,
      address: r.Address || "Scottsdale, AZ",
      city: "Scottsdale",
      state: "AZ",
      zip: "85251",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "maps.scottsdaleaz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const gilbert: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Gilbert",
  state: "AZ",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssuedDate > timestamp '${dateStr} 00:00:00' AND PermitType='Commercial Building'`);
    return `https://maps.gilbertaz.gov/arcgis/rest/services/OD/Growth_Development_Tables_1/MapServer/3/query?where=${where}&outFields=PermitNumber,PermitType,PermitStatus,PermitValuation,AddressFull,WorkClass,IssuedDate,ApplyDate,ProjectName,Latitude,Longitude&f=json&resultRecordCount=200&orderByFields=IssuedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.ProjectName || r.WorkClass || r.PermitType || "";
    if (!desc) return null;
    const value = parseFloat(r.PermitValuation || "0");
    const lat = parseFloat(r.Latitude || r._geo_y || "33.3528");
    const lng = parseFloat(r.Longitude || r._geo_x || "-111.7890");
    const issued = r.IssuedDate ? new Date(parseInt(r.IssuedDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `glb-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `GLB-${idx}`,
      address: r.AddressFull || "Gilbert, AZ",
      city: "Gilbert",
      state: "AZ",
      zip: "85234",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "maps.gilbertaz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const tempe: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Tempe",
  state: "AZ",
  buildUrl(dateStr: string) {
    return `https://services.arcgis.com/lQySeXwbBg53XWDi/arcgis/rest/services/building_permits/FeatureServer/0/query?where=IssuedDate>='${dateStr}'&outFields=PermitNum,Description,IssuedDate,EstProjectCost,StatusCurrent,OriginalAddress1,OriginalZip,PermitTypeDesc,ContractorCompanyName,ContractorPhone,ContractorEmail,Latitude,Longitude&f=json&resultRecordCount=200&orderByFields=IssuedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.PermitTypeDesc || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.EstProjectCost || "0");
    const lat = parseFloat(r.Latitude || r._geo_y || "33.4255");
    const lng = parseFloat(r.Longitude || r._geo_x || "-111.9400");
    const issued = r.IssuedDate || dateNDaysAgo(0);
    const gcName = r.ContractorCompanyName || "Unknown Contractor";
    return {
      id: `tmp-${r.PermitNum || idx}`,
      permitNumber: r.PermitNum || `TMP-${idx}`,
      address: r.OriginalAddress1 || "Tempe, AZ",
      city: "Tempe",
      state: "AZ",
      zip: r.OriginalZip || "85281",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.StatusCurrent),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.ContractorPhone || null, email: r.ContractorEmail || null, confidence: (gcName === "Unknown Contractor" ? "Low" : "High") as ContactConfidence },
      source: "data.tempe.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const tallahassee: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Tallahassee",
  state: "FL",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssuedDate > timestamp '${dateStr} 00:00:00' AND PermitClassMapped IN ('Business','Office/Professional','Restaurant','Hotel/Motel','Industrial','Warehouse','Store Mercantile','Multi-Use','Parking Garage','Service Station/Repair Garage')`);
    return `https://intervector.leoncountyfl.gov/intervector/rest/services/MapServices/TLC_OverlayPermitsActive_D_WM/MapServer/0/query?where=${where}&outFields=PermitNum,Description,IssuedDate,EstProjectCost,StatusCurrent,OriginalAddress1,OriginalZip,PermitTypeDesc,PermitClassMapped,ContractorCompanyName,ContractorFullName,ContractorPhone,ContractorEmail,Latitude,Longitude,ProposedUse&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssuedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.PermitTypeDesc || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.EstProjectCost || "0");
    const lat = parseFloat(r.Latitude || r._geo_y || "30.4383");
    const lng = parseFloat(r.Longitude || r._geo_x || "-84.2807");
    const issued = r.IssuedDate ? new Date(parseInt(r.IssuedDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const gcName = r.ContractorCompanyName || "Unknown Contractor";
    const contactName = r.ContractorFullName || null;
    return {
      id: `tlh-${r.PermitNum || idx}`,
      permitNumber: r.PermitNum || `TLH-${idx}`,
      address: r.OriginalAddress1 || "Tallahassee, FL",
      city: "Tallahassee",
      state: "FL",
      zip: r.OriginalZip || "32301",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.StatusCurrent),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName, phone: r.ContractorPhone || null, email: r.ContractorEmail || null, confidence: (gcName === "Unknown Contractor" ? "Low" : "High") as ContactConfidence },
      source: "leoncountyfl.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const chandler: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Chandler",
  state: "AZ",
  buildUrl() {
    return `https://gis.chandleraz.gov/appsanonymous/rest/services/DevelopmentServices/DSActiveProjects/MapServer/18/query?where=1%3D1&outFields=BLD_F_B1_ALT_ID,BLD_L_PROJ_NM,BLD_F_FULL_ADDRESS,BLD_L_JOB_VALUE,BLD_L_DTL_DESC,BLD_F_ISSUED_DT,BLD_F_PERM_TYPE,ACCELA_PERMIT_TYPE,BLD_L_SQ_FT&outSR=4326&f=json&resultRecordCount=200&orderByFields=BLD_F_ISSUED_DT+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.BLD_L_PROJ_NM || r.BLD_L_DTL_DESC || r.BLD_F_PERM_TYPE || "";
    if (!desc) return null;
    const valStr = (r.BLD_L_JOB_VALUE || "").replace(/[$,]/g, "");
    const value = parseFloat(valStr) || 0;
    const lat = parseFloat(r._geo_y || "33.3062");
    const lng = parseFloat(r._geo_x || "-111.8413");
    const issued = r.BLD_F_ISSUED_DT ? new Date(parseInt(r.BLD_F_ISSUED_DT)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `chn-${r.BLD_F_B1_ALT_ID || idx}`,
      permitNumber: r.BLD_F_B1_ALT_ID || `CHN-${idx}`,
      address: r.BLD_F_FULL_ADDRESS || "Chandler, AZ",
      city: "Chandler",
      state: "AZ",
      zip: "85225",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 200000,
      status: "Issued" as const,
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "gis.chandleraz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const fortLauderdale: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Fort Lauderdale",
  state: "FL",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`SUBMITDT > timestamp '${dateStr} 00:00:00'`);
    return `https://gis.fortlauderdale.gov/arcgis/rest/services/BuildingPermitTracker/BuildingPermitTracker/MapServer/0/query?where=${where}&outFields=PERMITID,FULLADDR,PERMITDESC,ESTCOST,CONTRACTOR,CONTRACTPH,PERMITSTAT,PERMITTYPE,SUBMITDT,USECLASS&outSR=4326&f=json&resultRecordCount=200&orderByFields=SUBMITDT+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.PERMITDESC || r.PERMITTYPE || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.ESTCOST || "0");
    const lat = parseFloat(r._geo_y || "26.1224");
    const lng = parseFloat(r._geo_x || "-80.1373");
    const issued = r.SUBMITDT ? new Date(parseInt(r.SUBMITDT)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const gcName = r.CONTRACTOR || "Unknown Contractor";
    return {
      id: `ftl-${r.PERMITID || idx}`,
      permitNumber: r.PERMITID || `FTL-${idx}`,
      address: r.FULLADDR || "Fort Lauderdale, FL",
      city: "Fort Lauderdale",
      state: "FL",
      zip: "33301",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PERMITSTAT),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: r.CONTRACTPH || null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "High") as ContactConfidence },
      source: "gis.fortlauderdale.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const overlandPark: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Overland Park",
  state: "KS",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`IssueDate > timestamp '${dateStr} 00:00:00' AND ReportPermitType NOT LIKE '%Residential%'`);
    return `https://maps.opkansas.org/mapping/rest/services/MixedInfo/Building_Permit_Report/MapServer/0/query?where=${where}&outFields=CaseNumber,MainAddressLine1,Description,Valuation,PermitStatus,ReportPermitType,IssueDate,Latitude,Longitude&f=json&resultRecordCount=200&orderByFields=IssueDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.ReportPermitType || "";
    if (!desc) return null;
    const value = parseFloat(r.Valuation || "0");
    const lat = parseFloat(r.Latitude || r._geo_y || "38.9822");
    const lng = parseFloat(r.Longitude || r._geo_x || "-94.6708");
    const issued = r.IssueDate ? new Date(parseInt(r.IssueDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `opk-${r.CaseNumber || idx}`,
      permitNumber: r.CaseNumber || `OPK-${idx}`,
      address: r.MainAddressLine1 || "Overland Park, KS",
      city: "Overland Park",
      state: "KS",
      zip: "66204",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "maps.opkansas.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const saltLakeCity: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Salt Lake City",
  state: "UT",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`OpenedDate > timestamp '${dateStr} 00:00:00'`);
    return `https://maps.slc.gov/server/rest/services/Accela/Accela_Permits_v2/MapServer/1/query?where=${where}&outFields=PermitNumber,PermitType,ApplicationSubType,ApplicationStatus,OpenedDate,AppliedDate,PermitIssuance,FULL_ADDRESS,ProjectName,WorkDescription,JobValue,Applicant,ApplicantPhone,ApplicantEmail&outSR=4326&f=json&resultRecordCount=200&orderByFields=OpenedDate+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.WorkDescription || r.ProjectName || r.ApplicationSubType || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.JobValue || "0");
    const lat = parseFloat(r._geo_y || "40.7608");
    const lng = parseFloat(r._geo_x || "-111.8910");
    const issued = r.OpenedDate ? new Date(parseInt(r.OpenedDate)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const applicant = r.Applicant || "Unknown Contractor";
    return {
      id: `slc-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `SLC-${idx}`,
      address: r.FULL_ADDRESS || "Salt Lake City, UT",
      city: "Salt Lake City",
      state: "UT",
      zip: "84101",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.ApplicationStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: applicant, contactName: null, phone: r.ApplicantPhone || null, email: r.ApplicantEmail || null, confidence: (r.ApplicantEmail ? "High" : applicant === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "maps.slc.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const peoria: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Peoria",
  state: "AZ",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`Permit_Type='Commercial' AND B1_FILE_DD > timestamp '${dateStr} 00:00:00'`);
    return `https://gis.peoriaaz.gov/arcgis/rest/services/Accela/Peoria_Building_Permit_All/MapServer/3/query?where=${where}&outFields=Permit_Number,Permit_Type,B1_PER_SUB_TYPE,Project_Status,Project_Description,Project_Address,Applicant_Contact_Name,Applicant_Contact_Organization,ContactPH,IssDate,B1_FILE_DD&outSR=4326&f=json&resultRecordCount=200&orderByFields=B1_FILE_DD+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Project_Description || r.B1_PER_SUB_TYPE || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "33.5806");
    const lng = parseFloat(r._geo_x || "-112.2373");
    const issued = r.B1_FILE_DD ? new Date(parseInt(r.B1_FILE_DD)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const contractor = r.Applicant_Contact_Organization || r.Applicant_Contact_Name || "Unknown Contractor";
    return {
      id: `peo-${r.Permit_Number || idx}`,
      permitNumber: r.Permit_Number || `PEO-${idx}`,
      address: r.Project_Address || "Peoria, AZ",
      city: "Peoria",
      state: "AZ",
      zip: "85345",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 100000,
      status: mapStatus(r.Project_Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: contractor, contactName: r.Applicant_Contact_Name || null, phone: r.ContactPH || null, email: null, confidence: (contractor === "Unknown Contractor" ? "Low" : "High") as ContactConfidence },
      source: "gis.peoriaaz.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const savannah: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Savannah",
  state: "GA",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`PermitType='Building Commercial Permit' AND IssuedDate_DATE > timestamp '${dateStr} 00:00:00'`);
    return `https://pub.sagis.org/arcgis/rest/services/Savannah/BuildingPermit_FC/FeatureServer/0/query?where=${where}&outFields=PermitNumber,PermitType,WorkClass,PermitStatus,IssuedDate,Address,ApplicantName,Description,Permit_Value&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssuedDate_DATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.WorkClass || r.PermitType || "";
    if (!desc) return null;
    const value = parseFloat(r.Permit_Value || "0");
    const lat = parseFloat(r._geo_y || "32.0809");
    const lng = parseFloat(r._geo_x || "-81.0912");
    const issued = r.IssuedDate ? r.IssuedDate.split(" ")[0].replace(/\//g, "-") : dateNDaysAgo(0);
    const applicant = r.ApplicantName || "Unknown Contractor";
    return {
      id: `sav-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `SAV-${idx}`,
      address: r.Address || "Savannah, GA",
      city: "Savannah",
      state: "GA",
      zip: "31401",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: applicant, contactName: null, phone: null, email: null, confidence: (applicant === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "pub.sagis.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const cary: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Cary",
  state: "NC",
  buildUrl(dateStr: string) {
    return `https://data.townofcary.org/api/explore/v2.1/catalog/datasets/permit-applications/records?where=permitclassmapped%3D%27Non-Residential%27+AND+applieddate%3E%3D%27${dateStr}%27&order_by=applieddate+desc&limit=200`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse(json: unknown) {
    const data = json as { results?: { record?: { fields?: Record<string, string> } }[] };
    if (!data.results) return [];
    return data.results.map((r) => (r as unknown as { record: { fields: Record<string, string> } }).record?.fields || r as unknown as Record<string, string>);
  },
  toPermit(r, idx) {
    const desc = r.description || r.permittypedesc || r.permittype || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.projectcost || "0");
    const lat = parseFloat(r.latitude || "35.7915");
    const lng = parseFloat(r.longitude || "-78.7811");
    const issued = r.applieddate?.split("T")[0] || r.issuedate?.split("T")[0] || dateNDaysAgo(0);
    const contractor = r.contractorcompanyname || "Unknown Contractor";
    return {
      id: `cry-${r.permitnum || idx}`,
      permitNumber: r.permitnum || `CRY-${idx}`,
      address: r.originaladdress1 || "Cary, NC",
      city: "Cary",
      state: "NC",
      zip: r.originalzip || "27513",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.statuscurrent),
      trades: classifyTrades(desc),
      gcContact: { companyName: contractor, contactName: null, phone: r.contractorphone || null, email: null, confidence: (contractor === "Unknown Contractor" ? "Low" : "High") as ContactConfidence },
      source: "data.townofcary.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const norfolk: CityAdapter = {
  domain: "data.norfolk.gov",
  datasetId: "fahm-yuh4",
  city: "Norfolk",
  state: "VA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `use_class = 'Commercial' AND application_date >= '${dateStr}T00:00:00.000'`,
      $order: "application_date DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = [r.work_type, r.use_type, r.type].filter(Boolean).join(" ") || "Commercial construction";
    const value = parseFloat(r.project_cost || "0");
    return {
      id: `nfk-${r.permit_number || idx}`,
      permitNumber: r.permit_number || `NFK-${idx}`,
      address: r.address || "Norfolk, VA",
      city: "Norfolk",
      state: "VA",
      zip: "23510",
      latitude: parseFloat(r.latitude || "36.8508"),
      longitude: parseFloat(r.longitude || "-76.2859"),
      filingDate: r.application_date?.split("T")[0] || dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "data.norfolk.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const tacoma: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Tacoma",
  state: "WA",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`application_date > timestamp '${dateStr} 00:00:00'`);
    return `https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/accela_permit_data/FeatureServer/0/query?where=${where}&outFields=permit_number,permit_type,permit_subtype,current_status,application_date,issued_date,applicant_name,address_line_1,description,valuation,latitude,longitude,zip&outSR=4326&f=json&resultRecordCount=200&orderByFields=application_date+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.description || r.permit_subtype || r.permit_type || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const value = parseFloat(r.valuation || "0");
    const lat = parseFloat(r.latitude || r._geo_y || "47.2529");
    const lng = parseFloat(r.longitude || r._geo_x || "-122.4443");
    const issued = r.application_date ? new Date(parseInt(r.application_date)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const applicant = r.applicant_name || "Unknown Contractor";
    return {
      id: `tac-${r.permit_number || idx}`,
      permitNumber: r.permit_number || `TAC-${idx}`,
      address: r.address_line_1 || "Tacoma, WA",
      city: "Tacoma",
      state: "WA",
      zip: r.zip || "98402",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.current_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: applicant, contactName: null, phone: null, email: null, confidence: (applicant === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "Tacoma Accela",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const frisco: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Frisco",
  state: "TX",
  buildUrl(dateStr: string) {
    return `https://maps.friscotexas.gov/gis/rest/services/Public/External_Planning_and_Zoning/MapServer/1/query?where=${encodeURIComponent("Type='Commercial'")}&outFields=Permit_No,Type,Address,Description,Status,Issued_Date,Project_Name&outSR=4326&f=json&resultRecordCount=200&orderByFields=Issued_Date+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Description || r.Project_Name || r.Type || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "33.1507");
    const lng = parseFloat(r._geo_x || "-96.8236");
    let issued = dateNDaysAgo(0);
    if (r.Issued_Date) {
      const parts = (r.Issued_Date as string).trim().split("/");
      if (parts.length === 3) issued = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
    return {
      id: `fri-${r.Permit_No || idx}`,
      permitNumber: r.Permit_No || `FRI-${idx}`,
      address: r.Address || "Frisco, TX",
      city: "Frisco",
      state: "TX",
      zip: "75034",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 100000,
      status: mapStatus(r.Status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "maps.friscotexas.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const siouxFalls: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Sioux Falls",
  state: "SD",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`PERMITTYPE='Commercial Building' AND ISSUEDATE > timestamp '${dateStr} 00:00:00'`);
    return `https://gis.siouxfalls.gov/arcgis/rest/services/Data/Community/MapServer/3/query?where=${where}&outFields=MAINADDRESS,PERMITNUMBER,PERMITTYPE,PERMITSTATUS,WORKCLASS,APPLYDATE,ISSUEDATE,VALUATION,contractor_name&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.WORKCLASS || r.PERMITTYPE || "Commercial Building";
    const value = parseFloat(r.VALUATION || "0");
    const lat = parseFloat(r._geo_y || "43.5460");
    const lng = parseFloat(r._geo_x || "-96.7313");
    const issued = r.ISSUEDATE ? new Date(parseInt(r.ISSUEDATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const contractor = r.contractor_name || "Unknown Contractor";
    return {
      id: `sxf-${r.PERMITNUMBER || idx}`,
      permitNumber: r.PERMITNUMBER || `SXF-${idx}`,
      address: r.MAINADDRESS || "Sioux Falls, SD",
      city: "Sioux Falls",
      state: "SD",
      zip: "57104",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PERMITSTATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: contractor, contactName: null, phone: null, email: null, confidence: (contractor === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "gis.siouxfalls.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const wilmington: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Wilmington",
  state: "NC",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`PERMIT_TYPE='NHC Commercial Building' AND ISSUE_DATE > timestamp '${dateStr} 00:00:00'`);
    return `https://gis.nhcgov.com/server/rest/services/Thematic/BuildingPermits/FeatureServer/0/query?where=${where}&outFields=PERMIT_NUMBER,PERMIT_TYPE,WORK_CLASS,DESCRIPTION,VALUATION,GENERAL_CONTRACTOR,PROJECT_CONTACT,NUMBER,SUBNUM,STREET,TYPE,DIR,CITY,ZIPCODE,Lat,Lon,ISSUE_DATE,PERMIT_STATUS,SQUARE_FEET&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUE_DATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.WORK_CLASS || "Commercial Building";
    const value = parseFloat(r.VALUATION || "0");
    const lat = parseFloat(r.Lat || "34.2257");
    const lng = parseFloat(r.Lon || "-77.9447");
    const issued = r.ISSUE_DATE ? new Date(parseInt(r.ISSUE_DATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const rawGC = r.GENERAL_CONTRACTOR || "";
    const contractor = rawGC.replace(/\s*\(LIC#?\s*\d+\)\s*/gi, "").replace(/\s*\([A-Z]+\)\s*/g, " ").trim() || r.PROJECT_CONTACT || "Unknown Contractor";
    const dir = r.DIR && r.DIR.trim() ? r.DIR.trim() + " " : "";
    const st = r.TYPE && r.TYPE.trim() ? " " + r.TYPE.trim() : "";
    const address = `${r.NUMBER || ""} ${dir}${r.STREET || ""}${st}`.trim() || "Wilmington, NC";
    return {
      id: `wlm-${r.PERMIT_NUMBER || idx}`,
      permitNumber: r.PERMIT_NUMBER || `WLM-${idx}`,
      address,
      city: "Wilmington",
      state: "NC",
      zip: r.ZIPCODE || "28401",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.PERMIT_STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: contractor, contactName: null, phone: null, email: null, confidence: (contractor === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "gis.nhcgov.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const stPaul: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "st-paul-permits",
  city: "St. Paul",
  state: "MN",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`WORK_TYPE LIKE 'Commercial%' AND ISSUEDATE >= timestamp '${dateStr} 00:00:00'`);
    return `https://services1.arcgis.com/9meaaHE3uiba0zr8/arcgis/rest/services/Approved_Building_Permits/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.FOLDERDESCRIPTION || r.WORK_TYPE || "Commercial construction";
    const value = parseFloat(r.EST_VALUE_OF_WORK || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.CONTRACTORNAME || "Unknown Contractor";
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDATE) { const d = new Date(Number(r.ISSUEDATE)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    const lat = parseFloat(r.LATITUE || r._geo_y || "44.9537");
    const lng = parseFloat(r.LONGITUTE || r._geo_x || "-93.09");
    return {
      id: `stp-${r.PERMITNUMBER || idx}`,
      permitNumber: r.PERMITNUMBER || `STP-${idx}`,
      address: r.ADDRESS || "St. Paul, MN",
      city: "St. Paul", state: "MN", zip: "55101",
      latitude: lat, longitude: lng,
      filingDate, description: desc, estimatedValue: value || 100000,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "information.stpaul.gov", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const naperville: CityAdapter = {
  domain: "services1.arcgis.com",
  datasetId: "naperville-permits",
  city: "Naperville",
  state: "IL",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`PERMITTYPE='COMMERCIAL' AND ISSUEDATE >= timestamp '${dateStr} 00:00:00'`);
    return `https://services1.arcgis.com/rXJ6QApc2sOtl1Pd/arcgis/rest/services/Building_Permits_View/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.PERMITWORKCLASS || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.PERMITVALUATION || "0");
    if (value > 0 && value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDATE) { const d = new Date(Number(r.ISSUEDATE)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    const parts = [r.STREETNUMBER, r.PREDIRECTION, r.STREETNAME, r.STREETTYPE, r.UNITORSUITE].filter(Boolean);
    const address = parts.join(" ") || "Naperville, IL";
    return {
      id: `nap-${r.PERMITNUMBER || idx}`,
      permitNumber: r.PERMITNUMBER || `NAP-${idx}`,
      address, city: "Naperville", state: "IL", zip: r.POSTALCODE || "60540",
      latitude: parseFloat(r._geo_y || "41.7508"), longitude: parseFloat(r._geo_x || "-88.1535"),
      filingDate, description: desc, estimatedValue: value || 100000,
      status: mapStatus(r.PERMITSTATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "naperville.il.us", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const salemOR: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "salem-permits",
  city: "Salem",
  state: "OR",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`SUBDESCRIPTION='Commercial' AND ISSUEDDATE >= timestamp '${dateStr} 00:00:00'`);
    return `https://services.arcgis.com/kIA6yS9KDGqZL7U3/arcgis/rest/services/Structure_Permits/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDDATE+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.FOLDERDESCRIPTION || r.WORKDESCRIPTION || r.MAPDESCRIPTION || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.ISSUEDDATE) { const d = new Date(Number(r.ISSUEDDATE)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    return {
      id: `sal-${r.FOLDERNUMBER || idx}`,
      permitNumber: r.FOLDERNUMBER || `SAL-${idx}`,
      address: r.PROPERTYADDRESS || "Salem, OR",
      city: "Salem", state: "OR", zip: "97301",
      latitude: parseFloat(r._geo_y || "44.9429"), longitude: parseFloat(r._geo_x || "-123.0351"),
      filingDate, description: desc, estimatedValue: 100000,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "cityofsalem.net", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const capeCoral: CityAdapter = {
  domain: "capeims.capecoral.gov",
  datasetId: "cape-coral-permits",
  city: "Cape Coral",
  state: "FL",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`Permit_Type LIKE '%Commercial%' AND issuedate >= timestamp '${dateStr} 00:00:00'`);
    return `https://capeims.capecoral.gov/arcgis/rest/services/OpenData/OpenData/MapServer/1/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=issuedate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.permit_desc || r.Permit_Type || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.permitvalue || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.Company_Name || r.Contractor || "Unknown Contractor";
    let filingDate = dateNDaysAgo(0);
    if (r.issuedate) { const d = new Date(Number(r.issuedate)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    const parts = [r.Addr1, r.Predir, r.Addr2, r.Street_Type].filter(Boolean);
    const address = parts.join(" ") || "Cape Coral, FL";
    return {
      id: `cc-${r.Permit_Number || idx}`,
      permitNumber: r.Permit_Number || `CC-${idx}`,
      address, city: "Cape Coral", state: "FL", zip: r.Zip || "33904",
      latitude: parseFloat(r._geo_y || "26.5629"), longitude: parseFloat(r._geo_x || "-81.9495"),
      filingDate, description: desc, estimatedValue: value || 100000,
      status: mapStatus(r.permit_status),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.Contractor || null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "capecoral.gov", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const palmBay: CityAdapter = {
  domain: "gis.palmbayflorida.org",
  datasetId: "palm-bay-permits",
  city: "Palm Bay",
  state: "FL",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`ApplicationType LIKE '%COMMERCIAL%' AND issueDate >= timestamp '${dateStr} 00:00:00'`);
    return `https://gis.palmbayflorida.org/arcgis/rest/services/GrowthManagement/BuildingPermits/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=issueDate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.ApplicationDescription || r.ApplicationType || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.EstimateValuation || "0");
    if (value > 0 && value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.issueDate) { const d = new Date(Number(r.issueDate)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    return {
      id: `pb-${r.ApplicationNumber?.trim() || idx}`,
      permitNumber: r.ApplicationNumber?.trim() || `PB-${idx}`,
      address: r.ADDRESS || "Palm Bay, FL",
      city: "Palm Bay", state: "FL", zip: "32905",
      latitude: parseFloat(r._geo_y || "28.0345"), longitude: parseFloat(r._geo_x || "-80.5887"),
      filingDate, description: desc, estimatedValue: value || 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "palmbayflorida.org", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const gainesvilleFL: CityAdapter = {
  domain: "data.cityofgainesville.org",
  datasetId: "p798-x3nx",
  city: "Gainesville",
  state: "FL",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `classification='Commercial' AND issue >= '${dateStr}T00:00:00.000'`,
      $order: "issue DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = [r.type, r.subtype].filter(Boolean).join(" - ") || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const gcName = r.business || r.contractor || "Unknown Contractor";
    return {
      id: `gnv-${r.permit || idx}`,
      permitNumber: r.permit || `GNV-${idx}`,
      address: r.address || "Gainesville, FL",
      city: "Gainesville", state: "FL", zip: "32601",
      latitude: parseFloat(r.latitude || "29.6516"), longitude: parseFloat(r.longitude || "-82.3248"),
      filingDate: r.issue ? r.issue.split("T")[0] : dateNDaysAgo(0),
      description: desc, estimatedValue: 100000,
      status: "Issued" as PermitStatus,
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: r.contractor || null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "data.cityofgainesville.org", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const coronaCA: CityAdapter = {
  domain: "corstat.coronaca.gov",
  datasetId: "2agx-camz",
  city: "Corona",
  state: "CA",
  buildQuery(dateStr) {
    return new URLSearchParams({
      $where: `permittype like '%COMMERCIAL%' AND issued >= '${dateStr}T00:00:00.000'`,
      $order: "issued DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.notes || r.permittype || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.jobvalue || "0");
    if (value > 0 && value < 50000) return null;
    const lat = r.geolocation ? parseFloat((r.geolocation as unknown as { latitude?: string })?.latitude || "33.8753") : 33.8753;
    const lng = r.geolocation ? parseFloat((r.geolocation as unknown as { longitude?: string })?.longitude || "-117.5664") : -117.5664;
    return {
      id: `cor-${r.permit_no || idx}`,
      permitNumber: r.permit_no || `COR-${idx}`,
      address: r.site_addr || "Corona, CA",
      city: "Corona", state: "CA", zip: r.site_zip || "92882",
      latitude: lat, longitude: lng,
      filingDate: r.issued ? r.issued.split("T")[0] : dateNDaysAgo(0),
      description: desc, estimatedValue: value || 100000,
      status: mapStatus(r.status),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "corstat.coronaca.gov", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const rockford: CityAdapter = {
  domain: "data.illinois.gov",
  datasetId: "3k8p-pkx8",
  city: "Rockford",
  state: "IL",
  buildQuery(dateStr) {
    const mmddyyyy = `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}/${dateStr.slice(0, 4)}`;
    return new URLSearchParams({
      $where: `permittype='Multifamily/Commercial Permits' AND dateissued1 > '${mmddyyyy}'`,
      $order: "dateissued1 DESC",
      $limit: "200",
    });
  },
  toPermit(r, idx) {
    const desc = r.description || r.permittype || "Commercial construction";
    if (isLikelyResidential(desc)) return null;
    const value = parseFloat(r.valuation || "0");
    if (value > 0 && value < 50000) return null;
    const gcName = r.contractorfullname || "Unknown Contractor";
    let filingDate = dateNDaysAgo(0);
    if (r.dateissued1) {
      const parts = r.dateissued1.split(" ")[0].split("/");
      if (parts.length === 3) filingDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
    return {
      id: `rck-${r.permitno || idx}`,
      permitNumber: r.permitno || `RCK-${idx}`,
      address: r.propertyaddress || "Rockford, IL",
      city: "Rockford", state: "IL", zip: "61101",
      latitude: 42.2711, longitude: -89.094,
      filingDate, description: desc, estimatedValue: value || 100000,
      status: "Issued" as PermitStatus,
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "data.illinois.gov", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const midland: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "midland-permits",
  city: "Midland",
  state: "TX",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`PermitType='Commercial - Building' AND IssueDate >= timestamp '${dateStr} 00:00:00'`);
    return `https://services.arcgis.com/0H6bQdxd9223gQB5/arcgis/rest/services/DevelopmentPermit/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=IssueDate+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.PermitClass || r.PermitType || "Commercial construction";
    let filingDate = dateNDaysAgo(0);
    if (r.IssueDate) { const d = new Date(Number(r.IssueDate)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    return {
      id: `mid-${r.PermitNumber || idx}`,
      permitNumber: r.PermitNumber || `MID-${idx}`,
      address: r.Address || "Midland, TX",
      city: "Midland", state: "TX", zip: "79701",
      latitude: parseFloat(r._geo_y || "31.9973"), longitude: parseFloat(r._geo_x || "-102.0779"),
      filingDate, description: desc, estimatedValue: 100000,
      status: mapStatus(r.PermitStatus),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "midlandtexas.gov", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const omaha: CityAdapter = {
  domain: "services.arcgis.com",
  datasetId: "omaha-permits",
  city: "Omaha",
  state: "NE",
  buildQuery() { return new URLSearchParams(); },
  buildUrl(dateStr) {
    const where = encodeURIComponent(`CITY='Omaha' AND Permit_Typ='C' AND Permit_Dat >= timestamp '${dateStr} 00:00:00'`);
    return `https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/Building_Permits_as_of_October_2019/FeatureServer/0/query?where=${where}&outFields=*&outSR=4326&f=json&resultRecordCount=200&orderByFields=Permit_Dat+DESC`;
  },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Permit_Typ === "C" ? "Commercial Construction" : "Construction";
    const value = parseFloat(r.COST || "0");
    if (value > 0 && value < 50000) return null;
    let filingDate = dateNDaysAgo(0);
    if (r.Permit_Dat) { const d = new Date(Number(r.Permit_Dat)); if (!isNaN(d.getTime())) filingDate = d.toISOString().split("T")[0]; }
    return {
      id: `oma-${r.ADDRESS?.replace(/\s/g, "-") || idx}-${r.YR || ""}`,
      permitNumber: `OMA-${r.YR || ""}-${idx}`,
      address: r.ADDRESS || "Omaha, NE",
      city: "Omaha", state: "NE", zip: "68102",
      latitude: parseFloat(r.Y || r._geo_y || "41.2565"), longitude: parseFloat(r.X || r._geo_x || "-95.9345"),
      filingDate, description: desc, estimatedValue: value || 100000,
      status: "Issued" as PermitStatus,
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "mapacog.org", sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const irvingTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Irving",
  state: "TX",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`Issued_Date > timestamp '${dateStr} 00:00:00'`);
    return `https://services3.arcgis.com/OfsJXUlu8pSkbl7B/arcgis/rest/services/Commercial_Permits_Issued_2_15_22_Present/FeatureServer/0/query?where=${where}&outFields=Issued_Date,Permit__,Status,Designation,Project_Description,Permit_Type,Address,Valuation,Square_Feet&outSR=4326&f=json&resultRecordCount=200&orderByFields=Issued_Date+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.Project_Description || r.Permit_Type || "";
    if (!desc || isLikelyResidential(desc)) return null;
    const valStr = (r.Valuation || "0").replace(/[$,]/g, "");
    const value = parseFloat(valStr) || 0;
    const issued = r.Issued_Date ? new Date(parseInt(r.Issued_Date)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const mapStatus = (s: string) => {
      if (s?.includes("Finaled") || s?.includes("Closed")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    return {
      id: `irv-${r.Permit__ || idx}`,
      permitNumber: r.Permit__ || `IRV-${idx}`,
      address: r.Address || "Irving, TX",
      city: "Irving",
      state: "TX",
      zip: "75039",
      latitude: 32.8140,
      longitude: -96.9489,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.Status || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "cityofirving.org",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const arlingtonTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Arlington",
  state: "TX",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`FOLDERTYPE='CP' AND ISSUEDATE > timestamp '${dateStr} 00:00:00'`);
    return `https://gis2.arlingtontx.gov/agsext2/rest/services/OpenData/OD_Property/MapServer/1/query?where=${where}&outFields=FOLDERYEAR,FOLDERSEQUENCE,FOLDERNAME,WORKDESC,FOLDERCONDITION,ConstructionValuationDeclared,ISSUEDATE,STATUSDESC,SUBDESC,NameofBusiness&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUEDATE+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.FOLDERCONDITION || r.WORKDESC || r.SUBDESC || "";
    if (!desc) return null;
    const value = parseFloat(r.ConstructionValuationDeclared || "0");
    const lat = parseFloat(r._geo_y || "32.7357");
    const lng = parseFloat(r._geo_x || "-97.1081");
    const issued = r.ISSUEDATE ? new Date(parseInt(r.ISSUEDATE)).toISOString().split("T")[0] : dateNDaysAgo(0);
    const permitNum = `ARL-${r.FOLDERYEAR || "00"}-${r.FOLDERSEQUENCE || idx}`;
    const mapStatus = (s: string) => {
      if (s?.includes("Final") || s?.includes("Closed")) return "Completed" as const;
      if (s?.includes("Issued")) return "Issued" as const;
      if (s?.includes("Approved")) return "Approved" as const;
      return "Under Review" as const;
    };
    const gcName = r.NameofBusiness || "Unknown Contractor";
    return {
      id: `arl-${r.FOLDERSEQUENCE || idx}`,
      permitNumber: permitNum,
      address: (r.FOLDERNAME || "Arlington, TX").trim(),
      city: "Arlington",
      state: "TX",
      zip: "76010",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.STATUSDESC || ""),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "arlingtontx.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const laredoTX: CityAdapter = {
  domain: "data.openlaredo.com",
  datasetId: "61972510-7b8c-488a-9e88-b73b0112f496",
  city: "Laredo",
  state: "TX",
  buildUrl(dateStr: string) {
    const q = encodeURIComponent(`"PERMIT ISS. DATE" >= '${dateStr}' AND "Permit Group Type" = 'Commercial Construction'`);
    return `https://data.openlaredo.com/api/3/action/datastore_search_sql?sql=SELECT * FROM "61972510-7b8c-488a-9e88-b73b0112f496" WHERE ${q} ORDER BY "PERMIT ISS. DATE" DESC LIMIT 200`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse(data: unknown) {
    const result = data as { result?: { records?: Record<string, string>[] } };
    return result.result?.records || [];
  },
  toPermit(r, idx) {
    const desc = (r["APP DESC"] as string || r["APP TYPE DESC"] as string || "").trim();
    if (!desc) return null;
    const value = parseFloat(String(r["VALUATION"] || "0"));
    const dateRaw = String(r["PERMIT ISS. DATE"] || "");
    const issued = dateRaw.includes("T") ? dateRaw.split("T")[0] : dateNDaysAgo(0);
    const streetNum = String(r["STREET NBR"] || "").trim();
    const street = String(r["STREET"] || "").trim();
    const address = [streetNum, street].filter(Boolean).join(" ") || "Laredo, TX";
    const permitNum = `LRD-${r["APP YR"] || "00"}-${r["APP NBR"] || idx}`;
    const mapStatus = (s: string) => {
      if (s === "IS") return "Issued" as const;
      if (s === "AP") return "Approved" as const;
      if (s === "FN" || s === "CL") return "Completed" as const;
      return "Under Review" as const;
    };
    const gcName = String(r["CONTRACTOR NAME"] || "").trim() || "Unknown Contractor";
    return {
      id: `lrd-${r["APP NBR"] || idx}`,
      permitNumber: permitNum,
      address,
      city: "Laredo",
      state: "TX",
      zip: "78040",
      latitude: 27.5036,
      longitude: -99.5076,
      filingDate: issued,
      description: desc,
      estimatedValue: value || 50000,
      status: mapStatus(String(r["APP STATUS"] || "").trim()),
      trades: classifyTrades(desc),
      gcContact: { companyName: gcName, contactName: null, phone: null, email: null, confidence: (gcName === "Unknown Contractor" ? "Low" : "Medium") as ContactConfidence },
      source: "data.openlaredo.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const dentonTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Denton",
  state: "TX",
  buildUrl(dateStr: string) {
    const filters = encodeURIComponent(JSON.stringify({ PERMIT_CATEGORY: "COMMERCIAL" }));
    return `https://data.cityofdenton.com/api/3/action/datastore_search?resource_id=71a5f6cc-7cb9-4ecb-9482-70b2c1f3ab48&limit=200&filters=${filters}&sort=ISSUED_DATE desc`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse(json: unknown) {
    const body = json as { result?: { records?: Record<string, string>[] } };
    return body?.result?.records ?? [];
  },
  toPermit(r, idx) {
    const desc = r.PERMIT_NAME || "";
    if (!desc) return null;
    const raw = (r.JOB_VALUE || "0").replace(/[$,]/g, "");
    const value = parseFloat(raw) || 0;
    return {
      id: `den-${r.PERMIT_NO || idx}`,
      permitNumber: r.PERMIT_NO || `DEN-${idx}`,
      address: r.SITE_ADDR || "Denton, TX",
      city: "Denton",
      state: "TX",
      zip: "76201",
      latitude: 33.2148,
      longitude: -97.1331,
      filingDate: r.ISSUED_DATE ? r.ISSUED_DATE.split("T")[0] : dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: r.CONTRACTOR_NAME || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r.CONTRACTOR_NAME ? "Medium" : "Low") as ContactConfidence },
      source: "data.cityofdenton.com",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const pearlandTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Pearland",
  state: "TX",
  buildUrl() {
    return `https://gis.pearlandtx.gov/hosting/rest/services/Commercial_Permits/FeatureServer/0/query?where=1=1&outFields=CASE_NUMBER,LOCATION,DATE_ISSUED,CASE_NAME,BUS_CASE_DESC,CASE_STATUS,Applicant,PropertyOwner&outSR=4326&f=json&resultRecordCount=200&orderByFields=DATE_ISSUED+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.CASE_NAME || r.BUS_CASE_DESC || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "29.5635");
    const lng = parseFloat(r._geo_x || "-95.2860");
    const issued = r.DATE_ISSUED ? new Date(parseInt(r.DATE_ISSUED)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `prl-${r.CASE_NUMBER || idx}`,
      permitNumber: r.CASE_NUMBER || `PRL-${idx}`,
      address: r.LOCATION || "Pearland, TX",
      city: "Pearland",
      state: "TX",
      zip: "77581",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 100000,
      status: mapStatus(r.CASE_STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: r.Applicant || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r.Applicant ? "Medium" : "Low") as ContactConfidence },
      source: "gis.pearlandtx.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sugarLandTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "Sugar Land",
  state: "TX",
  buildUrl(dateStr: string) {
    const filters = encodeURIComponent(JSON.stringify({ Type: "BUILDING - BUILDING COMMERCIAL" }));
    return `https://data.sugarlandtx.gov/api/3/action/datastore_search?resource_id=6165c955-43bb-401e-96f7-ca3f5954387c&limit=200&filters=${filters}&sort=Issued Date desc`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse(json: unknown) {
    const body = json as { result?: { records?: Record<string, string>[] } };
    return body?.result?.records ?? [];
  },
  toPermit(r, idx) {
    const desc = r["Permit Description"] || "";
    if (!desc) return null;
    const raw = (r["Permit Valuation"] || "0").replace(/[$,]/g, "");
    const value = parseFloat(raw) || 0;
    return {
      id: `sgl-${r["Permit Number"] || idx}`,
      permitNumber: r["Permit Number"] || `SGL-${idx}`,
      address: r.Address || "Sugar Land, TX",
      city: "Sugar Land",
      state: "TX",
      zip: r["Zip Code"] || "77478",
      latitude: 29.6197,
      longitude: -95.6349,
      filingDate: r["Issued Date"] ? r["Issued Date"].split("T")[0] : dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: mapStatus(r["Permit Status"]),
      trades: classifyTrades(desc),
      gcContact: { companyName: r["Contact Company Name"] || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r["Contact Company Name"] ? "Medium" : "Low") as ContactConfidence },
      source: "data.sugarlandtx.gov",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const sanMarcosTX: CityAdapter = {
  domain: "",
  datasetId: "",
  city: "San Marcos",
  state: "TX",
  buildUrl(dateStr: string) {
    const where = encodeURIComponent(`LANDUSE='Commercial' AND ISSUED > timestamp '${dateStr} 00:00:00'`);
    return `https://services1.arcgis.com/Hug9pbs2TYetbCha/arcgis/rest/services/Permit/FeatureServer/2/query?where=${where}&outFields=PERMITID,ADDRESS,ISSUED,DESCRIPTION,LANDUSE,TYPE,STATUS,SQUAREFEET,ProjectName&outSR=4326&f=json&resultRecordCount=200&orderByFields=ISSUED+DESC`;
  },
  buildQuery() { return new URLSearchParams(); },
  parseResponse: parseArcGISResponse,
  toPermit(r, idx) {
    const desc = r.DESCRIPTION || r.ProjectName || r.TYPE || "";
    if (!desc) return null;
    const lat = parseFloat(r._geo_y || "29.8833");
    const lng = parseFloat(r._geo_x || "-97.9414");
    const issued = r.ISSUED ? new Date(parseInt(r.ISSUED)).toISOString().split("T")[0] : dateNDaysAgo(0);
    return {
      id: `smtx-${r.PERMITID || idx}`,
      permitNumber: r.PERMITID || `SMTX-${idx}`,
      address: r.ADDRESS || "San Marcos, TX",
      city: "San Marcos",
      state: "TX",
      zip: "78666",
      latitude: lat,
      longitude: lng,
      filingDate: issued,
      description: desc,
      estimatedValue: 100000,
      status: mapStatus(r.STATUS),
      trades: classifyTrades(desc),
      gcContact: { companyName: "Unknown Contractor", contactName: null, phone: null, email: null, confidence: "Low" as ContactConfidence },
      source: "arcgis.com/Hug9pbs2TYetbCha",
      sourceUpdatedAt: dateNDaysAgo(0),
    };
  },
};

const mckinneyTX: CityAdapter = {
  domain: "data.texas.gov",
  datasetId: "82ee-gbj5",
  city: "McKinney",
  state: "TX",
  buildUrl(dateStr: string) {
    const params = new URLSearchParams({
      "$where": `situscity='MCKINNEY' AND proprescom='Commercial' AND permitissueddate>'${dateStr}T00:00:00.000'`,
      "$order": "permitissueddate DESC",
      "$limit": "200",
    });
    return `https://data.texas.gov/resource/82ee-gbj5.json?${params}`;
  },
  buildQuery() { return new URLSearchParams(); },
  toPermit(r, idx) {
    const desc = r.permitcomments || r.permittypedescr || "";
    if (!desc) return null;
    const value = parseFloat(r.permitvalue || "0");
    const addr = r.situsconcat || r.situsconcatshort || "McKinney, TX";
    return {
      id: `mck-${r.permitnum || idx}`,
      permitNumber: r.permitnum || `MCK-${idx}`,
      address: addr,
      city: "McKinney",
      state: "TX",
      zip: r.situszip || "75069",
      latitude: 33.1972,
      longitude: -96.6397,
      filingDate: r.permitissueddate ? r.permitissueddate.split("T")[0] : dateNDaysAgo(0),
      description: desc,
      estimatedValue: value || 100000,
      status: "Issued" as PermitStatus,
      trades: classifyTrades(desc),
      gcContact: { companyName: r.permitbuildername || "Unknown Contractor", contactName: null, phone: null, email: null, confidence: (r.permitbuildername ? "Medium" : "Low") as ContactConfidence },
      source: "data.texas.gov",
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
  buffalo: [buffalo],
  wichita: [wichita],
  spokane: [spokane],
  charleston: [charleston],
  hartford: [hartford],
  cleveland: [cleveland],
  "colorado-springs": [coloradoSprings],
  boise: [boise],
  greensboro: [greensboro],
  jacksonville: [jacksonville],
  anaheim: [anaheim],
  "st-petersburg": [stPetersburg],
  aurora: [aurora],
  chattanooga: [chattanooga],
  knoxville: [knoxville],
  lincoln: [lincoln],
  henderson: [henderson],
  scottsdale: [scottsdale],
  gilbert: [gilbert],
  chandler: [chandler],
  tempe: [tempe],
  tallahassee: [tallahassee],
  "fort-lauderdale": [fortLauderdale],
  "overland-park": [overlandPark],
  frisco: [frisco],
  tacoma: [tacoma],
  norfolk: [norfolk],
  savannah: [savannah],
  cary: [cary],
  peoria: [peoria],
  "salt-lake-city": [saltLakeCity],
  "sioux-falls": [siouxFalls],
  wilmington: [wilmington],
  "st-paul": [stPaul],
  naperville: [naperville],
  "salem-or": [salemOR],
  "cape-coral": [capeCoral],
  "palm-bay": [palmBay],
  "gainesville-fl": [gainesvilleFL],
  "corona-ca": [coronaCA],
  rockford: [rockford],
  midland: [midland],
  omaha: [omaha],
  irving: [irvingTX],
  "arlington-tx": [arlingtonTX],
  laredo: [laredoTX],
  denton: [dentonTX],
  pearland: [pearlandTX],
  "sugar-land": [sugarLandTX],
  "san-marcos-tx": [sanMarcosTX],
  mckinney: [mckinneyTX],
};

export async function fetchAdapter(adapter: CityAdapter, dateStr: string): Promise<Permit[]> {
  const url = adapter.buildUrl
    ? adapter.buildUrl(dateStr)
    : `https://${adapter.domain}/resource/${adapter.datasetId}.json?${adapter.buildQuery(dateStr)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", ...adapter.headers },
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
