import Link from "next/link";
import { clsx } from "clsx";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "outline-inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string };

export function buttonClass({ variant = "primary", size = "md", block, className }: StyleProps = {}) {
  return clsx(
    "press inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "md" && "h-11 px-5 text-[14.5px]",
    size === "lg" && "h-[52px] px-7 text-[15.5px]",
    variant === "primary" && "bg-ink text-paper hover:bg-ink/88",
    variant === "secondary" && "border border-line2 bg-paper text-ink hover:border-ink",
    variant === "ghost" && "text-ink hover:bg-sand",
    variant === "inverse" && "bg-paper text-ink hover:bg-sand",
    variant === "outline-inverse" && "border border-white/30 text-white hover:bg-white/10",
    variant === "danger" && "border border-danger/30 bg-paper text-danger hover:bg-danger-soft",
    block && "w-full",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & { loading?: boolean; icon?: LucideIcon; iconRight?: LucideIcon };

export function Button({
  variant,
  size,
  block,
  className,
  loading,
  icon: Icon,
  iconRight: IconRight,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 15 : 17;
  return (
    <button {...rest} type={type} disabled={disabled || loading} className={buttonClass({ variant, size, block, className })}>
      {loading ? <LoaderCircle size={iconSize} className="animate-spin" aria-hidden /> : Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={iconSize} aria-hidden /> : null}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  StyleProps & { icon?: LucideIcon; iconRight?: LucideIcon; children: ReactNode };

export function ButtonLink({ variant, size, block, className, icon: Icon, iconRight: IconRight, children, ...rest }: ButtonLinkProps) {
  const iconSize = size === "sm" ? 15 : 17;
  return (
    <Link {...rest} className={buttonClass({ variant, size, block, className })}>
      {Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {IconRight ? <IconRight size={iconSize} aria-hidden /> : null}
    </Link>
  );
}
