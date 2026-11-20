"use client";

import { clsx } from "clsx";
import { LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GeoResult } from "@/app/api/geo/route";
import { searchCommunes } from "@/lib/geo";
import { useI18n } from "@/lib/i18n/client";

export type PlaceValue = { name: string; postcode?: string; lat: number; lng: number; isMe?: boolean };

const localResults = (query: string): GeoResult[] =>
  searchCommunes(query, 5).map((place) => ({
    label: `${place.name} (${place.postcode})`,
    name: place.name,
    postcode: place.postcode,
    context: place.dep,
    lat: place.lat,
    lng: place.lng,
  }));

/**
 * Town search with suggestions. Starts with the built-in launch-area list (instant),
 * then asks the national address base. Geolocation is opt-in: nothing is requested
 * until the visitor picks "near me", and a refusal just shows a message.
 */
export function CityCombobox({
  value,
  onChange,
  placeholder,
  allowLocate = true,
  inverse,
  inputId,
  className,
}: {
  value: PlaceValue | null;
  onChange: (place: PlaceValue) => void;
  placeholder?: string;
  allowLocate?: boolean;
  inverse?: boolean;
  inputId?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const s = t.site.search;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  // Remote suggestions are kept with the query they answer; until they arrive, the
  // built-in launch-area list is shown instantly.
  const [remote, setRemote] = useState<{ query: string; results: GeoResult[] } | null>(null);
  const [highlight, setHighlight] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Follow the value chosen by the parent (derived during render, no effect needed).
  const [syncedName, setSyncedName] = useState(value?.name);
  if (value?.name !== syncedName) {
    setSyncedName(value?.name);
    setText(value?.name ?? "");
  }

  const query = text.trim();
  const results = useMemo(() => (remote?.query === query ? remote.results : localResults(query)), [remote, query]);

  useEffect(() => {
    if (!open) return;
    if (query.length < 2 || query === value?.name) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geo?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const body = (await response.json()) as { results: GeoResult[] };
        setRemote({ query, results: body.results });
      } catch {
        // keep the local suggestions
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open, value?.name]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setText(value?.name ?? "");
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, value?.name]);

  const choose = (result: GeoResult) => {
    onChange({ name: result.name, postcode: result.postcode, lat: result.lat, lng: result.lng });
    setText(result.name);
    setOpen(false);
    setHighlight(-1);
  };

  const locate = () => {
    setNotice(null);
    if (!("geolocation" in navigator)) {
      setNotice(s.locationDenied);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({ name: s.aroundMe, lat: position.coords.latitude, lng: position.coords.longitude, isMe: true });
        setText(s.aroundMe);
        setOpen(false);
      },
      () => {
        setLocating(false);
        setNotice(s.locationDenied);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <div
        className={clsx(
          "flex h-12 items-center gap-2 rounded-2xl border px-3.5 transition",
          inverse ? "border-transparent bg-white" : "border-line2 bg-paper focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/8",
        )}
      >
        <MapPin size={18} aria-hidden className="shrink-0 text-muted" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={text}
          placeholder={placeholder ?? s.cityPlaceholder}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlight((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              const pick = results[highlight] ?? results[0];
              if (open && pick) {
                event.preventDefault();
                choose(pick);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
              setText(value?.name ?? "");
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none md:text-[15px]"
          data-testid="city-input"
        />
        {locating ? <LoaderCircle size={17} className="shrink-0 animate-spin text-muted" aria-hidden /> : null}
      </div>
      {open ? (
        <div
          id={listId}
          role="listbox"
          className="animate-pop absolute inset-x-0 top-[54px] z-30 max-h-[320px] overflow-y-auto rounded-2xl border border-line bg-paper p-1.5 shadow-pop"
        >
          {allowLocate ? (
            <button
              type="button"
              onClick={locate}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14.5px] font-medium text-ink hover:bg-sand"
            >
              <LocateFixed size={17} aria-hidden />
              {locating ? s.locating : s.useMyLocation}
            </button>
          ) : null}
          {notice ? <p className="px-3 py-2 text-[13px] text-warn">{notice}</p> : null}
          {results.length === 0 ? <p className="px-3 py-2.5 text-[14px] text-muted">{s.noSuggestion}</p> : null}
          {results.map((result, index) => (
            <button
              key={`${result.label}-${result.lat}`}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onClick={() => choose(result)}
              onMouseEnter={() => setHighlight(index)}
              className={clsx(
                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14.5px] text-ink2",
                index === highlight ? "bg-sand" : "hover:bg-sand",
              )}
            >
              <MapPin size={16} aria-hidden className="shrink-0 text-faint" />
              <span className="truncate">
                <span className="font-medium text-ink">{result.name}</span>
                {result.postcode ? <span className="text-muted"> · {result.postcode}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
