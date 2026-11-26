"use client";

import { ActionButton } from "@/components/admin/admin-toggle";
import { setEventPublishedAction } from "@/lib/actions/events";
import { useI18n } from "@/lib/i18n/client";

/** Back office: puts an event on the public site, or takes it off, in one tap. */
export function EventPublishToggle({ eventId, published }: { eventId: string; published: boolean }) {
  const { t } = useI18n();
  const a = t.events.admin;
  return (
    <ActionButton
      action={() => setEventPublishedAction(eventId, !published)}
      label={published ? a.unpublish : a.publish}
      success={published ? a.unpublishedDone : a.publishedDone}
      variant={published ? "secondary" : "primary"}
      testId="event-publish"
    />
  );
}
