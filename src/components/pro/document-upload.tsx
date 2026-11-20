"use client";

import { clsx } from "clsx";
import { Check, FileUp, LoaderCircle, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { registerDocumentAction, runPrecheckAction } from "@/lib/actions/documents";
import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "@/lib/domain";
import type { ErrorCode } from "@/lib/errors";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

type Stage = "idle" | "uploading" | "received" | "precheck" | "done" | "failed";

const EXTENSIONS: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

/**
 * Uploads one professional document and walks it through the first verification level:
 *   file → private storage → "document received" → simulated pre-check → human review queue.
 * Every step is a real state change in the database; this component only shows it.
 */
export function DocumentUpload({
  userId,
  typeCode,
  typeName,
  hasExpiry,
  secondary,
}: {
  userId: string;
  typeCode: string;
  typeName: string;
  hasExpiry: boolean;
  secondary?: boolean;
}) {
  const { t } = useI18n();
  const d = t.pro.documents;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<ErrorCode | null>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const busy = stage === "uploading" || stage === "received" || stage === "precheck";

  const close = () => {
    if (busy) return;
    setOpen(false);
    setFile(null);
    setStage("idle");
    setError(null);
    router.refresh();
  };

  const pick = (candidate: File | undefined) => {
    setError(null);
    if (!candidate) return;
    if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(candidate.type)) {
      setFile(null);
      setError("unsupported_file_type");
      return;
    }
    if (candidate.size > DOCUMENT_MAX_BYTES) {
      setFile(null);
      setError("file_too_large");
      return;
    }
    setFile(candidate);
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    setStage("uploading");
    const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? "bin"}`;
    // Private bucket: storage policies only accept the coach's own folder.
    const upload = await createClient().storage.from("coach-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) {
      setStage("failed");
      setError("upload_failed");
      return;
    }
    const registered = await registerDocumentAction({
      typeCode,
      path,
      fileName: file.name,
      mimeType: file.type as (typeof DOCUMENT_MIME_TYPES)[number],
      sizeBytes: file.size,
      reference: referenceRef.current?.value ?? "",
      expiresOn: expiryRef.current?.value ?? "",
    });
    if (!registered.ok) {
      setStage("failed");
      setError(registered.error);
      return;
    }
    setStage("received");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStage("precheck");
    const checked = await runPrecheckAction(registered.data.id);
    if (!checked.ok) {
      setStage("failed");
      setError(checked.error);
      router.refresh();
      return;
    }
    setStage(checked.data.status === "needs_attention" ? "failed" : "done");
    router.refresh();
  };

  const steps: { key: Stage; label: string }[] = [
    { key: "received", label: d.steps.received },
    { key: "precheck", label: d.steps.precheck },
    { key: "done", label: d.steps.prechecked },
  ];
  const reached = (key: Stage) => {
    const order: Stage[] = ["uploading", "received", "precheck", "done"];
    return order.indexOf(stage) >= order.indexOf(key);
  };

  return (
    <>
      <Button variant={secondary ? "secondary" : "primary"} size="sm" icon={Plus} onClick={() => setOpen(true)} data-testid={`upload-${typeCode}`}>
        {secondary ? d.uploadAnother : d.upload}
      </Button>
      <Sheet open={open} onClose={close} title={typeName} description={d.fileHint} closeLabel={t.common.actions.close}>
        {stage === "idle" || (stage === "failed" && error === "upload_failed") ? (
          <div className="space-y-4 pt-2">
            <label
              className={clsx(
                "flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-5 py-8 text-center transition",
                file ? "border-ink bg-sand" : "border-line2 hover:border-ink",
              )}
            >
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(event) => pick(event.target.files?.[0])}
                data-testid="document-file"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink shadow-card">
                <FileUp size={20} aria-hidden />
              </span>
              <span className="mt-3 max-w-full truncate text-[15px] font-semibold text-ink">{file ? file.name : d.chooseFile}</span>
              <span className="mt-1 text-[12.5px] text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(2)} Mo` : d.fileHint}</span>
            </label>
            <Field label={d.reference} optional={t.common.optional}>
              <Input ref={referenceRef} maxLength={80} placeholder={d.referencePlaceholder} autoComplete="off" />
            </Field>
            {hasExpiry ? (
              <Field label={d.expiresOn} optional={t.common.optional}>
                <Input ref={expiryRef} type="date" />
              </Field>
            ) : null}
            {error ? <Notice tone="danger">{t.common.errors[error]}</Notice> : null}
            <Button size="lg" block disabled={!file} onClick={submit} data-testid="document-submit">
              {d.upload}
            </Button>
          </div>
        ) : (
          <div className="pt-3" data-testid="document-progress" data-stage={stage}>
            {stage === "uploading" ? (
              <p className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
                <LoaderCircle size={18} className="animate-spin" aria-hidden />
                {d.uploading}
              </p>
            ) : (
              <ol className="space-y-4">
                {steps.map((step) => {
                  const isCurrent = stage === step.key && step.key !== "done";
                  const done = reached(step.key) && !isCurrent;
                  return (
                    <li key={step.key} className="flex items-center gap-3">
                      <span
                        className={clsx(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          done ? "bg-ink text-paper" : isCurrent ? "bg-gold-soft text-gold-ink" : "bg-sand text-faint",
                        )}
                      >
                        {done ? <Check size={16} strokeWidth={3} aria-hidden /> : isCurrent ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : null}
                      </span>
                      <span className={clsx("text-[15px]", done || isCurrent ? "font-medium text-ink" : "text-faint")}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            {stage === "failed" ? (
              <Notice tone="danger" icon={TriangleAlert} className="mt-5">
                {error ? t.common.errors[error] : d.precheckFailed}
              </Notice>
            ) : null}
            <p className="mt-6 rounded-2xl bg-sand px-4 py-3 text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink2">{d.precheckLabel}.</span> {d.precheckNote}
            </p>
            {stage === "done" || stage === "failed" ? (
              <Button size="lg" block className="mt-5" onClick={close} data-testid="document-close">
                {t.common.actions.close}
              </Button>
            ) : null}
          </div>
        )}
      </Sheet>
    </>
  );
}
