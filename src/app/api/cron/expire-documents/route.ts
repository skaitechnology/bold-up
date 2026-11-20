import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily job (see vercel.json): marks approved documents past their expiry date as
 * expired. A coach whose required documents are no longer all valid loses the approved
 * status until a new document is reviewed. Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("expire_documents");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ expired: data ?? 0 });
}
