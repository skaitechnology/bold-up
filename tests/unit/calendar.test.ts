import { describe, expect, it } from "vitest";
import {
  BOOKING_HORIZON_DAYS,
  DEFAULT_CALENDAR_VIEW,
  addMonths,
  bookingHorizon,
  calendarViewParam,
  canShiftPeriod,
  clampKey,
  dayPartOf,
  endOfMonth,
  groupByParisDay,
  monthGrid,
  nextDayWith,
  parisHour,
  parseCalendarView,
  parseDateKey,
  periodRange,
  sameMonth,
  shiftPeriod,
  shiftWithin,
  startOfMonth,
  startOfWeek,
  weekDays,
  weekdayOf,
} from "@/lib/calendar";

describe("calendar views", () => {
  it("opens on the week", () => {
    expect(DEFAULT_CALENDAR_VIEW).toBe("week");
    expect(parseCalendarView(undefined)).toBe("week");
    expect(parseCalendarView("n'importe quoi")).toBe("week");
  });
  it("reads and writes the French URL values", () => {
    expect(parseCalendarView("jour")).toBe("day");
    expect(parseCalendarView("mois")).toBe("month");
    for (const view of ["day", "week", "month"] as const) expect(parseCalendarView(calendarViewParam(view))).toBe(view);
  });
});

describe("date keys", () => {
  it("accepts real days only", () => {
    expect(parseDateKey("2026-11-26")).toBe("2026-11-26");
    expect(parseDateKey("2028-02-29")).toBe("2028-02-29"); // leap year
    expect(parseDateKey("2027-02-29")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("26/11/2026")).toBeNull();
    expect(parseDateKey("")).toBeNull();
    expect(parseDateKey(undefined)).toBeNull();
  });
  it("clamps to a range", () => {
    expect(clampKey("2026-11-20", "2026-11-26", "2026-12-24")).toBe("2026-11-26");
    expect(clampKey("2026-12-30", "2026-11-26", "2026-12-24")).toBe("2026-12-24");
    expect(clampKey("2026-12-01", "2026-11-26", "2026-12-24")).toBe("2026-12-01");
  });
});

describe("weeks", () => {
  it("numbers weekdays the ISO way, Monday first", () => {
    expect(weekdayOf("2026-11-23")).toBe(1); // Monday
    expect(weekdayOf("2026-11-26")).toBe(4); // Thursday
    expect(weekdayOf("2026-11-29")).toBe(7); // Sunday
  });
  it("starts the week on Monday, also when the day is a Sunday", () => {
    expect(startOfWeek("2026-11-26")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-23")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-30")).toBe("2026-11-30");
  });
  it("lists the seven days across a month and a year boundary", () => {
    expect(weekDays("2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(weekDays("2027-01-01")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });
});

describe("months", () => {
  it("finds the first and last day", () => {
    expect(startOfMonth("2026-11-26")).toBe("2026-11-01");
    expect(endOfMonth("2026-11-26")).toBe("2026-11-30");
    expect(endOfMonth("2027-02-10")).toBe("2027-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-12-05")).toBe("2026-12-31");
  });
  it("adds months, pulling the day back when the month is shorter", () => {
    expect(addMonths("2026-11-26", 1)).toBe("2026-12-26");
    expect(addMonths("2026-12-26", 1)).toBe("2027-01-26");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2027-03-31", -1)).toBe("2027-02-28");
    expect(addMonths("2027-01-15", -1)).toBe("2026-12-15");
  });
  it("builds a grid of whole weeks, Monday first, that covers the month", () => {
    const november = monthGrid("2026-11-26"); // 1 November 2026 is a Sunday
    expect(november).toHaveLength(6);
    expect(november.every((week) => week.length === 7)).toBe(true);
    expect(november[0]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(november.at(-1)?.[0]).toBe("2026-11-30");
    expect(november.every((week) => weekdayOf(week[0]!) === 1)).toBe(true);

    const february = monthGrid("2027-02-10"); // 1 February 2027 is a Monday: exactly four weeks
    expect(february).toHaveLength(4);
    expect(february[0]?.[0]).toBe("2027-02-01");
    expect(february.at(-1)?.[6]).toBe("2027-02-28");

    const days = monthGrid("2026-12-15").flat();
    for (let day = 1; day <= 31; day++) expect(days).toContain(`2026-12-${String(day).padStart(2, "0")}`);
    expect(new Set(days).size).toBe(days.length);
  });
  it("tells whether two days share a month", () => {
    expect(sameMonth("2026-11-01", "2026-11-30")).toBe(true);
    expect(sameMonth("2026-11-30", "2026-12-01")).toBe(false);
  });
});

describe("periods", () => {
  it("gives the range a view shows", () => {
    expect(periodRange("day", "2026-11-26")).toEqual({ from: "2026-11-26", to: "2026-11-26" });
    expect(periodRange("week", "2026-11-26")).toEqual({ from: "2026-11-23", to: "2026-11-29" });
    expect(periodRange("month", "2026-11-26")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
  });
  it("moves by a day, a week or a month", () => {
    expect(shiftPeriod("day", "2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftPeriod("week", "2026-11-26", 1)).toBe("2026-12-03");
    expect(shiftPeriod("week", "2026-11-26", -1)).toBe("2026-11-19");
    expect(shiftPeriod("month", "2026-11-26", 1)).toBe("2026-12-26");
  });
});

describe("booking horizon", () => {
  const today = "2026-11-26"; // a Thursday
  const max = bookingHorizon(today);

  it("ends 28 days after today", () => {
    expect(BOOKING_HORIZON_DAYS).toBe(28);
    expect(max).toBe("2026-12-24");
    expect(bookingHorizon(today, 7)).toBe("2026-12-03");
  });
  it("never goes back before today", () => {
    expect(canShiftPeriod("day", today, -1, today, max)).toBe(false);
    expect(canShiftPeriod("week", today, -1, today, max)).toBe(false);
    expect(canShiftPeriod("month", today, -1, today, max)).toBe(false);
    expect(shiftWithin("week", today, -1, today, max)).toBe(today);
  });
  it("goes forward while the next period still holds a bookable day", () => {
    expect(canShiftPeriod("day", today, 1, today, max)).toBe(true);
    expect(canShiftPeriod("day", max, 1, today, max)).toBe(false);
    expect(canShiftPeriod("week", today, 1, today, max)).toBe(true);
    expect(canShiftPeriod("week", "2026-12-17", 1, today, max)).toBe(true); // the week of the 21st holds the 24th
    expect(canShiftPeriod("week", "2026-12-24", 1, today, max)).toBe(false);
    expect(canShiftPeriod("month", today, 1, today, max)).toBe(true);
    expect(canShiftPeriod("month", "2026-12-10", 1, today, max)).toBe(false);
  });
  it("keeps the cursor inside the bookable days", () => {
    // forward from a Sunday, the next week would start past the horizon's last day: clamp
    expect(shiftWithin("week", "2026-12-18", 1, today, max)).toBe("2026-12-24");
    // back to the current week from next Monday lands on today, not on last Monday
    expect(shiftWithin("week", "2026-11-30", -1, today, max)).toBe(today);
    expect(shiftWithin("month", "2026-12-20", -1, today, max)).toBe(today);
    expect(shiftWithin("day", "2026-12-01", 1, today, max)).toBe("2026-12-02");
  });
  it("is unbounded when no range is given", () => {
    expect(canShiftPeriod("month", today, -1)).toBe(true);
    expect(canShiftPeriod("week", today, 1, null, null)).toBe(true);
  });
});

describe("Paris time", () => {
  it("reads the hour on a Paris clock, winter and summer", () => {
    expect(parisHour("2026-11-26T08:30:00Z")).toBe(9); // UTC+1
    expect(parisHour("2026-07-01T08:30:00Z")).toBe(10); // UTC+2
    expect(parisHour("2026-11-26T23:30:00Z")).toBe(0);
  });
  it("splits the day into morning, afternoon and evening", () => {
    expect(dayPartOf("2026-11-26T08:00:00Z")).toBe("morning"); // 09:00
    expect(dayPartOf("2026-11-26T10:59:00Z")).toBe("morning"); // 11:59
    expect(dayPartOf("2026-11-26T11:00:00Z")).toBe("afternoon"); // 12:00
    expect(dayPartOf("2026-11-26T17:00:00Z")).toBe("evening"); // 18:00
  });
  it("groups instants by the Paris day they fall on, in time order", () => {
    const slots = ["2026-11-27T09:00:00Z", "2026-11-26T23:30:00Z", "2026-11-26T09:00:00Z", "2026-11-27T08:00:00Z"];
    const days = groupByParisDay(slots, (slot) => slot);
    expect([...days.keys()].sort()).toEqual(["2026-11-26", "2026-11-27"]);
    // 23:30 UTC on the 26th is already 00:30 on the 27th in Paris
    expect(days.get("2026-11-26")).toEqual(["2026-11-26T09:00:00Z"]);
    expect(days.get("2026-11-27")).toEqual(["2026-11-26T23:30:00Z", "2026-11-27T08:00:00Z", "2026-11-27T09:00:00Z"]);
  });
  it("finds the next day that has something", () => {
    const days = ["2026-12-03", "2026-11-27", "2026-12-10"];
    expect(nextDayWith(days, "2026-11-26")).toBe("2026-11-27");
    expect(nextDayWith(days, "2026-11-28")).toBe("2026-12-03");
    expect(nextDayWith(days, "2026-12-11")).toBe("2026-11-27"); // nothing later: back to the first
    expect(nextDayWith([], "2026-11-26")).toBeNull();
  });
});
