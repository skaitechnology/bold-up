import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Globe, Info, MapPin, Navigation, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CoachCard } from "@/components/coach/coach-card";
import { PinMap } from "@/components/map/area-map";
import { SiteFooter } from "@/components/site/site-footer";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, Notice } from "@/components/ui/misc";
import { venueInquiryAction } from "@/lib/actions/venues";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches } from "@/lib/data/coaches";
import { getVenueBySlug } from "@/lib/data/venues";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";
import { searchCoaches } from "@/lib/search";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [venue, { t }] = await Promise.all([getVenueBySlug(slug), getI18n()]);
  if (!venue) return { title: t.common.notFound.title, robots: { index: false } };
  return {
    title: `${venue.name} — ${t.common.venueCategories[venue.category]}${venue.city ? ` · ${venue.city}` : ""}`,
    description: venue.description || t.site.venues.metaDescription,
    alternates: { canonical: `/salle/${venue.slug}` },
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { slug } = await params;
  const [venue, { t, locale }, user, allCoaches] = await Promise.all([getVenueBySlug(slug), getI18n(), getSessionUser(), listPublicCoaches()]);
  if (!venue) notFound();
  const v = t.site.venues;
  const partner = venue.partner_status === "partner";
  const claimed = venue.claim_status === "claimed";
  const photo = mediaUrl(venue.photo_path, "venue-media");
  const nearby = searchCoaches(allCoaches, { center: { lat: venue.lat, lng: venue.lng }, radiusKm: 8 }).slice(0, 4);
  const favorites = user ? await getFavoriteCoachIds(user.id) : [];
  const address = [venue.address, [venue.postal_code, venue.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <Link href="/salles" className="inline-flex items-center gap-2 text-[14px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={16} aria-hidden />
          {v.title}
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          <div className="min-w-0">
            <div className="relative aspect-[16/8] overflow-hidden rounded-[28px] bg-sand2">
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-line2">
                  <Building2 size={72} strokeWidth={1.2} aria-hidden />
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {partner ? (
                <Badge tone="gold" icon={ShieldCheck}>
                  {v.partner}
                </Badge>
              ) : (
                <Badge tone="outline">{claimed ? v.claimed : v.unclaimed}</Badge>
              )}
              <Badge tone="neutral">{t.common.venueCategories[venue.category]}</Badge>
              {venue.is_demo ? <DemoBadge label={t.common.demo} className="!h-7 !px-2.5" /> : null}
            </div>
            <h1 className="display mt-4 text-[36px] text-ink md:text-[52px]" data-testid="venue-name">
              {venue.name}
            </h1>
            {venue.city ? (
              <p className="mt-3 flex items-center gap-2 text-[15.5px] text-muted">
                <MapPin size={17} aria-hidden />
                {address || venue.city}
              </p>
            ) : null}

            {!partner && !claimed ? (
              <Notice tone="neutral" icon={Info} className="mt-6">
                {v.unclaimedHint}
              </Notice>
            ) : partner ? (
              <Notice tone="gold" icon={ShieldCheck} className="mt-6">
                {v.partnerHint}
              </Notice>
            ) : null}
            {venue.is_demo ? <p className="mt-3 text-[12.5px] text-faint">{v.demoHint}</p> : null}

            {venue.description ? <p className="mt-7 max-w-2xl whitespace-pre-line text-[16px] leading-[1.7] text-ink2">{venue.description}</p> : null}

            {venue.facilities.length ? (
              <section className="mt-8">
                <h2 className="display text-[22px] text-ink">{v.facilities}</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {venue.facilities.map((facility) => (
                    <li key={facility} className="inline-flex h-10 items-center rounded-full bg-sand px-4 text-[14px] font-medium text-ink2">
                      {facility}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <Card className="overflow-hidden">
              <div className="h-[240px]">
                <PinMap center={{ lat: venue.lat, lng: venue.lng }} title={venue.name} partner={partner} fallback={t.site.search.mapUnavailable} className="h-full w-full" />
              </div>
              <div className="space-y-3 p-5">
                {address ? (
                  <p className="flex items-start gap-3 text-[14.5px] text-ink2">
                    <MapPin size={17} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                    {address}
                  </p>
                ) : null}
                {venue.phone ? (
                  <a href={`tel:${venue.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-[14.5px] text-ink2 hover:text-ink">
                    <Phone size={17} aria-hidden className="shrink-0 text-muted" />
                    {venue.phone}
                  </a>
                ) : null}
                {venue.website ? (
                  <a href={venue.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 text-[14.5px] text-ink2 hover:text-ink">
                    <Globe size={17} aria-hidden className="shrink-0 text-muted" />
                    <span className="truncate">{venue.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                  </a>
                ) : null}
                <a
                  href={`https://www.openstreetmap.org/directions?to=${venue.lat}%2C${venue.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line2 text-[14.5px] font-semibold text-ink hover:border-ink"
                >
                  <Navigation size={16} aria-hidden />
                  {v.directions}
                </a>
                {venue.source === "osm" ? <p className="pt-1 text-[11.5px] text-faint">{v.osmSource}</p> : null}
              </div>
            </Card>

            {!partner ? (
              <Card className="p-5">
                <h2 className="text-[17px] font-semibold tracking-tight text-ink">{v.claimTitle}</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{v.claimText}</p>
                <ActionForm action={venueInquiryAction} success={v.inquirySent} resetOnSuccess className="mt-4 space-y-3" data-testid="venue-inquiry">
                  <input type="hidden" name="venueId" value={venue.id} />
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                  <Field label={v.inquiryName}>
                    <Input name="name" required minLength={2} maxLength={120} autoComplete="name" />
                  </Field>
                  <Field label={v.inquiryEmail}>
                    <Input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" autoCapitalize="none" />
                  </Field>
                  <Field label={v.inquiryMessage}>
                    <Textarea name="message" required minLength={5} maxLength={2000} rows={3} placeholder={v.inquiryPlaceholder} />
                  </Field>
                  <SubmitButton variant="secondary" block>
                    {v.inquirySend}
                  </SubmitButton>
                </ActionForm>
              </Card>
            ) : null}
          </aside>
        </div>

        {nearby.length ? (
          <section className="mt-14">
            <h2 className="display text-[28px] text-ink md:text-[36px]">{v.nearbyCoaches}</h2>
            <div className="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {nearby.map((coach) => (
                <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite={favorites.includes(coach.id)} signedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter />
    </>
  );
}
