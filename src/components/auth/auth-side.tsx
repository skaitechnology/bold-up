"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};
const getTarget = () => document.getElementById("auth-side");
const getServerTarget = () => null;

/** Lets each auth page put its own headline on the image panel of the shared layout. */
export function AuthSide({ title, text }: { title: string; text: string }) {
  // The panel only exists in the browser: read it as an external, client-only value.
  const target = useSyncExternalStore(subscribe, getTarget, getServerTarget);
  if (!target) return null;
  return createPortal(
    <>
      <p className="display max-w-[14ch] text-[44px] xl:text-[56px]">{title}</p>
      <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/75">{text}</p>
    </>,
    target,
  );
}
