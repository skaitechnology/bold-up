"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FORMATS, LEVELS, QUALIFICATION_KINDS } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult, type ErrorCode } from "@/lib/errors";
import { jitter } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";

/** Result of a form submitted with useActionState. */
export type FormState = { ok?: boolean; error?: ErrorCode };

async function coachContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

function refresh(slug?: string | null) {
  for (const path of ["/pro", "/pro/profil", "/pro/documents", "/pro/agenda"]) revalidatePath(path);
  if (slug) revalidatePath(`/coach/${slug}`);
  revalidatePath("/coachs");
}

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

// ---------------------------------------------------------------- identity

const identitySchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  headline: text(120),
  bio: text(1200),
});

export async function saveIdentityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = identitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };
  // Row level security limits the update to the coach's own row; the guard trigger
  // protects the verification columns whatever is sent here.
  const { data, error } = await supabase.from("coach_profiles").update(parsed.data).eq("id", userId).select("slug").maybeSingle();
  if (error) return { error: toErrorCode(error) };
  if (!data) return { error: "not_a_coach" };
  refresh(data.slug);
  return { ok: true };
}

/** Called after the browser uploaded the image to the coach's own folder in public storage. */
export async function savePhotoAction(path: string): Promise<ActionResult> {
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  if (!new RegExp(`^${userId}/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$`).test(path)) return fail("invalid_input");
  const { data: current } = await supabase.from("coach_profiles").select("photo_path, slug").eq("id", userId).maybeSingle();
  if (!current) return fail("not_a_coach");
  const { error } = await supabase.from("coach_profiles").update({ photo_path: path }).eq("id", userId);
  if (error) return fail(toErrorCode(error));
  if (current.photo_path && current.photo_path !== path && current.photo_path.startsWith(`${userId}/`)) {
    await supabase.storage.from("coach-media").remove([current.photo_path]);
  }
  refresh(current.slug);
  return ok();
}

// ---------------------------------------------------------------- coaching

const coachingSchema = z.object({
  sports: z.array(z.uuid()).max(10),
  levels: z.array(z.enum(LEVELS)),
  formats: z.array(z.enum(FORMATS)),
  years_experience: z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]).transform((value) => (value === "" ? null : value)),
  experience: text(2000),
});

export async function saveCoachingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = coachingSchema.safeParse({
    sports: formData.getAll("sports"),
    levels: formData.getAll("levels"),
    formats: formData.getAll("formats"),
    years_experience: formData.get("years_experience") ?? "",
    experience: formData.get("experience") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };

  const { sports, ...profile } = parsed.data;
  const { data, error } = await supabase.from("coach_profiles").update(profile).eq("id", userId).select("slug").maybeSingle();
  if (error) return { error: toErrorCode(error) };
  if (!data) return { error: "not_a_coach" };

  const { data: existing } = await supabase.from("coach_sports").select("sport_id").eq("coach_id", userId);
  const current = new Set((existing ?? []).map((row) => row.sport_id));
  const wanted = new Set(sports);
  const toRemove = [...current].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !current.has(id));
  if (toRemove.length) await supabase.from("coach_sports").delete().eq("coach_id", userId).in("sport_id", toRemove);
  if (toAdd.length) {
    const { error: insertError } = await supabase.from("coach_sports").insert(toAdd.map((sport_id) => ({ coach_id: userId, sport_id })));
    if (insertError) return { error: toErrorCode(insertError) };
  }
  refresh(data.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- services

const serviceSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  name: z.string().trim().min(2).max(80),
  description: text(400),
  duration_min: z.coerce.number().int().min(15).max(240),
  price: z.coerce.number().min(0).max(1000),
  format: z.enum(FORMATS),
  is_active: z.boolean(),
});

export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = serviceSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    duration_min: formData.get("duration_min"),
    price: String(formData.get("price") ?? "").replace(",", "."),
    format: formData.get("format") ?? "private",
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };

  const { id, price, ...rest } = parsed.data;
  const row = { ...rest, price_cents: Math.round(price * 100) };
  const { error } = id
    ? await supabase.from("coach_services").update(row).eq("id", id).eq("coach_id", userId)
    : await supabase.from("coach_services").insert({ ...row, coach_id: userId });
  if (error) return { error: toErrorCode(error) };
  const { data } = await supabase.from("coach_profiles").select("slug").eq("id", userId).maybeSingle();
  refresh(data?.slug);
  return { ok: true };
}

export async function deleteServiceAction(serviceId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(serviceId).success) return fail("invalid_input");
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("coach_services").delete().eq("id", serviceId).eq("coach_id", userId);
  if (error) return fail(toErrorCode(error));
  const { data } = await supabase.from("coach_profiles").select("slug").eq("id", userId).maybeSingle();
  refresh(data?.slug);
  return ok();
}

// ---------------------------------------------------------------- location

const locationSchema = z.object({
  city: z.string().trim().min(1).max(80),
  postal_code: optionalText(10),
  lat: z.coerce.number().min(41).max(51.5),
  lng: z.coerce.number().min(-5.5).max(10),
  service_radius_km: z.coerce.number().int().min(1).max(50),
  at_gym: z.boolean(),
  at_home: z.boolean(),
  outdoor: z.boolean(),
  online: z.boolean(),
});

export async function saveLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = locationSchema.safeParse({
    city: formData.get("city"),
    postal_code: formData.get("postal_code") ?? "",
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    service_radius_km: formData.get("service_radius_km"),
    at_gym: formData.get("at_gym") === "on",
    at_home: formData.get("at_home") === "on",
    outdoor: formData.get("outdoor") === "on",
    online: formData.get("online") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };

  // Privacy: we store a point near the town centre, moved by a fixed offset per coach.
  // Never a street address, never the browser's position.
  const point = jitter({ lat: parsed.data.lat, lng: parsed.data.lng }, userId);
  const { data, error } = await supabase
    .from("coach_profiles")
    .update({ ...parsed.data, lat: point.lat, lng: point.lng })
    .eq("id", userId)
    .select("slug")
    .maybeSingle();
  if (error) return { error: toErrorCode(error) };
  if (!data) return { error: "not_a_coach" };
  refresh(data.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- qualifications & links

const qualificationSchema = z.object({
  kind: z.enum(QUALIFICATION_KINDS),
  title: z.string().trim().min(2).max(160),
  issuer: optionalText(120),
  year_obtained: z.union([z.literal(""), z.coerce.number().int().min(1960).max(new Date().getFullYear())]).transform((value) => (value === "" ? null : value)),
});

export async function addQualificationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = qualificationSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    issuer: formData.get("issuer") ?? "",
    year_obtained: formData.get("year_obtained") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };
  // The database forces status = 'declared' for coaches and flags the change for review
  // when the profile is already approved.
  const { error } = await supabase.from("coach_qualifications").insert({ ...parsed.data, coach_id: userId });
  if (error) return { error: toErrorCode(error) };
  const { data } = await supabase.from("coach_profiles").select("slug").eq("id", userId).maybeSingle();
  refresh(data?.slug);
  return { ok: true };
}

export async function deleteQualificationAction(qualificationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(qualificationId).success) return fail("invalid_input");
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("coach_qualifications").delete().eq("id", qualificationId).eq("coach_id", userId);
  if (error) return fail(toErrorCode(error));
  const { data } = await supabase.from("coach_profiles").select("slug").eq("id", userId).maybeSingle();
  refresh(data?.slug);
  return ok();
}

const linksSchema = z.object({
  training_school: optionalText(120),
  instagram: z
    .string()
    .trim()
    .max(60)
    .regex(/^@?[A-Za-z0-9._]*$/)
    .transform((value) => value.replace(/^@/, "") || null),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value))
    .transform((value) => value || null),
});

export async function saveLinksAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = linksSchema.safeParse({
    training_school: formData.get("training_school") ?? "",
    instagram: formData.get("instagram") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };
  const { data, error } = await supabase.from("coach_profiles").update(parsed.data).eq("id", userId).select("slug").maybeSingle();
  if (error) return { error: toErrorCode(error) };
  refresh(data?.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- availability

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const rulesSchema = z
  .array(z.object({ weekday: z.number().int().min(1).max(7), start: time, end: time }))
  .max(28)
  .refine((rules) => {
    // each range must run forward, and ranges of the same day must not overlap
    for (const rule of rules) if (rule.end <= rule.start) return false;
    for (let day = 1; day <= 7; day++) {
      const ranges = rules.filter((rule) => rule.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < ranges.length; i++) if (ranges[i]!.start < ranges[i - 1]!.end) return false;
    }
    return true;
  });

export async function saveAvailabilityAction(rules: { weekday: number; start: string; end: string }[]): Promise<ActionResult> {
  const parsed = rulesSchema.safeParse(rules);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");

  const { error: deleteError } = await supabase.from("availability_rules").delete().eq("coach_id", userId);
  if (deleteError) return fail(toErrorCode(deleteError));
  if (parsed.data.length) {
    const { error } = await supabase
      .from("availability_rules")
      .insert(parsed.data.map((rule) => ({ coach_id: userId, weekday: rule.weekday, start_time: rule.start, end_time: rule.end })));
    if (error) return fail(toErrorCode(error));
  }
  const { data } = await supabase.from("coach_profiles").select("slug").eq("id", userId).maybeSingle();
  refresh(data?.slug);
  return ok();
}

const settingsSchema = z.object({
  slot_step_min: z.coerce.number().refine((value) => [15, 30, 60].includes(value)),
  min_notice_hours: z.coerce.number().int().min(0).max(168),
  accepting_bookings: z.boolean(),
});

export async function saveBookingSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = settingsSchema.safeParse({
    slot_step_min: formData.get("slot_step_min"),
    min_notice_hours: formData.get("min_notice_hours"),
    accepting_bookings: formData.get("accepting_bookings") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };
  const { data, error } = await supabase.from("coach_profiles").update(parsed.data).eq("id", userId).select("slug").maybeSingle();
  if (error) return { error: toErrorCode(error) };
  refresh(data?.slug);
  return { ok: true };
}

const dayOffSchema = z
  .object({ starts_on: z.iso.date(), ends_on: z.iso.date(), reason: optionalText(120) })
  .refine((value) => value.ends_on >= value.starts_on);

export async function addDayOffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const startsOn = String(formData.get("starts_on") ?? "");
  const parsed = dayOffSchema.safeParse({
    starts_on: startsOn,
    ends_on: String(formData.get("ends_on") || startsOn),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const { supabase, userId } = await coachContext();
  if (!userId) return { error: "not_authenticated" };
  const { error } = await supabase.from("availability_exceptions").insert({ ...parsed.data, coach_id: userId });
  if (error) return { error: toErrorCode(error) };
  refresh();
  return { ok: true };
}

export async function deleteDayOffAction(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("invalid_input");
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("availability_exceptions").delete().eq("id", id).eq("coach_id", userId);
  if (error) return fail(toErrorCode(error));
  refresh();
  return ok();
}

// ---------------------------------------------------------------- publication

/** A coach may hide or show their own listing. It is only ever public once approved. */
export async function setVisibilityAction(published: boolean): Promise<ActionResult> {
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  const { data, error } = await supabase.from("coach_profiles").update({ is_published: published }).eq("id", userId).select("slug").maybeSingle();
  if (error) return fail(toErrorCode(error));
  refresh(data?.slug);
  return ok();
}

/** Sends the profile to the human review queue. The database checks that it is complete. */
export async function submitProfileAction(): Promise<ActionResult> {
  const { supabase, userId } = await coachContext();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.rpc("submit_coach_profile");
  if (error) return fail(toErrorCode(error));
  refresh();
  revalidatePath("/admin");
  return ok();
}
