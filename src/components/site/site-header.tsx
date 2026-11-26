import Link from "next/link";
import { Bell, Map as MapIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { getShellData } from "@/lib/data/shell";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitch } from "./language-switch";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const [{ t }, { user, unreadNotifications, unreadMessages }] = await Promise.all([getI18n(), getShellData()]);
  const nav = t.common.nav;
  const coachHref = user?.role === "coach" ? "/pro" : user ? "/devenir-coach" : "/inscription?role=coach";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        {nav.skip}
      </a>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 md:h-[72px] md:px-8">
        <Logo />
        <nav aria-label={nav.menu} className="ml-4 hidden items-center gap-0.5 md:flex lg:ml-6">
          <NavLink href="/carte" featured>
            <MapIcon size={15} aria-hidden />
            {nav.map}
          </NavLink>
          <NavLink href="/coachs" match={["/coachs", "/coach"]}>
            {nav.coaches}
          </NavLink>
          <NavLink href="/evenements" match={["/evenements", "/evenement"]}>
            {nav.events}
          </NavLink>
          <NavLink href="/clubs" match={["/clubs", "/club"]} className="hidden lg:inline-flex">
            {nav.clubs}
          </NavLink>
          <NavLink href="/street-workout" className="hidden lg:inline-flex">
            {nav.streetWorkout}
          </NavLink>
          <NavLink href="/salles" match={["/salles", "/salle"]} className="hidden xl:inline-flex">
            {nav.venues}
          </NavLink>
          <NavLink href={coachHref} match="/pro" className="hidden xl:inline-flex">
            {user?.role === "coach" ? nav.coachSpace : nav.forCoaches}
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch />
          {user ? (
            <>
              <Link
                href="/notifications"
                aria-label={nav.notifications}
                className="press relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand"
              >
                <Bell size={19} aria-hidden />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <UserMenu name={user.fullName} email={user.email} role={user.role} unreadMessages={unreadMessages} />
            </>
          ) : (
            <>
              <span className="hidden sm:block">
                <ButtonLink href="/connexion" variant="ghost" size="sm">
                  {nav.login}
                </ButtonLink>
              </span>
              <span className="hidden sm:block">
                <ButtonLink href="/inscription" size="sm">
                  {nav.signup}
                </ButtonLink>
              </span>
              <span className="sm:hidden">
                <ButtonLink href="/connexion" size="sm">
                  {nav.login}
                </ButtonLink>
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
