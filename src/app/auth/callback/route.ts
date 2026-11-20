import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { homeFor, safeNext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for every e-mail link and OAuth provider:
 * exchanges the one-time code (or token hash) for a session cookie, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const wantsCoach = searchParams.get("role") === "coach";

  const supabase = await createClient();
  let failed = true;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  }
  if (failed) return NextResponse.redirect(`${origin}/connexion?erreur=lien`);

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.redirect(`${origin}/connexion?erreur=lien`);

  // "Continue with Google" from the coach sign-up screen: OAuth accounts start as
  // customers, the database function upgrades them to a (draft) coach account.
  if (wantsCoach) await supabase.rpc("become_coach");

  const { data: profile } = await supabase.from("profiles").select("role, is_suspended").eq("id", userId).maybeSingle();
  if (!profile || profile.is_suspended) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/connexion?erreur=suspendu`);
  }
  return NextResponse.redirect(`${origin}${next ?? homeFor(profile.role)}`);
}
