import type { BadgeTone } from "@/components/ui/badge";
import type { DocumentStatus, VerificationStatus } from "@/lib/domain";

/** Badge colour for each document status. */
export const DOCUMENT_TONES: Record<DocumentStatus, BadgeTone> = {
  uploaded: "neutral",
  precheck_pending: "gold",
  precheck_completed: "gold",
  needs_attention: "danger",
  awaiting_review: "warn",
  approved: "success",
  rejected: "danger",
  info_requested: "warn",
  expired: "danger",
};

/** Badge colour for each profile verification status. */
export const VERIFICATION_TONES: Record<VerificationStatus, BadgeTone> = {
  draft: "neutral",
  awaiting_review: "warn",
  changes_requested: "warn",
  approved: "gold",
  rejected: "danger",
  suspended: "danger",
};
