import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSessionUser, homeFor, safeNext } from "@/lib/auth/session";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.nav.signup, robots: { index: false } };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getSessionUser()]);
  if (user) redirect(homeFor(user.role));
  const role = params.role === "coach" ? "coach" : params.role === "client" ? "customer" : null;
  return <SignUpForm initialRole={role} next={safeNext(params.next)} googleEnabled={GOOGLE_AUTH_ENABLED} />;
}
