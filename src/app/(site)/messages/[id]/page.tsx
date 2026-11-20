import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MessagesScreen } from "@/components/messages/messages-screen";
import { requireUser } from "@/lib/auth/session";
import { getConversation, listConversations } from "@/lib/data/messages";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.messages.title, robots: { index: false } };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  if (user.role === "coach") redirect(`/pro/messages/${id}`);
  const [{ t, locale }, active] = await Promise.all([getI18n(), getConversation(id, user.id)]);
  if (!active) notFound();
  const conversations = await listConversations(user.id);
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-4 md:px-8 md:py-8">
      <MessagesScreen
        basePath="/messages"
        conversations={conversations}
        active={active}
        userId={user.id}
        t={t}
        locale={locale}
        emptyText={t.account.messages.emptyText}
        heightClass="h-[calc(100dvh-64px-60px-32px-env(safe-area-inset-bottom))] md:h-[calc(100dvh-72px-64px)]"
      />
    </div>
  );
}
