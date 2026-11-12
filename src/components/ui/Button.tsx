"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { spring } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "icon";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink font-medium hover:brightness-105",
  secondary: "bg-card text-ink border border-line hover:border-muted/60",
  ghost: "text-muted hover:text-ink hover:bg-card",
  danger: "text-danger hover:bg-danger/10",
};

const SIZE: Record<Size, string> = {
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  icon: "h-10 w-10 rounded-xl",
};

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "secondary", size = "md", className = "", type, ...rest }: ButtonProps) {
  return (
    <motion.button
      type={type ?? "button"}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap transition-colors duration-200 disabled:opacity-45 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
}
