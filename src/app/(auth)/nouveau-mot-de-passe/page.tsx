import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/password-forms";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.auth.resetTitle, robots: { index: false } };
}

export default async function NewPasswordPage() {
  const user = await getSessionUser();
  return <NewPasswordForm home={user ? homeFor(user.role) : "/connexion"} />;
}
