import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ConversationView = {
  id: string;
  otherId: string;
  otherName: string;
  otherPhotoPath: string | null;
  otherSlug: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
};

/** Conversations the signed-in user takes part in (row level security: participants only). */
export async function listConversations(userId: string): Promise<ConversationView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, coach_id, customer_id, last_message_at, last_message_preview, created_at, coach_profiles(display_name, slug, photo_path)")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`listConversations: ${error.message}`);
  if (data.length === 0) return [];

  const customerIds = [...new Set(data.filter((row) => row.coach_id === userId).map((row) => row.customer_id))];
  const [{ data: cards }, { data: unreadRows }] = await Promise.all([
    customerIds.length ? supabase.from("profile_cards").select("id, full_name").in("id", customerIds) : Promise.resolve({ data: [] as { id: string | null; full_name: string | null }[] }),
    supabase.from("messages").select("conversation_id").neq("sender_id", userId).is("read_at", null),
  ]);
  const names = new Map((cards ?? []).map((card) => [card.id, card.full_name ?? ""]));
  const unread = new Map<string, number>();
  for (const row of unreadRows ?? []) unread.set(row.conversation_id, (unread.get(row.conversation_id) ?? 0) + 1);

  return data.map((row) => {
    const iAmCoach = row.coach_id === userId;
    return {
      id: row.id,
      otherId: iAmCoach ? row.customer_id : row.coach_id,
      otherName: iAmCoach ? (names.get(row.customer_id) ?? "") : (row.coach_profiles?.display_name ?? ""),
      otherPhotoPath: iAmCoach ? null : (row.coach_profiles?.photo_path ?? null),
      otherSlug: iAmCoach ? null : (row.coach_profiles?.slug ?? null),
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      unread: unread.get(row.id) ?? 0,
    };
  });
}

export async function getConversation(conversationId: string, userId: string) {
  const supabase = await createClient();
  const conversations = await listConversations(userId);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return null;
  // Opening the thread marks the other side's messages as read.
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  return { conversation, messages: messages ?? [] };
}
