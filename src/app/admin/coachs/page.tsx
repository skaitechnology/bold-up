import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, UserX } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { listCoachesAdmin } from "@/lib/data/admin";
import { listSports } from "@/lib/data/coaches";
import { formatDate } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";
import { VERIFICATION_TONES } from "@/lib/tones";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.coaches.title };
}

const STATUSES = ["draft", "awaiting_review", "changes_requested", "approved", "rejected", "suspended"] as const;
const selectClass = "h-11 rounded-full border border-line2 bg-paper px-4 text-[14px] font-medium text-ink outline-none focus:border-ink";

export default async function AdminCoachesPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; sport?: string }> }) {
  const [params, { t, locale }, sports] = await Promise.all([searchParams, getI18n(), listSports()]);
  const status = (STATUSES as readonly string[]).includes(params.statut ?? "") ? params.statut : undefined;
  const coaches = await listCoachesAdmin({ q: params.q, status, sport: params.sport });
  const c = t.admin.coaches;

  return (
    <div className="space-y-6">
      <PageHeader title={c.title} text={c.text} />
      <form method="get" className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">{c.search}</span>
          <Search size={17} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={c.search}
            className="h-11 w-full rounded-full border border-line2 bg-paper pl-11 pr-4 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <select name="statut" defaultValue={status ?? ""} aria-label={c.columns.status} className={selectClass}>
          <option value="">{c.allStatuses}</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {t.common.verificationStatus[item]}
            </option>
          ))}
        </select>
        <select name="sport" defaultValue={params.sport ?? ""} aria-label={c.columns.sports} className={selectClass}>
          <option value="">{c.allSports}</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.slug}>
              {localizedName(sport, locale)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t.common.nav.search}
        </Button>
      </form>

      <p className="text-[13.5px] text-muted">{c.results(coaches.length)}</p>
      {coaches.length === 0 ? (
        <EmptyState icon={UserX} title={c.empty} />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-line bg-paper">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_40px] gap-4 border-b border-line px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-faint lg:grid">
            <span>{c.columns.coach}</span>
            <span>{c.columns.city}</span>
            <span>{c.columns.sports}</span>
            <span>{c.columns.status}</span>
            <span>{c.columns.created}</span>
            <span />
          </div>
          <ul>
            {coaches.map((coach) => (
              <li key={coach.id} className="border-t border-line first:border-t-0">
                <Link
                  href={`/admin/coachs/${coach.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-sand lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_40px] lg:px-5"
                  data-testid="admin-coach-row"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={mediaUrl(coach.photo_path)} name={coach.display_name || coach.email} size={40} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-[15px] font-semibold text-ink">
                        <span className="truncate">{coach.display_name || "—"}</span>
                        {coach.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted">{coach.email}</span>
                    </span>
                  </span>
                  <span className="hidden truncate text-[14px] text-ink2 lg:block">{coach.city ?? "—"}</span>
                  <span className="hidden truncate text-[13.5px] text-muted lg:block">{coach.sports.map((sport) => localizedName(sport, locale)).join(", ") || "—"}</span>
                  <span className="flex flex-wrap items-center gap-1.5 justify-self-end lg:justify-self-start">
                    <Badge tone={VERIFICATION_TONES[coach.verification_status]} size="sm">
                      {t.common.verificationStatus[coach.verification_status]}
                    </Badge>
                    {coach.verification_status === "approved" && !coach.is_published ? (
                      <Badge tone="outline" size="sm">
                        {c.hidden}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="hidden text-[13px] text-muted lg:block">{formatDate(coach.created_at, locale)}</span>
                  <ChevronRight size={17} aria-hidden className="hidden justify-self-end text-faint lg:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
