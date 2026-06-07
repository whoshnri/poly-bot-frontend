import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-900 px-4 py-safe text-center text-neutral-100">
      <p className="serif-display text-5xl text-neutral-200">404</p>
      <h1 className="mt-3 text-lg font-medium">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        That route does not exist. Head back to explore or open an existing session from the
        menu.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-5 text-sm font-medium text-neutral-900"
      >
        Back to explore
      </Link>
    </div>
  );
}
