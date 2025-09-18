import Link from 'next/link';

export default function CompaniesPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
        Trwają prace
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
        Katalog firm w przebudowie
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Przygotowujemy nowe doświadczenie prezentujące partnerów Kuchnie AI. Wróć do nas wkrótce,
        aby odkryć zaktualizowany katalog.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Wróć na stronę główną
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Zobacz inspiracje
        </Link>
      </div>
    </main>
  );
}
