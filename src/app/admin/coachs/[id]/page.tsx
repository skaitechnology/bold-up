import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, ExternalLink, EyeOff, FileText, GraduationCap, Landmark, Lock, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-toggle";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Avatar, Card, Notice } from "@/components/ui/misc";
import { decideCoachAction, reviewDocumentAction, setCoachPublishedAction, setQualificationStatusAction } from "@/lib/actions/admin";
import { getCoachAdmin } from "@/lib/data/admin";
import { listDocumentTypes } from "@/lib/data/pro";
import { CHECKLIST_KEYS, isChecklistComplete, type QualificationKind } from "@/lib/domain";
import { formatDate, formatDateTimeCompact, formatDuration, formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";
import { DOCUMENT_TONES, VERIFICATION_TONES } from "@/lib/tones";
import { parsePrecheckReport } from "@/lib/verification/checks";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = /^[0-9a-f-]{36}$/.test(id) ? await getCoachAdmin(id) : null;
  return { title: data?.coach.display_name || "Coach" };
}

export default async function AdminCoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ t, locale }, data, types] = await Promise.all([getI18n(), getCoachAdmin(id), listDocumentTypes()]);
  if (!data) notFound();
  const { coach, documents, events, checklist } = data;
  const a = t.admin.coach;
  const status = coach.verification_status;
  const typeName = (code: string) => {
    const type = types.find((item) => item.code === code);
    return type ? localizedName(type, locale) : code;
  };
  const complete = isChecklistComplete(checklist);
  const blockers = [
    ...(status !== "awaiting_review" ? [a.blockers.status] : []),
    ...(!complete ? [a.blockers.incomplete] : []),
    ...(!checklist.documents_approved ? [a.blockers.documents] : []),
  ];
  const canApprove = blockers.length === 0;
  const services = [...coach.coach_services].sort((x, y) => x.sort_order - y.sort_order);
  const eventLabel = (value: string) => (value in t.pro.documents.events ? t.pro.documents.events[value as keyof typeof t.pro.documents.events] : value);

  return (
    <div className="space-y-6">
      <Link href="/admin/coachs" className="inline-flex items-center gap-2 text-[14px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden />
        {a.back}
      </Link>

      {/* ------------------------------------------------ header */}
      <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={mediaUrl(coach.photo_path)} name={coach.display_name || coach.profiles?.email || "?"} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={VERIFICATION_TONES[status]} data-testid="coach-status">
                {t.common.verificationStatus[status]}
              </Badge>
              {status === "approved" && !coach.is_published ? (
                <Badge tone="outline" icon={EyeOff}>
                  {t.admin.coaches.hidden}
                </Badge>
              ) : null}
              {coach.is_demo ? <DemoBadge label={t.common.demo} className="!h-7 !px-2.5" /> : null}
            </div>
            <h1 className="display mt-2 truncate text-[30px] text-ink md:text-[40px]">{coach.display_name || "—"}</h1>
            <p className="mt-1 truncate text-[14.5px] text-muted">{coach.headline}</p>
          </div>
        </div>
        <ButtonLink href={`/coach/${coach.slug}`} variant="secondary" iconRight={ExternalLink} target="_blank">
          {a.viewPublic}
        </ButtonLink>
      </header>

      {coach.is_demo ? (
        <Notice tone="neutral" icon={CircleAlert}>
          {a.demoWarning}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {/* ------------------------------------------------ documents */}
          <section>
            <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-ink">{a.documents}</h2>
            {documents.length === 0 ? (
              <p className="rounded-[22px] border border-dashed border-line2 bg-paper/60 px-5 py-6 text-[14.5px] text-muted">{a.noDocuments}</p>
            ) : (
              <ul className="space-y-4">
                {documents.map((document) => {
                  const report = parsePrecheckReport(document.precheck);
                  const type = types.find((item) => item.code === document.type_code);
                  return (
                    <li key={document.id} data-testid="admin-document" data-status={document.status} data-type={document.type_code}>
                      <Card className="p-5 md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand text-ink2">
                              <FileText size={19} aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-ink">
                                {typeName(document.type_code)}
                                {type?.is_required ? (
                                  <Badge tone="ink" size="sm">
                                    {t.pro.documents.required}
                                  </Badge>
                                ) : null}
                              </p>
                              <p className="mt-0.5 truncate text-[13.5px] text-muted">
                                {document.file_name} · {(document.size_bytes / 1024).toFixed(0)} Ko · {formatDate(document.created_at, locale)}
                              </p>
                            </div>
                          </div>
                          <Badge tone={DOCUMENT_TONES[document.status]}>{t.common.documentStatus[document.status]}</Badge>
                        </div>

                        <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                          <div className="flex gap-2">
                            <dt className="text-muted">{a.reference} :</dt>
                            <dd className="font-medium text-ink">{document.reference ?? "—"}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-muted">{a.expires} :</dt>
                            <dd className="font-medium text-ink">{document.expires_on ? formatDate(`${document.expires_on}T12:00:00Z`, locale) : "—"}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <a
                            href={`/api/documents/${document.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-paper hover:bg-ink/88"
                            data-testid="open-document"
                          >
                            <ExternalLink size={16} aria-hidden />
                            {a.openDocument}
                          </a>
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-faint">
                            <Lock size={12} aria-hidden />
                            {a.openHint}
                          </span>
                        </div>

                        {report ? (
                          <div className="mt-5 rounded-2xl bg-sand p-4">
                            <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
                              {a.precheck}
                              <Badge tone={report.passed ? "success" : "danger"} size="sm">
                                {report.passed ? a.precheckPassed : a.precheckFailed}
                              </Badge>
                            </p>
                            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                              {report.checks.map((check) => (
                                <li key={check.code} className="flex items-center gap-2 text-[13.5px] text-ink2">
                                  {check.passed ? <Check size={14} aria-hidden className="shrink-0 text-success" /> : <X size={14} aria-hidden className="shrink-0 text-danger" />}
                                  {a.checks[check.code]}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
                              <TriangleAlert size={13} aria-hidden className="mt-0.5 shrink-0" />
                              {a.precheckDisclaimer}
                            </p>
                          </div>
                        ) : null}

                        {document.status === "awaiting_review" ? (
                          <ActionForm action={reviewDocumentAction} success={a.documentReviewed} className="mt-5 space-y-4 border-t border-line pt-5" data-testid="document-review-form">
                            <input type="hidden" name="documentId" value={document.id} />
                            <input type="hidden" name="coachId" value={coach.id} />
                            <p className="text-[14.5px] font-semibold text-ink">{a.reviewTitle}</p>
                            <Field label={a.externalCheck} hint={a.externalCheckHint} optional={t.common.optional}>
                              <Textarea name="externalCheck" rows={2} maxLength={1000} placeholder={a.externalCheckPlaceholder} />
                            </Field>
                            <Field label={a.note} optional={t.common.optional}>
                              <Textarea name="note" rows={2} maxLength={1000} placeholder={a.notePlaceholder} />
                            </Field>
                            <div className="flex flex-wrap gap-2">
                              <SubmitButton name="decision" value="approve" data-testid="document-approve">
                                <Check size={17} aria-hidden />
                                {a.approveDocument}
                              </SubmitButton>
                              <SubmitButton name="decision" value="request_info" variant="secondary">
                                {a.requestInfo}
                              </SubmitButton>
                              <SubmitButton name="decision" value="reject" variant="danger" data-testid="document-reject">
                                {a.rejectDocument}
                              </SubmitButton>
                            </div>
                          </ActionForm>
                        ) : document.reviewed_at ? (
                          <div className="mt-5 border-t border-line pt-4 text-[13.5px] text-muted">
                            <p>{a.reviewedBy(formatDateTimeCompact(document.reviewed_at, locale))}</p>
                            {document.review_note ? <p className="mt-1 text-ink2">« {document.review_note} »</p> : null}
                          </div>
                        ) : null}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ------------------------------------------------ qualifications */}
          <Card className="p-5 md:p-6">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{a.qualifications}</h2>
            {coach.coach_qualifications.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">{a.noQualifications}</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {coach.coach_qualifications.map((qualification) => {
                  const verified = qualification.status === "verified";
                  return (
                    <li key={qualification.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3" data-testid="admin-qualification">
                      <span className={verified ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted"}>
                        {verified ? <ShieldCheck size={18} aria-hidden /> : <GraduationCap size={18} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-ink">{qualification.title}</p>
                        <p className="text-[13px] text-muted">
                          {[t.common.qualificationKinds[qualification.kind as QualificationKind], qualification.issuer, qualification.year_obtained].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Badge tone={verified ? "gold" : "outline"} size="sm">
                        {verified ? t.pro.profile.qualificationVerified : t.pro.profile.qualificationDeclared}
                      </Badge>
                      <ActionButton
                        action={setQualificationStatusAction.bind(null, qualification.id, verified ? "declared" : "verified", coach.id)}
                        label={verified ? a.markDeclared : a.markVerified}
                        success={a.decided}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* ------------------------------------------------ profile */}
          <Card className="p-5 md:p-6">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{a.profile}</h2>
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink2">{coach.bio || a.noBio}</p>
            <dl className="mt-5 grid gap-4 text-[14px] sm:grid-cols-2">
              <div>
                <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-faint">{t.pro.profile.sports}</dt>
                <dd className="mt-1 text-ink2">
                  {coach.coach_sports
                    .map((entry) => entry.sports)
                    .filter((sport): sport is NonNullable<typeof sport> => Boolean(sport))
                    .map((sport) => localizedName(sport, locale))
                    .join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-faint">{t.pro.profile.sections.location}</dt>
                <dd className="mt-1 text-ink2">{coach.city ? `${coach.city} ${coach.postal_code ?? ""} · ${coach.service_radius_km} km` : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-faint">{t.pro.profile.sections.services}</dt>
                <dd className="mt-1">
                  {services.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="space-y-1 text-ink2">
                      {services.map((service) => (
                        <li key={service.id} className="flex justify-between gap-3">
                          <span>
                            {service.name} <span className="text-muted">· {formatDuration(service.duration_min)}</span>
                          </span>
                          <span className="font-medium tabular">{formatPrice(service.price_cents, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {/* ------------------------------------------------ history */}
          <Card className="p-5 md:p-6">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{a.history}</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">{a.historyEmpty}</p>
            ) : (
              <ol className="mt-4 space-y-3.5" data-testid="verification-history">
                {events.map((event) => {
                  const document = documents.find((item) => item.id === event.document_id);
                  const subject = event.scope === "profile" ? t.pro.documents.profileEvent : document ? typeName(document.type_code) : event.scope === "document" && event.note ? typeName(event.note) : "";
                  return (
                    <li key={event.id} className="flex gap-3 text-[14px]">
                      <span className={event.actor_role === "admin" ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line2"} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink2">
                          <span className="font-medium text-ink">{event.is_internal ? a.externalCheck : eventLabel(event.to_status)}</span>
                          {subject ? <span className="text-muted">· {subject}</span> : null}
                          <Badge tone="outline" size="sm">
                            {a.actors[event.actor_role as "coach" | "admin" | "system"]}
                          </Badge>
                          {event.is_internal ? (
                            <Badge tone="neutral" size="sm" icon={Lock}>
                              {a.internal}
                            </Badge>
                          ) : null}
                        </p>
                        {event.note && (event.actor_role === "admin" || event.scope === "qualification") ? <p className="mt-0.5 text-[13.5px] text-muted">{event.note}</p> : null}
                        <p className="text-[12px] text-faint">{formatDateTimeCompact(event.created_at, locale)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------ decision column */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-8 lg:self-start">
          <section className="on-dark rounded-[26px] bg-ink p-5 text-paper md:p-6" data-testid="decision-panel">
            <h2 className="display text-[22px]">{a.decisionTitle}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">{a.decisionText}</p>

            <ul className="mt-5 space-y-1.5">
              {CHECKLIST_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2.5 text-[13.5px]">
                  {checklist[key] ? <Check size={15} aria-hidden className="shrink-0 text-gold" /> : <X size={15} aria-hidden className="shrink-0 text-white/40" />}
                  <span className={checklist[key] ? "text-white/85" : "text-white/50"}>{t.pro.dashboard.checklist[key]}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 border-t border-white/12 pt-2.5 text-[13.5px] font-semibold">
                {checklist.documents_approved ? <Check size={15} aria-hidden className="shrink-0 text-gold" /> : <X size={15} aria-hidden className="shrink-0 text-white/40" />}
                <span className={checklist.documents_approved ? "text-white" : "text-white/60"} data-testid="documents-approved" data-value={checklist.documents_approved ? "true" : "false"}>
                  {a.documents} : {(checklist.documents_approved ? t.common.documentStatus.approved : t.common.documentStatus.awaiting_review).toLowerCase()}
                </span>
              </li>
            </ul>

            {status === "awaiting_review" && !canApprove ? (
              <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-[13.5px] leading-relaxed" data-testid="approve-blockers">
                <p className="font-semibold">{a.cannotApprove}</p>
                <ul className="mt-1 list-disc pl-4 text-white/80">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {status === "awaiting_review" || status === "approved" || status === "suspended" ? (
              <ActionForm action={decideCoachAction} success={a.decided} className="mt-5 space-y-3" data-testid="decision-form">
                <input type="hidden" name="coachId" value={coach.id} />
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold">{a.decisionNote}</span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={1000}
                    placeholder={a.decisionNotePlaceholder}
                    className="w-full resize-y rounded-2xl border border-white/20 bg-white/8 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-white"
                  />
                </label>
                <div className="flex flex-col gap-2">
                  {status === "awaiting_review" ? (
                    <>
                      <SubmitButton name="decision" value="approve" variant="inverse" size="lg" block disabled={!canApprove} data-testid="coach-approve">
                        <ShieldCheck size={17} aria-hidden />
                        {a.approve}
                      </SubmitButton>
                      <SubmitButton name="decision" value="request_changes" variant="outline-inverse" block data-testid="coach-request-changes">
                        {a.requestChanges}
                      </SubmitButton>
                      <SubmitButton name="decision" value="reject" variant="outline-inverse" block data-testid="coach-reject">
                        {a.reject}
                      </SubmitButton>
                    </>
                  ) : status === "approved" ? (
                    <>
                      <SubmitButton name="decision" value="request_changes" variant="outline-inverse" block>
                        {a.requestChanges}
                      </SubmitButton>
                      <SubmitButton name="decision" value="suspend" variant="outline-inverse" block>
                        {a.suspend}
                      </SubmitButton>
                    </>
                  ) : (
                    <SubmitButton name="decision" value="reinstate" variant="inverse" block>
                      {a.reinstate}
                    </SubmitButton>
                  )}
                </div>
              </ActionForm>
            ) : (
              <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-[13.5px] text-white/80">{a.blockers.status}.</p>
            )}
            {coach.review_note ? (
              <p className="mt-4 text-[13px] text-white/60">
                {a.decisionNote} : « {coach.review_note} »
              </p>
            ) : null}
          </section>

          {status === "approved" ? (
            <Card className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-[14.5px] font-semibold text-ink">{a.listing}</p>
                <p className="text-[13px] text-muted">{coach.is_published ? t.admin.coaches.published : t.admin.coaches.hidden}</p>
              </div>
              <ActionButton
                action={setCoachPublishedAction.bind(null, coach.id, !coach.is_published)}
                label={coach.is_published ? a.unpublish : a.publish}
                success={a.listingUpdated}
              />
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold text-ink">{a.account}</h2>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              {[
                [a.email, coach.profiles?.email ?? "—"],
                [a.registered, formatDate(coach.created_at, locale)],
                [a.submitted, coach.submitted_at ? formatDate(coach.submitted_at, locale) : a.never],
                [a.verified, coach.verified_at ? formatDate(coach.verified_at, locale) : a.never],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="truncate font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Landmark size={16} aria-hidden />
              {a.regulatoryTitle}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{a.regulatoryText}</p>
            <a
              href="https://portail-educateurs-etablissements.sports.gouv.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink underline underline-offset-4"
            >
              {a.regulatoryLink}
              <ExternalLink size={13} aria-hidden />
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
