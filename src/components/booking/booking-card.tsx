"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Check, Clock, MapPin, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { respondBookingAction } from "@/lib/actions/bookings";
import { contactCoachAction } from "@/lib/actions/messages";
import { bookingAnchor } from "@/lib/calendar";
import type { BookingView } from "@/lib/data/bookings";
import { bookingActions, type BookingAction, type BookingStatus } from "@/lib/domain";
import { TIME_ZONE, formatDateTimeCompact, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/config";

export const BOOKING_TONES: Record<BookingStatus, BadgeTone> = {
  requested: "warn",
  accepted: "success",
  declined: "neutral",
  cancelled: "neutral",
  completed: "ink",
};

/** One booking, for the coach or for the customer, with the actions that role may take. */
export function BookingCard({ booking, as }: { booking: BookingView; as: "coach" | "customer" }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<BookingAction | null>(null);
  const r = t.pro.requests;
  const cb = t.account.bookings;

  const actions = bookingActions(booking, as);
  const date = new Date(booking.starts_at);
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, ...options }).format(date);
  const past = new Date(booking.ends_at) <= new Date();
  const dimmed = booking.status === "declined" || booking.status === "cancelled";

  const run = (action: BookingAction) => {
    startTransition(async () => {
      const result = await respondBookingAction(booking.id, action);
      setConfirming(null);
      if (!result.ok) {
        toast.error(t.common.errors[result.error]);
        router.refresh();
        return;
      }
      toast.success({ accept: r.accepted, decline: r.declined, cancel: r.cancelled, complete: r.completed }[action]);
      router.refresh();
    });
  };

  const labels: Record<BookingAction, string> = {
    accept: r.accept,
    decline: r.decline,
    cancel: as === "coach" ? r.cancel : booking.status === "requested" ? cb.cancelRequest : cb.cancel,
    complete: r.complete,
  };
  const needsConfirm = (action: BookingAction) => action === "decline" || action === "cancel";

  return (
    <article
      id={bookingAnchor(booking.id)}
      className={clsx(
        "scroll-mt-28 rounded-[24px] border border-line bg-paper p-4 transition-shadow duration-300 hover:shadow-card md:p-5",
        // reached from the calendar: the card it points to stands out
        "target:border-flame target:shadow-lift target:ring-2 target:ring-flame/35",
        dimmed && "opacity-70",
      )}
      data-testid="booking-card"
      data-status={booking.status}
    >
      <div className="flex gap-4">
        <div
          className={clsx(
            "flex h-[76px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl",
            past || dimmed ? "bg-sand text-muted" : booking.status === "accepted" ? "bg-bold text-white" : "bg-ink text-paper",
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{part({ weekday: "short" }).replace(".", "")}</span>
          <span className="text-[24px] font-semibold leading-none tabular">{part({ day: "numeric" })}</span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide opacity-80">{part({ month: "short" }).replace(".", "")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16.5px] font-semibold tracking-tight text-ink">{booking.service_name}</h3>
            <Badge tone={BOOKING_TONES[booking.status]} size="sm">
              {booking.status === "requested" && past ? r.expired : t.common.bookingStatus[booking.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-[14.5px] text-ink2">
            {as === "coach" ? (
              <span className="font-medium" data-testid="booking-customer">
                {booking.customer.name}
              </span>
            ) : (
              <>
                {cb.with}{" "}
                <Link href={`/coach/${booking.coach.slug}`} className="font-medium underline-offset-4 hover:underline">
                  {booking.coach.name}
                </Link>
              </>
            )}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-muted">
            <li className="inline-flex items-center gap-1.5 tabular">
              <Clock size={14} aria-hidden />
              {formatTime(booking.starts_at, locale)} – {formatTime(booking.ends_at, locale)} · {formatDuration(booking.duration_min)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden />
              {t.common.locations[booking.location_kind]}
            </li>
            <li className="font-medium text-ink2">{formatPrice(booking.price_cents, locale)}</li>
          </ul>
        </div>
      </div>

      {booking.message ? (
        <blockquote className="mt-4 rounded-2xl bg-sand px-4 py-3 text-[14px] leading-relaxed text-ink2">
          <span className="mb-1 block text-[12px] font-semibold text-muted">{as === "coach" ? r.customerMessage : cb.yourMessage}</span>
          {booking.message}
        </blockquote>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-faint">{r.receivedOn(formatDateTimeCompact(booking.created_at, locale))}</p>
        <div className="flex flex-wrap items-center gap-2">
          {as === "customer" && booking.coach.slug ? (
            <form action={contactCoachAction}>
              <input type="hidden" name="coachId" value={booking.coach.id} />
              <input type="hidden" name="back" value="/reservations" />
              <Button type="submit" variant="ghost" size="sm" icon={MessageCircle}>
                {cb.message}
              </Button>
            </form>
          ) : null}
          {confirming ? (
            <>
              <span className="text-[13.5px] font-medium text-ink">{confirming === "decline" ? r.declineConfirm : as === "coach" ? r.cancelConfirm : cb.cancelConfirm}</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={pending}>
                {as === "coach" ? r.keep : cb.keep}
              </Button>
              <Button variant="danger" size="sm" onClick={() => run(confirming)} loading={pending} data-testid="booking-confirm">
                {t.common.actions.confirm}
              </Button>
            </>
          ) : (
            actions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === "accept" ? "accent" : action === "complete" ? "primary" : "secondary"}
                icon={action === "accept" || action === "complete" ? Check : X}
                loading={pending && !needsConfirm(action)}
                onClick={() => (needsConfirm(action) ? setConfirming(action) : run(action))}
                data-testid={`booking-${action}`}
              >
                {labels[action]}
              </Button>
            ))
          )}
        </div>
      </div>
    </article>
  );
}
