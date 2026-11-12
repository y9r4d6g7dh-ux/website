"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { CalendarDays, House, ListTodo, Timer, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DevStatus } from "./DevStatus";
import { EditorProvider } from "./Editors";
import { FocusOverlay } from "./FocusOverlay";
import { Dots, Logo } from "./ui/Bits";
import { FocusProvider, useFocus } from "@/lib/focus";
import { EASE, spring } from "@/lib/motion";
import { StoreProvider, useStore } from "@/lib/store";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/planner", label: "Planner", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: EASE }}>
      <StoreProvider>
        <FocusProvider>
          <EditorProvider>
            <Frame>{children}</Frame>
          </EditorProvider>
        </FocusProvider>
      </StoreProvider>
    </MotionConfig>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  const path = usePathname();
  const focus = useFocus();
  const timerLive = focus.status === "running" || focus.status === "paused";

  return (
    <div className="min-h-dvh md:pl-60">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-3">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">EasyLife</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-200 ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="side-active"
                    transition={spring}
                    className="absolute inset-0 rounded-xl border border-line bg-card"
                  />
                )}
                <item.icon
                  size={18}
                  strokeWidth={1.75}
                  className={`relative ${active ? "text-accent" : ""}`}
                  aria-hidden
                />
                <span className="relative">{item.label}</span>
                {item.href === "/focus" && timerLive && (
                  <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-label="Timer active" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-1">
          <DevStatus />
          <p className="mt-3 px-2 text-xs text-muted">Less chaos. More life.</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-end justify-between bg-bg/90 px-5 pb-2.5 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-base font-semibold tracking-tight">EasyLife</span>
        </Link>
        <DevStatus />
      </div>

      <main
        id="main"
        className="mx-auto w-full max-w-[720px] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 md:px-10 md:pb-16 md:pt-12"
      >
        {ready ? (
          children
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <Dots label="Loading your day" />
          </div>
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex h-[58px] max-w-md items-stretch px-1">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200 ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  <motion.span whileTap={{ scale: 0.9 }} transition={spring} className="relative">
                    <item.icon size={21} strokeWidth={1.75} className={active ? "text-accent" : ""} aria-hidden />
                    {item.href === "/focus" && timerLive && (
                      <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </motion.span>
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="tab-active"
                      transition={spring}
                      className="absolute top-0 h-0.5 w-7 rounded-full bg-accent"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <FocusOverlay />
      <DayComplete />
    </div>
  );
}

/** Shown once per day when every priority task is done. Quiet on purpose. */
function DayComplete() {
  const { celebrating, dismissCelebration } = useStore();

  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(dismissCelebration, 4200);
    return () => clearTimeout(timer);
  }, [celebrating, dismissCelebration]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex justify-center px-5 md:top-6"
    >
      <AnimatePresence>
        {celebrating && (
          <motion.button
            type="button"
            onClick={dismissCelebration}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.25, ease: EASE } }}
            transition={spring}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-card py-3 pl-3.5 pr-5 shadow-sheet"
          >
            <span className="relative grid h-9 w-9 place-items-center">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border border-accent"
                initial={{ scale: 0.7, opacity: 0.7 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
              />
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  style={{ rotate: -90, transformOrigin: "center" }}
                />
                <motion.path
                  d="M12 18.5l4.2 4.2 8-9"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: EASE, delay: 0.45 }}
                />
              </svg>
            </span>
            <span className="text-left">
              <span className="block text-[15px] font-medium">Day complete. Well done.</span>
              <span className="block text-[13px] text-muted">Every priority is finished.</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
