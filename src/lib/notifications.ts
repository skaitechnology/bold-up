import type { Dictionary } from "@/lib/i18n";

type Row = { kind: string; data: unknown };

/** Sentence shown for a notification, in the reader's language. */
export function notificationText(row: Row, t: Dictionary, documentName: (code: string) => string): string {
  const n = t.common.notifications;
  const data = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
  switch (row.kind) {
    case "booking_requested":
      return n.booking_requested(text("customer"), text("service"));
    case "booking_accepted":
      return n.booking_accepted(text("by"));
    case "booking_declined":
      return n.booking_declined(text("by"));
    case "booking_cancelled":
      return n.booking_cancelled(text("by"));
    case "message_received":
      return n.message_received(text("from"));
    case "document_approved":
      return n.document_approved(documentName(text("type")));
    case "document_rejected":
      return n.document_rejected(documentName(text("type")));
    case "document_info_requested":
      return n.document_info_requested(documentName(text("type")));
    case "document_expired":
      return n.document_expired(documentName(text("type")));
    case "profile_approved":
      return n.profile_approved;
    case "profile_rejected":
      return n.profile_rejected;
    case "profile_changes_requested":
      return n.profile_changes_requested;
    case "profile_suspended":
      return n.profile_suspended;
    case "coach_submitted":
      return n.coach_submitted(text("name"));
    case "document_to_review":
      return n.document_to_review;
    case "qualification_changed":
      return n.qualification_changed;
    case "deletion_requested":
      return n.deletion_requested;
    case "venue_inquiry":
      return n.venue_inquiry(text("name"), text("venue"));
    default:
      return n.fallback;
  }
}
