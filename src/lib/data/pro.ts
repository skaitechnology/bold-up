import "server-only";
import { cache } from "react";
import { parseChecklist } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

/** The signed-in coach's own profile with everything the editor needs. */
export const getOwnCoach = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_profiles")
    .select(
      "*, coach_sports(sport_id), coach_services(id, name, description, duration_min, price_cents, format, is_active, sort_order, created_at), coach_qualifications(id, kind, title, issuer, year_obtained, status, created_at), availability_rules(id, weekday, start_time, end_time)",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`getOwnCoach: ${error.message}`);
  return data;
});

export type OwnCoach = NonNullable<Awaited<ReturnType<typeof getOwnCoach>>>;

/** Completion checklist, computed by the database from the real rows. */
export const getChecklist = cache(async (coachId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("coach_checklist", { p_coach_id: coachId });
  if (error) throw new Error(`getChecklist: ${error.message}`);
  return parseChecklist(data);
});

export const listDocumentTypes = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("document_types").select("*").order("sort_order");
  if (error) throw new Error(`listDocumentTypes: ${error.message}`);
  return data;
});

export async function listCoachDocuments(coachId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_documents")
    .select("id, type_code, file_name, mime_type, size_bytes, status, precheck, reference, expires_on, review_note, reviewed_at, is_demo, created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listCoachDocuments: ${error.message}`);
  return data;
}

export async function listVerificationEvents(coachId: string, limit = 40) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_events")
    .select("id, document_id, scope, from_status, to_status, actor_role, note, is_internal, created_at")
    .eq("coach_id", coachId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listVerificationEvents: ${error.message}`);
  return data;
}

export async function listDaysOff(coachId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("id, starts_on, ends_on, reason")
    .eq("coach_id", coachId)
    .order("starts_on");
  if (error) throw new Error(`listDaysOff: ${error.message}`);
  return data;
}
