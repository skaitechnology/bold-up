import "server-only";
import { parseChecklist, type VerificationStatus } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

// Read side of the back office. All queries run with the admin's session: the database
// only returns these rows to users whose role is 'admin'.

export async function getAdminStats() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw new Error(`getAdminStats: ${error.message}`);
  const value = (data ?? {}) as Record<string, number>;
  return {
    coachesTotal: value.coaches_total ?? 0,
    coachesPending: value.coaches_pending ?? 0,
    coachesApproved: value.coaches_approved ?? 0,
    coachesRejected: value.coaches_rejected ?? 0,
    customersTotal: value.customers_total ?? 0,
    bookingsTotal: value.bookings_total ?? 0,
    documentsToReview: value.documents_to_review ?? 0,
    venuesTotal: value.venues_total ?? 0,
  };
}

const COACH_LIST =
  "id, slug, display_name, city, photo_path, verification_status, is_published, is_demo, submitted_at, created_at, profiles!coach_profiles_id_fkey(email, is_suspended), coach_sports(sports(slug, name_fr, name_en))";

export async function listCoachesAdmin(filters: { q?: string; status?: string; sport?: string }) {
  const supabase = await createClient();
  let query = supabase.from("coach_profiles").select(COACH_LIST).order("created_at", { ascending: false }).limit(200);
  if (filters.status) query = query.eq("verification_status", filters.status as VerificationStatus);
  const term = filters.q?.replace(/[%_,()]/g, " ").trim();
  if (term) query = query.or(`display_name.ilike.%${term}%,city.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listCoachesAdmin: ${error.message}`);
  const rows = data.map((row) => ({
    ...row,
    email: row.profiles?.email ?? "",
    suspended: row.profiles?.is_suspended ?? false,
    sports: row.coach_sports.map((entry) => entry.sports).filter((sport): sport is NonNullable<typeof sport> => Boolean(sport)),
  }));
  return filters.sport ? rows.filter((row) => row.sports.some((sport) => sport.slug === filters.sport)) : rows;
}

export async function getCoachAdmin(coachId: string) {
  const supabase = await createClient();
  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select(
      "*, profiles!coach_profiles_id_fkey(email, full_name, created_at, is_suspended), coach_sports(sports(slug, name_fr, name_en, icon)), coach_services(id, name, duration_min, price_cents, is_active, sort_order), coach_qualifications(id, kind, title, issuer, year_obtained, status, created_at), availability_rules(weekday, start_time, end_time)",
    )
    .eq("id", coachId)
    .maybeSingle();
  if (error) throw new Error(`getCoachAdmin: ${error.message}`);
  if (!coach) return null;

  const [documents, events, checklist] = await Promise.all([
    supabase
      .from("coach_documents")
      .select("id, type_code, file_name, mime_type, size_bytes, status, precheck, reference, expires_on, review_note, reviewed_at, is_demo, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false }),
    supabase
      .from("verification_events")
      .select("id, document_id, scope, from_status, to_status, actor_role, note, is_internal, created_at")
      .eq("coach_id", coachId)
      .order("id", { ascending: false })
      .limit(60),
    supabase.rpc("coach_checklist", { p_coach_id: coachId }),
  ]);
  return {
    coach,
    documents: documents.data ?? [],
    events: events.data ?? [],
    checklist: parseChecklist(checklist.data),
  };
}

export async function listReviewQueue() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id, display_name, city, photo_path, submitted_at, is_demo")
    .eq("verification_status", "awaiting_review")
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(`listReviewQueue: ${error.message}`);
  return data;
}

export async function listRecentActivity(limit = 12) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_logs").select("id, action, entity, entity_id, meta, created_at, actor_id").order("id", { ascending: false }).limit(limit);
  if (error) throw new Error(`listRecentActivity: ${error.message}`);
  return data;
}

export async function listUsersAdmin(filters: { q?: string; role?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, city, is_demo, is_suspended, deletion_requested_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (filters.role === "customer" || filters.role === "coach" || filters.role === "admin") query = query.eq("role", filters.role);
  const term = filters.q?.replace(/[%_,()]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listUsersAdmin: ${error.message}`);
  return data;
}

export async function listVenuesAdmin() {
  const supabase = await createClient();
  const [venues, inquiries] = await Promise.all([
    supabase.from("venues").select("*").order("partner_status", { ascending: false }).order("name"),
    supabase.from("venue_inquiries").select("id, venue_id, name, email, message, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  if (venues.error) throw new Error(`listVenuesAdmin: ${venues.error.message}`);
  return { venues: venues.data, inquiries: inquiries.data ?? [] };
}

export async function listSportsAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sports").select("*").order("sort_order");
  if (error) throw new Error(`listSportsAdmin: ${error.message}`);
  return data;
}
