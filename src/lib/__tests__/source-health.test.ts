import { describe, expect, it } from "vitest";
import {
  adapterKey,
  classifyError,
  FAILURE_OUTCOMES,
  HttpError,
  isFailure,
  measureContacts,
  type SourceOutcome,
} from "../source-health";
import type { Permit } from "../types";

function permit(overrides: Partial<Permit["gcContact"]> = {}): Permit {
  return {
    id: "chi-1",
    permitNumber: "PN-1",
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
    trades: ["HVAC"],
    gcContact: {
      companyName: "Ridgeline Mechanical",
      contactName: null,
      phone: "(312) 555-0142",
      email: null,
      confidence: "High",
      ...overrides,
    },
    source: "Chicago Data Portal",
    sourceUpdatedAt: "2026-08-02",
  };
}

describe("outcome vocabulary", () => {
  it("treats a genuine empty market as a success", () => {
    // The distinction the old code could not make: a quiet market and a broken
    // source both produced an empty array.
    expect(isFailure("success_with_zero_records")).toBe(false);
    expect(isFailure("success")).toBe(false);
  });

  it("treats every error class as a failure", () => {
    const failures: SourceOutcome[] = [
      "upstream_error",
      "parse_error",
      "normalization_error",
      "database_error",
    ];
    for (const outcome of failures) {
      expect(isFailure(outcome), outcome).toBe(true);
    }
    expect([...FAILURE_OUTCOMES].sort()).toEqual([...failures].sort());
  });
});

describe("classifyError", () => {
  it("maps a non-2xx response to an upstream error carrying its status", () => {
    const result = classifyError(new HttpError(503));
    expect(result.outcome).toBe("upstream_error");
    expect(result.errorClass).toBe("HttpError");
    expect(result.errorMessage).toBe("HTTP 503");
  });

  it("maps a 429 the same way, so rate limiting is visible", () => {
    expect(classifyError(new HttpError(429)).errorMessage).toBe("HTTP 429");
  });

  it("maps malformed JSON to a parse error, not an upstream error", () => {
    const result = classifyError(new SyntaxError("Unexpected token < in JSON"));
    expect(result.outcome).toBe("parse_error");
    expect(result.errorClass).toBe("SyntaxError");
  });

  it("reports a timeout as an upstream problem", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const result = classifyError(abort);
    expect(result.outcome).toBe("upstream_error");
    expect(result.errorClass).toBe("TimeoutError");
  });

  it("reports a network failure with its own class", () => {
    const network = new TypeError("fetch failed");
    expect(classifyError(network).errorClass).toBe("TypeError");
  });

  it("survives a thrown non-Error", () => {
    const result = classifyError("something went sideways");
    expect(result.outcome).toBe("upstream_error");
    expect(result.errorClass).toBe("Unknown");
  });

  it("strips URLs so a source token cannot reach the health table", () => {
    // Municipal endpoints carry app tokens in query parameters, and this
    // message is stored and shown to operators.
    const err = new Error(
      "failed to reach https://data.example.gov/resource/abc.json?$$app_token=SECRET123"
    );
    const result = classifyError(err);
    expect(result.errorMessage).not.toContain("SECRET123");
    expect(result.errorMessage).toContain("[url]");
  });

  it("caps a runaway error message", () => {
    const result = classifyError(new Error("x".repeat(5000)));
    expect(result.errorMessage.length).toBeLessThanOrEqual(301);
  });
});

describe("adapterKey", () => {
  it("is stable for the same metro and host", () => {
    expect(adapterKey("chicago", "data.cityofchicago.org")).toBe(
      "chicago#data.cityofchicago.org"
    );
  });

  it("separates two sources serving one metro", () => {
    // San Francisco configures three adapters; their health must not merge.
    expect(adapterKey("san-francisco", "data.sfgov.org")).not.toBe(
      adapterKey("san-francisco", "data.marincounty.gov")
    );
  });
});

describe("measureContacts", () => {
  it("counts each field independently", () => {
    const permits = [
      permit(),
      permit({ phone: null, email: "a@example.com" }),
      permit({ companyName: "Unknown Contractor", phone: null }),
    ];
    expect(measureContacts(permits)).toEqual({
      withCompany: 2,
      withPhone: 1,
      withEmail: 1,
    });
  });

  it("does not count the unknown-contractor placeholder as a company", () => {
    expect(measureContacts([permit({ companyName: "Unknown Contractor" })])).toEqual(
      { withCompany: 0, withPhone: 1, withEmail: 0 }
    );
  });

  it("returns zeroes for an empty run", () => {
    expect(measureContacts([])).toEqual({
      withCompany: 0,
      withPhone: 0,
      withEmail: 0,
    });
  });
});
