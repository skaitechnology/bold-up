"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LOCATION_KINDS } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { addDaysToKey, parisDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** How far ahead a session can be requested. */
const HORIZON_DAYS = 28;

/**
 * Free start times for one coach and one session length, as ISO instants.
 * Computed by the database (`open_slots`): opening hours, days off, minimum notice and
 * existing bookings are all taken into account there, in Paris local time.
 */
export async function getOpenSlotsAction(coachId: string, durationMin: number): Promise<ActionResult<string[]>> {
  if (!z.uuid().safeParse(coachId).success || !Number.isInteger(durationMin)) return fail("invalid_input");
  const supabase = await createClient();
  const from = parisDateKey(new Date());
  const { data, error } = await supabase.rpc("open_slots", {
    p_coach_id: coachId,
    p_duration_min: durationMin,
    p_from: from,
    p_to: addDaysToKey(from, HORIZON_DAYS),
  });
  if (error) return fail(toErrorCode(error));
  return ok((data ?? []).map((row) => new Date(row.starts_at).toISOString()));
}

const requestSchema = z.object({
  serviceId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  locationKind: z.enum(LOCATION_KINDS),
  message: z.string().trim().max(600).optional(),
});

/** Sends a session request. The database re-checks the slot and prevents double booking. */
export async function requestBookingAction(input: z.input<typeof requestSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return fail("not_authenticated");

  const { data, error } = await supabase.rpc("request_booking", {
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_location_kind: parsed.data.locationKind,
    p_message: parsed.data.message || undefined,
  });
  if (error || !data) return fail(toErrorCode(error));
  revalidatePath("/reservations");
  return ok({ id: data });
}

const respondSchema = z.object({ bookingId: z.uuid(), action: z.enum(["accept", "decline", "cancel", "complete"]) });

/** Accept / decline / cancel / complete. Who may do what is decided by the database function. */
export async function respondBookingAction(bookingId: string, action: string): Promise<ActionResult<{ status: string }>> {
  const parsed = respondSchema.safeParse({ bookingId, action });
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_booking", { p_booking_id: parsed.data.bookingId, p_action: parsed.data.action });
  if (error || !data) return fail(toErrorCode(error));
  for (const path of ["/reservations", "/pro", "/pro/demandes", "/pro/agenda"]) revalidatePath(path);
  return ok({ status: data });
}
