// Simulated "AI pre-check" — the deterministic part.
//
// This is deliberately NOT document authentication. It only answers technical questions
// about the uploaded file (is it there, is it really a PDF/JPEG/PNG, is the size sane).
// It extracts nothing and proves nothing about the diploma, card or identity.
// A real OCR / document-AI engine can replace `runTechnicalChecks` behind the same
// `PrecheckReport` shape without touching the workflow around it.

import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "@/lib/domain";

export const PRECHECK_ENGINE = "simulated-precheck-v1";

export type PrecheckCode = "file_exists" | "not_empty" | "size_ok" | "type_allowed" | "signature_matches" | "metadata_present";

export type PrecheckReport = {
  engine: string;
  /** Always true for this engine: shown in the UI so nobody mistakes it for a real verification. */
  simulated: true;
  passed: boolean;
  ran_at: string;
  checks: { code: PrecheckCode; passed: boolean }[];
};

/** Detects the real file type from its first bytes, ignoring the name and declared MIME type. */
export function sniffMimeType(head: Uint8Array): (typeof DOCUMENT_MIME_TYPES)[number] | null {
  const startsWith = (bytes: number[]) => bytes.every((byte, index) => head[index] === byte);
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  return null;
}

export type PrecheckInput = {
  /** First bytes of the stored object, or null when it could not be read. */
  head: Uint8Array | null;
  sizeBytes: number;
  declaredMimeType: string;
  typeCode: string;
  fileName: string;
};

export function runTechnicalChecks(input: PrecheckInput, now: Date = new Date()): PrecheckReport {
  const exists = input.head !== null;
  const sniffed = input.head ? sniffMimeType(input.head) : null;
  const checks: PrecheckReport["checks"] = [
    { code: "file_exists", passed: exists },
    { code: "not_empty", passed: exists && input.sizeBytes > 0 && (input.head?.length ?? 0) > 0 },
    { code: "size_ok", passed: input.sizeBytes > 0 && input.sizeBytes <= DOCUMENT_MAX_BYTES },
    { code: "type_allowed", passed: (DOCUMENT_MIME_TYPES as readonly string[]).includes(input.declaredMimeType) },
    { code: "signature_matches", passed: sniffed !== null && sniffed === input.declaredMimeType },
    { code: "metadata_present", passed: input.typeCode.length > 0 && input.fileName.trim().length > 0 },
  ];
  return {
    engine: PRECHECK_ENGINE,
    simulated: true,
    passed: checks.every((check) => check.passed),
    ran_at: now.toISOString(),
    checks,
  };
}

export function parsePrecheckReport(raw: unknown): PrecheckReport | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PrecheckReport>;
  if (!Array.isArray(value.checks)) return null;
  return {
    engine: typeof value.engine === "string" ? value.engine : PRECHECK_ENGINE,
    simulated: true,
    passed: value.passed === true,
    ran_at: typeof value.ran_at === "string" ? value.ran_at : "",
    checks: value.checks.filter(
      (check): check is PrecheckReport["checks"][number] =>
        Boolean(check) && typeof check.code === "string" && typeof check.passed === "boolean",
    ),
  };
}
