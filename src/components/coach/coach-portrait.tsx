import { clsx } from "clsx";
import { initials } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

/**
 * A coach's photo, or a designed monogram when there is none yet.
 * The parent sets the size and aspect ratio; this fills it.
 */
export function CoachPortrait({
  photoPath,
  name,
  className,
  eager,
}: {
  photoPath: string | null | undefined;
  name: string;
  className?: string;
  eager?: boolean;
}) {
  const src = mediaUrl(photoPath);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={clsx("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      role="img"
      className={clsx(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-ink text-paper",
        "bg-[radial-gradient(120%_80%_at_80%_0%,rgb(184_151_90/0.28),transparent_60%)]",
        className,
      )}
    >
      <span className="wordmark text-[clamp(40px,22cqw,120px)] text-white/90" style={{ containerType: "inline-size" }}>
        {initials(name)}
      </span>
      <span aria-hidden className="absolute bottom-0 left-0 h-1 w-1/3 bg-gold" />
    </div>
  );
}
