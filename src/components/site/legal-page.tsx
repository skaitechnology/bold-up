import { TriangleAlert } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { Notice } from "@/components/ui/misc";

export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };

/** Shared layout of the privacy policy and the terms of use. */
export function LegalPage({ title, updated, notice, sections }: { title: string; updated: string; notice: string; sections: LegalSection[] }) {
  return (
    <>
      <article className="mx-auto max-w-[760px] px-4 py-10 md:px-8 md:py-16">
        <h1 className="display text-[36px] text-ink md:text-[52px]">{title}</h1>
        <p className="mt-3 text-[13.5px] text-faint">{updated}</p>
        <Notice tone="warn" icon={TriangleAlert} className="mt-6">
          {notice}
        </Notice>
        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[19px] font-semibold tracking-tight text-ink">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[15.5px] leading-[1.75] text-ink2">
                  {paragraph}
                </p>
              ))}
              {section.items ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15.5px] leading-[1.7] text-ink2 marker:text-line2">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
