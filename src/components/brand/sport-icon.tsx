import { Activity, CircleDot, Dumbbell, Flame, Flower2, Footprints, HeartPulse, Waves, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  activity: Activity,
  footprints: Footprints,
  flower: Flower2,
  "circle-dot": CircleDot,
  flame: Flame,
  waves: Waves,
  zap: Zap,
  "heart-pulse": HeartPulse,
};

function BoxingGlove({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 20h7a1 1 0 0 0 1-1v-3.1c1.8-1 3-2.9 3-5.1V8a4 4 0 0 0-4-4h-3.5A3.5 3.5 0 0 0 8 7.5V9H6.8A2.8 2.8 0 0 0 4 11.8v.4A2.8 2.8 0 0 0 6.8 15H7v4a1 1 0 0 0 1 1Z" />
      <path d="M7 16.5h9" />
      <path d="M8 9v1.5a2 2 0 0 0 2 2h1.5" />
    </svg>
  );
}

/** Icon for a sport category, from the `icon` key stored on the sports table. */
export function SportIcon({ icon, size = 20, className }: { icon: string; size?: number; className?: string }) {
  if (icon === "boxing") return <BoxingGlove size={size} className={className} />;
  const Icon = ICONS[icon] ?? Dumbbell;
  return <Icon size={size} className={className} aria-hidden />;
}
