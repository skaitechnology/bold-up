"use client";

import { Clock, PencilLine, Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { deleteServiceAction, saveServiceAction } from "@/lib/actions/pro";
import { FORMATS } from "@/lib/domain";
import { formatDuration, formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { DeleteButton } from "./delete-button";

export type EditableService = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
  format: string;
  is_active: boolean;
};

const DURATIONS = [30, 45, 55, 60, 75, 90, 120];

/** The coach's price list: add, edit, hide or delete a session type. */
export function ServicesEditor({ services }: { services: EditableService[] }) {
  const { t, locale } = useI18n();
  const p = t.pro.profile;
  const router = useRouter();
  const [editing, setEditing] = useState<EditableService | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div>
      {services.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={p.serviceEmpty}
          text={p.serviceEmptyText}
          action={
            <Button icon={Plus} onClick={() => setEditing("new")} data-testid="service-add">
              {p.serviceAdd}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5">
            {services.map((service) => (
              <li key={service.id} className="flex items-center gap-4 rounded-[20px] border border-line bg-paper px-4 py-3.5" data-testid="service-row">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-semibold text-ink">
                    {service.name}
                    {!service.is_active ? (
                      <Badge tone="neutral" size="sm">
                        {p.serviceInactive}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} aria-hidden />
                      {formatDuration(service.duration_min)}
                    </span>
                    <span>{t.common.formats[service.format as "private" | "group"]}</span>
                  </p>
                </div>
                <p className="shrink-0 text-[18px] font-semibold tabular text-ink" data-testid="service-price">
                  {formatPrice(service.price_cents, locale)}
                </p>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setEditing(service)}
                    aria-label={`${t.common.actions.edit} — ${service.name}`}
                    className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand"
                    data-testid="service-edit"
                  >
                    <PencilLine size={17} aria-hidden />
                  </button>
                  <DeleteButton action={deleteServiceAction} id={service.id} label={`${t.common.actions.delete} — ${service.name}`} success={p.serviceDeleted} />
                </div>
              </li>
            ))}
          </ul>
          <Button variant="secondary" icon={Plus} className="mt-4" onClick={() => setEditing("new")} data-testid="service-add">
            {p.serviceAdd}
          </Button>
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={current ? p.serviceEdit : p.serviceAdd} closeLabel={t.common.actions.close}>
        <ActionForm
          action={saveServiceAction}
          onSuccess={() => {
            setEditing(null);
            router.refresh();
          }}
          className="space-y-4 pt-2"
        >
          <input type="hidden" name="id" value={current?.id ?? ""} />
          <Field label={p.serviceName}>
            <Input name="name" required minLength={2} maxLength={80} defaultValue={current?.name} placeholder={p.serviceNamePlaceholder} autoFocus />
          </Field>
          <Field label={p.serviceDescription} optional={t.common.optional}>
            <Textarea name="description" rows={3} maxLength={400} defaultValue={current?.description} placeholder={p.serviceDescriptionPlaceholder} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={p.serviceDuration}>
              <Select name="duration_min" defaultValue={current?.duration_min ?? 60}>
                {[...new Set([...DURATIONS, ...(current ? [current.duration_min] : [])])]
                  .sort((a, b) => a - b)
                  .map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatDuration(minutes)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={p.servicePrice}>
              <Input
                name="price"
                type="number"
                inputMode="decimal"
                min={0}
                max={1000}
                step="0.5"
                required
                defaultValue={current ? current.price_cents / 100 : ""}
                placeholder="50"
              />
            </Field>
          </div>
          <Field label={p.serviceFormat}>
            <Select name="format" defaultValue={current?.format ?? "private"}>
              {FORMATS.map((format) => (
                <option key={format} value={format}>
                  {t.common.formats[format]}
                </option>
              ))}
            </Select>
          </Field>
          <Switch name="is_active" defaultChecked={current?.is_active ?? true} label={p.serviceActive} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" block onClick={() => setEditing(null)}>
              {t.common.actions.cancel}
            </Button>
            <SubmitButton block data-testid="service-save">
              {t.common.actions.save}
            </SubmitButton>
          </div>
        </ActionForm>
      </Sheet>
    </div>
  );
}
