import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSessionUser, homeFor, safeNext } from "@/lib/auth/session";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.nav.login, robots: { index: false } };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getSessionUser()]);
  const next = safeNext(params.next);
  if (user) redirect(next ?? homeFor(user.role));
  const initialError = params.erreur === "suspendu" ? "suspended" : params.erreur === "lien" ? "link" : null;
  return <SignInForm next={next} googleEnabled={GOOGLE_AUTH_ENABLED} initialError={initialError} />;
}
