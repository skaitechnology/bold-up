// Shared vocabulary of the product: the values stored in the database and the small
// pure rules built on top of them. No I/O here, so everything is unit-testable.

import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type VerificationStatus = Enums["verification_status"];
export type DocumentStatus = Enums["document_status"];
export type BookingStatus = Enums["booking_status"];
export type VenueCategory = Enums["venue_category"];

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const FORMATS = ["private", "group"] as const;
export type Format = (typeof FORMATS)[number];

export const LOCATION_KINDS = ["to_agree", "gym", "home", "outdoor", "online"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export const QUALIFICATION_KINDS = ["carte_pro", "bpjeps", "dejeps", "desjeps", "staps", "cqp", "federal", "other"] as const;
export type QualificationKind = (typeof QUALIFICATION_KINDS)[number];

/** Every kind of place stored in `venues` (admin forms list them all). */
export const VENUE_CATEGORIES = ["gym", "studio", "shop", "school", "other", "club", "street_workout"] as const;
/** The "Salles" listing: indoor training venues, i.e. neither a club nor an outdoor spot. */
export const GYM_CATEGORIES = ["gym", "studio", "shop", "school", "other"] as const;
export const isGymCategory = (category: string) => (GYM_CATEGORIES as readonly string[]).includes(category);

/** Public route of a place, by category. */
export function placeHref(place: { category: string; slug: string }): string {
  if (place.category === "club") return `/club/${place.slug}`;
  if (place.category === "street_workout") return `/street-workout/${place.slug}`;
  return `/salle/${place.slug}`;
}

/**
 * Facilities with a translated label and a filter. `venues.facilities` may also hold
 * free text (older gym listings), which is shown as written.
 */
export const SPOT_FEATURES = ["pull_up_bars", "parallel_bars", "monkey_bars", "rings", "abs_bench", "stall_bars", "lighting", "water", "covered"] as const;
export const CLUB_FEATURES = ["competition", "leisure", "kids", "adults", "changing_rooms", "parking", "accessible"] as const;
export const PLACE_FEATURES = [...SPOT_FEATURES, ...CLUB_FEATURES] as const;
export type PlaceFeature = (typeof PLACE_FEATURES)[number];
export const isPlaceFeature = (value: string): value is PlaceFeature => (PLACE_FEATURES as readonly string[]).includes(value);

export const EVENT_KINDS = ["hyrox", "marathon", "trail", "competition", "challenge", "local"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_LEVELS = ["all", "beginner", "intermediate", "advanced"] as const;
export type EventLevel = (typeof EVENT_LEVELS)[number];

export const DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------- profile completion

/** Keys returned by the `coach_checklist` database function, in the order shown to the coach. */
export const CHECKLIST_KEYS = [
  "identity",
  "photo",
  "bio",
  "sports",
  "services",
  "location",
  "qualifications",
  "availability",
  "documents",
] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

export type Checklist = Record<ChecklistKey, boolean> & {
  missing_documents: string[];
  documents_approved: boolean;
  unapproved_documents: string[];
};

export function parseChecklist(raw: unknown): Checklist {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const flags = Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, source[key] === true])) as Record<ChecklistKey, boolean>;
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
  return {
    ...flags,
    missing_documents: list(source.missing_documents),
    documents_approved: source.documents_approved === true,
    unapproved_documents: list(source.unapproved_documents),
  };
}

/** Share of completed checklist steps, 0 to 100. Always computed, never hardcoded. */
export function completionPercent(checklist: Checklist): number {
  const done = CHECKLIST_KEYS.filter((key) => checklist[key]).length;
  return Math.round((done / CHECKLIST_KEYS.length) * 100);
}

export function isChecklistComplete(checklist: Checklist): boolean {
  return CHECKLIST_KEYS.every((key) => checklist[key]);
}

export function nextChecklistStep(checklist: Checklist): ChecklistKey | null {
  return CHECKLIST_KEYS.find((key) => !checklist[key]) ?? null;
}

/** Where each checklist step is completed in the coach area. */
export const CHECKLIST_LINKS: Record<ChecklistKey, string> = {
  identity: "/pro/profil#identite",
  photo: "/pro/profil#identite",
  bio: "/pro/profil#identite",
  sports: "/pro/profil#coaching",
  services: "/pro/profil#prestations",
  location: "/pro/profil#lieu",
  qualifications: "/pro/profil#qualifications",
  availability: "/pro/agenda?vue=disponibilites",
  documents: "/pro/documents",
};

// ---------------------------------------------------------------- state machines
// Mirrors of the SQL transition tables, used by the UI to decide which actions to offer.
// The database remains the authority: it rejects anything not listed there.

export const PROFILE_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  draft: ["awaiting_review"],
  awaiting_review: ["approved", "rejected", "changes_requested"],
  changes_requested: ["awaiting_review"],
  rejected: ["awaiting_review"],
  approved: ["changes_requested", "suspended"],
  suspended: ["approved"],
};

export const DOCUMENT_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  uploaded: ["precheck_pending"],
  precheck_pending: ["precheck_completed"],
  precheck_completed: ["awaiting_review", "needs_attention"],
  needs_attention: [],
  awaiting_review: ["approved", "rejected", "info_requested"],
  approved: ["expired"],
  rejected: [],
  info_requested: [],
  expired: [],
};

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["accepted", "declined", "cancelled"],
  accepted: ["cancelled", "completed"],
  declined: [],
  cancelled: [],
  completed: [],
};

export function canTransition<S extends string>(table: Record<S, S[]>, from: S, to: S): boolean {
  return table[from]?.includes(to) ?? false;
}

/** A coach can (re)submit their profile from these states. */
export function canSubmitProfile(status: VerificationStatus): boolean {
  return canTransition(PROFILE_TRANSITIONS, status, "awaiting_review");
}

/** The public "verified" badge exists only after a human approval, and only while published. */
export function isPubliclyVerified(coach: { verification_status: VerificationStatus; is_published: boolean }): boolean {
  return coach.verification_status === "approved" && coach.is_published;
}

/** Documents a coach should replace: the file was refused, questioned, failed the pre-check or expired. */
export function documentNeedsAction(status: DocumentStatus): boolean {
  return status === "needs_attention" || status === "rejected" || status === "info_requested" || status === "expired";
}

export type BookingAction = "accept" | "decline" | "cancel" | "complete";

export function bookingActions(
  booking: { status: BookingStatus; starts_at: string; ends_at: string },
  as: "coach" | "customer",
  now: Date = new Date(),
): BookingAction[] {
  const startsInFuture = new Date(booking.starts_at) > now;
  const ended = new Date(booking.ends_at) <= now;
  const actions: BookingAction[] = [];
  if (booking.status === "requested" && startsInFuture) {
    if (as === "coach") actions.push("accept", "decline");
    else actions.push("cancel");
  }
  if (booking.status === "accepted") {
    if (startsInFuture) actions.push("cancel");
    if (as === "coach" && ended) actions.push("complete");
  }
  return actions;
}
