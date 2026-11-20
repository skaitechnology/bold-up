import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

// 16px on phones keeps iOS Safari from zooming into focused fields.
const base =
  "w-full rounded-2xl border border-line2 bg-paper px-4 text-[16px] text-ink outline-none transition md:text-[15px] " +
  "focus:border-ink focus:ring-4 focus:ring-ink/8 disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted " +
  "aria-[invalid=true]:border-danger";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={clsx(base, "h-12", className)} />;
}

export function Textarea({ className, rows = 4, ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} rows={rows} className={clsx(base, "resize-y py-3 leading-relaxed", className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select
      {...rest}
      className={clsx(
        base,
        "h-12 appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2366655f%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        className,
      )}
    >
      {children}
    </select>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint or error. Wraps the control in a <label> when no htmlFor is given. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  const head = (
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {optional ? <span className="text-[12px] text-faint">{optional}</span> : null}
    </span>
  );
  const foot = error ? (
    <span role="alert" className="mt-1.5 block text-[12.5px] text-danger">
      {error}
    </span>
  ) : hint ? (
    <span className="mt-1.5 block text-[12.5px] leading-snug text-muted">{hint}</span>
  ) : null;

  if (htmlFor) {
    return (
      <div className={className}>
        <label htmlFor={htmlFor} className="block">
          {head}
        </label>
        {children}
        {foot}
      </div>
    );
  }
  return (
    <label className={clsx("block", className)}>
      {head}
      {children}
      {foot}
    </label>
  );
}

/** Selectable pill used for multi-choice options (sports, levels, formats…). */
export function ChoiceChip({
  name,
  value,
  type = "checkbox",
  defaultChecked,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  type?: "checkbox" | "radio";
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="press relative inline-flex cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer sr-only"
      />
      <span
        className={clsx(
          "inline-flex h-10 items-center gap-2 rounded-full border border-line2 bg-paper px-4 text-[14px] font-medium text-ink2 transition",
          "peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper",
          "peer-focus-visible:ring-4 peer-focus-visible:ring-ink/15 hover:border-ink",
        )}
      >
        {children}
      </span>
    </label>
  );
}

/** iOS-style switch backed by a real checkbox, so it works in plain forms. */
export function Switch({
  name,
  defaultChecked,
  checked,
  onChange,
  label,
  description,
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          checked={checked}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="peer sr-only"
        />
        <span className="h-7 w-12 rounded-full bg-line2 transition peer-checked:bg-ink peer-focus-visible:ring-4 peer-focus-visible:ring-ink/15" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-paper shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
