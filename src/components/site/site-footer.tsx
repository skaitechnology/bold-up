import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitch } from "./language-switch";

export async function SiteFooter() {
  const { t } = await getI18n();
  const f = t.common.footer;
  const nav = t.common.nav;
  const linkClass = "text-[14px] text-white/70 hover:text-white";

  return (
    <footer className="on-dark bg-night text-paper">
      <div className="mx-auto max-w-[1320px] px-4 pb-28 pt-14 md:px-8 md:pb-12 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo inverse size="lg" />
            <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-white/70">{f.about}</p>
            <p className="mt-2 text-[13.5px] font-medium text-volt">{f.launch}</p>
          </div>
          <div>
            <p className="eyebrow text-white/50">{f.explore}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/coachs" className={linkClass}>
                  {nav.findCoach}
                </Link>
              </li>
              <li>
                <Link href="/carte" className={linkClass}>
                  {nav.map}
                </Link>
              </li>
              <li>
                <Link href="/clubs" className={linkClass}>
                  {nav.clubs}
                </Link>
              </li>
              <li>
                <Link href="/street-workout" className={linkClass}>
                  {nav.streetWorkout}
                </Link>
              </li>
              <li>
                <Link href="/evenements" className={linkClass}>
                  {nav.events}
                </Link>
              </li>
              <li>
                <Link href="/salles" className={linkClass}>
                  {nav.venues}
                </Link>
              </li>
              <li>
                <Link href="/inscription?role=coach" className={linkClass}>
                  {f.becomeCoach}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-white/50">{f.company}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/confidentialite" className={linkClass}>
                  {f.privacy}
                </Link>
              </li>
              <li>
                <Link href="/conditions" className={linkClass}>
                  {f.terms}
                </Link>
              </li>
              <li>
                <Link href="/connexion" className={linkClass}>
                  {nav.login}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/12 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[12.5px] text-white/50">
            {f.rights(new Date().getFullYear())} · {f.mapCredit}
          </p>
          <LanguageSwitch inverse />
        </div>
      </div>
    </footer>
  );
}
