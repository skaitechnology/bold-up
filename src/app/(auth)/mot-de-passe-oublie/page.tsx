import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.auth.forgotTitle, robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
