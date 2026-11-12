"use client";

import Link from "next/link";
import { useState } from "react";
import { LOCAL_ENGINE_LABEL } from "./PlanFlow";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";
import { useAiStatus } from "@/lib/ai-client";
import { useStore } from "@/lib/store";

/** Small pill that always tells you which mode EasyLife is running in. */
export function DevStatus({ className = "" }: { className?: string }) {
  const status = useAiStatus();
  const { data, storage, storageError } = useStore();
  const [open, setOpen] = useState(false);

  const ai = status?.mode === "ai";
  const label = !status ? "Checking…" : ai ? "AI connected" : "Local demo";
  const warn = storage === "memory" || !!storageError;

  const rows: [string, string][] = [
    ["Mode", !status ? "Checking…" : ai ? "Real AI Mode" : "Local Demo Mode"],
    ["Planning", ai ? `AI model · ${status?.model}` : LOCAL_ENGINE_LABEL],
    ["Storage", storage === "indexeddb" ? "IndexedDB · on this device" : "Memory only · not saved"],
    ["Environment", status?.environment ?? "—"],
    [
      "Data",
      `${data.tasks.length} tasks · ${data.events.length} events · ${data.notes.length} notes`,
    ],
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs text-muted transition-colors hover:text-ink ${className}`}
        aria-label={`System status: ${label}. Open details.`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${warn ? "bg-danger" : ai ? "bg-accent" : "bg-muted"}`}
          aria-hidden
        />
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="System status">
        <dl className="divide-y divide-line rounded-2xl border border-line bg-card">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {storageError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {storageError}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {ai
            ? "Planning requests go through this app's server, which holds the API key. Your tasks stay in this browser."
            : "Everything runs in this browser. Plans come from a deterministic rule-based engine — no AI model is involved. Add an API key to .env.local to enable Real AI Mode."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Link
            href="/profile#data"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 items-center rounded-xl px-4 text-[15px] text-muted hover:bg-card hover:text-ink"
          >
            Manage data
          </Link>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Sheet>
    </>
  );
}
