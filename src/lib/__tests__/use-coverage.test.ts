import { describe, expect, it } from "vitest";
import { freshnessLabel, marketCountLabel } from "../use-coverage";
import {
  CONFIDENCE_DEFINITIONS,
  CONFIDENCE_DISCLAIMER,
} from "../contact-confidence";

const NOW = new Date("2026-08-21T12:00:00Z");

describe("freshnessLabel", () => {
  it("says so plainly when nothing has ever refreshed", () => {
    // Never "just now". An empty pipeline must not read as a fresh one.
    expect(freshnessLabel(null, NOW)).toBe("not yet refreshed");
  });

  it("reports sub-hour, hour, and day scales", () => {
    expect(freshnessLabel("2026-08-21T11:40:00Z", NOW)).toBe(
      "less than an hour ago"
    );
    expect(freshnessLabel("2026-08-21T11:00:00Z", NOW)).toBe("1 hour ago");
    expect(freshnessLabel("2026-08-21T04:00:00Z", NOW)).toBe("8 hours ago");
    expect(freshnessLabel("2026-08-20T10:00:00Z", NOW)).toBe("yesterday");
    expect(freshnessLabel("2026-08-18T10:00:00Z", NOW)).toBe("3 days ago");
  });

  it("falls back to a date once a week has passed", () => {
    expect(freshnessLabel("2026-08-01T10:00:00Z", NOW)).toBe("on Aug 1");
  });

  it("does not claim freshness for an unparseable timestamp", () => {
    expect(freshnessLabel("whenever", NOW)).toBe("unknown");
  });
});

describe("marketCountLabel", () => {
  it("agrees with its own number", () => {
    expect(marketCountLabel(0)).toBe("0 markets");
    expect(marketCountLabel(1)).toBe("1 market");
    expect(marketCountLabel(145)).toBe("145 markets");
  });
});

describe("confidence definitions", () => {
  it("covers every level the type allows", () => {
    expect(Object.keys(CONFIDENCE_DEFINITIONS).sort()).toEqual([
      "High",
      "Low",
      "Medium",
    ]);
  });

  it("never describes a contact as verified", () => {
    // The whole point of the label is that nothing is verified. If a future
    // edit reintroduces that word, this fails before it reaches a customer.
    const copy = Object.values(CONFIDENCE_DEFINITIONS)
      .flatMap((d) => [d.summary, d.detail])
      .join(" ")
      .toLowerCase();
    expect(copy).not.toContain("verified");
    expect(copy).not.toContain("confirmed");
  });

  it("states plainly that we do not verify contacts", () => {
    expect(CONFIDENCE_DISCLAIMER.toLowerCase()).toContain("do not");
    expect(CONFIDENCE_DISCLAIMER.toLowerCase()).toContain("verify");
  });

  it("warns that a Medium name may not be the contractor", () => {
    expect(CONFIDENCE_DEFINITIONS.Medium.detail.toLowerCase()).toContain(
      "owner"
    );
  });

  it("does not imply a Low-confidence permit is a bad record", () => {
    expect(CONFIDENCE_DEFINITIONS.Low.detail.toLowerCase()).toContain(
      "still accurate"
    );
  });
});
