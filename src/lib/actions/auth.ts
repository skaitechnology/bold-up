"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homeFor, safeNext } from "@/lib/auth/session";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import type { ErrorCode } from "@/lib/errors";
import { getLocale } from "@/lib/i18n/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: ErrorCode;
  notice?: "magic_sent" | "reset_sent" | "password_updated";
  values?: { fullName?: string; email?: string };
};

const emailSchema = z.email().max(200);
const passwordSchema = z.string().min(8).max(72);

const signUpSchema = z.object({
  role: z.enum(["customer", "coach"]),
  fullName: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

async function origin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? siteUrl();
}

/**
 * Creates the account and signs the user in, in one step.
 * The account is created server-side with a confirmed e-mail so a coach lands on the
 * dashboard right away. Trade-off (documented): address ownership is not proven at sign-up.
 */
export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    role: formData.get("role"),
    fullName: formData.get("fullName"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  };
  const values = { fullName: String(raw.fullName ?? ""), email: raw.email };
  if (!isSupabaseConfigured) return { error: "not_configured", values };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const weak = parsed.error.issues.some((issue) => issue.path[0] === "password");
    return { error: weak ? "weak_password" : "invalid_input", values };
  }
  const { role, fullName, email, password } = parsed.data;

  if (!(await allow(`signup:${await clientIp()}`, 8, 3600))) return { error: "rate_limited", values };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "not_configured", values };
  }
  const locale = await getLocale();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // The database trigger clamps `role` to customer/coach: admin can never be requested here.
    user_metadata: { full_name: fullName, role, locale },
  });
  if (createError) {
    const taken = createError.status === 422 || /already|registered|exists/i.test(createError.message);
    const weak = /password/i.test(createError.message) && !taken;
    return { error: taken ? "email_taken" : weak ? "weak_password" : "generic", values };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "generic", values };

  const next = safeNext(String(formData.get("next") ?? ""));
  redirect(role === "coach" ? "/pro" : (next ?? "/"));
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };
  if (!isSupabaseConfigured) return { error: "not_configured", values };
  if (!emailSchema.safeParse(email).success || password.length === 0) return { error: "invalid_credentials", values };

  if (!(await allow(`login:${await clientIp()}`, 20, 600))) return { error: "rate_limited", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "invalid_credentials", values };

  const { data: profile } = await supabase.from("profiles").select("role, is_suspended").eq("id", data.user.id).maybeSingle();
  if (!profile || profile.is_suspended) {
    await supabase.auth.signOut();
    return { error: profile?.is_suspended ? "suspended" : "generic", values };
  }

  const next = safeNext(String(formData.get("next") ?? ""));
  redirect(next ?? homeFor(profile.role));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Passwordless sign-in for existing accounts. Always answers the same, whether or not the address exists. */
export async function magicLinkAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isSupabaseConfigured) return { error: "not_configured", values: { email } };
  if (!emailSchema.safeParse(email).success) return { error: "invalid_input", values: { email } };
  if (!(await allow(`magic:${await clientIp()}`, 5, 900))) return { error: "rate_limited", values: { email } };

  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await origin()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });
  return { notice: "magic_sent", values: { email } };
}

export async function forgotPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isSupabaseConfigured) return { error: "not_configured", values: { email } };
  if (!emailSchema.safeParse(email).success) return { error: "invalid_input", values: { email } };
  if (!(await allow(`reset:${await clientIp()}`, 5, 900))) return { error: "rate_limited", values: { email } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent("/nouveau-mot-de-passe")}`,
  });
  return { notice: "reset_sent", values: { email } };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordSchema.safeParse(password).success) return { error: "weak_password" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "not_authenticated" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /password/i.test(error.message) ? "weak_password" : "generic" };
  return { notice: "password_updated" };
}

/** Turns a customer account into a coach account (draft profile, no privilege gained). */
export async function becomeCoachAction() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("become_coach");
  if (error) redirect("/compte");
  redirect("/pro");
}
