"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE, softSpring, spring } from "@/lib/motion";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-[15px] font-medium text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
      <p className="text-[15px] text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Three-dot loading indicator. Animates only while mounted. */
export function Dots({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 6,
  children,
  label,
}: {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          initial={{ strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 1 - clamped }}
          transition={softSpring}
          style={{ opacity: clamped === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Round checkbox with a drawn check mark. */
export function Check({
  checked,
  onChange,
  label,
  size = 22,
}: {
  checked: boolean;
  onChange(): void;
  label: string;
  size?: number;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      whileTap={{ scale: 0.86 }}
      transition={spring}
      className="relative grid h-11 w-9 shrink-0 place-items-center"
    >
      <motion.span
        className="grid place-items-center rounded-full border-[1.5px]"
        style={{ width: size, height: size }}
        animate={{
          backgroundColor: checked ? "var(--accent)" : "rgba(0,0,0,0)",
          borderColor: checked ? "var(--accent)" : "var(--muted)",
        }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        <svg width={size - 10} height={size - 10} viewBox="0 0 12 12" fill="none" aria-hidden>
          <motion.path
            d="M2.5 6.4l2.4 2.4 4.6-5.2"
            stroke="var(--accent-ink)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.24, ease: EASE, delay: checked ? 0.06 : 0 }}
          />
        </svg>
      </motion.span>
    </motion.button>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--line)" strokeWidth="2.5" />
      <path d="M12 3a9 9 0 1 1-9 9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
