import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import type { ConversationView } from "@/lib/data/messages";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { mediaUrl } from "@/lib/media";
import { ConversationList } from "./conversation-list";
import { Thread, type ThreadMessage } from "./thread";

/**
 * Inbox + open conversation. Two panes on desktop; on phones the list and the thread
 * are separate screens. Shared by the customer area and the coach area.
 */
export function MessagesScreen({
  basePath,
  conversations,
  active,
  userId,
  t,
  locale,
  emptyText,
  heightClass,
}: {
  basePath: string;
  conversations: ConversationView[];
  active: { conversation: ConversationView; messages: ThreadMessage[] } | null;
  userId: string;
  t: Dictionary;
  locale: Locale;
  emptyText: string;
  heightClass: string;
}) {
  const m = t.account.messages;
  return (
    <div className={`grid gap-5 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] ${heightClass}`}>
      <div className={active ? "hidden min-h-0 overflow-y-auto lg:block" : "min-h-0 overflow-y-auto"}>
        <ConversationList conversations={conversations} basePath={basePath} activeId={active?.conversation.id} t={t} locale={locale} emptyText={emptyText} />
      </div>
      {active ? (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-line bg-paper">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <Link href={basePath} aria-label={m.back} className="press -ml-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-sand lg:hidden">
              <ArrowLeft size={19} aria-hidden />
            </Link>
            <Avatar src={mediaUrl(active.conversation.otherPhotoPath)} name={active.conversation.otherName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15.5px] font-semibold text-ink" data-testid="thread-with">
                {active.conversation.otherName}
              </p>
            </div>
            {active.conversation.otherSlug ? (
              <Link
                href={`/coach/${active.conversation.otherSlug}`}
                className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink hover:bg-sand"
              >
                {m.viewProfile}
                <ExternalLink size={13} aria-hidden />
              </Link>
            ) : null}
          </header>
          <Thread conversationId={active.conversation.id} userId={userId} initial={active.messages} />
        </section>
      ) : (
        <div className="hidden items-center justify-center rounded-[24px] border border-dashed border-line2 text-[14.5px] text-muted lg:flex">
          {conversations.length ? m.start : emptyText}
        </div>
      )}
    </div>
  );
}
