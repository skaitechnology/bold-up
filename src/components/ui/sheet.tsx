"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Modal built on the native <dialog>: focus trap, Escape and inert background come for free.
 * Bottom sheet on phones, centered dialog from tablet up.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  closeLabel,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  closeLabel: string;
  size?: "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="bu-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <div
          className="flex h-full w-full items-end justify-center md:items-center md:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            className={clsx(
              "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-pop",
              "animate-sheet md:animate-pop md:rounded-[28px]",
              size === "md" ? "md:max-w-lg" : "md:max-w-2xl",
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 md:px-7 md:pt-6">
              <div className="min-w-0">
                <h2 id={titleId} className="display text-[22px] text-ink md:text-[24px]">
                  {title}
                </h2>
                {description ? <p className="mt-1.5 text-[14px] leading-snug text-muted">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="press -mr-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink2 hover:bg-sand"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7">{children}</div>
            {footer ? <div className="border-t border-line bg-paper px-5 py-4 pb-safe md:px-7">{footer}</div> : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
