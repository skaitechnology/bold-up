"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/actions/pro";
import { EVENT_KINDS, EVENT_LEVELS } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Events are written with the caller's own session: row level security lets only admins
// insert, update or delete, so there is no separate role check to forget here.

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const eventSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    name: z.string().trim().min(2).max(140),
    kind: z.enum(EVENT_KINDS),
    sport_slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]*$/)
      .max(40)
      .transform((value) => value || null),
    summary: z.string().trim().max(200),
    description: z.string().trim().max(2000),
    starts_on: dateKey,
    ends_on: z.union([z.literal(""), dateKey]).transform((value) => value || null),
    start_time: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]).transform((value) => value || null),
    place_name: nullable(140),
    address: nullable(200),
    postal_code: nullable(10),
    city: nullable(80),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    formats: z.string().max(400),
    level: z.enum(EVENT_LEVELS),
    // euros in the form, cents in the database
    price: z.union([z.literal(""), z.coerce.number().min(0).max(10000)]),
    is_free: z.boolean(),
    organizer: nullable(140),
    website: z
      .string()
      .trim()
      .max(200)
      .refine((value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value))
      .transform((value) => value || null),
    is_published: z.boolean(),
  })
  .refine((event) => !event.ends_on || event.ends_on >= event.starts_on);

function revalidateEvents(slug?: string) {
  for (const path of ["/admin/evenements", "/evenements", "/"]) revalidatePath(path);
  if (slug) revalidatePath(`/evenement/${slug}`);
}

/** Creates or updates an event. Only admins pass the row level security check. */
export async function saveEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const text = (name: string) => String(formData.get(name) ?? "");
  const parsed = eventSchema.safeParse({
    id: text("id"),
    name: text("name"),
    kind: text("kind"),
    sport_slug: text("sport_slug"),
    summary: text("summary"),
    description: text("description"),
    starts_on: text("starts_on"),
    ends_on: text("ends_on"),
    start_time: text("start_time").slice(0, 5),
    place_name: text("place_name"),
    address: text("address"),
    postal_code: text("postal_code"),
    city: text("city"),
    lat: text("lat").replace(",", "."),
    lng: text("lng").replace(",", "."),
    formats: text("formats"),
    level: text("level"),
    price: text("price").trim().replace(",", "."),
    is_free: formData.get("is_free") === "on",
    organizer: text("organizer"),
    website: text("website"),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };

  const { id, formats, price, ...rest } = parsed.data;
  const row = {
    ...rest,
    // a one-day event has no end date
    ends_on: rest.ends_on && rest.ends_on !== rest.starts_on ? rest.ends_on : null,
    formats: formats
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
    price_from_cents: rest.is_free || price === "" ? null : Math.round(price * 100),
  };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("events").update(row).eq("id", id).select("slug").maybeSingle();
    if (error) return { error: toErrorCode(error) };
    if (!data) return { error: "forbidden" };
    revalidateEvents(data.slug);
  } else {
    const base = slugify(`${row.name} ${row.city ?? ""}`) || "evenement";
    let slug = base;
    for (let attempt = 2; attempt < 30; attempt++) {
      const { data: taken } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
      if (!taken) break;
      slug = `${base}-${attempt}`;
    }
    const { error } = await supabase.from("events").insert({ ...row, slug, source: "admin" });
    if (error) return { error: toErrorCode(error) };
    revalidateEvents(slug);
  }
  return { ok: true };
}

/** Shows or hides an event on the public site without touching its content. */
export async function setEventPublishedAction(eventId: string, published: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(eventId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update({ is_published: published }).eq("id", eventId).select("slug").maybeSingle();
  if (error) return fail(toErrorCode(error));
  if (!data) return fail("forbidden");
  revalidateEvents(data.slug);
  return ok();
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(eventId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("slug").maybeSingle();
  if (error) return fail(toErrorCode(error));
  if (!data) return fail("forbidden");
  revalidateEvents(data.slug);
  return ok();
}
