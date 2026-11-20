"use client";

import { clsx } from "clsx";
import { Check, CircleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";

type Toast = { id: number; kind: "success" | "error"; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function push(kind: Toast["kind"], message: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, kind, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, kind === "error" ? 6000 : 3500);
}

/** Small feedback messages after an action. Call from client code: toast.success("…"). */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const emptyToasts: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => emptyToasts,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : "status"}
          className={clsx(
            "animate-pop pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full py-3 pl-4 pr-5 text-[14px] font-medium shadow-pop",
            item.kind === "success" ? "bg-ink text-paper" : "bg-danger text-white",
          )}
        >
          {item.kind === "success" ? <Check size={17} aria-hidden /> : <CircleAlert size={17} aria-hidden />}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
