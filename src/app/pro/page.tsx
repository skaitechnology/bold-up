import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  Inbox,
  Lock,
  MessageSquareWarning,
  PencilLine,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { BookingCard } from "@/components/booking/booking-card";
import { ShareButton } from "@/components/coach/share-button";
import { SubmitProfileButton, VisibilityToggle } from "@/components/pro/dashboard-actions";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, ProgressRing } from "@/components/ui/misc";
import { requireCoach } from "@/lib/auth/session";
import { listBookings } from "@/lib/data/bookings";
import { getChecklist, getOwnCoach } from "@/lib/data/pro";
import {
  CHECKLIST_KEYS,
  CHECKLIST_LINKS,
  canSubmitProfile,
  completionPercent,
  isChecklistComplete,
  nextChecklistStep,
  type VerificationStatus,
} from "@/lib/domain";
import { siteUrl } from "@/lib/env";
import { firstName, formatDayLong, formatDayShort, formatDuration, formatTime, parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

const STATUS_TONES: Record<VerificationStatus, BadgeTone> = {
  draft: "glass",
  awaiting_review: "glass",
  changes_requested: "warn",
  approved: "gold",
  rejected: "danger",
  suspended: "danger",
};

export default async function ProDashboardPage() {
  const user = await requireCoach();
  const [{ t, locale }, coach, checklist, bookings] = await Promise.all([
    getI18n(),
    getOwnCoach(user.id),
    getChecklist(user.id),
    listBookings("coach", user.id),
  ]);
  if (!coach) return null;

  const d = t.pro.dashboard;
  const status = coach.verification_status;
  const percent = completionPercent(checklist);
  const complete = isChecklistComplete(checklist);
  const nextStep = nextChecklistStep(checklist);
  const canSubmit = canSubmitProfile(status);
  const name = firstName(coach.display_name || user.fullName);
  const firstVisit = status === "draft" && !coach.submitted_at;

  const now = new Date();
  const todayKey = parisDateKey(now);
  const pending = bookings.filter((booking) => booking.status === "requested" && new Date(booking.starts_at) > now);
  const upcoming = bookings.filter((booking) => booking.status === "accepted" && new Date(booking.ends_at) > now);
  const today = upcoming.filter((booking) => parisDateKey(booking.starts_at) === todayKey);
  const completed = bookings.filter((booking) => booking.status === "completed").length;

  const copy =
    status === "approved"
      ? coach.is_published
        ? d.status.approved
        : d.status.hidden
      : status === "draft"
        ? complete
          ? d.status.ready
          : { title: d.status.draft.title, text: d.status.draft.text(percent) }
        : d.status[status];
  const systemNote = coach.review_note && coach.review_note in d.systemNotes ? d.systemNotes[coach.review_note as keyof typeof d.systemNotes] : coach.review_note;
  const publicUrl = `${siteUrl()}/coach/${coach.slug}`;

  const stats: { label: string; value: string; icon: LucideIcon; href: string }[] = [
    { label: d.stats.pending, value: String(pending.length), icon: Inbox, href: "/pro/demandes" },
    { label: d.stats.upcoming, value: String(upcoming.length), icon: CalendarDays, href: "/pro/agenda" },
    { label: d.stats.completed, value: String(completed), icon: Check, href: "/pro/demandes?vue=historique" },
    { label: d.stats.completion, value: `${percent} %`, icon: FileCheck2, href: "/pro/profil" },
  ];
  const quick: { label: string; href: string; icon: LucideIcon }[] = [
    { label: d.quick.editProfile, href: "/pro/profil", icon: PencilLine },
    { label: d.quick.documents, href: "/pro/documents", icon: FileCheck2 },
    { label: d.quick.availability, href: "/pro/agenda?vue=disponibilites", icon: Clock },
    { label: d.quick.publicProfile, href: `/coach/${coach.slug}`, icon: ExternalLink },
    { label: d.quick.requests, href: "/pro/demandes", icon: Inbox },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <header>
        <h1 className="display text-[30px] text-ink md:text-[42px]" data-testid="pro-greeting">
          {firstVisit ? d.welcome(name) : d.hello(name)}
        </h1>
        <p className="mt-2 text-[15px] capitalize-first text-muted">{d.today(formatDayLong(now, locale))}</p>
      </header>

      {/* ------------------------------------------------ status */}
      <section className="on-dark relative overflow-hidden rounded-[28px] bg-ink p-6 text-paper md:p-9" data-testid="status-card" data-status={status}>
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 max-w-xl">
            <Badge tone={STATUS_TONES[status]} icon={status === "approved" ? ShieldCheck : undefined}>
              {t.common.verificationStatus[status]}
            </Badge>
            <h2 className="display mt-4 text-[26px] md:text-[34px]">{copy.title}</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/75" data-testid="status-text">
              {copy.text}
            </p>

            {systemNote && status !== "approved" ? (
              <div className="mt-5 flex gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-[14px] leading-relaxed">
                <MessageSquareWarning size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                <div>
                  <p className="font-semibold">{d.reviewNote}</p>
                  <p className="mt-0.5 text-white/80" data-testid="review-note">
                    {systemNote}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {canSubmit && complete ? (
                <SubmitProfileButton label={status === "draft" ? d.submit : d.resubmit} variant="inverse" />
              ) : canSubmit && nextStep ? (
                <ButtonLink href={CHECKLIST_LINKS[nextStep]} variant="inverse" size="lg" iconRight={ArrowRight} data-testid="next-step">
                  {d.checklist[nextStep]}
                </ButtonLink>
              ) : status === "approved" ? (
                <>
                  <ButtonLink href={`/coach/${coach.slug}`} variant="inverse" size="lg" iconRight={ExternalLink}>
                    {t.pro.nav.publicProfile}
                  </ButtonLink>
                </>
              ) : null}
            </div>
          </div>

          {status !== "approved" ? (
            <div className="flex shrink-0 items-center gap-4 md:flex-col md:gap-3">
              <ProgressRing value={percent} size={132} stroke={10}>
                <span className="text-[30px] font-semibold tabular" data-testid="completion-percent">
                  {percent}
                  <span className="text-[16px] text-white/60"> %</span>
                </span>
              </ProgressRing>
              <p className="text-[13px] text-white/60">{d.completion}</p>
            </div>
          ) : null}
        </div>

        {status === "approved" ? (
          <div className="relative mt-8 grid gap-4 border-t border-white/12 pt-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">{d.shareTitle}</p>
              <p className="mt-1 truncate text-[13.5px] text-white/60" data-testid="public-url">
                {publicUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <ShareButton url={publicUrl} title={coach.display_name} variant="full" />
          </div>
        ) : null}
      </section>

      {status === "approved" ? (
        <Card className="px-5 py-4">
          <VisibilityToggle published={coach.is_published} />
        </Card>
      ) : null}

      {/* ------------------------------------------------ stats (real counts) */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link href={stat.href} className="press block rounded-[22px] border border-line bg-paper p-4 hover:border-line2 md:p-5">
              <stat.icon size={18} aria-hidden className="text-muted" />
              <p className="mt-3 text-[30px] font-semibold leading-none tabular text-ink">{stat.value}</p>
              <p className="mt-1.5 text-[13px] text-muted">{stat.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-6 md:space-y-8">
          {/* requests */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">{d.requestsTitle}</h2>
              {pending.length ? (
                <Link href="/pro/demandes" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-ink underline-offset-4 hover:underline">
                  {t.common.actions.seeAll} <ChevronRight size={15} aria-hidden />
                </Link>
              ) : null}
            </div>
            {status !== "approved" ? (
              <p className="flex items-center gap-2.5 rounded-[22px] border border-dashed border-line2 bg-paper/60 px-5 py-6 text-[14.5px] text-muted">
                <Lock size={17} aria-hidden className="shrink-0" />
                {d.bookingsLocked}
              </p>
            ) : pending.length === 0 ? (
              <p className="rounded-[22px] border border-dashed border-line2 bg-paper/60 px-5 py-6 text-[14.5px] text-muted">{d.noRequests}</p>
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 3).map((booking) => (
                  <BookingCard key={booking.id} booking={booking} as="coach" />
                ))}
              </div>
            )}
          </section>

          {/* sessions */}
          <section>
            <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-ink">{today.length ? d.todayTitle : d.upcomingTitle}</h2>
            {upcoming.length === 0 ? (
              <p className="rounded-[22px] border border-dashed border-line2 bg-paper/60 px-5 py-6 text-[14.5px] text-muted">{d.noUpcoming}</p>
            ) : (
              <ul className="overflow-hidden rounded-[22px] border border-line bg-paper">
                {(today.length ? today : upcoming.slice(0, 5)).map((booking) => (
                  <li key={booking.id} className="flex items-center gap-4 border-t border-line px-5 py-4 first:border-t-0">
                    <div className="w-[92px] shrink-0">
                      <p className="text-[16px] font-semibold tabular text-ink">{formatTime(booking.starts_at, locale)}</p>
                      <p className="text-[12.5px] capitalize-first text-muted">{formatDayShort(booking.starts_at, locale)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">{booking.customer.name}</p>
                      <p className="truncate text-[13.5px] text-muted">
                        {booking.service_name} · {formatDuration(booking.duration_min)} · {t.common.locations[booking.location_kind]}
                      </p>
                    </div>
                    <Badge tone="success" size="sm">
                      {t.pro.agenda.confirmed}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          {/* checklist */}
          <Card className="p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">{d.checklistTitle}</h2>
              <span className="text-[13.5px] font-semibold tabular text-ink">{percent} %</span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-snug text-muted">{d.checklistText}</p>
            <ul className="mt-4 space-y-1" data-testid="checklist">
              {CHECKLIST_KEYS.map((key) => {
                const done = checklist[key];
                return (
                  <li key={key}>
                    <Link
                      href={CHECKLIST_LINKS[key]}
                      className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-sand"
                      data-done={done ? "true" : "false"}
                      data-step={key}
                    >
                      <span
                        className={
                          done
                            ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper"
                            : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line2"
                        }
                      >
                        {done ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
                      </span>
                      <span className={done ? "flex-1 text-[14.5px] text-muted line-through decoration-line2" : "flex-1 text-[14.5px] font-medium text-ink"}>
                        {d.checklist[key]}
                      </span>
                      <ChevronRight size={16} aria-hidden className="shrink-0 text-faint group-hover:text-ink" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* quick actions */}
          <Card className="p-5 md:p-6">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">{d.quickTitle}</h2>
            <ul className="mt-3 space-y-1">
              {quick.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group flex h-12 items-center gap-3 rounded-2xl px-2 text-[14.5px] font-medium text-ink hover:bg-sand">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-ink2 group-hover:bg-paper">
                      <item.icon size={17} aria-hidden />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight size={16} aria-hidden className="text-faint group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
