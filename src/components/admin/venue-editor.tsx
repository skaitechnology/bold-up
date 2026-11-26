"use client";

import { LocateFixed, PencilLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { GeoResult } from "@/app/api/geo/route";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { saveVenueAction } from "@/lib/actions/venues";
import { CLUB_FEATURES, isPlaceFeature, SPOT_FEATURES, VENUE_CATEGORIES } from "@/lib/domain";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export type EditableVenue = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  facilities: string[];
  sports: string[];
  is_free: boolean;
  always_open: boolean;
  partner_status: string;
  claim_status: string;
  is_published: boolean;
};

export type SportOption = { slug: string; name_fr: string; name_en: string };

/**
 * Create or edit a place: a gym or studio, a sports club, or a street workout spot.
 * The category decides which extra fields are offered (disciplines and audiences for a
 * club, equipment for a spot). "Locate" turns the typed address into coordinates
 * (national address base).
 */
export function VenueEditor({ venue, sports, defaultCategory = "gym" }: { venue?: EditableVenue; sports: SportOption[]; defaultCategory?: string }) {
  const { t, locale } = useI18n();
  const v = t.admin.venues;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(venue?.category ?? defaultCategory);
  const isSpot = category === "street_workout";
  const isClub = category === "club";
  const featureOptions = isSpot ? SPOT_FEATURES : isClub ? CLUB_FEATURES : [];
  // Facilities are stored together: known keys are ticked below, the rest stays free text.
  const freeText = venue?.facilities.filter((item) => !isPlaceFeature(item)) ?? [];
  const [locating, setLocating] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const locate = async () => {
    const root = formRef.current;
    if (!root) return;
    const value = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value.trim() ?? "";
    const query = [value("address"), value("postal_code"), value("city")].filter(Boolean).join(" ");
    if (query.length < 3) return;
    setLocating(true);
    try {
      const response = await fetch(`/api/geo?type=address&q=${encodeURIComponent(query)}`);
      const body = (await response.json()) as { results: GeoResult[] };
      const hit = body.results[0];
      if (!hit) {
        toast.error(v.locateFailed);
        return;
      }
      const set = (name: string, next: string) => {
        const input = root.querySelector<HTMLInputElement>(`[name="${name}"]`);
        if (input) input.value = next;
      };
      set("lat", hit.lat.toFixed(5));
      set("lng", hit.lng.toFixed(5));
      if (!value("city")) set("city", hit.name);
      if (!value("postal_code")) set("postal_code", hit.postcode);
      toast.success(v.located);
    } catch {
      toast.error(v.locateFailed);
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      {venue ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t.common.actions.edit} — ${venue.name}`}
          className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand"
          data-testid="venue-edit"
        >
          <PencilLine size={17} aria-hidden />
        </button>
      ) : (
        <Button icon={Plus} onClick={() => setOpen(true)} data-testid="venue-add">
          {v.add}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={venue ? v.edit : v.add} closeLabel={t.common.actions.close} size="lg">
        <ActionForm
          action={saveVenueAction}
          success={v.saved}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="pt-2"
        >
          <div ref={formRef} className="space-y-4">
            <input type="hidden" name="id" value={venue?.id ?? ""} />
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label={v.name}>
                <Input name="name" required minLength={2} maxLength={120} defaultValue={venue?.name} />
              </Field>
              <Field label={v.category}>
                <Select name="category" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="venue-category">
                  {VENUE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t.common.venueCategories[category]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={v.description} optional={t.common.optional}>
              <Textarea name="description" rows={3} maxLength={1200} defaultValue={venue?.description} />
            </Field>
            <Field label={v.address} optional={t.common.optional}>
              <Input name="address" maxLength={200} defaultValue={venue?.address ?? ""} autoComplete="off" />
            </Field>
            <div className="grid grid-cols-[130px_1fr] gap-4">
              <Field label={v.postalCode}>
                <Input name="postal_code" maxLength={10} defaultValue={venue?.postal_code ?? ""} inputMode="numeric" />
              </Field>
              <Field label={v.city}>
                <Input name="city" maxLength={80} defaultValue={venue?.city ?? ""} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={v.lat}>
                <Input name="lat" required inputMode="decimal" defaultValue={venue?.lat ?? ""} placeholder="48.78451" />
              </Field>
              <Field label={v.lng}>
                <Input name="lng" required inputMode="decimal" defaultValue={venue?.lng ?? ""} placeholder="2.45298" />
              </Field>
              <Button variant="secondary" icon={LocateFixed} onClick={locate} loading={locating} className="col-span-2 !h-12 sm:col-span-1">
                {v.locate}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={v.phone} optional={t.common.optional}>
                <Input name="phone" type="tel" maxLength={30} defaultValue={venue?.phone ?? ""} />
              </Field>
              <Field label={v.website} optional={t.common.optional}>
                <Input name="website" type="url" maxLength={200} defaultValue={venue?.website ?? ""} placeholder="https://" />
              </Field>
            </div>
            {!isSpot ? (
              <fieldset>
                <legend className="mb-1 text-[13.5px] font-medium text-ink">{v.sports}</legend>
                <p className="mb-2.5 text-[12.5px] leading-snug text-muted">{v.sportsHint}</p>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sport) => (
                    <ChoiceChip key={sport.slug} name="sports" value={sport.slug} defaultChecked={venue?.sports.includes(sport.slug)}>
                      {localizedName(sport, locale)}
                    </ChoiceChip>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {featureOptions.length ? (
              <fieldset>
                <legend className="mb-2.5 text-[13.5px] font-medium text-ink">{isSpot ? v.spotFeatures : v.clubFeatures}</legend>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map((feature) => (
                    <ChoiceChip key={feature} name="features" value={feature} defaultChecked={venue?.facilities.includes(feature)}>
                      {t.places.features[feature]}
                    </ChoiceChip>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <Field label={v.facilities} hint={v.facilitiesHint} optional={t.common.optional}>
              <Input name="facilities" maxLength={600} defaultValue={freeText.join(", ")} />
            </Field>
            <div className="divide-y divide-line rounded-2xl border border-line px-4 py-1">
              <Switch name="is_free" defaultChecked={venue?.is_free ?? isSpot} label={v.isFree} description={v.isFreeHint} />
              <Switch name="always_open" defaultChecked={venue?.always_open ?? false} label={v.alwaysOpen} description={v.alwaysOpenHint} />
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line px-4 py-1">
              <Switch name="partner_status" defaultChecked={venue?.partner_status === "partner"} label={v.partner} description={v.partnerHint} />
              <Switch name="claim_status" defaultChecked={venue?.claim_status === "claimed"} label={v.claimed} />
              <Switch name="is_published" defaultChecked={venue?.is_published ?? true} label={v.published} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" block onClick={() => setOpen(false)}>
                {t.common.actions.cancel}
              </Button>
              <SubmitButton block data-testid="venue-save">
                {t.common.actions.save}
              </SubmitButton>
            </div>
          </div>
        </ActionForm>
      </Sheet>
    </>
  );
}
