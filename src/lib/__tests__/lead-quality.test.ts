import { describe, expect, it } from "vitest";
import {
  assessMarketQuality,
  constantValueShare,
  DEFAULT_GATE,
  evaluateGate,
  findSharedContacts,
  normalizePhone,
  suppressSharedContacts,
} from "../lead-quality";
import type { Permit } from "../types";

function permit(
  id: string,
  company: string,
  phone: string | null,
  value = 250_000,
  email: string | null = null
): Permit {
  return {
    id,
    permitNumber: id,
    address: "railroad row",
    city: "Testville",
    state: "AZ",
    zip: "85345",
    latitude: 33.5,
    longitude: -112.2,
    filingDate: "2026-08-01",
    description: "Tenant build-out",
    estimatedValue: value,
    status: "Issued",
    trades: ["HVAC"],
    gcContact: {
      companyName: company,
      contactName: null,
      phone,
      email,
      confidence: company === "Unknown Contractor" ? "Low" : "High",
    },
    source: "Test Portal",
    sourceUpdatedAt: "2026-08-02",
  };
}

/**
 * The Peoria shape: one municipal permit-desk line published on every record,
 * attached to many different companies, and labelled High confidence.
 */
const peoriaLike = [
  permit("p1", "Vistancia Development", "623-773-7225"),
  permit("p2", "American Flag & Pole Co", "623-773-7225"),
  permit("p3", "Okland", "623-773-7225"),
  permit("p4", "SSOE", "623-773-7225"),
];

/**
 * The Austin shape: one large GC pulling several permits under one number,
 * which is legitimate and must survive.
 */
const austinLike = [
  permit("a1", "Harvey Cleary Builders", "832-986-1613"),
  permit("a2", "Harvey Cleary Builders", "832-986-1613"),
  permit("a3", "Harvey Cleary Builders", "832-986-1613"),
  permit("a4", "Cadence McShane Construction Company", "512-328-1411"),
  permit("a5", "Skybeck Construction, LLC", "512-225-9343"),
];

describe("normalizePhone", () => {
  it("ignores formatting so the same line matches itself", () => {
    expect(normalizePhone("623-773-7225")).toBe("6237737225");
    expect(normalizePhone("(623) 773-7225")).toBe("6237737225");
    expect(normalizePhone("+1 623 773 7225")).toBe("6237737225");
    // The real records carry a trailing extension note.
    expect(normalizePhone("623-773-7225 Option1")).toBe("6237737225");
  });

  it("rejects anything too short to be a number", () => {
    expect(normalizePhone("555-1234")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("findSharedContacts", () => {
  it("flags a line used by many different companies", () => {
    const shared = findSharedContacts(peoriaLike);
    expect(shared).toHaveLength(1);
    expect(shared[0].kind).toBe("phone");
    expect(shared[0].companies).toBe(4);
  });

  it("leaves one company's repeated number alone", () => {
    // Three permits, one GC, one number. This is a real lead, not a switchboard.
    expect(findSharedContacts(austinLike)).toEqual([]);
  });

  it("does not treat unnamed contractors as distinct companies", () => {
    // Otherwise any source with missing contractor names looks like it shares
    // a line, and real contacts get suppressed.
    const permits = [
      permit("u1", "Unknown Contractor", "512-555-0100"),
      permit("u2", "Unknown Contractor", "512-555-0100"),
      permit("u3", "Unknown Contractor", "512-555-0100"),
      permit("u4", "Real Builders", "512-555-0100"),
    ];
    expect(findSharedContacts(permits)).toEqual([]);
  });

  it("flags a shared email the same way", () => {
    const permits = [
      permit("e1", "Alpha Co", null, 1000, "permits@city.gov"),
      permit("e2", "Beta Co", null, 1000, "permits@city.gov"),
      permit("e3", "Gamma Co", null, 1000, "permits@city.gov"),
    ];
    const shared = findSharedContacts(permits);
    expect(shared).toHaveLength(1);
    expect(shared[0].kind).toBe("email");
  });

  it("finds nothing in an empty set", () => {
    expect(findSharedContacts([])).toEqual([]);
  });
});

describe("suppressSharedContacts", () => {
  it("removes the shared line and downgrades confidence", () => {
    const result = suppressSharedContacts(peoriaLike);
    expect(result.suppressedPhones).toBe(4);
    for (const p of result.permits) {
      expect(p.gcContact.phone).toBeNull();
      expect(p.gcContact.confidence).toBe("Low");
      // The company name is real and stays.
      expect(p.gcContact.companyName).not.toBe("");
    }
  });

  it("keeps every legitimate contact untouched", () => {
    const result = suppressSharedContacts(austinLike);
    expect(result.suppressedPhones).toBe(0);
    expect(result.permits).toBe(austinLike);
  });

  it("suppresses only the offending contact in a mixed source", () => {
    const mixed = [...peoriaLike, ...austinLike];
    const result = suppressSharedContacts(mixed);
    expect(result.suppressedPhones).toBe(4);
    const survivors = result.permits.filter((p) => p.gcContact.phone !== null);
    expect(survivors).toHaveLength(austinLike.length);
  });
});

describe("constantValueShare", () => {
  it("detects a hardcoded placeholder value", () => {
    // Twenty adapters write a fixed number where the source publishes no cost.
    const permits = Array.from({ length: 10 }, (_, i) =>
      permit(`c${i}`, `Co ${i}`, null, 100_000)
    );
    expect(constantValueShare(permits)).toEqual({ share: 1, value: 100_000 });
  });

  it("reports a low share for genuinely varied values", () => {
    const permits = [
      permit("v1", "A", null, 120_000),
      permit("v2", "B", null, 450_000),
      permit("v3", "C", null, 90_000),
      permit("v4", "D", null, 1_200_000),
    ];
    expect(constantValueShare(permits).share).toBe(0.25);
  });

  it("ignores zeroes, which mean absent rather than identical", () => {
    const permits = [
      permit("z1", "A", null, 0),
      permit("z2", "B", null, 0),
      permit("z3", "C", null, 500_000),
    ];
    expect(constantValueShare(permits)).toEqual({ share: 1, value: 500_000 });
  });
});

describe("assessMarketQuality", () => {
  it("reports a shared-line market as unreachable in substance", () => {
    const quality = assessMarketQuality("peoria", peoriaLike);
    // Every permit has a phone, and none of them are usable.
    expect(quality.phoneRate).toBe(1);
    expect(quality.phoneDistinctness).toBe(0.25);
    expect(quality.sharedContacts).toHaveLength(1);
  });

  it("reports a healthy market as healthy", () => {
    const quality = assessMarketQuality("austin", austinLike);
    expect(quality.namedGcRate).toBe(1);
    expect(quality.reachableRate).toBe(1);
    expect(quality.sharedContacts).toEqual([]);
    expect(quality.phoneDistinctness).toBeGreaterThan(0.5);
  });
});

describe("evaluateGate", () => {
  it("fails a market whose contacts are one shared line", () => {
    const gate = evaluateGate(
      assessMarketQuality("peoria", peoriaLike),
      { ...DEFAULT_GATE, minPermits: 1 }
    );
    expect(gate.passes).toBe(false);
    expect(gate.failures.join(" ")).toContain("shared by 4 different companies");
  });

  it("fails a market with no way to reach anyone", () => {
    const silent = Array.from({ length: 60 }, (_, i) =>
      permit(`s${i}`, `Builder ${i}`, null)
    );
    const gate = evaluateGate(assessMarketQuality("chicago", silent));
    expect(gate.passes).toBe(false);
    expect(gate.failures.join(" ")).toContain("have a contact method");
  });

  it("fails a market too small to judge", () => {
    const gate = evaluateGate(assessMarketQuality("tiny", austinLike));
    expect(gate.failures.join(" ")).toContain("only 5 permits");
  });

  it("fails a market whose project values are a placeholder", () => {
    const permits = Array.from({ length: 60 }, (_, i) =>
      permit(`h${i}`, `Builder ${i}`, `512-555-${String(1000 + i)}`, 100_000)
    );
    const gate = evaluateGate(assessMarketQuality("peoria", permits));
    expect(gate.failures.join(" ")).toContain("same project value");
  });

  it("passes a market that is genuinely ready", () => {
    const permits = Array.from({ length: 60 }, (_, i) =>
      permit(`g${i}`, `Builder ${i}`, `512-555-${String(1000 + i)}`, 100_000 + i * 1000)
    );
    const gate = evaluateGate(assessMarketQuality("austin", permits));
    expect(gate.failures).toEqual([]);
    expect(gate.passes).toBe(true);
  });
});
