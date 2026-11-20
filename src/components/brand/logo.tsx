import Link from "next/link";
import { clsx } from "clsx";

/** BOLD UP wordmark. The small champagne dot is the only ornament. */
export function Logo({
  href = "/",
  inverse,
  size = "md",
  className,
}: {
  href?: string;
  inverse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Bold Up"
      className={clsx(
        "wordmark inline-flex items-baseline gap-[0.26em] whitespace-nowrap",
        size === "sm" && "text-[15px]",
        size === "md" && "text-[18px]",
        size === "lg" && "text-[26px]",
        inverse ? "text-paper" : "text-ink",
        className,
      )}
    >
      <span>Bold</span>
      <span className="relative pr-[0.34em]">
        Up
        <span aria-hidden className="absolute right-0 top-[0.04em] h-[0.24em] w-[0.24em] rounded-full bg-gold" />
      </span>
    </Link>
  );
}
