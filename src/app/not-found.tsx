import Link from 'next/link';

import AppLogo from '@/components/ui/AppLogo';

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <AppLogo size={52} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The route you requested does not exist in this workspace. Head back to the compiler and
          keep shipping.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary rounded-md px-5 py-3 text-sm font-semibold">
            Return home
          </Link>
          <a
            href="javascript:history.back()"
            className="btn-ghost rounded-md px-5 py-3 text-sm font-semibold"
          >
            Go back
          </a>
        </div>
      </div>
    </main>
  );
}
