import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessagesScreen } from "@/components/messages/messages-screen";
import { requireCoach } from "@/lib/auth/session";
import { getConversation, listConversations } from "@/lib/data/messages";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.messages.title };
}

export default async function ProConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCoach(`/pro/messages/${id}`);
  const [{ t, locale }, active] = await Promise.all([getI18n(), getConversation(id, user.id)]);
  if (!active) notFound();
  const conversations = await listConversations(user.id);
  return (
    <MessagesScreen
      basePath="/pro/messages"
      conversations={conversations}
      active={active}
      userId={user.id}
      t={t}
      locale={locale}
      emptyText={t.account.messages.emptyTextCoach}
      heightClass="h-[calc(100dvh-64px-92px-24px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-104px)]"
    />
  );
}
