import { describe, expect, it } from "vitest";
import { buildLeadsCsv, CSV_HEADERS, escapeField } from "../csv";
import { applyEntitlement } from "../entitlements";
import type { SavedLeadRecord } from "../saved-leads-server";
import type { GCContact, Permit } from "../types";

function contact(overrides: Partial<GCContact> = {}): GCContact {
  return {
    companyName: "Ridgeline Mechanical",
    contactName: "Dana Okafor",
    phone: "(312) 555-0142",
    email: "dana@ridgeline.example",
    confidence: "High",
    ...overrides,
  };
}

function permit(overrides: Partial<Permit> = {}): Permit {
  return {
    id: "chi-1",
    permitNumber: "100-2026",
    address: "railroad row",
    city: "Chicago",
    state: "IL",
    zip: "60607",
    latitude: 41.87,
    longitude: -87.65,
    filingDate: "2026-08-01",
    description: "Tenant build-out",
    estimatedValue: 450000,
    status: "Issued",
    trades: ["HVAC", "Electrical"],
    gcContact: contact(),
    source: "Chicago Data Portal",
    sourceUpdatedAt: "2026-08-02",
    ...overrides,
  };
}

function lead(overrides: Partial<SavedLeadRecord> = {}): SavedLeadRecord {
  return {
    permitId: "chi-1",
    status: "Saved",
    notes: "",
    savedAt: "2026-08-10T09:00:00Z",
    updatedAt: "2026-08-10T09:00:00Z",
    permit: permit(),
    ...overrides,
  };
}

function rowsOf(csv: string): string[] {
  return csv.split("\r\n");
}

describe("escapeField", () => {
  it("quotes every field", () => {
    expect(escapeField("plain")).toBe('"plain"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeField('say "hi"')).toBe('"say ""hi"""');
  });

  it("keeps a comma inside one field", () => {
    // The old in-browser export interpolated raw values, so a description
    // containing a comma shifted every later column.
    expect(escapeField("Suite 200, Building B")).toBe('"Suite 200, Building B"');
  });

  it("keeps a newline inside one field", () => {
    expect(escapeField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("renders null and undefined as empty", () => {
    expect(escapeField(null)).toBe('""');
    expect(escapeField(undefined)).toBe('""');
  });

  it("defuses spreadsheet formulas", () => {
    expect(escapeField("=SUM(A1:A9)")).toBe("\"'=SUM(A1:A9)\"");
    expect(escapeField("+1 312 555 0142")).toBe("\"'+1 312 555 0142\"");
    expect(escapeField("-5")).toBe("\"'-5\"");
    expect(escapeField("@import")).toBe("\"'@import\"");
  });

  it("leaves an ordinary number alone", () => {
    expect(escapeField(450000)).toBe('"450000"');
  });
});

describe("buildLeadsCsv", () => {
  it("emits a header plus exactly one row per saved lead", () => {
    const csv = buildLeadsCsv([
      lead({ permitId: "chi-1" }),
      lead({ permitId: "chi-2" }),
      lead({ permitId: "chi-3" }),
    ]);
    const rows = rowsOf(csv);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toBe(CSV_HEADERS.map((h) => `"${h}"`).join(","));
  });

  it("writes contact details for an entitled export", () => {
    const csv = buildLeadsCsv([
      lead({ permit: applyEntitlement(permit(), true) }),
    ]);
    expect(csv).toContain("Ridgeline Mechanical");
    expect(csv).toContain("(312) 555-0142");
    expect(csv).toContain("dana@ridgeline.example");
  });

  it("carries no contact value when the permit was redacted", () => {
    const csv = buildLeadsCsv([
      lead({ permit: applyEntitlement(permit(), false) }),
    ]);
    expect(csv).not.toContain("Ridgeline");
    expect(csv).not.toContain("555-0142");
    expect(csv).not.toContain("ridgeline.example");
    // The row still exists, with blank contact columns.
    expect(rowsOf(csv)).toHaveLength(2);
  });

  it("still exports a lead whose permit is gone", () => {
    const csv = buildLeadsCsv([
      lead({ permit: null, notes: "called, left voicemail", status: "Contacted" }),
    ]);
    const rows = rowsOf(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('"called, left voicemail"');
    expect(rows[1]).toContain('"Contacted"');
  });

  it("keeps a row intact when a field contains a comma or a quote", () => {
    const csv = buildLeadsCsv([
      lead({
        permit: permit({ description: 'Fit-out, phase 2 ("east wing")' }),
        notes: "budget: 40,000",
      }),
    ]);
    // Two lines only — the comma did not split the row.
    expect(rowsOf(csv)).toHaveLength(2);
    expect(csv).toContain('"Fit-out, phase 2 (""east wing"")"');
    expect(csv).toContain('"budget: 40,000"');
  });

  it("keeps a row intact when a note contains a newline", () => {
    const csv = buildLeadsCsv([lead({ notes: "call back\nask for Dana" })]);
    // The embedded newline is inside a quoted field, so RFC 4180 readers see
    // one record even though the raw text spans two lines.
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("joins trades with a separator that is not the delimiter", () => {
    const csv = buildLeadsCsv([lead()]);
    expect(csv).toContain('"HVAC; Electrical"');
  });
});
