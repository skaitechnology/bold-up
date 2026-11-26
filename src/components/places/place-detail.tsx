import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, Globe, MapPin, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PlaceIcon } from "@/components/brand/kind-icon";
import { PinMap } from "@/components/map/area-map";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { DemoBadge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { venueInquiryAction } from "@/lib/actions/venues";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { VenueCard } from "@/lib/search";
import { PlaceCard } from "./place-card";
import type { SportLite } from "./place-bits";

type PlaceRow = {
  id: string;
  name: string;
  category: "gym" | "studio" | "shop" | "school" | "other" | "club" | "street_workout";
  address: string | null;
  postal_code: string | null;
  city: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  is_demo: boolean;
};

export function placeAddress(place: Pick<PlaceRow, "address" | "postal_code" | "city">): string {
  return [place.address, [place.postal_code, place.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="press inline-flex items-center gap-2 text-[14px] font-medium text-muted hover:text-ink">
      <ArrowLeft size={16} aria-hidden />
      {children}
    </Link>
  );
}

/**
 * Designed header of a place page (these places have no photo): the place colour, a very
 * large category icon, and the name on a darkened corner so it always stays readable.
 */
export function PlaceHero({
  place,
  tone,
  where,
  badges,
  t,
}: {
  place: PlaceRow;
  /** Colour of the cover: a sport slug for a club, "street_workout" for a spot. */
  tone: string;
  /** "Créteil · à 1,2 km de Créteil" */
  where: string;
  badges?: ReactNode;
  t: Dictionary;
}) {
  const isSpot = place.category === "street_workout";
  return (
    <header data-tone={tone} className={clsx("on-dark relative isolate overflow-hidden rounded-[32px] text-white", isSpot ? "bg-ink" : "tone-cover")} data-testid="place-hero">
      {isSpot ? (
        <>
          <span aria-hidden className="tone-solid absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full opacity-40 blur-3xl" />
          <span aria-hidden className="tone-solid absolute -bottom-28 left-1/3 -z-10 h-56 w-56 rounded-full opacity-20 blur-3xl" />
        </>
      ) : (
        // keeps white text readable on the brightest discipline colours
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-tr from-ink/75 via-ink/30 to-transparent" />
      )}
      <span aria-hidden className={clsx("animate-float absolute -bottom-10 -right-6 -z-10 md:-bottom-14 md:right-6", isSpot ? "tone-fill opacity-25 md:opacity-90" : "text-white/25")}>
        <PlaceIcon category={place.category} size={260} />
      </span>
      <div className="flex min-h-[260px] flex-col justify-end px-5 pb-6 pt-16 md:min-h-[340px] md:px-10 md:pb-10">
        <div className="animate-fade-up flex flex-wrap items-center gap-2">
          <span data-tone={place.category} className={clsx("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold", isSpot ? "tone-solid" : "bg-paper text-ink")}>
            <span className={clsx(!isSpot && "tone-text")}>
              <PlaceIcon category={place.category} size={13} />
            </span>
            {t.common.venueCategories[place.category]}
          </span>
          {badges}
          {place.is_demo ? <DemoBadge label={t.common.demo} className="!h-7 !border-white/45 !px-2.5 !text-white/85" /> : null}
        </div>
        <h1 className="display animate-fade-up mt-4 max-w-[18ch] text-[36px] md:text-[60px]" style={{ animationDelay: "60ms" }} data-testid="place-name">
          {place.name}
        </h1>
        <p className="animate-fade-up mt-3 flex items-center gap-2 text-[15px] font-medium text-white/85 md:text-[16px]" style={{ animationDelay: "120ms" }}>
          <MapPin size={17} aria-hidden className="shrink-0" />
          {where}
        </p>
      </div>
    </header>
  );
}

/** White pill for the hero ("Gratuit", "24 h/24"…). */
export function HeroBadge({ children, solid }: { children: ReactNode; solid?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold",
        solid ? "bg-paper text-ink" : "bg-white/14 text-white ring-1 ring-inset ring-white/30 backdrop-blur",
      )}
    >
      {children}
    </span>
  );
}

/** Map with the pin of the place, its address, contact details and a directions link. */
export function PlaceLocationCard({ place, tone, t }: { place: PlaceRow; tone: string; t: Dictionary }) {
  const address = placeAddress(place);
  return (
    <Card className="overflow-hidden shadow-card">
      <div className="h-[260px]">
        <PinMap
          center={{ lat: place.lat, lng: place.lng }}
          title={place.name}
          kind={place.category === "club" ? "club" : "street_workout"}
          tone={tone}
          fallback={t.site.search.mapUnavailable}
          className="h-full w-full"
        />
      </div>
      <div className="space-y-3 p-5">
        {address ? (
          <p className="flex items-start gap-3 text-[14.5px] text-ink2">
            <MapPin size={17} aria-hidden className="mt-0.5 shrink-0 text-muted" />
            <span>
              <span className="sr-only">{t.places.detail.address} : </span>
              {address}
            </span>
          </p>
        ) : null}
        {place.phone ? (
          <a href={`tel:${place.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-[14.5px] text-ink2 hover:text-ink">
            <Phone size={17} aria-hidden className="shrink-0 text-muted" />
            {place.phone}
          </a>
        ) : null}
        {place.website ? (
          <a href={place.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 text-[14.5px] text-ink2 hover:text-ink">
            <Globe size={17} aria-hidden className="shrink-0 text-muted" />
            <span className="truncate">{place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
          </a>
        ) : null}
        <a
          href={`https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14.5px] font-semibold text-paper hover:bg-ink3"
          data-testid="place-directions"
        >
          <Navigation size={16} aria-hidden />
          {t.places.detail.directions}
        </a>
      </div>
    </Card>
  );
}

/** "Do you manage this place?" — same form and server action as on a gym page. */
export function PlaceInquiryCard({ venueId, t }: { venueId: string; t: Dictionary }) {
  const v = t.site.venues;
  return (
    <Card className="p-5">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink">{v.claimTitle}</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{v.claimText}</p>
      <ActionForm action={venueInquiryAction} success={v.inquirySent} resetOnSuccess className="mt-4 space-y-3" data-testid="venue-inquiry">
        <input type="hidden" name="venueId" value={venueId} />
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
  );
}

export function SectionTitle({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h2 className="display text-[26px] text-ink md:text-[34px]">{title}</h2>
        {text ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{text}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Other places of the same kind, nearest first. */
export function NearbyPlaces({
  title,
  places,
  sports,
  allHref,
  allLabel,
  t,
  locale,
}: {
  title: string;
  places: VenueCard[];
  sports: readonly SportLite[];
  allHref: string;
  allLabel: string;
  t: Dictionary;
  locale: Locale;
}) {
  if (places.length === 0) return null;
  return (
    <section className="mt-14">
      <SectionTitle
        title={title}
        action={
          <Link href={allHref} className="press inline-flex h-10 items-center gap-2 rounded-full border border-line2 px-4 text-[14px] font-semibold text-ink hover:border-ink">
            {allLabel}
            <ArrowRight size={15} aria-hidden />
          </Link>
        }
      />
      <div className="stagger mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} sports={sports} t={t} locale={locale} />
        ))}
      </div>
    </section>
  );
}

/** Cross-links between the three kinds of places, shown at the bottom of each listing. */
export function AlsoRow({ current, t }: { current: "clubs" | "spots" | "venues"; t: Dictionary }) {
  const a = t.places.also;
  const items = [
    { key: "clubs", href: "/clubs", category: "club", title: a.clubs, text: a.clubsText },
    { key: "spots", href: "/street-workout", category: "street_workout", title: a.spots, text: a.spotsText },
    { key: "venues", href: "/salles", category: "gym", title: a.venues, text: a.venuesText },
  ].filter((item) => item.key !== current);
  return (
    <section className="mt-14" aria-label={a.title}>
      <h2 className="eyebrow text-muted">{a.title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.key} href={item.href} data-tone={item.category} className="hover-lift group flex items-center gap-4 rounded-[24px] border border-line bg-paper p-4" data-testid={`also-${item.key}`}>
            <span className="tone-solid flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 ease-out-soft group-hover:-rotate-6 group-hover:scale-105">
              <PlaceIcon category={item.category} size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16.5px] font-semibold tracking-tight text-ink">{item.title}</span>
              <span className="mt-0.5 block text-[13.5px] text-muted">{item.text}</span>
            </span>
            <ArrowRight size={18} aria-hidden className="shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:text-ink" />
          </Link>
        ))}
      </div>
    </section>
  );
}
