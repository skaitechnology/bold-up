import { Accessibility, AlignJustify, Baby, Check, CircleDashed, CircleParking, Droplets, Equal, Grip, Lightbulb, RectangleHorizontal, Shirt, Smile, Trophy, Umbrella, UserRound, type LucideIcon } from "lucide-react";
import { PlaceIcon } from "@/components/brand/kind-icon";

const ICONS: Record<string, LucideIcon> = {
  parallel_bars: Equal,
  monkey_bars: Grip,
  rings: CircleDashed,
  abs_bench: RectangleHorizontal,
  stall_bars: AlignJustify,
  lighting: Lightbulb,
  water: Droplets,
  covered: Umbrella,
  competition: Trophy,
  leisure: Smile,
  kids: Baby,
  adults: UserRound,
  changing_rooms: Shirt,
  parking: CircleParking,
  accessible: Accessibility,
};

/** Icon for a place facility (a PLACE_FEATURES key). Unknown keys get a neutral tick. */
export function FeatureIcon({ feature, size = 16, className }: { feature: string; size?: number; className?: string }) {
  if (feature === "pull_up_bars") return <PlaceIcon category="street_workout" size={size} className={className} />;
  const Icon = ICONS[feature] ?? Check;
  return <Icon size={size} className={className} aria-hidden />;
}
