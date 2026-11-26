"use client";

import { LocateFixed, PencilLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { GeoResult } from "@/app/api/geo/route";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { saveEventAction } from "@/lib/actions/events";
import { EVENT_KINDS, EVENT_LEVELS } from "@/lib/domain";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export type EditableEvent = {
  id: string;
  name: string;
  kind: string;
  sport_slug: string | null;
  summary: string;
  description: string;
  starts_on: string;
  ends_on: string | null;
  start_time: string | null;
  place_name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  lat: number;
  lng: number;
  formats: string[];
  level: string;
  price_from_cents: number | null;
  is_free: boolean;
  organizer: string | null;
  website: string | null;
  is_published: boolean;
  is_demo: boolean;
};

type SportOption = { slug: string; name_fr: string; name_en: string };

/** Create or edit an event. "Locate" turns the typed address into coordinates (national address base). */
export function EventEditor({ event, sports }: { event?: EditableEvent; sports: SportOption[] }) {
  const { t, locale } = useI18n();
  const a = t.events.admin;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [free, setFree] = useState(event?.is_free ?? false);
  const formRef = useRef<HTMLDivElement>(null);

  const locate = async () => {
    const root = formRef.current;
    if (!root) return;
    const value = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value.trim() ?? "";
    const query = [value("address") || value("place_name"), value("postal_code"), value("city")].filter(Boolean).join(" ");
    if (query.length < 3) return;
    setLocating(true);
    try {
      const response = await fetch(`/api/geo?type=address&q=${encodeURIComponent(query)}`);
      const body = (await response.json()) as { results: GeoResult[] };
      const hit = body.results[0];
      if (!hit) {
        toast.error(a.locateFailed);
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
      toast.success(a.located);
    } catch {
      toast.error(a.locateFailed);
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      {event ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t.common.actions.edit} — ${event.name}`}
          className="press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink2 hover:bg-sand"
          data-testid="event-edit"
        >
          <PencilLine size={17} aria-hidden />
        </button>
      ) : (
        <Button icon={Plus} variant="accent" onClick={() => setOpen(true)} data-testid="event-add">
          {a.add}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={event ? a.edit : a.add} description={event?.is_demo ? a.demoNote : undefined} closeLabel={t.common.actions.close} size="lg">
        <ActionForm
          action={saveEventAction}
          success={a.saved}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="pt-2"
        >
          <div ref={formRef} className="space-y-4">
            <input type="hidden" name="id" value={event?.id ?? ""} />
            <Field label={a.name}>
              <Input name="name" required minLength={2} maxLength={140} defaultValue={event?.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a.kind}>
                <Select name="kind" defaultValue={event?.kind ?? "local"}>
                  {EVENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t.events.kinds[kind]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={a.sport} optional={t.common.optional}>
                <Select name="sport_slug" defaultValue={event?.sport_slug ?? ""}>
                  <option value="">{a.noSport}</option>
                  {sports.map((sport) => (
                    <option key={sport.slug} value={sport.slug}>
                      {localizedName(sport, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={a.summary} hint={a.summaryHint} optional={t.common.optional}>
              <Input name="summary" maxLength={200} defaultValue={event?.summary} />
            </Field>
            <Field label={a.description} optional={t.common.optional}>
              <Textarea name="description" rows={4} maxLength={2000} defaultValue={event?.description} />
            </Field>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={a.startsOn}>
                <Input name="starts_on" type="date" required defaultValue={event?.starts_on} />
              </Field>
              <Field label={a.endsOn} optional={t.common.optional}>
                <Input name="ends_on" type="date" defaultValue={event?.ends_on ?? ""} />
              </Field>
              <Field label={a.startTime} optional={t.common.optional} className="col-span-2 sm:col-span-1">
                <Input name="start_time" type="time" defaultValue={event?.start_time?.slice(0, 5) ?? ""} />
              </Field>
            </div>
            <p className="-mt-2 text-[12.5px] text-muted">{a.endsOnHint}</p>
            <Field label={a.placeName} optional={t.common.optional}>
              <Input name="place_name" maxLength={140} defaultValue={event?.place_name ?? ""} />
            </Field>
            <Field label={a.address} optional={t.common.optional}>
              <Input name="address" maxLength={200} defaultValue={event?.address ?? ""} autoComplete="off" />
            </Field>
            <div className="grid grid-cols-[130px_1fr] gap-4">
              <Field label={a.postalCode}>
                <Input name="postal_code" maxLength={10} defaultValue={event?.postal_code ?? ""} inputMode="numeric" />
              </Field>
              <Field label={a.city}>
                <Input name="city" maxLength={80} defaultValue={event?.city ?? ""} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={a.lat}>
                <Input name="lat" required inputMode="decimal" defaultValue={event?.lat ?? ""} placeholder="48.78451" />
              </Field>
              <Field label={a.lng}>
                <Input name="lng" required inputMode="decimal" defaultValue={event?.lng ?? ""} placeholder="2.45298" />
              </Field>
              <Button variant="secondary" icon={LocateFixed} onClick={locate} loading={locating} className="col-span-2 !h-12 sm:col-span-1">
                {a.locate}
              </Button>
            </div>
            <Field label={a.formats} hint={a.formatsHint} optional={t.common.optional}>
              <Input name="formats" maxLength={400} defaultValue={event?.formats.join(", ") ?? ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a.level}>
                <Select name="level" defaultValue={event?.level ?? "all"}>
                  {EVENT_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t.events.levels[level]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={a.price} hint={a.priceHint} optional={t.common.optional}>
                <Input
                  name="price"
                  inputMode="decimal"
                  disabled={free}
                  defaultValue={event?.price_from_cents != null ? String(event.price_from_cents / 100) : ""}
                  placeholder="25"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a.organizer} optional={t.common.optional}>
                <Input name="organizer" maxLength={140} defaultValue={event?.organizer ?? ""} />
              </Field>
              <Field label={a.website} optional={t.common.optional}>
                <Input name="website" type="url" maxLength={200} defaultValue={event?.website ?? ""} placeholder="https://" />
              </Field>
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line px-4 py-1">
              <Switch name="is_free" checked={free} onChange={setFree} label={a.isFree} />
              <Switch name="is_published" defaultChecked={event?.is_published ?? true} label={a.isPublished} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" block onClick={() => setOpen(false)}>
                {t.common.actions.cancel}
              </Button>
              <SubmitButton block data-testid="event-save">
                {t.common.actions.save}
              </SubmitButton>
            </div>
          </div>
        </ActionForm>
      </Sheet>
    </>
  );
}
