"use client";

import { useState } from "react";
import { Field, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";

/** Introduction text with a live character count. */
export function BioField({ defaultValue }: { defaultValue: string }) {
  const { t } = useI18n();
  const [length, setLength] = useState(defaultValue.length);
  return (
    <Field label={t.pro.profile.bio} hint={t.pro.profile.bioHint(length)}>
      <Textarea
        name="bio"
        rows={6}
        maxLength={1200}
        defaultValue={defaultValue}
        placeholder={t.pro.profile.bioPlaceholder}
        onChange={(event) => setLength(event.target.value.length)}
      />
    </Field>
  );
}
