import { SUPABASE_URL } from "@/lib/env";

/** Public URL of a file in a public storage bucket (coach photos, venue photos). */
export function mediaUrl(path: string | null | undefined, bucket: "coach-media" | "venue-media" = "coach-media"): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
