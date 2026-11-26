"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CityCombobox } from "@/components/site/city-combobox";
import { writePlace, type SearchPlace } from "@/lib/search-params";

/**
 * Town picker of a place listing. The other filters are plain links rendered on the
 * server; this one needs suggestions and geolocation, so it navigates from the client,
 * keeping every other parameter of `baseUrl` (the current URL without place or radius).
 */
export function CityFilter({ place, radiusKm, baseUrl, className }: { place: SearchPlace; radiusKm: number | null; baseUrl: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <CityCombobox
      value={place}
      onChange={(next) => {
        const [path = baseUrl, query = ""] = baseUrl.split("?");
        const params = new URLSearchParams(query);
        writePlace(params, { name: next.name, lat: next.lat, lng: next.lng, isMe: next.isMe }, radiusKm);
        const search = params.toString();
        startTransition(() => router.replace(search ? `${path}?${search}` : path, { scroll: false }));
      }}
      className={clsx(pending && "opacity-60", className)}
    />
  );
}
