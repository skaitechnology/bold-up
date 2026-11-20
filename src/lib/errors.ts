// Error codes shared by the database (raised from SQL), the server actions and the UI.
// The UI never shows raw database messages: it maps a code to a translated sentence.

export const ERROR_CODES = [
  "generic",
  "not_authenticated",
  "forbidden",
  "not_found",
  "invalid_input",
  "invalid_credentials",
  "email_taken",
  "weak_password",
  "suspended",
  "rate_limited",
  "protected_field",
  "invalid_transition",
  "invalid_decision",
  "note_required",
  "profile_incomplete",
  "documents_not_approved",
  "not_a_coach",
  "unknown_document_type",
  "unsupported_file_type",
  "file_too_large",
  "too_many_documents",
  "upload_failed",
  "slot_unavailable",
  "coach_unavailable",
  "service_unavailable",
  "cannot_book_self",
  "cannot_message_self",
  "invalid_location",
  "too_many_requests",
  "booking_in_past",
  "booking_not_finished",
  "not_configured",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode };

export const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
export const fail = (error: ErrorCode): ActionResult<never> => ({ ok: false, error });

/** Turns anything thrown or returned by Supabase into one of our codes. */
export function toErrorCode(error: unknown): ErrorCode {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";

  for (const candidate of ERROR_CODES) {
    if (candidate !== "generic" && message.includes(candidate)) return candidate;
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) return "forbidden";
  if (code === "23P01") return "slot_unavailable";
  if (code === "PGRST116") return "not_found";
  return "generic";
}
