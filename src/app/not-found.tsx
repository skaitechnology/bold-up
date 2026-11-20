import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size="lg" />
      <span className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-sand text-ink">
        <Compass size={26} aria-hidden />
      </span>
      <h1 className="display mt-6 text-[34px] text-ink md:text-[44px]">{t.common.notFound.title}</h1>
      <p className="mt-3 max-w-sm text-[15px] text-muted">{t.common.notFound.text}</p>
      <ButtonLink href="/" size="lg" className="mt-8">
        {t.common.notFound.cta}
      </ButtonLink>
    </main>
  );
}
