"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveAvailabilityAction } from "@/lib/actions/pro";
import { useI18n } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/config";

type Range = { start: string; end: string };
type Week = Record<number, Range[]>;

const timeClass =
  "h-11 w-[104px] rounded-xl border border-line2 bg-paper px-3 text-[15px] tabular text-ink outline-none focus:border-ink focus:ring-4 focus:ring-ink/8";

function nextRange(ranges: Range[]): Range {
  const last = ranges[ranges.length - 1];
  if (!last) return { start: "09:00", end: "12:00" };
  const [hour] = last.end.split(":").map(Number) as [number];
  const start = Math.min(hour + 2, 21);
  return { start: `${String(start).padStart(2, "0")}:00`, end: `${String(Math.min(start + 3, 23)).padStart(2, "0")}:00` };
}

/** Weekly opening hours, in Paris local time. Bookable slots are derived from these. */
export function AvailabilityEditor({ initial }: { initial: { weekday: number; start_time: string; end_time: string }[] }) {
  const { t, locale } = useI18n();
  const a = t.pro.agenda;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [week, setWeek] = useState<Week>(() => {
    const result: Week = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const rule of [...initial].sort((x, y) => x.start_time.localeCompare(y.start_time))) {
      result[rule.weekday]?.push({ start: rule.start_time.slice(0, 5), end: rule.end_time.slice(0, 5) });
    }
    return result;
  });

  const dayName = (isoDay: number) => new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, isoDay)));
  const update = (day: number, ranges: Range[]) => setWeek((current) => ({ ...current, [day]: ranges }));

  const save = () => {
    const rules = Object.entries(week).flatMap(([day, ranges]) => ranges.map((range) => ({ weekday: Number(day), start: range.start, end: range.end })));
    startTransition(async () => {
      const result = await saveAvailabilityAction(rules);
      if (!result.ok) {
        toast.error(result.error === "invalid_input" ? a.invalidRange : t.common.errors[result.error]);
        return;
      }
      toast.success(a.hoursSaved);
      router.refresh();
    });
  };

  return (
    <div data-testid="availability-editor">
      <ul className="divide-y divide-line">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const ranges = week[day] ?? [];
          return (
            <li key={day} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:gap-6" data-day={day}>
              <div className="flex items-center justify-between md:w-36 md:pt-2.5">
                <span className="text-[15px] font-semibold capitalize-first text-ink">{dayName(day)}</span>
                {ranges.length === 0 ? <span className="text-[13.5px] text-faint md:hidden">{a.closed}</span> : null}
              </div>
              <div className="flex-1 space-y-2">
                {ranges.length === 0 ? <p className="hidden h-11 items-center text-[14px] text-faint md:flex">{a.closed}</p> : null}
                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="sr-only">{a.from}</span>
                    <input
                      type="time"
                      step={900}
                      value={range.start}
                      aria-label={`${dayName(day)} — ${a.from}`}
                      onChange={(event) => update(day, ranges.map((item, i) => (i === index ? { ...item, start: event.target.value } : item)))}
                      className={timeClass}
                    />
                    <span className="text-[14px] text-muted">{a.to}</span>
                    <input
                      type="time"
                      step={900}
                      value={range.end}
                      aria-label={`${dayName(day)} — ${a.to}`}
                      onChange={(event) => update(day, ranges.map((item, i) => (i === index ? { ...item, end: event.target.value } : item)))}
                      className={timeClass}
                    />
                    <button
                      type="button"
                      onClick={() => update(day, ranges.filter((_, i) => i !== index))}
                      aria-label={a.removeRange}
                      className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <X size={17} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => update(day, [...ranges, nextRange(ranges)])}
                disabled={ranges.length >= 4}
                className="press inline-flex h-10 items-center gap-1.5 self-start rounded-full px-3 text-[13.5px] font-semibold text-ink hover:bg-sand disabled:opacity-40 md:mt-0.5"
                data-testid="add-range"
              >
                <Plus size={16} aria-hidden />
                {a.addRange}
              </button>
            </li>
          );
        })}
      </ul>
      <Button onClick={save} loading={pending} className="mt-4" data-testid="availability-save">
        {a.saveHours}
      </Button>
    </div>
  );
}
