import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOOKING_TRANSITIONS,
  CHECKLIST_KEYS,
  DOCUMENT_TRANSITIONS,
  PROFILE_TRANSITIONS,
  bookingActions,
  canSubmitProfile,
  canTransition,
  completionPercent,
  documentNeedsAction,
  isChecklistComplete,
  isPubliclyVerified,
  nextChecklistStep,
  parseChecklist,
} from "@/lib/domain";

const sql = readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261120100100_functions.sql"), "utf8");

/** Reads the `(from, to)` pairs of one SQL transition function. */
function sqlTransitions(functionName: string): string[] {
  const start = sql.indexOf(`function public.${functionName}`);
  expect(start, `${functionName} exists in the migration`).toBeGreaterThan(-1);
  const body = sql.slice(start, sql.indexOf("$$;", start));
  return [...body.matchAll(/\('([a-z_]+)',\s*'([a-z_]+)'\)/g)].map((match) => `${match[1]}>${match[2]}`).sort();
}
const tsTransitions = (table: Record<string, string[]>) =>
  Object.entries(table)
    .flatMap(([from, targets]) => targets.map((to) => `${from}>${to}`))
    .sort();

describe("state machines", () => {
  it("TypeScript mirrors match the SQL transition tables exactly", () => {
    expect(tsTransitions(PROFILE_TRANSITIONS)).toEqual(sqlTransitions("profile_status_transition_allowed"));
    expect(tsTransitions(DOCUMENT_TRANSITIONS)).toEqual(sqlTransitions("document_status_transition_allowed"));
    expect(tsTransitions(BOOKING_TRANSITIONS)).toEqual(sqlTransitions("booking_status_transition_allowed"));
  });

  it("never lets a profile jump from draft to approved", () => {
    expect(canTransition(PROFILE_TRANSITIONS, "draft", "approved")).toBe(false);
    expect(canTransition(PROFILE_TRANSITIONS, "draft", "awaiting_review")).toBe(true);
    expect(canTransition(PROFILE_TRANSITIONS, "awaiting_review", "approved")).toBe(true);
  });

  it("never approves a document straight after the automated pre-check", () => {
    expect(canTransition(DOCUMENT_TRANSITIONS, "precheck_completed", "approved")).toBe(false);
    expect(canTransition(DOCUMENT_TRANSITIONS, "precheck_pending", "approved")).toBe(false);
    expect(canTransition(DOCUMENT_TRANSITIONS, "awaiting_review", "approved")).toBe(true);
  });

  it("treats declined, cancelled and completed bookings as final", () => {
    for (const status of ["declined", "cancelled", "completed"] as const) expect(BOOKING_TRANSITIONS[status]).toEqual([]);
  });

  it("lets a coach resubmit only from the states that allow it", () => {
    expect(["draft", "changes_requested", "rejected"].every((status) => canSubmitProfile(status as never))).toBe(true);
    expect(["awaiting_review", "approved", "suspended"].some((status) => canSubmitProfile(status as never))).toBe(false);
  });
});

describe("public verified badge", () => {
  it("needs a human approval AND a published profile", () => {
    expect(isPubliclyVerified({ verification_status: "approved", is_published: true })).toBe(true);
    expect(isPubliclyVerified({ verification_status: "approved", is_published: false })).toBe(false);
    expect(isPubliclyVerified({ verification_status: "awaiting_review", is_published: true })).toBe(false);
  });
});

describe("profile completion", () => {
  const none = parseChecklist({});
  it("starts at 0 % and reaches 100 % only when every step is done", () => {
    expect(completionPercent(none)).toBe(0);
    const all = parseChecklist(Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, true])));
    expect(completionPercent(all)).toBe(100);
    expect(isChecklistComplete(all)).toBe(true);
    expect(nextChecklistStep(all)).toBeNull();
  });
  it("is computed from the steps actually done", () => {
    const some = parseChecklist({ identity: true, photo: true, bio: false });
    expect(completionPercent(some)).toBe(22);
    expect(nextChecklistStep(some)).toBe("bio");
    expect(isChecklistComplete(some)).toBe(false);
  });
  it("ignores anything that is not strictly true", () => {
    expect(completionPercent(parseChecklist({ identity: "true", photo: 1, bio: null }))).toBe(0);
    expect(parseChecklist(null).missing_documents).toEqual([]);
  });
});

describe("documents", () => {
  it("flags the statuses that need a new file from the coach", () => {
    expect(["needs_attention", "rejected", "info_requested", "expired"].every((status) => documentNeedsAction(status as never))).toBe(true);
    expect(["awaiting_review", "approved", "precheck_pending"].some((status) => documentNeedsAction(status as never))).toBe(false);
  });
});

describe("booking actions offered by the interface", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  const future = { starts_at: "2026-11-21T09:00:00Z", ends_at: "2026-11-21T10:00:00Z" };
  const past = { starts_at: "2026-11-19T09:00:00Z", ends_at: "2026-11-19T10:00:00Z" };
  it("coach answers a request, customer can only cancel it", () => {
    expect(bookingActions({ status: "requested", ...future }, "coach", now)).toEqual(["accept", "decline"]);
    expect(bookingActions({ status: "requested", ...future }, "customer", now)).toEqual(["cancel"]);
  });
  it("a confirmed session can be cancelled before it starts and completed after it ends", () => {
    expect(bookingActions({ status: "accepted", ...future }, "coach", now)).toEqual(["cancel"]);
    expect(bookingActions({ status: "accepted", ...past }, "coach", now)).toEqual(["complete"]);
    expect(bookingActions({ status: "accepted", ...past }, "customer", now)).toEqual([]);
  });
  it("offers nothing on a request whose date has passed or on final states", () => {
    expect(bookingActions({ status: "requested", ...past }, "coach", now)).toEqual([]);
    expect(bookingActions({ status: "cancelled", ...future }, "coach", now)).toEqual([]);
  });
});
