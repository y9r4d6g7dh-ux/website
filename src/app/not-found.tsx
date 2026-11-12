import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-muted">There’s nothing at this address.</p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-4 font-medium text-accent-ink"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
