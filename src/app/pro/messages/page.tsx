import type { Metadata } from "next";
import { MessagesScreen } from "@/components/messages/messages-screen";
import { PageHeader } from "@/components/ui/misc";
import { requireCoach } from "@/lib/auth/session";
import { listConversations } from "@/lib/data/messages";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.messages.title };
}

export default async function ProMessagesPage() {
  const user = await requireCoach("/pro/messages");
  const [{ t, locale }, conversations] = await Promise.all([getI18n(), listConversations(user.id)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t.account.messages.title} text={t.account.messages.textCoach} />
      <MessagesScreen
        basePath="/pro/messages"
        conversations={conversations}
        active={null}
        userId={user.id}
        t={t}
        locale={locale}
        emptyText={t.account.messages.emptyTextCoach}
        heightClass="lg:h-[calc(100dvh-240px)]"
      />
    </div>
  );
}
