"use client";

import { useState } from "react";
import { CityCombobox, type PlaceValue } from "@/components/site/city-combobox";
import { Field, Select, Switch } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";

type Initial = {
  city: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  service_radius_km: number;
  at_gym: boolean;
  at_home: boolean;
  outdoor: boolean;
  online: boolean;
};

/** Town picker (never a street address), travel radius and where sessions take place. */
export function LocationFields({ initial }: { initial: Initial }) {
  const { t } = useI18n();
  const p = t.pro.profile;
  const [place, setPlace] = useState<PlaceValue | null>(
    initial.city && initial.lat != null && initial.lng != null
      ? { name: initial.city, postcode: initial.postal_code ?? undefined, lat: initial.lat, lng: initial.lng }
      : null,
  );
  return (
    <div className="space-y-5">
      <Field label={p.city} hint={p.cityHint} htmlFor="coach-city">
        <CityCombobox value={place} onChange={setPlace} allowLocate={false} inputId="coach-city" />
      </Field>
      <input type="hidden" name="city" value={place?.name ?? ""} />
      <input type="hidden" name="postal_code" value={place?.postcode ?? ""} />
      <input type="hidden" name="lat" value={place?.lat ?? ""} />
      <input type="hidden" name="lng" value={place?.lng ?? ""} />
      <Field label={p.radius}>
        <Select name="service_radius_km" defaultValue={initial.service_radius_km}>
          {[2, 3, 5, 8, 10, 15, 20, 30].map((km) => (
            <option key={km} value={km}>
              {km} km
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink">{p.whereTitle}</p>
        <div className="divide-y divide-line rounded-2xl border border-line px-4 py-1">
          <Switch name="at_gym" defaultChecked={initial.at_gym} label={p.atGym} description={p.atGymText} />
          <Switch name="at_home" defaultChecked={initial.at_home} label={p.atHome} description={p.atHomeText} />
          <Switch name="outdoor" defaultChecked={initial.outdoor} label={p.outdoor} description={p.outdoorText} />
          <Switch name="online" defaultChecked={initial.online} label={p.online} description={p.onlineText} />
        </div>
      </div>
    </div>
  );
}
