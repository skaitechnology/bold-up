"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** Adds or removes a coach from the signed-in user's favourites. Returns the new state. */
export async function toggleFavoriteAction(coachId: string): Promise<ActionResult<{ favorite: boolean }>> {
  if (!z.uuid().safeParse(coachId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail("not_authenticated");

  const { data: existing } = await supabase
    .from("favorites")
    .select("coach_id")
    .eq("customer_id", userId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("customer_id", userId).eq("coach_id", coachId);
    if (error) return fail(toErrorCode(error));
    revalidatePath("/favoris");
    return ok({ favorite: false });
  }
  const { error } = await supabase.from("favorites").insert({ customer_id: userId, coach_id: coachId });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/favoris");
  return ok({ favorite: true });
}
