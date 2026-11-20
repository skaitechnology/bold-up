import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessagesScreen } from "@/components/messages/messages-screen";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { listConversations } from "@/lib/data/messages";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.messages.title, robots: { index: false } };
}

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  if (user.role === "coach") redirect("/pro/messages");
  const [{ t, locale }, conversations] = await Promise.all([getI18n(), listConversations(user.id)]);
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-8 md:py-12">
      <PageHeader title={t.account.messages.title} text={t.account.messages.text} />
      <div className="mt-6">
        <MessagesScreen
          basePath="/messages"
          conversations={conversations}
          active={null}
          userId={user.id}
          t={t}
          locale={locale}
          emptyText={t.account.messages.emptyText}
          heightClass="lg:h-[calc(100dvh-300px)]"
        />
      </div>
    </div>
  );
}
