"use client";

import { motion } from "motion/react";
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { spring } from "@/lib/motion";

/* 16px text on inputs prevents iOS Safari from zooming on focus. */
const INPUT =
  "w-full rounded-xl border border-line bg-card px-3.5 text-base text-ink placeholder:text-muted/70 transition-colors duration-200 focus:border-accent focus-visible:outline-none";

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] text-muted">
      {children}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT} h-11 ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${INPUT} min-h-24 resize-y py-2.5 leading-relaxed ${className}`} {...rest} />;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

/** Segmented control with a sliding selection pill. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: Option<T>[];
  value: T;
  onChange(value: T): void;
  label: string;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-xl border border-line bg-surface p-1 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative h-9 flex-1 rounded-lg px-3.5 text-sm transition-colors duration-200 ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                transition={spring}
                className="absolute inset-0 rounded-lg border border-line bg-card"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Small selectable chips, e.g. durations. */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange(value: T): void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-9 rounded-lg border px-3 text-sm transition-colors duration-200 ${
              active
                ? "border-accent bg-accent/12 text-ink"
                : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange(next: boolean): void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-card px-3.5 text-[15px]"
    >
      <span>{label}</span>
      <span
        className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? "justify-end bg-accent" : "justify-start bg-line"
        }`}
      >
        <motion.span layout transition={spring} className="h-5 w-5 rounded-full bg-bg" />
      </span>
    </button>
  );
}
