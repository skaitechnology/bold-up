"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CityCombobox } from "@/components/site/city-combobox";
import { buildEventsUrl, type EventsState } from "./utils";

/**
 * "Around which town?" for the events listing. The choice goes into the URL, so the page
 * is rendered again on the server with real distances from that place.
 */
export function EventsPlacePicker({ state, label }: { state: EventsState; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <label htmlFor="events-city" className="sr-only">
        {label}
      </label>
      <CityCombobox
        value={state.place}
        inverse
        inputId="events-city"
        onChange={(place) =>
          startTransition(() => router.replace(buildEventsUrl({ ...state, place: { name: place.name, lat: place.lat, lng: place.lng, isMe: place.isMe } }), { scroll: false }))
        }
      />
    </div>
  );
}
