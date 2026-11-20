import type { Metadata } from "next";
import { Heart, Search } from "lucide-react";
import { CoachCard } from "@/components/coach/coach-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listCoachCardsByIds } from "@/lib/data/coaches";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.favorites.title, robots: { index: false } };
}

export default async function FavoritesPage() {
  const user = await requireUser("/favoris");
  const [{ t, locale }, ids] = await Promise.all([getI18n(), getFavoriteCoachIds(user.id)]);
  const coaches = await listCoachCardsByIds(ids);
  const f = t.account.favorites;
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-12">
      <PageHeader title={f.title} text={f.text} />
      {coaches.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Heart}
          title={f.empty}
          text={f.emptyText}
          action={
            <ButtonLink href="/coachs" icon={Search}>
              {t.account.bookings.findCoach}
            </ButtonLink>
          }
        />
      ) : (
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite signedIn />
          ))}
        </div>
      )}
    </div>
  );
}
