import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure access to a professional document.
 * The row is read with the caller's own session, so row level security decides: only the
 * owning coach and admins can see it. The file itself is served through a signed URL
 * that expires after one minute; the bucket is private and has no public URLs.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: document } = await supabase.from("coach_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!document) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: signed, error } = await supabase.storage.from("coach-documents").createSignedUrl(document.storage_path, 60);
  if (error || !signed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
