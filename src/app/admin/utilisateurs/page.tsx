import type { Metadata } from "next";
import { Search, UserX } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-toggle";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { setUserSuspendedAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersAdmin } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.users.title };
}

const selectClass = "h-11 rounded-full border border-line2 bg-paper px-4 text-[14px] font-medium text-ink outline-none focus:border-ink";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const [params, { t, locale }, me] = await Promise.all([searchParams, getI18n(), requireAdmin("/admin/utilisateurs")]);
  const users = await listUsersAdmin({ q: params.q, role: params.role });
  const u = t.admin.users;
  return (
    <div className="space-y-6">
      <PageHeader title={u.title} text={u.text} />
      <form method="get" className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">{u.search}</span>
          <Search size={17} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={u.search}
            className="h-11 w-full rounded-full border border-line2 bg-paper pl-11 pr-4 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <select name="role" defaultValue={params.role ?? ""} aria-label={u.columns.role} className={selectClass}>
          <option value="">{u.allRoles}</option>
          {(["customer", "coach", "admin"] as const).map((role) => (
            <option key={role} value={role}>
              {u.roles[role]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t.common.nav.search}
        </Button>
      </form>
      <p className="text-[13.5px] text-muted">{u.results(users.length)}</p>

      {users.length === 0 ? (
        <EmptyState icon={UserX} title={u.empty} />
      ) : (
        <ul className="overflow-hidden rounded-[24px] border border-line bg-paper">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 md:px-5" data-testid="admin-user-row">
              <Avatar name={user.full_name || user.email} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className="truncate">{user.full_name || "—"}</span>
                  {user.id === me.id ? (
                    <Badge tone="ink" size="sm">
                      {u.you}
                    </Badge>
                  ) : null}
                  {user.is_demo ? <DemoBadge label={t.common.demo} /> : null}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {[user.email, user.city, formatDate(user.created_at, locale)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge tone={user.role === "admin" ? "ink" : user.role === "coach" ? "gold" : "neutral"} size="sm">
                {u.roles[user.role]}
              </Badge>
              {user.deletion_requested_at ? (
                <Badge tone="warn" size="sm">
                  {u.deletionRequested}
                </Badge>
              ) : null}
              <Badge tone={user.is_suspended ? "danger" : "success"} size="sm">
                {user.is_suspended ? u.suspended : u.active}
              </Badge>
              {user.id !== me.id ? (
                <ActionButton
                  action={setUserSuspendedAction.bind(null, user.id, !user.is_suspended)}
                  label={user.is_suspended ? u.reinstate : u.suspend}
                  success={u.updated}
                  variant={user.is_suspended ? "secondary" : "danger"}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
