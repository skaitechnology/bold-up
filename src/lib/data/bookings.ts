import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, LocationKind } from "@/lib/domain";

export type BookingView = {
  id: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
  service_name: string;
  duration_min: number;
  price_cents: number;
  location_kind: LocationKind;
  message: string | null;
  coach: { id: string; name: string; slug: string; photoPath: string | null };
  customer: { id: string; name: string; city: string | null };
};

/**
 * Bookings of the signed-in user, seen as a coach or as a customer.
 * Row level security already restricts rows to the participants; the explicit filter
 * keeps a coach's own purchases out of their coaching agenda (and the other way round).
 */
export async function listBookings(as: "coach" | "customer", userId: string): Promise<BookingView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, status, starts_at, ends_at, created_at, service_name, duration_min, price_cents, location_kind, message, coach_id, customer_id, coach_profiles(display_name, slug, photo_path)",
    )
    .eq(as === "coach" ? "coach_id" : "customer_id", userId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`listBookings: ${error.message}`);

  const customerIds = [...new Set(data.map((row) => row.customer_id))];
  const { data: cards } = customerIds.length
    ? await supabase.from("profile_cards").select("id, full_name, city").in("id", customerIds)
    : { data: [] as { id: string | null; full_name: string | null; city: string | null }[] };
  const names = new Map((cards ?? []).map((card) => [card.id, card]));

  return data.map((row) => ({
    id: row.id,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    service_name: row.service_name,
    duration_min: row.duration_min,
    price_cents: row.price_cents,
    location_kind: row.location_kind as LocationKind,
    message: row.message,
    coach: {
      id: row.coach_id,
      name: row.coach_profiles?.display_name ?? "",
      slug: row.coach_profiles?.slug ?? "",
      photoPath: row.coach_profiles?.photo_path ?? null,
    },
    customer: {
      id: row.customer_id,
      name: names.get(row.customer_id)?.full_name ?? "",
      city: names.get(row.customer_id)?.city ?? null,
    },
  }));
}

/** Splits bookings into what still matters and what is behind us. */
export function partitionBookings(bookings: BookingView[], now: Date = new Date()) {
  const live = (booking: BookingView) => booking.status === "requested" || booking.status === "accepted";
  const upcoming = bookings.filter((booking) => live(booking) && new Date(booking.ends_at) > now);
  const past = bookings.filter((booking) => !upcoming.includes(booking)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}
