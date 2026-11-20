"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/actions/pro";
import { VENUE_CATEGORIES } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { allow, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inquirySchema = z.object({
  venueId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  message: z.string().trim().min(5).max(2000),
});

/**
 * "Do you manage this venue?" form. Open to visitors, so it is rate limited and written
 * with the service role after validation; admins read the result in the back office.
 */
export async function venueInquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inquirySchema.safeParse({
    venueId: formData.get("venueId"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    message: formData.get("message"),
  });
  // Honeypot: real visitors never fill this hidden field.
  if (String(formData.get("company") ?? "") !== "") return { ok: true };
  if (!parsed.success) return { error: "invalid_input" };
  if (!(await allow(`inquiry:${await clientIp()}`, 5, 3600))) return { error: "rate_limited" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "not_configured" };
  }
  const { data: venue } = await admin.from("venues").select("id, name").eq("id", parsed.data.venueId).eq("is_published", true).maybeSingle();
  if (!venue) return { error: "not_found" };
  const { error } = await admin
    .from("venue_inquiries")
    .insert({ venue_id: venue.id, name: parsed.data.name, email: parsed.data.email, message: parsed.data.message });
  if (error) return { error: "generic" };
  await admin.rpc("notify_admins", { p_kind: "venue_inquiry", p_data: { venue: venue.name, name: parsed.data.name }, p_link: "/admin/salles" });
  return { ok: true };
}

// ---------------------------------------------------------------- admin

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const venueSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(2).max(120),
  category: z.enum(VENUE_CATEGORIES),
  description: z.string().trim().max(1200),
  address: nullable(200),
  postal_code: nullable(10),
  city: nullable(80),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  phone: nullable(30),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value))
    .transform((value) => value || null),
  facilities: z.string().max(600),
  partner_status: z.enum(["listed", "partner"]),
  claim_status: z.enum(["unclaimed", "claimed"]),
  is_published: z.boolean(),
});

/** Creates or updates a venue. Only admins pass the row level security check. */
export async function saveVenueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = venueSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    address: formData.get("address") ?? "",
    postal_code: formData.get("postal_code") ?? "",
    city: formData.get("city") ?? "",
    lat: String(formData.get("lat") ?? "").replace(",", "."),
    lng: String(formData.get("lng") ?? "").replace(",", "."),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    facilities: formData.get("facilities") ?? "",
    partner_status: formData.get("partner_status") === "on" ? "partner" : "listed",
    claim_status: formData.get("claim_status") === "on" ? "claimed" : "unclaimed",
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const supabase = await createClient();
  const { id, facilities, ...rest } = parsed.data;
  const row = {
    ...rest,
    facilities: facilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20),
  };

  if (id) {
    const { data, error } = await supabase.from("venues").update(row).eq("id", id).select("id").maybeSingle();
    if (error) return { error: toErrorCode(error) };
    if (!data) return { error: "forbidden" };
  } else {
    const base = slugify(`${row.name} ${row.city ?? ""}`) || "lieu";
    let slug = base;
    for (let attempt = 2; attempt < 30; attempt++) {
      const { data: taken } = await supabase.from("venues").select("id").eq("slug", slug).maybeSingle();
      if (!taken) break;
      slug = `${base}-${attempt}`;
    }
    const { error } = await supabase.from("venues").insert({ ...row, slug, source: "admin" });
    if (error) return { error: toErrorCode(error) };
  }
  revalidatePath("/admin/salles");
  revalidatePath("/salles");
  revalidatePath("/coachs");
  return { ok: true };
}

export async function deleteVenueAction(venueId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(venueId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("venues").delete().eq("id", venueId).select("id").maybeSingle();
  if (error) return fail(toErrorCode(error));
  if (!data) return fail("forbidden");
  revalidatePath("/admin/salles");
  revalidatePath("/salles");
  return ok();
}

export async function deleteInquiryAction(inquiryId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(inquiryId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("venue_inquiries").delete().eq("id", inquiryId);
  if (error) return fail(toErrorCode(error));
  revalidatePath("/admin/salles");
  return ok();
}
