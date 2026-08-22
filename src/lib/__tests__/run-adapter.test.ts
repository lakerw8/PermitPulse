import { afterEach, describe, expect, it, vi } from "vitest";
import { runAdapter } from "../permit-adapters";
import type { CityAdapter } from "../permit-adapters";
import type { Permit } from "../types";

/**
 * The acceptance criterion for 0D: a 500, a 429, a timeout, malformed JSON and
 * a schema change must each produce a distinct, logged result. Previously all
 * five returned `[]` and were recorded as successes.
 */

function samplePermit(id: string): Permit {
  return {
    id,
    permitNumber: id,
    address: "railroad row",
    city: "Testville",
    state: "IL",
    zip: "60607",
    latitude: 41.8,
    longitude: -87.6,
    filingDate: "2026-08-01",
    description: "Tenant build-out",
    estimatedValue: 100000,
    status: "Issued",
    trades: ["HVAC"],
    gcContact: {
      companyName: "Ridgeline Mechanical",
      contactName: null,
      phone: "(312) 555-0142",
      email: null,
      confidence: "High",
    },
    source: "Test Portal",
    sourceUpdatedAt: "2026-08-02",
  };
}

function adapter(overrides: Partial<CityAdapter> = {}): CityAdapter {
  return {
    domain: "data.example.gov",
    datasetId: "abcd-1234",
    city: "Testville",
    state: "IL",
    buildQuery: () => new URLSearchParams({ $limit: "10" }),
    toPermit: (_r, i) => samplePermit(`t-${i}`),
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("runAdapter outcomes", () => {
  it("reports success with counts and timing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}, {}, {}])));

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("success");
    expect(result.httpStatus).toBe(200);
    expect(result.rawRecordCount).toBe(3);
    expect(result.acceptedCount).toBe(3);
    expect(result.rejectedCount).toBe(0);
    expect(result.contacts).toEqual({
      withCompany: 3,
      withPhone: 3,
      withEmail: 0,
    });
    expect(result.windowDays).toBe(90);
    expect(result.windowStart).toBe("2026-05-01");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("distinguishes a genuinely empty market from a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("success_with_zero_records");
    expect(result.httpStatus).toBe(200);
  });

  it("reports a 500 as an upstream error after exhausting retries", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(null, 500));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("upstream_error");
    expect(result.httpStatus).toBe(500);
    expect(result.errorMessage).toBe("HTTP 500");
    expect(result.permits).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a 429 and succeeds when the source recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, 429))
      .mockResolvedValueOnce(jsonResponse([{}]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 404, which will not fix itself", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(null, 404));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("upstream_error");
    expect(result.httpStatus).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout distinctly from an HTTP error", async () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const fetchMock = vi.fn(async () => {
      throw abort;
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("upstream_error");
    expect(result.errorClass).toBe("TimeoutError");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports malformed JSON as a parse error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      }))
    );

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("parse_error");
    expect(result.errorClass).toBe("SyntaxError");
  });

  it("reports a non-array body as a parse error rather than crashing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "nope" })));

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.outcome).toBe("parse_error");
    expect(result.errorClass).toBe("ShapeError");
  });

  it("reports a schema change as a normalization error", async () => {
    // Records arrive and every one is dropped: the source renamed a field.
    // Silently returning zero permits here is what made schema drift invisible.
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}, {}, {}, {}])));

    const result = await runAdapter(
      "testville",
      adapter({ toPermit: () => null }),
      "2026-05-01",
      90
    );

    expect(result.outcome).toBe("normalization_error");
    expect(result.rawRecordCount).toBe(4);
    expect(result.acceptedCount).toBe(0);
    expect(result.rejectedCount).toBe(4);
    expect(result.rejectionReasons).toEqual({ adapter_returned_null: 4 });
  });

  it("counts partial rejections without calling the run a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}, {}, {}, {}])));

    const result = await runAdapter(
      "testville",
      adapter({ toPermit: (_r, i) => (i % 2 === 0 ? samplePermit(`t-${i}`) : null) }),
      "2026-05-01",
      90
    );

    expect(result.outcome).toBe("success");
    expect(result.acceptedCount).toBe(2);
    expect(result.rejectedCount).toBe(2);
  });

  it("keeps the permits when contact enrichment fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}, {}])));

    const result = await runAdapter(
      "testville",
      adapter({
        enrichContacts: async () => {
          throw new Error("enrichment host down");
        },
      }),
      "2026-05-01",
      90
    );

    // Losing enrichment costs contact detail, not the permits themselves.
    expect(result.outcome).toBe("success");
    expect(result.acceptedCount).toBe(2);
  });

  it("tags the result with the source's stable key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}])));

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.adapterKey).toBe("testville#data.example.gov");
    expect(result.metro).toBe("testville");
    expect(result.domain).toBe("data.example.gov");
  });

  it("records the source's own status alongside the permit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ PERMIT_STATUS: "Withdrawn" }]))
    );

    const result = await runAdapter("testville", adapter(), "2026-05-01", 90);

    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].sourceStatus).toBe("Withdrawn");
    expect(result.observations[0].stage).toBe("withdrawn");
    expect(result.observations[0].stageInferredFromQuery).toBe(false);
  });

  it("falls back to the query's implied stage when a record has no status", async () => {
    // Chicago publishes no status column but selects on issue_date, so its
    // records are issued permits by construction. Reporting them as unknown
    // would be less accurate than what the request itself proves.
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{ address: "railroad row" }])));

    const issuedOnly = adapter({
      buildUrl: () =>
        "https://data.example.gov/resource/abcd-1234.json?$where=issue_date >= '2026-05-01'",
    });
    const result = await runAdapter("testville", issuedOnly, "2026-05-01", 90);

    expect(result.observations[0].stage).toBe("issued");
    expect(result.observations[0].stageInferredFromQuery).toBe(true);
    expect(result.observations[0].sourceStatus).toBeNull();
  });

  it("lets a published status override what the query implies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ status: "Void" }]))
    );

    const issuedOnly = adapter({
      buildUrl: () =>
        "https://data.example.gov/resource/abcd-1234.json?$where=issue_date >= '2026-05-01'",
    });
    const result = await runAdapter("testville", issuedOnly, "2026-05-01", 90);

    // The record says void; the query saying "issued" must not overrule it.
    expect(result.observations[0].stage).toBe("canceled");
    expect(result.observations[0].stageInferredFromQuery).toBe(false);
  });
});