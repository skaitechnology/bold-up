import Link from "next/link";
import { clsx } from "clsx";
import { MessageCircle } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/misc";
import type { ConversationView } from "@/lib/data/messages";
import { formatDayShort, formatTime, parisDateKey } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { mediaUrl } from "@/lib/media";

/** Inbox: one row per conversation, newest first, with unread counts. */
export function ConversationList({
  conversations,
  basePath,
  activeId,
  t,
  locale,
  emptyText,
}: {
  conversations: ConversationView[];
  basePath: string;
  activeId?: string;
  t: Dictionary;
  locale: Locale;
  emptyText: string;
}) {
  if (conversations.length === 0) {
    return <EmptyState icon={MessageCircle} title={t.account.messages.empty} text={emptyText} />;
  }
  const today = parisDateKey(new Date());
  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => {
        const when = conversation.lastMessageAt
          ? parisDateKey(conversation.lastMessageAt) === today
            ? formatTime(conversation.lastMessageAt, locale)
            : formatDayShort(conversation.lastMessageAt, locale)
          : "";
        return (
          <li key={conversation.id}>
            <Link
              href={`${basePath}/${conversation.id}`}
              className={clsx(
                "flex items-center gap-3.5 rounded-[22px] border p-3.5 transition",
                conversation.id === activeId ? "border-ink bg-paper" : "border-line bg-paper hover:border-line2 hover:shadow-card",
              )}
              data-testid="conversation"
            >
              <Avatar src={mediaUrl(conversation.otherPhotoPath)} name={conversation.otherName} size={48} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={clsx("truncate text-[15.5px] text-ink", conversation.unread ? "font-semibold" : "font-medium")}>{conversation.otherName}</span>
                  <span className="shrink-0 text-[12px] text-faint">{when}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-3">
                  <span className={clsx("truncate text-[13.5px]", conversation.unread ? "font-medium text-ink2" : "text-muted")}>
                    {conversation.lastMessagePreview ?? t.account.messages.noMessageYet}
                  </span>
                  {conversation.unread ? (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-paper">
                      {conversation.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
