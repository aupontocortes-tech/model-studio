import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.035em] text-[var(--ink)] sm:text-[32px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_8px_24px_rgba(16,24,40,0.035)] ${className}`}
    >
      {title ? (
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const styles = {
    primary:
      "bg-[var(--accent)] text-white shadow-[0_1px_2px_rgba(76,50,170,0.25)] hover:bg-[var(--accent-hover)]",
    secondary:
      "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--ink)] shadow-sm hover:border-[var(--accent)] hover:bg-[var(--panel)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--panel-elevated)] hover:text-[var(--ink)]",
    danger: "bg-[var(--danger)] text-white hover:brightness-95",
  }[variant];

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-[var(--ink)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs leading-5 text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-soft)]";
