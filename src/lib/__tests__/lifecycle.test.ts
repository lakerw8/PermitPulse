import { describe, expect, it } from "vitest";
import {
  classifyStage,
  inferStageFromQuery,
  extractSourceStatus,
  isActionable,
  isStatusKey,
  isTerminal,
  isValidTransition,
  signalFor,
  STAGE_LABELS,
  TERMINAL_STAGES,
  type LifecycleStage,
} from "../lifecycle";
import { mapStatus } from "../permit-adapters";
import { PERMIT_STATUSES } from "../types";

describe("classifyStage: negative outcomes are never lost", () => {
  // The regression this whole module exists for. The previous mapping sent
  // every one of these to "Under Review" or "Completed", so a refused permit
  // was advertised as a live opportunity.
  const negatives: [string, LifecycleStage][] = [
    ["Denied", "rejected"],
    ["DENIED - see notes", "rejected"],
    ["Application Rejected", "rejected"],
    ["Disapproved", "rejected"],
    ["Permit Revoked", "revoked"],
    ["REVOKED", "revoked"],
    ["Withdrawn by applicant", "withdrawn"],
    ["Expired", "expired"],
    ["Permit Lapsed", "expired"],
    ["Cancelled", "canceled"],
    ["Canceled", "canceled"],
    ["VOID", "canceled"],
    ["Abandoned", "canceled"],
  ];

  it.each(negatives)("classifies %s as %s", (input, expected) => {
    expect(classifyStage(input).stage).toBe(expected);
  });

  it("gives every negative outcome a closed signal", () => {
    for (const [input] of negatives) {
      expect(signalFor(classifyStage(input).stage)).toBe("closed");
    }
  });

  it("never presents a negative outcome as actionable", () => {
    for (const [input] of negatives) {
      expect(isActionable(classifyStage(input).stage)).toBe(false);
    }
  });
});

describe("classifyStage: positive stages", () => {
  const positives: [string, LifecycleStage][] = [
    ["Issued", "issued"],
    ["PERMIT ISSUED", "issued"],
    ["Active", "issued"],
    ["In Progress", "issued"],
    ["Approved", "approved"],
    ["Ready to Issue", "approved"],
    ["Under Review", "under_review"],
    ["Plan Check", "under_review"],
    ["Pending", "under_review"],
    ["In Process", "under_review"],
    ["Filed", "filed"],
    ["Submitted", "filed"],
    ["Application Received", "filed"],
    ["Completed", "completed"],
    ["Finaled", "completed"],
    ["Certificate of Occupancy", "completed"],
  ];

  it.each(positives)("classifies %s as %s", (input, expected) => {
    expect(classifyStage(input).stage).toBe(expected);
  });

  it("maps filed and under review to the early signal", () => {
    expect(signalFor("filed")).toBe("early");
    expect(signalFor("under_review")).toBe("early");
  });

  it("maps approved and issued to the go signal", () => {
    expect(signalFor("approved")).toBe("go");
    expect(signalFor("issued")).toBe("go");
  });
});

describe("classifyStage: ambiguous and missing", () => {
  it("does not invent a stage for a missing status", () => {
    // Previously "" and undefined both became "Issued" — the strongest
    // go-signal the product has, assigned on no evidence at all.
    for (const empty of ["", "   ", null, undefined]) {
      const result = classifyStage(empty);
      expect(result.stage).toBe("unknown");
      expect(result.matched).toBe(false);
      expect(signalFor(result.stage)).toBe("none");
    }
  });

  it("does not invent a stage for an unrecognised code", () => {
    const result = classifyStage("STAT-7B");
    expect(result.stage).toBe("unknown");
    expect(result.matched).toBe(false);
    // The source's own words survive even when we cannot read them.
    expect(result.sourceStatus).toBe("STAT-7B");
  });

  it("reads a negative outcome even when a positive word precedes it", () => {
    // "Issued - Revoked" is a revoked permit; matching "issue" first would
    // call it live.
    expect(classifyStage("Issued - Revoked").stage).toBe("revoked");
    expect(classifyStage("Approved then Withdrawn").stage).toBe("withdrawn");
  });

  it("preserves the source string verbatim", () => {
    expect(classifyStage("  Permit Issued  ").sourceStatus).toBe("Permit Issued");
  });
});

describe("mapStatus", () => {
  it("no longer shows a denied permit as under review", () => {
    expect(mapStatus("Denied")).toBe("Rejected");
    expect(mapStatus("Revoked")).toBe("Revoked");
  });

  it("no longer shows a cancelled permit as completed", () => {
    expect(mapStatus("Cancelled")).toBe("Canceled");
    expect(mapStatus("Expired")).toBe("Expired");
    expect(mapStatus("Withdrawn")).toBe("Withdrawn");
  });

  it("no longer defaults an unknown status to Issued", () => {
    expect(mapStatus(undefined)).toBe("Status Unknown");
    expect(mapStatus("")).toBe("Status Unknown");
    expect(mapStatus("XYZ-42")).toBe("Status Unknown");
  });

  it("still reads the ordinary cases correctly", () => {
    expect(mapStatus("Issued")).toBe("Issued");
    expect(mapStatus("Under Review")).toBe("Under Review");
    expect(mapStatus("Approved")).toBe("Approved");
    expect(mapStatus("Completed")).toBe("Completed");
  });

  it("only ever returns a status the filter offers", () => {
    const samples = ["Issued", "Denied", "", "STAT-7B", "Cancelled", "Finaled"];
    for (const sample of samples) {
      expect(PERMIT_STATUSES).toContain(mapStatus(sample));
    }
  });

  it("has a label for every stage", () => {
    for (const label of Object.values(STAGE_LABELS)) {
      expect(PERMIT_STATUSES).toContain(label);
    }
  });
});

describe("extractSourceStatus", () => {
  it("finds the status under any of the field names adapters read", () => {
    // Drawn from the real adapter call sites.
    const keys = [
      "status", "PermitStatus", "STATUS", "StatusCurrent", "PERMIT_STATUS",
      "RECORD_STATUS", "Project_Status", "B1_APPL_ST", "APP STATUS",
      "CURRENT_TASK_STATUS", "USER_Current_Stage___Display", "STAT",
    ];
    for (const key of keys) {
      const result = extractSourceStatus({ [key]: "Withdrawn" });
      expect(result.stage, key).toBe("withdrawn");
      expect(result.sourceStatus, key).toBe("Withdrawn");
    }
  });

  it("ignores fields that are not statuses", () => {
    const result = extractSourceStatus({
      address: "Issued Street",
      contractor: "Revoked & Sons",
    });
    expect(result.stage).toBe("unknown");
    expect(result.sourceStatus).toBeNull();
  });

  it("prefers a readable status over an unreadable code", () => {
    const result = extractSourceStatus({
      STATUS_CODE: "7B",
      Permit_Status: "Withdrawn",
    });
    expect(result.stage).toBe("withdrawn");
  });

  it("keeps an unreadable code rather than discarding it", () => {
    const result = extractSourceStatus({ STATUS_CODE: "7B" });
    expect(result.stage).toBe("unknown");
    expect(result.sourceStatus).toBe("7B");
  });

  it("reads a numeric status field", () => {
    expect(extractSourceStatus({ status: 7 }).sourceStatus).toBe("7");
  });

  it("returns unknown for an empty record", () => {
    expect(extractSourceStatus({}).stage).toBe("unknown");
  });
});

describe("isStatusKey", () => {
  it("accepts the shapes adapters actually use", () => {
    for (const key of ["status", "PERMIT_STATUS", "B1_APPL_ST", "APP STATUS", "STAT", "statuscurrent"]) {
      expect(isStatusKey(key), key).toBe(true);
    }
  });

  it("rejects unrelated fields", () => {
    for (const key of ["address", "contractor", "issue_date", "state"]) {
      expect(isStatusKey(key), key).toBe(false);
    }
  });
});

describe("isValidTransition", () => {
  it("accepts any stage on first sight", () => {
    expect(isValidTransition(null, "completed")).toBe(true);
    expect(isValidTransition(null, "revoked")).toBe(true);
  });

  it("accepts the normal progression", () => {
    expect(isValidTransition("filed", "under_review")).toBe(true);
    expect(isValidTransition("under_review", "approved")).toBe(true);
    expect(isValidTransition("approved", "issued")).toBe(true);
    expect(isValidTransition("issued", "completed")).toBe(true);
  });

  it("accepts falling out of the pipeline at each step", () => {
    expect(isValidTransition("filed", "rejected")).toBe(true);
    expect(isValidTransition("under_review", "withdrawn")).toBe(true);
    expect(isValidTransition("approved", "revoked")).toBe(true);
    expect(isValidTransition("issued", "expired")).toBe(true);
  });

  it("flags a move backwards rather than coercing it", () => {
    // Recorded, not suppressed: sources do correct themselves, and that is
    // information about the source.
    expect(isValidTransition("issued", "under_review")).toBe(false);
    expect(isValidTransition("completed", "issued")).toBe(false);
  });

  it("treats a terminal stage as terminal", () => {
    for (const stage of TERMINAL_STAGES) {
      expect(isTerminal(stage)).toBe(true);
      expect(isValidTransition(stage, "issued")).toBe(false);
    }
  });

  it("allows leaving unknown for anything", () => {
    expect(isValidTransition("unknown", "issued")).toBe(true);
    expect(isValidTransition("unknown", "rejected")).toBe(true);
  });

  it("treats staying put as valid", () => {
    expect(isValidTransition("issued", "issued")).toBe(true);
  });
});

describe("inferStageFromQuery", () => {
  it("reads issued from a query that filters on an issue date", () => {
    // Chicago publishes no status column, but selects on issue_date — so
    // every record it returns is an issued permit by construction.
    expect(
      inferStageFromQuery(
        "https://data.cityofchicago.org/resource/ydr8-5enu.json?$where=issue_date >= '2026-05-01T00:00:00.000' AND reported_cost > 50000"
      )
    ).toBe("issued");
    expect(inferStageFromQuery("...?$where=issued_date >= '2026-05-01'")).toBe("issued");
    expect(inferStageFromQuery("...?$where=issueddate%3E='2026-05-01'")).toBe("issued");
  });

  it("reads filed from a query that filters on an application date", () => {
    expect(inferStageFromQuery("...?$where=applied_date >= '2026-05-01'")).toBe("filed");
    expect(inferStageFromQuery("...?$where=application_date >= '2026-05-01'")).toBe("filed");
  });

  it("infers nothing from a mere mention of the field", () => {
    // A column in the select list says nothing about which rows came back.
    expect(
      inferStageFromQuery("...?$select=issue_date,address&$where=zip='60607'")
    ).toBeNull();
  });

  it("infers nothing from an unrelated query", () => {
    expect(inferStageFromQuery("https://example.gov/permits.json?$limit=200")).toBeNull();
  });
});
