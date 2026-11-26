import { NextResponse, type NextRequest } from "next/server";
import { buildIcs } from "@/components/events/ics";
import { getEventBySlug } from "@/lib/data/events";
import { siteUrl } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

/**
 * "Ajouter à mon agenda": the event as an .ics file.
 * The row is read with the caller's own session, so row level security decides what
 * exists: the public only ever gets published events.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [event, { t }] = await Promise.all([getEventBySlug(slug), getI18n()]);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = buildIcs(
    {
      slug: event.slug,
      name: event.name,
      summary: event.summary,
      startsOn: event.starts_on,
      endsOn: event.ends_on,
      startTime: event.start_time ? event.start_time.slice(0, 5) : null,
      placeName: event.place_name,
      address: event.address,
      postalCode: event.postal_code,
      city: event.city,
      lat: event.lat,
      lng: event.lng,
      formats: event.formats,
      isDemo: event.is_demo,
    },
    { url: `${siteUrl()}/evenement/${event.slug}`, labels: t.events.ics },
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
