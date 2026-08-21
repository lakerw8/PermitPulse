import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `fetchSavedLeads` is the fix for the dashboard dropping saved leads, so what
 * matters here is that the result depends only on the user — never on which
 * permits happen to be loaded elsewhere — and that a lead survives its permit
 * disappearing.
 */

interface PermitRow {
  id: string;
  gc_phone?: string | null;
  gc_email?: string | null;
  has_gc_phone?: boolean;
  [key: string]: unknown;
}

const state = {
  leads: [] as Record<string, unknown>[],
  permits: [] as PermitRow[],
  leadsError: null as { code: string } | null,
  permitsError: null as { code: string } | null,
  /** Every `select(...)` string passed for the permits table. */
  permitSelects: [] as string[],
  /** Each chunk of ids requested, so chunking can be asserted. */
  permitIdChunks: [] as string[][],
};

vi.mock("../supabase", () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table === "saved_leads") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: () =>
            Promise.resolve({ data: state.leads, error: state.leadsError }),
        };
        return builder;
      }

      const builder = {
        select: (columns: string) => {
          state.permitSelects.push(columns);
          return builder;
        },
        in: (_column: string, ids: string[]) => {
          state.permitIdChunks.push(ids);
          return Promise.resolve({
            data: state.permits.filter((p) => ids.includes(p.id)),
            error: state.permitsError,
          });
        },
      };
      return builder;
    },
  },
}));

const { fetchSavedLeads } = await import("../saved-leads-server");

function leadRow(permitId: string, overrides: Record<string, unknown> = {}) {
  return {
    permit_id: permitId,
    status: "Saved",
    notes: "",
    saved_at: "2026-08-10T09:00:00Z",
    updated_at: "2026-08-10T09:00:00Z",
    ...overrides,
  };
}

function permitRow(id: string): PermitRow {
  return {
    id,
    permit_number: `PN-${id}`,
    address: "railroad row",
    city: "Chicago",
    state: "IL",
    zip: "60607",
    latitude: 41.87,
    longitude: -87.65,
    filing_date: "2026-08-01",
    description: "Tenant build-out",
    estimated_value: 450000,
    status: "Issued",
    trades: ["HVAC"],
    gc_confidence: "High",
    gc_company_name: "Ridgeline Mechanical",
    gc_phone: "(312) 555-0142",
    gc_email: "dana@ridgeline.example",
    has_gc_company: true,
    has_gc_contact_name: false,
    has_gc_phone: true,
    has_gc_email: true,
    source: "Chicago Data Portal",
    source_updated_at: "2026-08-02",
  };
}

beforeEach(() => {
  state.leads = [];
  state.permits = [];
  state.leadsError = null;
  state.permitsError = null;
  state.permitSelects = [];
  state.permitIdChunks = [];
});

describe("fetchSavedLeads", () => {
  it("returns every saved lead with its permit attached", async () => {
    state.leads = [leadRow("chi-1"), leadRow("chi-2")];
    state.permits = [permitRow("chi-1"), permitRow("chi-2")];

    const result = await fetchSavedLeads("user-1", true);

    expect(result).toHaveLength(2);
    expect(result[0].permit?.id).toBe("chi-1");
    expect(result[1].permit?.id).toBe("chi-2");
  });

  it("keeps a lead whose permit is no longer cached", async () => {
    // The bug this replaces: the dashboard filtered these out entirely, so a
    // lead the user had saved and annotated simply vanished.
    state.leads = [
      leadRow("chi-1", { notes: "called, left voicemail", status: "Contacted" }),
    ];
    state.permits = [];

    const result = await fetchSavedLeads("user-1", true);

    expect(result).toHaveLength(1);
    expect(result[0].permit).toBeNull();
    expect(result[0].notes).toBe("called, left voicemail");
    expect(result[0].status).toBe("Contacted");
  });

  it("preserves the saved-at ordering of the lead query", async () => {
    state.leads = [leadRow("chi-3"), leadRow("chi-1"), leadRow("chi-2")];
    // Returned out of order by the permit lookup on purpose.
    state.permits = [permitRow("chi-1"), permitRow("chi-2"), permitRow("chi-3")];

    const result = await fetchSavedLeads("user-1", true);

    expect(result.map((r) => r.permitId)).toEqual(["chi-3", "chi-1", "chi-2"]);
  });

  it("requests contact columns only for an entitled viewer", async () => {
    state.leads = [leadRow("chi-1")];
    state.permits = [permitRow("chi-1")];

    // Compared as a column list, not a substring: "has_gc_phone" contains
    // "gc_phone", so a substring check would pass for the wrong reason.
    await fetchSavedLeads("user-1", false);
    let columns = state.permitSelects[0].split(",");
    expect(columns).not.toContain("gc_phone");
    expect(columns).not.toContain("gc_email");
    expect(columns).not.toContain("gc_company_name");
    expect(columns).toContain("has_gc_phone");

    state.permitSelects = [];
    await fetchSavedLeads("user-1", true);
    columns = state.permitSelects[0].split(",");
    expect(columns).toContain("gc_phone");
    expect(columns).toContain("gc_email");
  });

  it("redacts contacts for an unentitled viewer even if a value slips through", async () => {
    // Defence in depth: the select above already omits the column, but if a
    // value ever arrives it must still not reach the caller.
    state.leads = [leadRow("chi-1")];
    state.permits = [permitRow("chi-1")];

    const result = await fetchSavedLeads("user-1", false);

    expect((result[0].permit as unknown as Record<string, unknown>)?.phone).toBeUndefined();
    expect(result[0].permit?.gcContact.phone).toBeNull();
    expect(result[0].permit?.gcContact.locked).toBe(true);
    expect(JSON.stringify(result)).not.toContain("555-0142");
    // Availability still comes through, from the generated column.
    expect(result[0].permit?.gcContact.available?.phone).toBe(true);
  });

  it("chunks the permit lookup so a large pipeline still resolves", async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `chi-${i}`);
    state.leads = ids.map((id) => leadRow(id));
    state.permits = ids.map(permitRow);

    const result = await fetchSavedLeads("user-1", true);

    expect(result).toHaveLength(450);
    expect(result.every((r) => r.permit !== null)).toBe(true);
    expect(state.permitIdChunks.map((c) => c.length)).toEqual([200, 200, 50]);
  });

  it("returns nothing without querying permits when there are no leads", async () => {
    const result = await fetchSavedLeads("user-1", true);
    expect(result).toEqual([]);
    expect(state.permitIdChunks).toHaveLength(0);
  });

  it("throws when the lead read fails, rather than reporting an empty pipeline", async () => {
    state.leadsError = { code: "57014" };
    await expect(fetchSavedLeads("user-1", true)).rejects.toThrow(/saved_leads read failed/);
  });

  it("throws when the permit read fails", async () => {
    state.leads = [leadRow("chi-1")];
    state.permitsError = { code: "57014" };
    await expect(fetchSavedLeads("user-1", true)).rejects.toThrow(/permits read failed/);
  });
});
