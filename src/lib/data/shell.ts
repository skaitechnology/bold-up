import "server-only";
import { cache } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** What every page chrome needs: who is signed in and how much is unread. */
export const getShellData = cache(async () => {
  const user = await getSessionUser();
  if (!user) return { user: null, unreadNotifications: 0, unreadMessages: 0 };
  const supabase = await createClient();
  const [notifications, messages] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", user.id).is("read_at", null),
  ]);
  return { user, unreadNotifications: notifications.count ?? 0, unreadMessages: messages.count ?? 0 };
});
