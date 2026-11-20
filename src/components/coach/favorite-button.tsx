"use client";

import { clsx } from "clsx";
import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { toggleFavoriteAction } from "@/lib/actions/favorites";
import { useI18n } from "@/lib/i18n/client";

/** Heart toggle. Asks visitors to sign in first, then saves for real. */
export function FavoriteButton({
  coachId,
  initial,
  signedIn,
  variant = "overlay",
  className,
}: {
  coachId: string;
  initial: boolean;
  signedIn: boolean;
  variant?: "overlay" | "outline";
  className?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [favorite, setFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!signedIn) {
      router.push(`/connexion?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const result = await toggleFavoriteAction(coachId);
      if (!result.ok) {
        setFavorite(!next);
        toast.error(t.common.errors[result.error]);
        return;
      }
      setFavorite(result.data.favorite);
      toast.success(result.data.favorite ? t.account.favorites.added : t.account.favorites.removed);
    });
  };

  const label = favorite ? t.site.coach.saved : t.site.coach.save;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className={clsx(
        "press inline-flex shrink-0 items-center justify-center rounded-full",
        variant === "overlay" && "h-10 w-10 bg-white/92 text-ink shadow-card backdrop-blur hover:bg-white",
        variant === "outline" && "h-11 w-11 border border-line2 bg-paper text-ink hover:border-ink",
        className,
      )}
    >
      <Heart size={18} aria-hidden className={clsx(favorite && "fill-ink")} />
    </button>
  );
}
