import type { ReactNode } from "react";
import { PlaceIcon } from "@/components/brand/kind-icon";

/** Night-coloured header of a place listing, lit by the colour of its category. */
export function ListingHero({
  category,
  eyebrow,
  headline,
  accent,
  text,
  stats,
  note,
}: {
  category: "club" | "street_workout";
  eyebrow: string;
  headline: string;
  accent: string;
  text: string;
  /** Real counts read from the database, never invented figures. */
  stats: string[];
  note?: ReactNode;
}) {
  return (
    <section data-tone={category} className="on-dark relative isolate overflow-hidden bg-night text-paper">
      <span aria-hidden className="tone-solid absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full opacity-45 blur-3xl" />
      <span aria-hidden className="tone-fill animate-float absolute -bottom-12 right-2 -z-10 opacity-25 md:right-[8%] md:opacity-60">
        <PlaceIcon category={category} size={250} />
      </span>
      <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-10 md:px-8 md:pb-14 md:pt-16">
        <p className="eyebrow animate-fade-up inline-flex items-center gap-2 text-white/80">
          <span className="tone-solid flex h-7 w-7 items-center justify-center rounded-full">
            <PlaceIcon category={category} size={14} />
          </span>
          {eyebrow}
        </p>
        <h1 className="display animate-fade-up mt-5 text-[42px] sm:text-[56px] md:text-[72px]" style={{ animationDelay: "60ms" }}>
          {headline} <span className="text-bold-gradient">{accent}</span>
        </h1>
        <p className="animate-fade-up mt-5 max-w-xl text-[16px] leading-relaxed text-white/78 md:text-[18px]" style={{ animationDelay: "120ms" }}>
          {text}
        </p>
        <ul className="animate-fade-up mt-7 flex flex-wrap gap-2" style={{ animationDelay: "180ms" }}>
          {stats.map((stat) => (
            <li key={stat} className="inline-flex h-9 items-center rounded-full bg-white/10 px-4 text-[13.5px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur">
              {stat}
            </li>
          ))}
        </ul>
        {note ? <div className="animate-fade-up mt-4" style={{ animationDelay: "220ms" }}>{note}</div> : null}
      </div>
    </section>
  );
}
