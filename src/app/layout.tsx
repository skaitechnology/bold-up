import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { siteUrl } from "@/lib/env";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.site.home.metaTitle, template: "%s · Bold Up" },
    description: t.site.home.metaDescription,
    applicationName: "Bold Up",
    openGraph: {
      type: "website",
      siteName: "Bold Up",
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      title: t.site.home.metaTitle,
      description: t.site.home.metaDescription,
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale}>
      <body className="font-sans">
        <I18nProvider locale={locale}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
