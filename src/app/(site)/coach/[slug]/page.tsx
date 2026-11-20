import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AtSign,
  Award,
  CalendarDays,
  Clock,
  Dumbbell,
  Eye,
  Globe,
  GraduationCap,
  House,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Trees,
  Video,
  type LucideIcon,
} from "lucide-react";
import { BookingLauncher } from "@/components/booking/booking-launcher";
import { BookingPanel } from "@/components/booking/booking-panel";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import { FavoriteButton } from "@/components/coach/favorite-button";
import { ShareButton } from "@/components/coach/share-button";
import { AreaMap } from "@/components/map/area-map";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge, DemoBadge, VerifiedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { contactCoachAction } from "@/lib/actions/messages";
import { getSessionUser } from "@/lib/auth/session";
import { getCoachBySlug, getFavoriteCoachIds } from "@/lib/data/coaches";
import { isPubliclyVerified, type Level, type LocationKind } from "@/lib/domain";
import { formatDuration, formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { intlLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ reserver?: string; prestation?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [coach, { t }] = await Promise.all([getCoachBySlug(slug), getI18n()]);
  if (!coach) return { title: t.site.coach.notFound, robots: { index: false } };
  const title = `${coach.display_name} — ${coach.headline || t.common.tagline}`;
  const description = (coach.bio || coach.headline).slice(0, 180);
  const photo = mediaUrl(coach.photo_path);
  const isPublic = isPubliclyVerified(coach);
  return {
    title,
    description,
    alternates: { canonical: `/coach/${coach.slug}` },
    robots: isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/coach/${coach.slug}`,
      images: photo ? [{ url: photo, alt: coach.display_name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: photo ? [photo] : undefined },
  };
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-9 first:border-t-0 first:pt-0">
      <h2 className="display text-[24px] text-ink md:text-[28px]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function CoachProfilePage({ params, searchParams }: PageProps) {
  const [{ slug }, query, { t, locale }, user] = await Promise.all([params, searchParams, getI18n(), getSessionUser()]);
  const coach = await getCoachBySlug(slug);
  if (!coach) notFound();

  const c = t.site.coach;
  const isPublic = isPubliclyVerified(coach);
  const isOwn = user?.id === coach.id;
  const favoriteIds = user && !isOwn ? await getFavoriteCoachIds(user.id) : [];

  const services = coach.services.filter((service) => service.is_active);
  const minPrice = services.length ? Math.min(...services.map((service) => service.price_cents)) : null;
  const locations: LocationKind[] = [
    ...(coach.at_gym ? (["gym"] as const) : []),
    ...(coach.at_home ? (["home"] as const) : []),
    ...(coach.outdoor ? (["outdoor"] as const) : []),
    ...(coach.online ? (["online"] as const) : []),
    "to_agree",
  ];
  const places: { kind: Exclude<LocationKind, "to_agree">; icon: LucideIcon; on: boolean }[] = [
    { kind: "gym", icon: Dumbbell, on: coach.at_gym },
    { kind: "home", icon: House, on: coach.at_home },
    { kind: "outdoor", icon: Trees, on: coach.outdoor },
    { kind: "online", icon: Video, on: coach.online },
  ];
  const workingDays = [...new Set(coach.availability_rules.map((rule) => rule.weekday))].sort();
  const weekdayName = (isoDay: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, isoDay))).replace(".", "");

  const panel = {
    coach: { id: coach.id, slug: coach.slug, displayName: coach.display_name, acceptingBookings: coach.accepting_bookings },
    services: services.map(({ id, name, description, duration_min, price_cents }) => ({ id, name, description, duration_min, price_cents })),
    locations,
    signedIn: Boolean(user),
    isOwn,
    bookable: isPublic,
    initialServiceId: services.find((service) => service.id === query.prestation)?.id,
  };
  const instagram = coach.instagram?.replace(/^@/, "");

  return (
    <>
      {!isPublic ? (
        <div className="border-b border-gold-line bg-gold-soft">
          <p className="mx-auto flex max-w-[1320px] items-center gap-2.5 px-4 py-3 text-[13.5px] font-medium text-gold-ink md:px-8">
            <Eye size={16} aria-hidden className="shrink-0" />
            {isOwn ? c.previewBanner : c.adminPreviewBanner}
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ editorial hero */}
      <section className="bg-sand">
        <div className="mx-auto grid max-w-[1320px] gap-0 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-8 md:py-12 lg:gap-16">
          <div className="relative order-1 aspect-[4/5] max-h-[56dvh] w-full overflow-hidden md:order-2 md:max-h-none md:rounded-[32px]">
            <CoachPortrait photoPath={coach.photo_path} name={coach.display_name} eager />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent md:hidden" />
          </div>

          <div className="order-2 flex flex-col justify-center px-4 pb-8 pt-6 md:order-1 md:px-0 md:py-4">
            <div className="flex flex-wrap items-center gap-2">
              {isPublic ? <VerifiedBadge label={t.common.verifiedLong} /> : <Badge tone="warn">{t.common.verificationStatus[coach.verification_status]}</Badge>}
              {coach.is_demo ? <DemoBadge label={t.common.demoProfile} className="!h-7 !px-2.5" /> : null}
            </div>
            <h1 className="display mt-5 text-[44px] text-ink sm:text-[56px] lg:text-[76px]" data-testid="coach-name">
              {coach.display_name}
            </h1>
            <p className="mt-4 max-w-lg text-[18px] leading-snug text-ink2 md:text-[20px]">{coach.headline}</p>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14.5px] text-muted">
              {coach.city ? (
                <li className="inline-flex items-center gap-1.5">
                  <MapPin size={16} aria-hidden />
                  {coach.city} · {c.radius(coach.service_radius_km)}
                </li>
              ) : null}
              {coach.years_experience ? (
                <li className="inline-flex items-center gap-1.5">
                  <Award size={16} aria-hidden />
                  {c.yearsExperience(coach.years_experience)}
                </li>
              ) : null}
            </ul>

            <ul className="mt-5 flex flex-wrap gap-2">
              {coach.sports.map((sport) => (
                <li key={sport.id} className="inline-flex h-9 items-center gap-2 rounded-full bg-paper px-4 text-[13.5px] font-medium text-ink ring-1 ring-inset ring-line">
                  <SportIcon icon={sport.icon} size={15} />
                  {localizedName(sport, locale)}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              {isOwn ? (
                <ButtonLink href="/pro/profil" size="lg">
                  {c.editProfile}
                </ButtonLink>
              ) : (
                <>
                  <span className="hidden lg:block">
                    <ButtonLink href="#reserver" size="lg">
                      {c.book}
                      {minPrice != null ? <span className="font-normal opacity-70">· {c.bookFrom(formatPrice(minPrice, locale))}</span> : null}
                    </ButtonLink>
                  </span>
                  {isPublic ? (
                    <form action={contactCoachAction}>
                      <input type="hidden" name="coachId" value={coach.id} />
                      <input type="hidden" name="back" value={`/coach/${coach.slug}`} />
                      <button
                        type="submit"
                        className="press inline-flex h-[52px] items-center gap-2 rounded-full border border-line2 bg-paper px-6 text-[15px] font-semibold text-ink hover:border-ink"
                        data-testid="contact-coach"
                      >
                        <MessageCircle size={17} aria-hidden />
                        {c.contact}
                      </button>
                    </form>
                  ) : null}
                  <FavoriteButton coachId={coach.id} initial={favoriteIds.includes(coach.id)} signedIn={Boolean(user)} variant="outline" className="!h-[52px] !w-[52px]" />
                </>
              )}
              <ShareButton url={`/coach/${coach.slug}`} title={c.shareTitle(coach.display_name)} />
            </div>
            {coach.is_demo ? <p className="mt-4 text-[12.5px] text-faint">{c.demoHint}</p> : isPublic ? <p className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-faint"><ShieldCheck size={13} aria-hidden />{c.verifiedHint}</p> : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ content + booking */}
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 pb-40 pt-10 md:px-8 md:pt-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16 lg:pb-24">
        <div className="min-w-0">
          {coach.bio ? (
            <Section title={c.about}>
              <p className="max-w-2xl whitespace-pre-line text-[16.5px] leading-[1.7] text-ink2">{coach.bio}</p>
              {coach.experience ? (
                <>
                  <h3 className="mt-7 text-[15px] font-semibold text-ink">{c.experience}</h3>
                  <p className="mt-2 max-w-2xl whitespace-pre-line text-[15.5px] leading-[1.7] text-muted">{coach.experience}</p>
                </>
              ) : null}
            </Section>
          ) : null}

          {services.length ? (
            <Section id="prestations" title={c.services}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <li key={service.id} className="flex flex-col rounded-[22px] border border-line bg-paper p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[16.5px] font-semibold tracking-tight text-ink">{service.name}</h3>
                      <p className="shrink-0 text-[20px] font-semibold tabular text-ink">{formatPrice(service.price_cents, locale)}</p>
                    </div>
                    {service.description ? <p className="mt-2 text-[14px] leading-relaxed text-muted">{service.description}</p> : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <Badge tone="neutral" icon={Clock} size="sm">
                        {formatDuration(service.duration_min)}
                      </Badge>
                      <Badge tone="outline" size="sm">
                        {t.common.formats[service.format as "private" | "group"]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-faint">{c.servicesText}</p>
            </Section>
          ) : null}

          {coach.coach_qualifications.length || coach.training_school ? (
            <Section title={c.qualifications}>
              <ul className="space-y-2.5">
                {coach.coach_qualifications.map((qualification) => {
                  const verified = qualification.status === "verified" && isPublic;
                  return (
                    <li key={qualification.id} className="flex items-center gap-4 rounded-[20px] bg-sand px-5 py-4">
                      <span
                        className={
                          verified
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink ring-1 ring-inset ring-gold-line"
                            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-muted ring-1 ring-inset ring-line"
                        }
                      >
                        {verified ? <ShieldCheck size={20} aria-hidden /> : <GraduationCap size={20} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15.5px] font-semibold text-ink">{qualification.title}</span>
                        <span className="mt-0.5 block text-[13.5px] text-muted">
                          {[qualification.issuer, qualification.year_obtained].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Badge tone={verified ? "gold" : "outline"} size="sm">
                        {verified ? c.qualificationVerified : c.qualificationDeclared}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              {coach.training_school ? (
                <p className="mt-4 text-[14px] text-muted">
                  {c.school} : <span className="font-medium text-ink2">{coach.training_school}</span>
                </p>
              ) : null}
            </Section>
          ) : null}

          <Section title={c.whereTitle}>
            <ul className="flex flex-wrap gap-2">
              {places
                .filter((place) => place.on)
                .map((place) => (
                  <li key={place.kind} className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line2 px-5 text-[14.5px] font-medium text-ink">
                    <place.icon size={17} aria-hidden />
                    {c.trainsAt[place.kind]}
                  </li>
                ))}
            </ul>
            {coach.lat != null && coach.lng != null ? (
              <>
                <div className="mt-5 h-[300px] overflow-hidden rounded-[24px] border border-line md:h-[360px]">
                  <AreaMap center={{ lat: coach.lat, lng: coach.lng }} radiusKm={coach.service_radius_km} fallback={t.site.search.mapUnavailable} className="h-full w-full" />
                </div>
                <p className="mt-3 text-[13px] text-faint">{c.areaNote}</p>
              </>
            ) : null}
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {coach.levels.length ? (
                <div>
                  <dt className="text-[13px] font-semibold text-ink">{c.levelsTitle}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {coach.levels.map((level) => (
                      <Badge key={level} tone="neutral">
                        {t.common.levels[level as Level]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ) : null}
              {coach.formats.length ? (
                <div>
                  <dt className="text-[13px] font-semibold text-ink">{c.formatsTitle}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {coach.formats.map((format) => (
                      <Badge key={format} tone="neutral">
                        {t.common.formats[format as "private" | "group"]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Section>

          {workingDays.length ? (
            <Section title={c.availability}>
              <p className="mb-3 inline-flex items-center gap-2 text-[14px] text-muted">
                <CalendarDays size={16} aria-hidden />
                {c.weekdays}
              </p>
              <ul className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const on = workingDays.includes(day);
                  return (
                    <li
                      key={day}
                      className={
                        on
                          ? "inline-flex h-11 w-14 items-center justify-center rounded-2xl bg-ink text-[13.5px] font-semibold capitalize text-paper"
                          : "inline-flex h-11 w-14 items-center justify-center rounded-2xl bg-sand text-[13.5px] capitalize text-faint line-through"
                      }
                    >
                      {weekdayName(day)}
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : null}

          {coach.coach_media.length ? (
            <Section title={c.gallery}>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[...coach.coach_media]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((media) => (
                    <li key={media.id} className="aspect-square overflow-hidden rounded-[20px] bg-sand2">
                      <img src={mediaUrl(media.path) ?? ""} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </li>
                  ))}
              </ul>
            </Section>
          ) : null}

          {instagram || coach.website ? (
            <div className="flex flex-wrap gap-2 border-t border-line pt-8">
              {instagram ? (
                <a
                  href={`https://www.instagram.com/${encodeURIComponent(instagram)}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="press inline-flex h-11 items-center gap-2 rounded-full border border-line2 px-5 text-[14px] font-medium text-ink hover:border-ink"
                >
                  <AtSign size={16} aria-hidden />
                  {instagram}
                </a>
              ) : null}
              {coach.website ? (
                <a
                  href={coach.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="press inline-flex h-11 items-center gap-2 rounded-full border border-line2 px-5 text-[14px] font-medium text-ink hover:border-ink"
                >
                  <Globe size={16} aria-hidden />
                  {c.website}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* desktop booking card */}
        <aside id="reserver" className="hidden scroll-mt-28 lg:block">
          <div className="sticky top-[96px] rounded-[28px] border border-line bg-paper p-6 shadow-card">
            <h2 className="display text-[24px] text-ink">{t.site.booking.title}</h2>
            <div className="mt-5">
              <BookingPanel {...panel} />
            </div>
          </div>
        </aside>
      </div>

      {!isOwn && isPublic ? <BookingLauncher {...panel} minPriceCents={minPrice} autoOpen={query.reserver === "1"} /> : null}
      {!isPublic && !isOwn ? (
        <div className="mx-auto max-w-[1320px] px-4 pb-10 md:px-8">
          <Notice tone="warn">{c.notAccepting}</Notice>
        </div>
      ) : null}
      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </>
  );
}
