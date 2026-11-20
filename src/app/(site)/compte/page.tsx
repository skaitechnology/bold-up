import type { Metadata } from "next";
import { Dumbbell, LogOut } from "lucide-react";
import { DeletionRequest, PasswordForm } from "@/components/account/account-extras";
import { SportIcon } from "@/components/brand/sport-icon";
import { LanguageSwitch } from "@/components/site/language-switch";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { DemoBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { saveAccountAction } from "@/lib/actions/account";
import { signOutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { listSports } from "@/lib/data/coaches";
import { LEVELS } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.profile.title, robots: { index: false } };
}

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const [{ t, locale }, sports, supabase] = await Promise.all([getI18n(), listSports(), createClient()]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, city, postal_code, favorite_sports, level, goal, deletion_requested_at, is_demo")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  const p = t.account.profile;

  return (
    <div className="mx-auto max-w-[880px] space-y-5 px-4 py-8 md:px-8 md:py-12">
      <PageHeader
        title={p.title}
        text={p.text}
        right={
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" icon={LogOut} data-testid="logout">
              {t.common.nav.logout}
            </Button>
          </form>
        }
      />
      {profile.is_demo ? <DemoBadge label={p.demoAccount} className="!h-6" /> : null}

      <ActionForm action={saveAccountAction} className="space-y-5">
        <Card className="p-5 md:p-8">
          <h2 className="display text-[22px] text-ink">{p.identity}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label={p.fullName}>
              <Input name="full_name" required minLength={2} maxLength={80} defaultValue={profile.full_name} autoComplete="name" />
            </Field>
            <Field label={p.email} hint={p.emailHint}>
              <Input value={profile.email} disabled readOnly />
            </Field>
            <Field label={p.phone} optional={t.common.optional}>
              <Input name="phone" type="tel" inputMode="tel" maxLength={20} defaultValue={profile.phone ?? ""} autoComplete="tel" />
            </Field>
            <Field label={p.city} optional={t.common.optional}>
              <Input name="city" maxLength={80} defaultValue={profile.city ?? ""} autoComplete="address-level2" />
            </Field>
          </div>
          <input type="hidden" name="postal_code" value={profile.postal_code ?? ""} />
        </Card>

        {user.role === "customer" ? (
          <Card className="p-5 md:p-8">
            <h2 className="display text-[22px] text-ink">{p.preferences}</h2>
            <p className="mt-2 text-[14.5px] text-muted">{p.preferencesText}</p>
            <fieldset className="mt-5">
              <legend className="mb-3 text-[13px] font-semibold text-ink">{p.favoriteSports}</legend>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <ChoiceChip key={sport.id} name="favorite_sports" value={sport.slug} defaultChecked={profile.favorite_sports.includes(sport.slug)}>
                    <SportIcon icon={sport.icon} size={15} />
                    {localizedName(sport, locale)}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
              <Field label={p.level}>
                <Select name="level" defaultValue={profile.level ?? ""}>
                  <option value="">{p.noLevel}</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t.common.levels[level]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={p.goal} optional={t.common.optional}>
                <Textarea name="goal" rows={2} maxLength={300} defaultValue={profile.goal ?? ""} placeholder={p.goalPlaceholder} />
              </Field>
            </div>
          </Card>
        ) : null}
        <SubmitButton size="lg" data-testid="account-save">
          {t.common.actions.save}
        </SubmitButton>
      </ActionForm>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-8">
        <h2 className="display text-[22px] text-ink">{p.language}</h2>
        <LanguageSwitch />
      </Card>

      <Card className="p-5 md:p-8">
        <h2 className="display text-[22px] text-ink">{p.security}</h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </Card>

      {user.role === "customer" ? (
        <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="display text-[22px] text-ink">{p.becomeCoach}</h2>
            <p className="mt-2 max-w-md text-[14.5px] text-muted">{p.becomeCoachText}</p>
          </div>
          <ButtonLink href="/devenir-coach" variant="secondary" icon={Dumbbell}>
            {p.becomeCoachCta}
          </ButtonLink>
        </Card>
      ) : null}

      <Card className="p-5 md:p-8">
        <h2 className="display text-[22px] text-ink">{p.privacy}</h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{p.privacyText}</p>
        <div className="mt-5">
          {profile.deletion_requested_at ? <Notice tone="warn">{p.deletePending(formatDate(profile.deletion_requested_at, locale))}</Notice> : <DeletionRequest />}
        </div>
      </Card>
    </div>
  );
}
