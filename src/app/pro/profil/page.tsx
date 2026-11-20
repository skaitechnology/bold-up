import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileCheck2, GraduationCap, Info, ShieldCheck } from "lucide-react";
import { SportIcon } from "@/components/brand/sport-icon";
import { BioField } from "@/components/pro/bio-field";
import { DeleteButton } from "@/components/pro/delete-button";
import { LocationFields } from "@/components/pro/location-fields";
import { PhotoUploader } from "@/components/pro/photo-uploader";
import { ServicesEditor } from "@/components/pro/services-editor";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import {
  addQualificationAction,
  deleteQualificationAction,
  saveCoachingAction,
  saveIdentityAction,
  saveLinksAction,
  saveLocationAction,
} from "@/lib/actions/pro";
import { requireCoach } from "@/lib/auth/session";
import { listSports } from "@/lib/data/coaches";
import { getOwnCoach } from "@/lib/data/pro";
import { FORMATS, LEVELS, QUALIFICATION_KINDS, type QualificationKind } from "@/lib/domain";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pro.profile.title };
}

function SectionCard({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-28 p-5 md:p-8">
      <h2 className="display text-[22px] text-ink md:text-[26px]">{title}</h2>
      <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{text}</p>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

export default async function ProProfilePage() {
  const user = await requireCoach("/pro/profil");
  const [{ t, locale }, coach, sports] = await Promise.all([getI18n(), getOwnCoach(user.id), listSports()]);
  if (!coach) return null;
  const p = t.pro.profile;
  const selectedSports = new Set(coach.coach_sports.map((entry) => entry.sport_id));
  const services = [...coach.coach_services].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const qualifications = [...coach.coach_qualifications].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sections = [
    { id: "identite", label: p.sections.identity },
    { id: "coaching", label: p.sections.coaching },
    { id: "prestations", label: p.sections.services },
    { id: "lieu", label: p.sections.location },
    { id: "qualifications", label: p.sections.qualifications },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title}
        text={p.text}
        right={
          <>
            <ButtonLink href="/pro/documents" variant="secondary" icon={FileCheck2}>
              {t.pro.nav.documents}
            </ButtonLink>
            <ButtonLink href={`/coach/${coach.slug}`} icon={Eye} data-testid="preview-profile">
              {p.preview}
            </ButtonLink>
          </>
        }
      />

      <nav aria-label={p.title} className="no-scrollbar sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto bg-sand/95 px-4 py-2.5 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="press inline-flex h-9 shrink-0 items-center rounded-full border border-line2 bg-paper px-4 text-[13.5px] font-medium text-ink2 hover:border-ink hover:text-ink"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {/* ------------------------------------------------ identity */}
      <SectionCard id="identite" title={p.sections.identity} text={p.identityText}>
        <PhotoUploader userId={user.id} photoPath={coach.photo_path} name={coach.display_name} />
        <ActionForm action={saveIdentityAction} className="mt-7 space-y-5" data-testid="identity-form">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={p.displayName}>
              <Input name="display_name" required minLength={2} maxLength={80} defaultValue={coach.display_name} autoComplete="name" />
            </Field>
            <Field label={p.headline} hint={p.headlineHint}>
              <Input name="headline" maxLength={120} defaultValue={coach.headline} placeholder={p.headlinePlaceholder} />
            </Field>
          </div>
          <BioField defaultValue={coach.bio} />
          <SubmitButton data-testid="identity-save">{t.common.actions.save}</SubmitButton>
        </ActionForm>
      </SectionCard>

      {/* ------------------------------------------------ coaching */}
      <SectionCard id="coaching" title={p.sections.coaching} text={p.coachingText}>
        <ActionForm action={saveCoachingAction} className="space-y-6" data-testid="coaching-form">
          <fieldset>
            <legend className="text-[13px] font-semibold text-ink">{p.sports}</legend>
            <p className="mt-1 text-[12.5px] text-muted">{p.sportsHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sports.map((sport) => (
                <ChoiceChip key={sport.id} name="sports" value={sport.id} defaultChecked={selectedSports.has(sport.id)}>
                  <SportIcon icon={sport.icon} size={15} />
                  <span data-sport={sport.slug}>{localizedName(sport, locale)}</span>
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-6 md:grid-cols-2">
            <fieldset>
              <legend className="mb-3 text-[13px] font-semibold text-ink">{p.levels}</legend>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <ChoiceChip key={level} name="levels" value={level} defaultChecked={coach.levels.includes(level)}>
                    {t.common.levels[level]}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-[13px] font-semibold text-ink">{p.formats}</legend>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => (
                  <ChoiceChip key={format} name="formats" value={format} defaultChecked={coach.formats.includes(format)}>
                    {t.common.formats[format]}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
          </div>
          <Field label={p.yearsExperience} optional={t.common.optional} className="max-w-[220px]">
            <Input name="years_experience" type="number" inputMode="numeric" min={0} max={60} defaultValue={coach.years_experience ?? ""} />
          </Field>
          <Field label={p.experience} optional={t.common.optional}>
            <Textarea name="experience" rows={5} maxLength={2000} defaultValue={coach.experience} placeholder={p.experiencePlaceholder} />
          </Field>
          <SubmitButton data-testid="coaching-save">{t.common.actions.save}</SubmitButton>
        </ActionForm>
      </SectionCard>

      {/* ------------------------------------------------ services */}
      <SectionCard id="prestations" title={p.sections.services} text={p.servicesText}>
        <ServicesEditor services={services} />
      </SectionCard>

      {/* ------------------------------------------------ location */}
      <SectionCard id="lieu" title={p.sections.location} text={p.locationText}>
        <ActionForm action={saveLocationAction} className="max-w-xl space-y-5" data-testid="location-form">
          <LocationFields
            initial={{
              city: coach.city,
              postal_code: coach.postal_code,
              lat: coach.lat,
              lng: coach.lng,
              service_radius_km: coach.service_radius_km,
              at_gym: coach.at_gym,
              at_home: coach.at_home,
              outdoor: coach.outdoor,
              online: coach.online,
            }}
          />
          <SubmitButton data-testid="location-save">{t.common.actions.save}</SubmitButton>
        </ActionForm>
      </SectionCard>

      {/* ------------------------------------------------ qualifications */}
      <SectionCard id="qualifications" title={p.sections.qualifications} text={p.qualificationsText}>
        {coach.verification_status === "approved" ? (
          <Notice tone="gold" icon={Info} className="mb-5">
            {p.reviewWarning}
          </Notice>
        ) : null}
        {qualifications.length === 0 ? (
          <p className="rounded-2xl bg-sand px-4 py-4 text-[14px] text-muted">{p.qualificationEmpty}</p>
        ) : (
          <ul className="space-y-2.5">
            {qualifications.map((qualification) => {
              const verified = qualification.status === "verified";
              return (
                <li key={qualification.id} className="flex items-center gap-3.5 rounded-[20px] border border-line px-4 py-3.5" data-testid="qualification-row">
                  <span className={verified ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted"}>
                    {verified ? <ShieldCheck size={18} aria-hidden /> : <GraduationCap size={18} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{qualification.title}</span>
                    <span className="block text-[13px] text-muted">
                      {[t.common.qualificationKinds[qualification.kind as QualificationKind], qualification.issuer, qualification.year_obtained].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Badge tone={verified ? "gold" : "outline"} size="sm">
                    {verified ? p.qualificationVerified : p.qualificationDeclared}
                  </Badge>
                  <DeleteButton action={deleteQualificationAction} id={qualification.id} label={`${t.common.actions.delete} — ${qualification.title}`} success={p.qualificationDeleted} />
                </li>
              );
            })}
          </ul>
        )}

        <ActionForm action={addQualificationAction} resetOnSuccess className="mt-6 rounded-[22px] bg-sand p-4 md:p-5" data-testid="qualification-form">
          <p className="text-[14.5px] font-semibold text-ink">{p.qualificationAdd}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={p.qualificationKind}>
              <Select name="kind" defaultValue="bpjeps">
                {QUALIFICATION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t.common.qualificationKinds[kind]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={p.qualificationTitle}>
              <Input name="title" required minLength={2} maxLength={160} placeholder={p.qualificationTitlePlaceholder} />
            </Field>
            <Field label={p.qualificationIssuer} optional={t.common.optional}>
              <Input name="issuer" maxLength={120} placeholder={p.qualificationIssuerPlaceholder} />
            </Field>
            <Field label={p.qualificationYear} optional={t.common.optional}>
              <Input name="year_obtained" type="number" inputMode="numeric" min={1960} max={new Date().getFullYear()} placeholder="2021" />
            </Field>
          </div>
          <SubmitButton variant="secondary" className="mt-4" data-testid="qualification-add">
            {t.common.actions.add}
          </SubmitButton>
        </ActionForm>

        <ActionForm action={saveLinksAction} className="mt-8 space-y-5 border-t border-line pt-7">
          <p className="text-[14.5px] font-semibold text-ink">{p.links}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={p.school} optional={t.common.optional}>
              <Input name="training_school" maxLength={120} defaultValue={coach.training_school ?? ""} placeholder={p.schoolPlaceholder} />
            </Field>
            <Field label={p.instagram} optional={t.common.optional}>
              <Input name="instagram" maxLength={60} defaultValue={coach.instagram ?? ""} placeholder={p.instagramPlaceholder} autoCapitalize="none" />
            </Field>
            <Field label={p.website} optional={t.common.optional}>
              <Input name="website" type="url" maxLength={200} defaultValue={coach.website ?? ""} placeholder="https://" autoCapitalize="none" />
            </Field>
          </div>
          <SubmitButton variant="secondary">{t.common.actions.save}</SubmitButton>
        </ActionForm>
        <p className="mt-6 text-[13.5px] text-muted">
          <Link href="/pro/documents" className="font-semibold text-ink underline underline-offset-4">
            {t.pro.dashboard.quick.documents}
          </Link>
        </p>
      </SectionCard>
    </div>
  );
}
