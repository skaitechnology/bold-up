"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { CalendarCheck, Check, Clock, Info, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { getOpenSlotsAction, requestBookingAction } from "@/lib/actions/bookings";
import type { LocationKind } from "@/lib/domain";
import { addDaysToKey, formatDateKey, formatDayLong, formatDuration, formatPrice, formatTime, parisDateKey } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/config";

export type BookableService = { id: string; name: string; description: string; duration_min: number; price_cents: number };

type Props = {
  coach: { id: string; slug: string; displayName: string; acceptingBookings: boolean };
  services: BookableService[];
  locations: LocationKind[];
  signedIn: boolean;
  isOwn: boolean;
  /** Bookable only when the profile is approved and published. */
  bookable: boolean;
  initialServiceId?: string;
};

type Draft = { serviceId: string; startsAt: string | null; location: LocationKind; message: string };

const DAYS_SHOWN = 21;

/**
 * The whole booking request, in one panel: service, day, time, place, message.
 * Slots come from the database and the request is stored there; nothing is simulated.
 */
export function BookingPanel({ coach, services, locations, signedIn, isOwn, bookable, initialServiceId }: Props) {
  const { t, locale } = useI18n();
  const b = t.site.booking;
  const router = useRouter();
  const storageKey = `bu.booking.${coach.id}`;

  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id ?? "");
  // Slots are kept with the request they answer, so a stale answer is never shown.
  const [loaded, setLoaded] = useState<{ key: string; slots: string[]; failed: boolean } | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationKind>(locations[0] ?? "to_agree");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const restored = useRef<Draft | null>(null);

  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const duration = service?.duration_min ?? 0;
  const requestKey = `${coach.id}:${serviceId}:${duration}`;
  const slots = loaded?.key === requestKey ? loaded.slots : null;
  const slotsError = loaded?.key === requestKey && loaded.failed;

  // A visitor who had to sign in comes back to the choices they had made.
  useEffect(() => {
    let draft: Draft;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      sessionStorage.removeItem(storageKey);
      draft = JSON.parse(raw) as Draft;
    } catch {
      return; // nothing to restore
    }
    if (!services.some((item) => item.id === draft.serviceId)) return;
    restored.current = draft;
    const frame = requestAnimationFrame(() => {
      setServiceId(draft.serviceId);
      setLocation(draft.location);
      setMessage(draft.message);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bookable || !service) return;
    let cancelled = false;
    getOpenSlotsAction(coach.id, duration).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoaded({ key: requestKey, slots: [], failed: true });
        return;
      }
      setLoaded({ key: requestKey, slots: result.data, failed: false });
      const wanted = restored.current?.startsAt;
      restored.current = null;
      if (wanted && result.data.includes(wanted)) {
        setDay(parisDateKey(wanted));
        setStartsAt(wanted);
      } else {
        setStartsAt(null);
        setDay(result.data[0] ? parisDateKey(result.data[0]) : null);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.id, duration, serviceId, bookable]);

  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = parisDateKey(slot);
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);

  const days = useMemo(() => {
    const today = parisDateKey(new Date());
    return Array.from({ length: DAYS_SHOWN }, (_, index) => addDaysToKey(today, index));
  }, []);

  if (sent) {
    return (
      <div className="flex flex-col items-center px-2 py-6 text-center" data-testid="booking-sent">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-paper">
          <Check size={28} aria-hidden />
        </span>
        <h3 className="display mt-5 text-[24px] text-ink">{b.sentTitle}</h3>
        <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-muted">{b.sentText(coach.displayName)}</p>
        <ButtonLink href="/reservations" className="mt-6" icon={CalendarCheck}>
          {b.seeBookings}
        </ButtonLink>
      </div>
    );
  }

  if (isOwn) {
    return (
      <div className="rounded-2xl bg-sand px-4 py-5 text-center">
        <p className="text-[14.5px] text-muted">{t.site.coach.ownProfile}</p>
        <ButtonLink href="/pro/profil" variant="secondary" className="mt-4">
          {t.site.coach.editProfile}
        </ButtonLink>
      </div>
    );
  }

  if (!bookable || !coach.acceptingBookings || services.length === 0) {
    return <p className="rounded-2xl bg-sand px-4 py-5 text-center text-[14.5px] text-muted">{t.site.coach.notAccepting}</p>;
  }

  const submit = () => {
    if (!service || !startsAt) return;
    setError(null);
    if (!signedIn) {
      const draft: Draft = { serviceId: service.id, startsAt, location, message };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // private browsing: the visitor will simply choose again
      }
      router.push(`/connexion?next=${encodeURIComponent(`/coach/${coach.slug}?reserver=1`)}`);
      return;
    }
    startSubmit(async () => {
      const result = await requestBookingAction({ serviceId: service.id, startsAt, locationKind: location, message });
      if (!result.ok) {
        setError(t.common.errors[result.error]);
        if (result.error === "slot_unavailable") {
          setStartsAt(null);
          const refreshed = await getOpenSlotsAction(coach.id, duration);
          if (refreshed.ok) setLoaded({ key: requestKey, slots: refreshed.data, failed: false });
        }
        return;
      }
      setSent(true);
      router.refresh();
    });
  };

  const today = days[0];
  const dayLabel = (key: string) => {
    if (key === today) return b.today;
    if (key === days[1]) return b.tomorrow;
    return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
  };
  const times = day ? (byDay.get(day) ?? []) : [];

  return (
    <div className="space-y-6" data-testid="booking-panel">
      {/* 1 — service */}
      <fieldset>
        <legend className="mb-2.5 text-[13px] font-semibold text-ink">{b.chooseService}</legend>
        <div className="space-y-2">
          {services.map((item) => {
            const active = item.id === service?.id;
            return (
              <label
                key={item.id}
                className={clsx(
                  "press flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
                  active ? "border-ink bg-ink text-paper" : "border-line2 bg-paper hover:border-ink",
                )}
              >
                <input
                  type="radio"
                  name="service"
                  value={item.id}
                  checked={active}
                  onChange={() => setServiceId(item.id)}
                  className="sr-only"
                  data-testid="service-option"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{item.name}</span>
                  <span className={clsx("mt-0.5 flex items-center gap-1.5 text-[12.5px]", active ? "text-white/70" : "text-muted")}>
                    <Clock size={12} aria-hidden />
                    {formatDuration(item.duration_min)}
                  </span>
                </span>
                <span className="shrink-0 text-[15.5px] font-semibold tabular">{formatPrice(item.price_cents, locale)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 2 — day and time */}
      <div>
        <div className="mb-2.5 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-ink">{b.chooseDay}</p>
          <p className="text-[11.5px] text-faint">{b.timezone}</p>
        </div>
        {slots === null ? (
          <div className="flex h-[76px] items-center gap-2 text-[13.5px] text-muted">
            <LoaderCircle size={16} className="animate-spin" aria-hidden />
            {b.loadingSlots}
          </div>
        ) : slots.length === 0 ? (
          <p className="rounded-2xl bg-sand px-4 py-4 text-[14px] text-muted">{slotsError ? t.common.errors.generic : b.noSlots}</p>
        ) : (
          <>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={b.chooseDay}>
              {days.map((key) => {
                const available = byDay.has(key);
                const active = key === day;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    aria-pressed={active}
                    aria-label={formatDateKey(key, locale)}
                    onClick={() => {
                      setDay(key);
                      setStartsAt(null);
                    }}
                    data-testid={available ? "day-available" : undefined}
                    className={clsx(
                      "press flex h-[68px] w-[58px] shrink-0 flex-col items-center justify-center rounded-2xl border text-center",
                      active
                        ? "border-ink bg-ink text-paper"
                        : available
                          ? "border-line2 bg-paper text-ink hover:border-ink"
                          : "border-transparent bg-sand text-faint",
                    )}
                  >
                    <span className="text-[11px] font-medium capitalize-first">{dayLabel(key).replace(".", "")}</span>
                    <span className="mt-0.5 text-[18px] font-semibold tabular">{Number(key.slice(8))}</span>
                  </button>
                );
              })}
            </div>
            <p className="mb-2.5 mt-5 text-[13px] font-semibold text-ink">
              {b.chooseTime}
              {day ? <span className="font-normal text-muted"> · {formatDateKey(day, locale)}</span> : null}
            </p>
            {times.length === 0 ? (
              <p className="text-[13.5px] text-muted">{b.noSlotsDay}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2" role="group" aria-label={b.chooseTime}>
                {times.map((slot) => {
                  const active = slot === startsAt;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStartsAt(slot)}
                      data-testid="slot"
                      className={clsx(
                        "press h-11 rounded-xl border text-[14px] font-semibold tabular",
                        active ? "border-ink bg-ink text-paper" : "border-line2 bg-paper text-ink hover:border-ink",
                      )}
                    >
                      {formatTime(slot, locale)}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 3 — place and message */}
      {startsAt ? (
        <div className="animate-fade-up space-y-5">
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold text-ink">{b.where}</legend>
            <div className="flex flex-wrap gap-2">
              {locations.map((kind) => (
                <label key={kind} className="press cursor-pointer">
                  <input
                    type="radio"
                    name="location"
                    value={kind}
                    checked={location === kind}
                    onChange={() => setLocation(kind)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-10 items-center rounded-full border border-line2 px-4 text-[13.5px] font-medium text-ink2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                    {t.common.locations[kind]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-ink">{b.messageLabel}</span>
              <span className="text-[12px] text-faint">{t.common.optional}</span>
            </span>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={600}
              rows={3}
              placeholder={b.messagePlaceholder}
              name="message"
            />
          </label>

          <div className="rounded-2xl bg-sand px-4 py-3.5">
            <p className="text-[14.5px] font-semibold text-ink">
              {service?.name} · {formatDuration(duration)}
            </p>
            <p className="mt-0.5 text-[14px] capitalize-first text-ink2">
              {formatDayLong(startsAt, locale)} {t.common.at} {formatTime(startsAt, locale)}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
              {b.priceNote}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger">
          {error}
        </p>
      ) : null}

      <Button size="lg" block onClick={submit} disabled={!startsAt} loading={submitting} data-testid="booking-submit">
        {b.submit}
        {service ? <span className="font-normal opacity-70">· {formatPrice(service.price_cents, locale)}</span> : null}
      </Button>
      {!signedIn ? (
        <p className="-mt-3 text-center text-[12.5px] text-muted">
          {b.loginToBook} ·{" "}
          <Link href={`/connexion?next=${encodeURIComponent(`/coach/${coach.slug}`)}`} className="font-semibold text-ink underline underline-offset-2">
            {t.common.nav.login}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
