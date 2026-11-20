"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** Opens (or reuses) the conversation between the signed-in customer and a coach. */
export async function contactCoachAction(formData: FormData) {
  const coachId = String(formData.get("coachId") ?? "");
  const back = String(formData.get("back") ?? "/");
  if (!z.uuid().safeParse(coachId).success) redirect("/");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/connexion?next=${encodeURIComponent(back)}`);
  const { data, error } = await supabase.rpc("start_conversation", { p_coach_id: coachId });
  if (error || !data) redirect(back);
  redirect(`/messages/${data}`);
}

const sendSchema = z.object({ conversationId: z.uuid(), body: z.string().trim().min(1).max(2000) });

export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult<{ id: number; created_at: string }>> {
  const parsed = sendSchema.safeParse({ conversationId, body });
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail("not_authenticated");

  // Row level security only lets a participant insert, and only as themselves.
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.conversationId, sender_id: userId, body: parsed.data.body })
    .select("id, created_at")
    .single();
  if (error || !data) return fail(toErrorCode(error));
  revalidatePath("/messages");
  revalidatePath("/pro/messages");
  return ok(data);
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  if (!z.uuid().safeParse(conversationId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

export async function markNotificationsReadAction(): Promise<void> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  revalidatePath("/notifications");
}
