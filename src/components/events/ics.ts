// Builds the .ics file behind "Ajouter à mon agenda" (RFC 5545). Pure: no I/O.
//
// Events are written as all-day entries on their local (Paris) dates. The table stores a
// start time but no end time, and an invented duration would be a made-up fact; the start
// time is given in the description instead.

import { addDaysToKey } from "@/lib/format";

export type IcsEvent = {
  slug: string;
  name: string;
  summary: string;
  startsOn: string;
  endsOn: string | null;
  /** HH:MM, Paris time. */
  startTime: string | null;
  placeName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number;
  lng: number;
  formats: string[];
  isDemo: boolean;
};

export type IcsLabels = {
  demoPrefix: string;
  demoNote: string;
  start: (time: string) => string;
  formats: (list: string) => string;
  more: (url: string) => string;
};

/** Escapes a TEXT value: backslash, semicolon, comma and line breaks. */
export function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line so that no line is longer than 75 octets (continuations start with a space). */
export function icsFold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // continuation lines carry one leading space, which counts in their 75 octets
    if (size + bytes > 75) {
      out.push(current);
      current = ` ${char}`;
      size = 1 + bytes;
    } else {
      current += char;
      size += bytes;
    }
  }
  out.push(current);
  return out.join("\r\n");
}

const compact = (key: string) => key.replace(/-/g, "");
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function buildIcs(event: IcsEvent, options: { url: string; labels: IcsLabels; now?: Date }): string {
  const { url, labels, now = new Date() } = options;
  const lastDay = event.endsOn && event.endsOn > event.startsOn ? event.endsOn : event.startsOn;
  const location = [event.placeName, event.address, [event.postalCode, event.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const description = [
    event.isDemo ? labels.demoNote : null,
    event.summary || null,
    event.startTime ? labels.start(event.startTime) : null,
    event.formats.length ? labels.formats(event.formats.join(", ")) : null,
    labels.more(url),
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bold Up//Events//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.slug}@boldup`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compact(event.startsOn)}`,
    // the end of an all-day event is exclusive: the day after the last day
    `DTEND;VALUE=DATE:${compact(addDaysToKey(lastDay, 1))}`,
    `SUMMARY:${icsEscape(event.isDemo ? `${labels.demoPrefix} ${event.name}` : event.name)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    `GEO:${event.lat.toFixed(5)};${event.lng.toFixed(5)}`,
    `URL:${url}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));

  return `${lines.map(icsFold).join("\r\n")}\r\n`;
}
