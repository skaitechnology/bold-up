import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, ExternalLink } from "lucide-react";
import { EventEditor } from "@/components/admin/event-editor";
import { EventIcon } from "@/components/brand/kind-icon";
import { EventPublishToggle } from "@/components/events/publish-toggle";
import { eventDateLabel } from "@/components/events/utils";
import { DeleteButton } from "@/components/pro/delete-button";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { deleteEventAction } from "@/lib/actions/events";
import { listSports } from "@/lib/data/coaches";
import { listEventsAdmin } from "@/lib/data/events";
import type { EventKind } from "@/lib/domain";
import { parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.events.admin.title };
}

export default async function AdminEventsPage() {
  const [{ t, locale }, events, sports] = await Promise.all([getI18n(), listEventsAdmin(), listSports()]);
  const a = t.events.admin;
  const today = parisDateKey(new Date());
  const sportOptions = sports.map(({ slug, name_fr, name_en }) => ({ slug, name_fr, name_en }));

  return (
    <div className="space-y-6">
      <PageHeader title={a.title} text={a.text} right={<EventEditor sports={sportOptions} />} />

      {events.length === 0 ? (
        <EmptyState icon={CalendarX2} title={a.empty} />
      ) : (
        <ul className="overflow-hidden rounded-[24px] border border-line bg-paper">
          {events.map((event) => {
            const kind = event.kind as EventKind;
            const over = (event.ends_on ?? event.starts_on) < today;
            return (
              <li key={event.id} data-tone={kind} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 md:flex-nowrap md:px-5" data-testid="admin-event-row">
                <span className="tone-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                  <EventIcon kind={kind} size={19} />
                </span>
                <div className="min-w-0 flex-1 basis-[200px]">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-semibold text-ink">
                    <span className="truncate">{event.name}</span>
                    {event.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                  </p>
                  <p className="capitalize-first mt-0.5 truncate text-[13px] text-muted">
                    {[eventDateLabel({ startsOn: event.starts_on, endsOn: event.ends_on }, locale, t.events.dateRange), event.city].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="tone" size="sm">
                      {t.events.kinds[kind]}
                    </Badge>
                    <Badge tone={event.is_published ? "success" : "warn"} size="sm">
                      {event.is_published ? a.published : a.unpublished}
                    </Badge>
                    {over ? (
                      <Badge tone="outline" size="sm">
                        {a.past}
                      </Badge>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EventPublishToggle eventId={event.id} published={event.is_published} />
                  <Link
                    href={`/evenement/${event.slug}`}
                    target="_blank"
                    aria-label={`${t.common.actions.view} — ${event.name}`}
                    className="press hidden h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand sm:inline-flex"
                  >
                    <ExternalLink size={16} aria-hidden />
                  </Link>
                  <EventEditor event={event} sports={sportOptions} />
                  <DeleteButton action={deleteEventAction} id={event.id} label={`${t.common.actions.delete} — ${event.name}`} success={a.deleted} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
