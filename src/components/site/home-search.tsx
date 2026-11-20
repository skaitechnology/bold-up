"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE, type SearchPlace } from "@/lib/search-params";
import { CityCombobox } from "./city-combobox";

type Sport = { slug: string; name_fr: string; name_en: string };

/** The one thing the home page asks: which sport, and where. */
export function HomeSearch({ sports }: { sports: Sport[] }) {
  const { t, locale } = useI18n();
  const h = t.site.home;
  const router = useRouter();
  const [sport, setSport] = useState("");
  const [place, setPlace] = useState<SearchPlace>(DEFAULT_SEARCH_PLACE);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(buildSearchUrl({ sport: sport || null, place }));
      }}
      className="flex flex-col gap-2 rounded-[28px] bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur-md md:flex-row md:items-center md:rounded-full"
    >
      <label className="relative flex-1">
        <span className="sr-only">{h.searchSport}</span>
        <select
          value={sport}
          onChange={(event) => setSport(event.target.value)}
          className="h-12 w-full appearance-none rounded-2xl bg-white px-4 text-[16px] font-medium text-ink outline-none md:rounded-full md:text-[15px]"
          data-testid="home-sport"
        >
          <option value="">{h.allSports}</option>
          {sports.map((item) => (
            <option key={item.slug} value={item.slug}>
              {localizedName(item, locale)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex-1">
        <label htmlFor="home-city" className="sr-only">
          {h.searchCity}
        </label>
        <CityCombobox value={place} onChange={setPlace} inverse inputId="home-city" className="[&>div:first-child]:md:rounded-full" />
      </div>
      <Button type="submit" size="lg" variant="inverse" iconRight={ArrowRight} className="!h-12 md:px-7" data-testid="home-search">
        {h.searchCta}
      </Button>
    </form>
  );
}
