import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/site/language-switch";

/** Sign-in and sign-up screens: the form on the left, one strong image on the right. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 pb-10 pt-5 md:px-12 md:pt-8">
        <header className="flex items-center justify-between">
          <Logo />
          <LanguageSwitch />
        </header>
        <main id="contenu" className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <div className="on-dark relative hidden overflow-hidden bg-ink lg:block">
        <img src="/demo/gym.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        <div id="auth-side" className="absolute inset-x-0 bottom-0 p-12 text-paper" />
      </div>
    </div>
  );
}
