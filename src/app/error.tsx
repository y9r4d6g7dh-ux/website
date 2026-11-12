"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset(): void }) {
  useEffect(() => {
    console.error("[EasyLife]", error);
  }, [error]);

  return (
    <div className="grid min-h-[50dvh] place-items-center text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-1 max-w-xs text-muted">
          Your data is safe on this device. Try again, or reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-4 font-medium text-accent-ink"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
