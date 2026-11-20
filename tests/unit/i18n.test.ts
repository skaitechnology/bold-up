import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/lib/errors";
import { addDaysToKey, formatDistance, formatDuration, formatPrice, formatTime, initials, parisDateKey } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type Node = string | ((...args: never[]) => string) | { [key: string]: Node };

function shape(node: Node, prefix = ""): string[] {
  if (typeof node === "string") return [`${prefix}:string`];
  if (typeof node === "function") return [`${prefix}:fn${node.length}`];
  return Object.entries(node).flatMap(([key, value]) => shape(value, prefix ? `${prefix}.${key}` : key));
}
function strings(node: Node, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  if (typeof node === "function") return [];
  return Object.entries(node).flatMap(([key, value]) => strings(value, prefix ? `${prefix}.${key}` : key));
}

describe("French and English dictionaries", () => {
  const fr = getDictionary("fr") as unknown as Node;
  const en = getDictionary("en") as unknown as Node;

  it("have exactly the same keys, with the same kind of value", () => {
    expect(shape(en)).toEqual(shape(fr));
  });
  it("have no empty text", () => {
    for (const [key, value] of [...strings(fr), ...strings(en)]) expect(value.trim(), key).not.toBe("");
  });
  it("are really translated (the two languages differ)", () => {
    const french = new Map(strings(fr));
    // Proper nouns are legitimately identical in both languages.
    const properNouns = new Set(["site.home.eyebrow", "account.auth.fullNamePlaceholder", "pro.profile.qualificationIssuerPlaceholder"]);
    const same = strings(en).filter(([key, value]) => french.get(key) === value && value.length > 14 && !properNouns.has(key));
    expect(same.map(([key]) => key)).toEqual([]);
  });
  it("cover every error code in both languages", () => {
    for (const locale of ["fr", "en"] as const) {
      const errors = getDictionary(locale).common.errors;
      for (const code of ERROR_CODES) expect(errors[code], `${locale}.${code}`).toBeTruthy();
    }
  });
});

describe("formatting", () => {
  it("shows prices in euros the French way", () => {
    expect(formatPrice(5000, "fr").replace(/\s/g, " ")).toBe("50 €");
    expect(formatPrice(4550, "fr").replace(/\s/g, " ")).toBe("45,50 €");
    expect(formatPrice(5000, "en")).toBe("€50");
  });
  it("formats durations and distances", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDistance(0.31, "fr")).toBe("300 m");
    expect(formatDistance(4.23, "fr").replace(/\s/g, " ")).toBe("4,2 km");
  });
  it("always uses Paris local time, across daylight saving", () => {
    // 23:30 UTC on 28 March 2026 is already 29 March in Paris (UTC+1, the night clocks change)
    expect(parisDateKey("2026-03-28T23:30:00Z")).toBe("2026-03-29");
    expect(formatTime("2026-07-01T16:00:00Z", "fr")).toBe("18:00"); // summer: UTC+2
    expect(formatTime("2026-12-01T16:00:00Z", "fr")).toBe("17:00"); // winter: UTC+1
  });
  it("does calendar arithmetic on date keys", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("builds initials", () => {
    expect(initials("Alexandre Moreau")).toBe("AM");
    expect(initials("Camille")).toBe("C");
  });
});
