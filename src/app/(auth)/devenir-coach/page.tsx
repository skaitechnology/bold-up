import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthSide } from "@/components/auth/auth-side";
import { Button, ButtonLink } from "@/components/ui/button";
import { becomeCoachAction } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.auth.becomeTitle, robots: { index: false } };
}

export default async function BecomeCoachPage() {
  const [user, { t }] = await Promise.all([getSessionUser(), getI18n()]);
  if (!user) redirect("/inscription?role=coach");
  if (user.role === "coach") redirect("/pro");
  if (user.role === "admin") notFound();
  const a = t.account.auth;
  return (
    <div className="animate-fade-up">
      <AuthSide title={a.sideTitleCoach} text={a.sideTextCoach} />
      <h1 className="display text-[34px] text-ink md:text-[42px]">{a.becomeTitle}</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-muted">{a.becomeText}</p>
      <form action={becomeCoachAction} className="mt-8 flex flex-col gap-3">
        <Button type="submit" size="lg" block iconRight={ArrowRight}>
          {a.becomeCta}
        </Button>
        <ButtonLink href="/compte" variant="ghost" block>
          {t.common.actions.cancel}
        </ButtonLink>
      </form>
    </div>
  );
}
