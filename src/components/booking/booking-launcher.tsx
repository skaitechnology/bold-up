"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { BookingPanel } from "./booking-panel";

type PanelProps = React.ComponentProps<typeof BookingPanel>;

/**
 * Phone version of the booking panel: a sticky bar with the starting price that opens
 * the same panel in a bottom sheet. Hidden on desktop, where the panel sits in the page.
 */
export function BookingLauncher({ minPriceCents, autoOpen, ...panel }: PanelProps & { minPriceCents: number | null; autoOpen?: boolean }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Coming back from sign-in: reopen where the visitor left off (phones only).
    if (!autoOpen || !window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [autoOpen]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="min-w-0">
            {minPriceCents != null ? (
              <p className="text-[13px] text-muted">
                {t.common.from} <span className="text-[19px] font-semibold text-ink">{formatPrice(minPriceCents, locale)}</span>
              </p>
            ) : null}
            <p className="truncate text-[12px] text-faint">{t.site.booking.priceNote.split(".")[0]}</p>
          </div>
          <Button size="lg" variant="accent" onClick={() => setOpen(true)} className="shrink-0 !px-6" data-testid="booking-open">
            {t.site.coach.book}
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.site.booking.title} closeLabel={t.common.actions.close}>
        <BookingPanel {...panel} />
      </Sheet>
    </>
  );
}
