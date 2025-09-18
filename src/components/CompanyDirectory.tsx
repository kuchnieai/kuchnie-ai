'use client';

import { useCallback, useRef, useState } from 'react';

import type { Company } from '@/types/company';

import CompanyMap from './CompanyMap';

const EXCLUDED_FIELDS = new Set(['id', 'name', 'city', 'lat', 'lng', 'url']);

const humanizeKey = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

export type CompanyDirectoryProps = {
  companies: Company[];
};

const buildCardClassName = (isActive: boolean): string =>
  [
    'rounded-2xl border bg-white p-6 shadow-sm transition duration-200 hover:shadow-md',
    isActive ? 'border-blue-300 ring-2 ring-blue-400 ring-offset-2' : 'border-slate-200',
  ].join(' ');

export default function CompanyDirectory({ companies }: CompanyDirectoryProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  const handleSelectFromList = useCallback(
    (companyId: string) => {
      setSelectedCompanyId(companyId);
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [],
  );

  return (
    <div className="space-y-12">
      <section ref={mapSectionRef} className="mx-auto max-w-6xl">
        <CompanyMap
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelect={setSelectedCompanyId}
        />
      </section>

      <section className="mx-auto mt-12 max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Firmy partnerskie</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Poniżej znajdziesz listę firm dostępnych w naszym katalogu. Wersja mapowa umożliwia
            szybkie wyszukanie partnerów w Twojej okolicy, a lista stanowi tekstowy fallback dla
            wyszukiwarek i użytkowników preferujących klasyczny przegląd.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2">
          {companies.map((company) => {
            const additionalFields = Object.entries(company).filter(([key, value]) => {
              if (EXCLUDED_FIELDS.has(key)) {
                return false;
              }

              if (value === null || value === undefined || value === '') {
                return false;
              }

              return true;
            });

            const isActive = selectedCompanyId === company.id;

            return (
              <li key={company.id} className={buildCardClassName(isActive)}>
                <article className="space-y-3">
                  <header className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
                    {company.city ? (
                      <p className="text-sm text-slate-500">{company.city}</p>
                    ) : null}
                  </header>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {company.url ? (
                      <a
                        href={company.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Odwiedź stronę
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleSelectFromList(company.id)}
                      className="inline-flex items-center rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      Zobacz na mapie
                    </button>
                  </div>

                  {additionalFields.length > 0 ? (
                    <dl className="space-y-1 text-sm text-slate-600">
                      {additionalFields.map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-3">
                          <dt className="font-medium text-slate-500">{humanizeKey(key)}</dt>
                          <dd className="text-right text-slate-700">{formatValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
