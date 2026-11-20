import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, CircleAlert, Clock, ExternalLink, FileText, LoaderCircle, Lock, ScanSearch, ShieldCheck, Upload, UserRoundCheck } from "lucide-react";
import { SubmitProfileButton } from "@/components/pro/dashboard-actions";
import { DeleteButton } from "@/components/pro/delete-button";
import { DocumentUpload } from "@/components/pro/document-upload";
import { PrecheckResumer } from "@/components/pro/precheck-resumer";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { deleteDocumentAction } from "@/lib/actions/documents";
import { requireCoach } from "@/lib/auth/session";
import { getChecklist, getOwnCoach, listCoachDocuments, listDocumentTypes, listVerificationEvents } from "@/lib/data/pro";
import { CHECKLIST_KEYS, CHECKLIST_LINKS, canSubmitProfile, isChecklistComplete, type DocumentStatus } from "@/lib/domain";
import { formatDate, formatDateTimeCompact } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { DOCUMENT_TONES } from "@/lib/tones";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pro.documents.title };
}

/** How far a document got on the four-step track: 0 received … 3 approved. -1 = stopped. */
function progress(status: DocumentStatus): { reached: number; failedAt: number | null; running: number | null } {
  switch (status) {
    case "uploaded":
      return { reached: 0, failedAt: null, running: null };
    case "precheck_pending":
      return { reached: 0, failedAt: null, running: 1 };
    case "precheck_completed":
      return { reached: 1, failedAt: null, running: null };
    case "needs_attention":
      return { reached: 0, failedAt: 1, running: null };
    case "awaiting_review":
      return { reached: 2, failedAt: null, running: null };
    case "approved":
      return { reached: 3, failedAt: null, running: null };
    default:
      return { reached: 2, failedAt: 3, running: null };
  }
}

export default async function ProDocumentsPage() {
  const user = await requireCoach("/pro/documents");
  const [{ t, locale }, coach, checklist, types, documents, events] = await Promise.all([
    getI18n(),
    getOwnCoach(user.id),
    getChecklist(user.id),
    listDocumentTypes(),
    listCoachDocuments(user.id),
    listVerificationEvents(user.id, 14),
  ]);
  if (!coach) return null;
  const d = t.pro.documents;
  const status = coach.verification_status;
  const complete = isChecklistComplete(checklist);
  const canSubmit = canSubmitProfile(status);
  const missing = CHECKLIST_KEYS.filter((key) => !checklist[key]);
  const typeName = (code: string) => {
    const type = types.find((item) => item.code === code);
    return type ? localizedName(type, locale) : code;
  };
  const stepLabels = [d.steps.received, d.steps.precheck, d.steps.prechecked, d.steps.approved];

  return (
    <div className="space-y-6">
      <PrecheckResumer documentIds={documents.filter((document) => document.status === "precheck_pending").map((document) => document.id)} />
      <PageHeader title={d.title} text={d.text} />

      {/* how verification works */}
      <Card className="p-5 md:p-7">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">{d.howTitle}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { icon: Upload, ...d.how.one },
            { icon: ScanSearch, ...d.how.two },
            { icon: UserRoundCheck, ...d.how.three },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink">
                <step.icon size={18} aria-hidden />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold text-ink">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex items-center gap-2 text-[12.5px] text-faint">
          <Lock size={13} aria-hidden />
          {d.text}
        </p>
      </Card>

      {/* one block per document type */}
      <div className="space-y-4">
        {types.map((type) => {
          const own = documents.filter((document) => document.type_code === type.code);
          return (
            <Card key={type.code} className="p-5 md:p-7" data-testid={`doc-type-${type.code}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold tracking-tight text-ink">{localizedName(type, locale)}</h2>
                    <Badge tone={type.is_required ? "ink" : "outline"} size="sm">
                      {type.is_required ? d.required : d.recommended}
                    </Badge>
                  </div>
                  <p className="mt-1.5 max-w-xl text-[14px] leading-snug text-muted">{locale === "fr" ? type.hint_fr : type.hint_en}</p>
                </div>
                <div className="shrink-0">
                  <DocumentUpload userId={user.id} typeCode={type.code} typeName={localizedName(type, locale)} hasExpiry={type.has_expiry} secondary={own.length > 0} />
                </div>
              </div>

              {own.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-sand px-4 py-3.5 text-[14px] text-muted">{d.none}</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {own.map((document) => {
                    const track = progress(document.status);
                    return (
                      <li key={document.id} className="rounded-[20px] border border-line p-4" data-testid="document-row" data-status={document.status}>
                        <div className="flex items-start gap-3.5">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand text-ink2">
                            <FileText size={19} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[15px] font-semibold text-ink">{document.file_name}</span>
                              {document.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                            </p>
                            <p className="mt-0.5 text-[13px] text-muted">
                              {d.sentOn(formatDate(document.created_at, locale))}
                              {document.expires_on ? ` · ${d.expires(formatDate(`${document.expires_on}T12:00:00Z`, locale))}` : ""}
                            </p>
                          </div>
                          <Badge tone={DOCUMENT_TONES[document.status]} size="sm">
                            {t.common.documentStatus[document.status]}
                          </Badge>
                        </div>

                        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
                          {stepLabels.map((label, index) => {
                            const failed = track.failedAt === index;
                            const running = track.running === index;
                            const done = !failed && index <= track.reached;
                            return (
                              <li key={label} className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5">
                                <span
                                  className={
                                    failed
                                      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-white"
                                      : done
                                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper"
                                        : running
                                          ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
                                          : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand2 text-faint"
                                  }
                                >
                                  {failed ? (
                                    <CircleAlert size={14} aria-hidden />
                                  ) : done ? (
                                    <Check size={13} strokeWidth={3} aria-hidden />
                                  ) : running ? (
                                    <LoaderCircle size={13} className="animate-spin" aria-hidden />
                                  ) : (
                                    <Clock size={12} aria-hidden />
                                  )}
                                </span>
                                <span className={done || running || failed ? "text-[12.5px] font-medium leading-snug text-ink2" : "text-[12.5px] leading-snug text-faint"}>{label}</span>
                              </li>
                            );
                          })}
                        </ol>

                        {document.status === "needs_attention" ? (
                          <Notice tone="danger" className="mt-4">
                            {d.precheckFailed}
                          </Notice>
                        ) : null}
                        {document.review_note ? (
                          <Notice tone={document.status === "approved" ? "success" : "warn"} title={d.reviewNote} className="mt-4">
                            {document.review_note}
                          </Notice>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                          <p className="text-[12px] text-faint">
                            <span className="font-medium text-muted">{d.precheckLabel}</span> · {d.precheckNote}
                          </p>
                          <div className="flex items-center gap-1">
                            <a
                              href={`/api/documents/${document.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="press inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold text-ink hover:bg-sand"
                            >
                              <ExternalLink size={15} aria-hidden />
                              {d.view}
                            </a>
                            <DeleteButton action={deleteDocumentAction} id={document.id} label={`${d.delete} — ${document.file_name}`} success={d.deleted} />
                          </div>
                        </div>
                        {document.is_demo ? <p className="mt-2 text-[12px] text-faint">{d.demoNote}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {/* submit */}
      <section className="on-dark rounded-[28px] bg-ink p-6 text-paper md:p-8" data-testid="submit-card">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 max-w-xl">
            <h2 className="display text-[24px] md:text-[28px]">{d.submitTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-white/75">
              {status === "approved" ? d.submitApproved : status === "awaiting_review" ? d.submitWaiting : complete ? d.submitReady : d.submitMissing}
            </p>
            {canSubmit && !complete ? (
              <ul className="mt-4 space-y-1.5">
                {missing.map((key) => (
                  <li key={key}>
                    <Link href={CHECKLIST_LINKS[key]} className="group inline-flex items-center gap-2 text-[14.5px] font-medium text-white underline-offset-4 hover:underline">
                      <ChevronRight size={15} aria-hidden className="text-gold" />
                      {t.pro.dashboard.checklist[key]}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {status === "approved" ? (
            <Badge tone="gold" icon={ShieldCheck}>
              {t.common.verificationStatus.approved}
            </Badge>
          ) : status === "awaiting_review" ? (
            <Badge tone="glass" icon={Clock}>
              {t.common.verificationStatus.awaiting_review}
            </Badge>
          ) : canSubmit ? (
            <SubmitProfileButton label={status === "draft" ? t.pro.dashboard.submit : t.pro.dashboard.resubmit} variant="inverse" disabled={!complete} />
          ) : null}
        </div>
      </section>

      {/* history */}
      <Card className="p-5 md:p-7">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">{d.historyTitle}</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">{d.historyEmpty}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {events.map((event) => {
              const label = event.to_status in d.events ? d.events[event.to_status as keyof typeof d.events] : event.to_status;
              const document = documents.find((item) => item.id === event.document_id);
              const subject = event.scope === "profile" ? d.profileEvent : document ? typeName(document.type_code) : event.scope === "document" && event.note ? typeName(event.note) : (event.note ?? "");
              return (
                <li key={event.id} className="flex gap-3 text-[14px]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink2">
                      <span className="font-medium text-ink">{label}</span>
                      {subject ? <span className="text-muted"> · {subject}</span> : null}
                    </p>
                    {event.scope !== "document" || !event.note || document ? (
                      event.note && event.scope !== "qualification" && event.actor_role === "admin" ? <p className="text-[13px] text-muted">{event.note}</p> : null
                    ) : null}
                    <p className="text-[12px] text-faint">{formatDateTimeCompact(event.created_at, locale)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
