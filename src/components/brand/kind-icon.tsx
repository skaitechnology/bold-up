import { Building2, Flag, GraduationCap, MapPin, Medal, Mountain, PartyPopper, ShoppingBag, Sparkles, Target, Trophy, Users, Zap, type LucideIcon } from "lucide-react";

const PLACE_ICONS: Record<string, LucideIcon> = {
  gym: Building2,
  studio: Sparkles,
  shop: ShoppingBag,
  school: GraduationCap,
  other: MapPin,
  club: Users,
};

const EVENT_ICONS: Record<string, LucideIcon> = {
  hyrox: Zap,
  marathon: Medal,
  trail: Mountain,
  competition: Trophy,
  challenge: Target,
  local: PartyPopper,
};

/** A pull-up bar with a figure hanging from it: the street workout mark. */
function PullUpBar({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 5h18" />
      <path d="M5 5v15M19 5v15" />
      <circle cx="12" cy="10.2" r="1.7" />
      <path d="M9 5l1.6 3.4M15 5l-1.6 3.4" />
      <path d="M12 12v4.2M12 16.2l-1.8 3.3M12 16.2l1.8 3.3" />
    </svg>
  );
}

/** Icon for a place, from its `venues.category`. */
export function PlaceIcon({ category, size = 20, className }: { category: string; size?: number; className?: string }) {
  if (category === "street_workout") return <PullUpBar size={size} className={className} />;
  const Icon = PLACE_ICONS[category] ?? MapPin;
  return <Icon size={size} className={className} aria-hidden />;
}

/** Icon for an event, from its `events.kind`. */
export function EventIcon({ kind, size = 20, className }: { kind: string; size?: number; className?: string }) {
  const Icon = EVENT_ICONS[kind] ?? Flag;
  return <Icon size={size} className={className} aria-hidden />;
}
