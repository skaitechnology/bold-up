import type { Metadata } from "next";
import { ActionButton } from "@/components/admin/admin-toggle";
import { SportIcon } from "@/components/brand/sport-icon";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/misc";
import { saveSportAction, setDocumentTypeRequiredAction, setSportActiveAction } from "@/lib/actions/admin";
import { listSportsAdmin } from "@/lib/data/admin";
import { listDocumentTypes } from "@/lib/data/pro";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.settings.title };
}

export default async function AdminSettingsPage() {
  const [{ t, locale }, sports, types] = await Promise.all([getI18n(), listSportsAdmin(), listDocumentTypes()]);
  const s = t.admin.settings;
  return (
    <div className="space-y-6">
      <PageHeader title={s.title} text={s.text} />

      <Card className="p-5 md:p-8">
        <h2 className="display text-[22px] text-ink">{s.sportsTitle}</h2>
        <p className="mt-2 text-[14.5px] text-muted">{s.sportsText}</p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {sports.map((sport) => (
            <li key={sport.id} className="flex items-center gap-3 px-4 py-3" data-testid="admin-sport-row">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand text-ink2">
                <SportIcon icon={sport.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{sport.name_fr}</p>
                <p className="text-[13px] text-muted">{sport.name_en}</p>
              </div>
              <Badge tone={sport.is_active ? "success" : "neutral"} size="sm">
                {sport.is_active ? s.sportActive : s.sportInactive}
              </Badge>
              <ActionButton
                action={setSportActiveAction.bind(null, sport.id, !sport.is_active)}
                label={sport.is_active ? t.admin.coach.unpublish : t.admin.coach.publish}
                success={s.sportSaved}
              />
            </li>
          ))}
        </ul>
        <ActionForm action={saveSportAction} success={s.sportSaved} resetOnSuccess className="mt-5 grid gap-4 rounded-[22px] bg-sand p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:p-5">
          <input type="hidden" name="id" value="" />
          <Field label={s.sportNameFr}>
            <Input name="name_fr" required minLength={2} maxLength={60} />
          </Field>
          <Field label={s.sportNameEn}>
            <Input name="name_en" required minLength={2} maxLength={60} />
          </Field>
          <SubmitButton variant="secondary" className="!h-12" data-testid="sport-add">
            {s.sportAdd}
          </SubmitButton>
        </ActionForm>
      </Card>

      <Card className="p-5 md:p-8">
        <h2 className="display text-[22px] text-ink">{s.documentsTitle}</h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{s.documentsText}</p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {types.map((type) => (
            <li key={type.code} className="flex flex-wrap items-center gap-3 px-4 py-3.5" data-testid="admin-doctype-row">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{localizedName(type, locale)}</p>
                <p className="text-[13px] leading-snug text-muted">{locale === "fr" ? type.hint_fr : type.hint_en}</p>
              </div>
              <Badge tone={type.is_required ? "ink" : "outline"} size="sm">
                {type.is_required ? s.required : s.optionalDoc}
              </Badge>
              <ActionButton
                action={setDocumentTypeRequiredAction.bind(null, type.code, !type.is_required)}
                label={type.is_required ? s.optionalDoc : s.required}
                success={s.documentSaved}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
