"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/actions/pro";
import { LEVELS } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const accountSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+().\s-]*$/)
    .transform((value) => value || null),
  city: optional(80),
  postal_code: optional(10),
  favorite_sports: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).max(10),
  level: z.union([z.literal(""), z.enum(LEVELS)]).transform((value) => value || null),
  goal: optional(300),
});

/** Updates the signed-in user's own profile. Role and e-mail are frozen by the database. */
export async function saveAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = accountSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    postal_code: formData.get("postal_code") ?? "",
    favorite_sports: formData.getAll("favorite_sports"),
    level: formData.get("level") ?? "",
    goal: formData.get("goal") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "not_authenticated" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return { error: toErrorCode(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** GDPR: records a deletion request. An admin completes it (see docs/PRODUCT_SPEC.md). */
export async function requestDeletionAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) return fail(toErrorCode(error));
  revalidatePath("/compte");
  return ok();
}
