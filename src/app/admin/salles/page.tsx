import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ExternalLink, Mail } from "lucide-react";
import { VenueEditor } from "@/components/admin/venue-editor";
import { DeleteButton } from "@/components/pro/delete-button";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { deleteInquiryAction, deleteVenueAction } from "@/lib/actions/venues";
import { listVenuesAdmin } from "@/lib/data/admin";
import { formatDateTimeCompact } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.venues.title };
}

export default async function AdminVenuesPage() {
  const [{ t, locale }, { venues, inquiries }] = await Promise.all([getI18n(), listVenuesAdmin()]);
  const v = t.admin.venues;
  return (
    <div className="space-y-6">
      <PageHeader title={v.title} text={v.text} right={<VenueEditor />} />

      {venues.length === 0 ? (
        <EmptyState icon={Building2} title={v.empty} />
      ) : (
        <ul className="overflow-hidden rounded-[24px] border border-line bg-paper">
          {venues.map((venue) => (
            <li key={venue.id} className="flex items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 md:px-5" data-testid="admin-venue-row">
              <span
                className={
                  venue.partner_status === "partner"
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold-ink"
                    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand text-ink2"
                }
              >
                <Building2 size={19} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-semibold text-ink">
                  <span className="truncate">{venue.name}</span>
                  {venue.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-muted">
                  {[t.common.venueCategories[venue.category], venue.city, v.sources[venue.source as "admin" | "osm" | "demo"]].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={venue.partner_status === "partner" ? "gold" : "outline"} size="sm">
                    {venue.partner_status === "partner" ? v.partner : v.listed}
                  </Badge>
                  <Badge tone="outline" size="sm">
                    {venue.claim_status === "claimed" ? v.claimed : v.unclaimed}
                  </Badge>
                  {!venue.is_published ? (
                    <Badge tone="warn" size="sm">
                      {v.unpublished}
                    </Badge>
                  ) : null}
                </p>
              </div>
              <Link
                href={`/salle/${venue.slug}`}
                target="_blank"
                aria-label={t.common.actions.view}
                className="press hidden h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand sm:inline-flex"
              >
                <ExternalLink size={16} aria-hidden />
              </Link>
              <VenueEditor venue={venue} />
              <DeleteButton action={deleteVenueAction} id={venue.id} label={`${t.common.actions.delete} — ${venue.name}`} success={v.deleted} />
            </li>
          ))}
        </ul>
      )}

      <Card className="p-5 md:p-7">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">{v.inquiries}</h2>
        {inquiries.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">{v.noInquiries}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="flex items-start gap-3 rounded-2xl bg-sand p-4" data-testid="admin-inquiry">
                <Mail size={17} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">
                    {v.inquiryFrom(inquiry.name)} <span className="font-normal text-muted">· {venues.find((venue) => venue.id === inquiry.venue_id)?.name}</span>
                  </p>
                  <a href={`mailto:${inquiry.email}`} className="text-[13.5px] text-ink2 underline underline-offset-2">
                    {inquiry.email}
                  </a>
                  <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink2">{inquiry.message}</p>
                  <p className="mt-1 text-[12px] text-faint">{formatDateTimeCompact(inquiry.created_at, locale)}</p>
                </div>
                <DeleteButton action={deleteInquiryAction} id={inquiry.id} label={t.common.actions.delete} success={v.deleted} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
