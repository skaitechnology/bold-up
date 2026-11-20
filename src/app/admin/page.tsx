import Link from "next/link";
import { Building2, CalendarCheck, ChevronRight, CircleCheck, CircleX, FileSearch, Hourglass, Inbox, UserCheck, Users, type LucideIcon } from "lucide-react";
import { DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { getAdminStats, listRecentActivity, listReviewQueue, listVenuesAdmin } from "@/lib/data/admin";
import { formatDate, formatDateTimeCompact } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";

export default async function AdminDashboardPage() {
  const [{ t, locale }, stats, queue, activity, { inquiries, venues }] = await Promise.all([
    getI18n(),
    getAdminStats(),
    listReviewQueue(),
    listRecentActivity(),
    listVenuesAdmin(),
  ]);
  const d = t.admin.dashboard;
  const ACTIVITY: Record<string, keyof typeof d.activity> = {
    "coach.approve": "coachApprove",
    "coach.reject": "coachReject",
    "coach.request_changes": "coachRequestChanges",
    "coach.suspend": "coachSuspend",
    "coach.reinstate": "coachReinstate",
    "coach.publish": "coachPublish",
    "coach.unpublish": "coachUnpublish",
    "document.approve": "documentApprove",
    "document.reject": "documentReject",
    "document.request_info": "documentRequestInfo",
    "qualification.verified": "qualificationVerified",
    "qualification.declared": "qualificationDeclared",
    "user.suspend": "userSuspend",
    "user.reinstate": "userReinstate",
    "account.deletion_requested": "deletionRequested",
  };
  const activityLabel = (action: string) => d.activity[ACTIVITY[action] ?? "other"];
  const tiles: { label: string; value: number; icon: LucideIcon; href: string; accent?: boolean }[] = [
    { label: d.stats.pending, value: stats.coachesPending, icon: Hourglass, href: "/admin/coachs?statut=awaiting_review", accent: stats.coachesPending > 0 },
    { label: d.stats.documents, value: stats.documentsToReview, icon: FileSearch, href: "/admin/coachs?statut=awaiting_review" },
    { label: d.stats.coaches, value: stats.coachesTotal, icon: UserCheck, href: "/admin/coachs" },
    { label: d.stats.approved, value: stats.coachesApproved, icon: CircleCheck, href: "/admin/coachs?statut=approved" },
    { label: d.stats.rejected, value: stats.coachesRejected, icon: CircleX, href: "/admin/coachs?statut=rejected" },
    { label: d.stats.customers, value: stats.customersTotal, icon: Users, href: "/admin/utilisateurs?role=customer" },
    { label: d.stats.bookings, value: stats.bookingsTotal, icon: CalendarCheck, href: "/admin" },
    { label: d.stats.venues, value: stats.venuesTotal, icon: Building2, href: "/admin/salles" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={d.title} text={d.text} />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className={
                tile.accent
                  ? "press on-dark block rounded-[22px] bg-ink p-4 text-paper md:p-5"
                  : "press block rounded-[22px] border border-line bg-paper p-4 hover:border-line2 md:p-5"
              }
              data-testid="admin-stat"
            >
              <tile.icon size={18} aria-hidden className={tile.accent ? "text-gold" : "text-muted"} />
              <p className="mt-3 text-[30px] font-semibold leading-none tabular">{tile.value}</p>
              <p className={tile.accent ? "mt-1.5 text-[13px] text-white/70" : "mt-1.5 text-[13px] text-muted"}>{tile.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <section className="min-w-0">
          <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-ink">{d.queueTitle}</h2>
          {queue.length === 0 ? (
            <EmptyState icon={Inbox} title={d.queueEmpty} text={d.queueEmptyText} />
          ) : (
            <ul className="space-y-2.5">
              {queue.map((coach) => (
                <li key={coach.id} className="flex items-center gap-4 rounded-[22px] border border-line bg-paper p-4" data-testid="queue-item">
                  <Avatar src={mediaUrl(coach.photo_path)} name={coach.display_name} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-ink">
                      {coach.display_name}
                      {coach.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[13.5px] text-muted">
                      {[coach.city, coach.submitted_at ? d.submittedOn(formatDate(coach.submitted_at, locale)) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ButtonLink href={`/admin/coachs/${coach.id}`} size="sm" iconRight={ChevronRight} data-testid="queue-review">
                    {d.review}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 md:p-6">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{d.activityTitle}</h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">{d.activityEmpty}</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-[14px]">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{activityLabel(entry.action)}</p>
                      <p className="text-[12px] text-faint">{formatDateTimeCompact(entry.created_at, locale)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">{d.inquiriesTitle}</h2>
              <Link href="/admin/salles" className="text-[13.5px] font-medium text-ink underline-offset-4 hover:underline">
                {t.common.actions.seeAll}
              </Link>
            </div>
            {inquiries.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">{d.inquiriesEmpty}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {inquiries.slice(0, 4).map((inquiry) => (
                  <li key={inquiry.id} className="text-[14px]">
                    <p className="font-medium text-ink">
                      {inquiry.name} <span className="font-normal text-muted">· {venues.find((venue) => venue.id === inquiry.venue_id)?.name}</span>
                    </p>
                    <p className="line-clamp-2 text-[13.5px] text-muted">{inquiry.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
