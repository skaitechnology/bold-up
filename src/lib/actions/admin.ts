"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/actions/pro";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Every function here calls the database with the admin's own session.
// Authorization is enforced there (is_admin() inside each RPC, admin-only row level
// security on the tables): hiding buttons in the interface is never the protection.

function refreshCoach(coachId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/coachs");
  revalidatePath(`/admin/coachs/${coachId}`);
  revalidatePath("/coachs");
  revalidatePath("/");
}

const reviewSchema = z.object({
  documentId: z.uuid(),
  coachId: z.uuid(),
  decision: z.enum(["approve", "reject", "request_info"]),
  note: z.string().trim().max(1000),
  externalCheck: z.string().trim().max(1000),
});

export async function reviewDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse({
    documentId: formData.get("documentId"),
    coachId: formData.get("coachId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
    externalCheck: formData.get("externalCheck") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_document", {
    p_document_id: parsed.data.documentId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || undefined,
    p_external_check: parsed.data.externalCheck || undefined,
  });
  if (error) return { error: toErrorCode(error) };
  refreshCoach(parsed.data.coachId);
  return { ok: true };
}

const decisionSchema = z.object({
  coachId: z.uuid(),
  decision: z.enum(["approve", "reject", "request_changes", "suspend", "reinstate"]),
  note: z.string().trim().max(1000),
});

export async function decideCoachAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = decisionSchema.safeParse({
    coachId: formData.get("coachId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: "invalid_input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_decide_coach", {
    p_coach_id: parsed.data.coachId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { error: toErrorCode(error) };
  refreshCoach(parsed.data.coachId);
  return { ok: true };
}

export async function setQualificationStatusAction(qualificationId: string, status: "declared" | "verified", coachId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(qualificationId).success || !z.uuid().safeParse(coachId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_qualification_status", { p_qualification_id: qualificationId, p_status: status });
  if (error) return fail(toErrorCode(error));
  refreshCoach(coachId);
  return ok();
}

export async function setCoachPublishedAction(coachId: string, published: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(coachId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_coach_published", { p_coach_id: coachId, p_published: published });
  if (error) return fail(toErrorCode(error));
  refreshCoach(coachId);
  return ok();
}

export async function setUserSuspendedAction(userId: string, suspended: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(userId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspended", { p_user_id: userId, p_suspended: suspended });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/coachs");
  return ok();
}

// ---------------------------------------------------------------- reference lists

const sportSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name_fr: z.string().trim().min(2).max(60),
  name_en: z.string().trim().min(2).max(60),
});

export async function saveSportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sportSchema.safeParse({ id: formData.get("id") ?? "", name_fr: formData.get("name_fr"), name_en: formData.get("name_en") });
  if (!parsed.success) return { error: "invalid_input" };
  const supabase = await createClient();
  const { id, ...names } = parsed.data;
  if (id) {
    const { error } = await supabase.from("sports").update(names).eq("id", id);
    if (error) return { error: toErrorCode(error) };
  } else {
    const slug = names.name_fr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const { data: last } = await supabase.from("sports").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("sports").insert({ ...names, slug, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: error.code === "23505" ? "invalid_input" : toErrorCode(error) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setSportActiveAction(sportId: string, active: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(sportId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("sports").update({ is_active: active }).eq("id", sportId).select("id").maybeSingle();
  if (error) return fail(toErrorCode(error));
  if (!data) return fail("forbidden");
  revalidatePath("/", "layout");
  return ok();
}

export async function setDocumentTypeRequiredAction(code: string, required: boolean): Promise<ActionResult> {
  if (!/^[a-z_]{2,40}$/.test(code)) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("document_types").update({ is_required: required }).eq("code", code).select("code").maybeSingle();
  if (error) return fail(toErrorCode(error));
  if (!data) return fail("forbidden");
  revalidatePath("/admin/reglages");
  revalidatePath("/pro", "layout");
  return ok();
}
