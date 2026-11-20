"use client";

import { clsx } from "clsx";
import { ArrowUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { markConversationReadAction, sendMessageAction } from "@/lib/actions/messages";
import { formatDayLong, formatTime, parisDateKey } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export type ThreadMessage = { id: number; sender_id: string; body: string; created_at: string };

/**
 * A conversation between one coach and one customer.
 * Messages are stored in the database; new ones arrive through Supabase Realtime, with a
 * periodic refresh as a safety net. Nothing is generated or answered automatically.
 */
export function Thread({ conversationId, userId, initial }: { conversationId: string; userId: string; initial: ThreadMessage[] }) {
  const { t, locale } = useI18n();
  const m = t.account.messages;
  const router = useRouter();
  const [extra, setExtra] = useState<ThreadMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, startSend] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const byId = new Map<number, ThreadMessage>();
    for (const message of [...initial, ...extra]) byId.set(message.id, message);
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }, [initial, extra]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const message = payload.new as ThreadMessage;
          setExtra((current) => [...current, message]);
          if (message.sender_id !== userId) void markConversationReadAction(conversationId);
        },
      )
      .subscribe();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 12000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId, router]);

  const send = () => {
    const body = text.trim();
    if (!body || sending) return;
    startSend(async () => {
      const result = await sendMessageAction(conversationId, body);
      if (!result.ok) {
        toast.error(t.common.errors[result.error]);
        return;
      }
      setText("");
      setExtra((current) => [...current, { id: result.data.id, sender_id: userId, body, created_at: result.data.created_at }]);
    });
  };

  const rows = messages.map((message, index) => {
    const previous = messages[index - 1];
    return { message, showDay: !previous || parisDateKey(previous.created_at) !== parisDateKey(message.created_at) };
  });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6" data-testid="thread">
        <p className="mb-5 flex items-center justify-center gap-1.5 text-[12px] text-faint">
          <Lock size={12} aria-hidden />
          {m.privacy}
        </p>
        {messages.length === 0 ? <p className="py-10 text-center text-[14.5px] text-muted">{m.start}</p> : null}
        <ul className="space-y-1.5">
          {rows.map(({ message, showDay }) => {
            const mine = message.sender_id === userId;
            return (
              <li key={message.id}>
                {showDay ? <p className="my-4 text-center text-[12px] capitalize text-faint">{formatDayLong(message.created_at, locale)}</p> : null}
                <div className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[82%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[68%]",
                      mine ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md bg-sand2 text-ink",
                    )}
                    data-testid={mine ? "message-mine" : "message-theirs"}
                  >
                    {message.body}
                    <span className={clsx("ml-2 inline-block align-bottom text-[10.5px] tabular", mine ? "text-white/55" : "text-faint")}>
                      {formatTime(message.created_at, locale)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-line bg-paper px-4 py-3 md:px-6"
      >
        <label className="sr-only" htmlFor="message-input">
          {m.placeholder}
        </label>
        <textarea
          id="message-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={m.placeholder}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-line2 bg-paper px-4 py-3 text-[16px] text-ink outline-none focus:border-ink md:text-[15px]"
          data-testid="message-input"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label={m.send}
          className="press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-35"
          data-testid="message-send"
        >
          <ArrowUp size={20} aria-hidden />
        </button>
      </form>
    </div>
  );
}
