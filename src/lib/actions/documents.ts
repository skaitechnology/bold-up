"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "@/lib/domain";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { allow } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runTechnicalChecks } from "@/lib/verification/checks";

const registerSchema = z.object({
  typeCode: z.string().regex(/^[a-z_]{2,40}$/),
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
  reference: z.string().trim().max(80).optional(),
  expiresOn: z.union([z.literal(""), z.iso.date()]).optional(),
});

/**
 * Step 1 of the verification workflow: the browser has just uploaded the file to the
 * coach's private folder; this records it and puts it in "pre-check pending".
 */
export async function registerDocumentAction(input: z.input<typeof registerSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.path[0];
    return fail(issue === "mimeType" ? "unsupported_file_type" : issue === "sizeBytes" ? "file_too_large" : "invalid_input");
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail("not_authenticated");
  if (!(await allow(`upload:${userId}`, 20, 3600))) return fail("rate_limited");

  const { data, error } = await supabase.rpc("register_document", {
    p_type_code: parsed.data.typeCode,
    p_storage_path: parsed.data.path,
    p_file_name: parsed.data.fileName,
    p_mime_type: parsed.data.mimeType,
    p_size_bytes: parsed.data.sizeBytes,
    p_reference: parsed.data.reference || undefined,
    p_expires_on: parsed.data.expiresOn || undefined,
  });
  if (error || !data) {
    // The row was refused: do not leave an orphan file behind.
    await supabase.storage.from("coach-documents").remove([parsed.data.path]);
    return fail(toErrorCode(error));
  }
  revalidatePath("/pro/documents");
  return ok({ id: data });
}

/**
 * Step 2: the simulated pre-check. Reads the first bytes of the stored file with the
 * service role, runs deterministic technical checks and reports the outcome to the
 * database, which moves the document to "awaiting human review" or "needs attention".
 * Nothing here authenticates the document: see src/lib/verification/checks.ts.
 */
export async function runPrecheckAction(documentId: string): Promise<ActionResult<{ status: string }>> {
  if (!z.uuid().safeParse(documentId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail("not_authenticated");

  // Read through the user's own session: row level security proves ownership.
  const { data: document } = await supabase
    .from("coach_documents")
    .select("id, coach_id, type_code, storage_path, file_name, mime_type, size_bytes, status")
    .eq("id", documentId)
    .eq("coach_id", userId)
    .maybeSingle();
  if (!document) return fail("not_found");
  if (document.status !== "precheck_pending") return ok({ status: document.status });

  const admin = createAdminClient();
  let head: Uint8Array | null = null;
  let sizeBytes = document.size_bytes;
  const download = await admin.storage.from("coach-documents").download(document.storage_path);
  if (download.data) {
    sizeBytes = download.data.size;
    head = new Uint8Array(await download.data.slice(0, 16).arrayBuffer());
  }

  // A short, honest pause so the "pre-check in progress" state is visible to the coach.
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const report = runTechnicalChecks({
    head,
    sizeBytes,
    declaredMimeType: document.mime_type,
    typeCode: document.type_code,
    fileName: document.file_name,
  });
  const { data: status, error } = await admin.rpc("record_precheck", {
    p_document_id: document.id,
    p_passed: report.passed,
    p_report: report,
  });
  if (error || !status) return fail(toErrorCode(error));
  revalidatePath("/pro/documents");
  revalidatePath("/pro");
  revalidatePath("/admin");
  return ok({ status });
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(documentId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_document", { p_document_id: documentId });
  if (error) return fail(toErrorCode(error));
  if (path) await supabase.storage.from("coach-documents").remove([path]);
  revalidatePath("/pro/documents");
  revalidatePath("/pro");
  return ok();
}
