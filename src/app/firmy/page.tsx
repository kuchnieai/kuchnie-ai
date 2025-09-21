'use client';

import { useMemo, useState } from 'react';
import { companies, cityFilters, serviceFilters } from '@/lib/companies';

const ratingOptions = [
  { label: 'Dowolna ocena', value: 0 },
  { label: 'Min. 4.5', value: 4.5 },
  { label: 'Min. 4.7', value: 4.7 },
  { label: 'Min. 4.8', value: 4.8 },
];

const formatCountLabel = (count: number) => {
  if (count === 1) {
    return '1 firmę';
  }
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `${count} firmy`;
  }
  return `${count} firm`;
};

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [company.name, company.description, company.city, company.voivodeship]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCity = selectedCity === 'all' || company.city === selectedCity;

      const matchesServices =
        selectedServices.length === 0 ||
        selectedServices.every((service) => company.services.includes(service));

      const matchesRating = company.rating >= minRating;

      return matchesSearch && matchesCity && matchesServices && matchesRating;
    });
  }, [minRating, searchTerm, selectedCity, selectedServices]);

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredCompanies]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedCity !== 'all' ||
    selectedServices.length > 0 ||
    minRating > 0;

  const activeFiltersSummary = [
    searchTerm.trim().length > 0 ? `fraza „${searchTerm.trim()}”` : null,
    selectedCity !== 'all' ? `miasto ${selectedCity}` : null,
    minRating > 0 ? `ocena ≥ ${minRating.toFixed(1)}` : null,
    selectedServices.length > 0 ? `usługi: ${selectedServices.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const toggleService = (service: string) => {
    setSelectedServices((previous) =>
      previous.includes(service)
        ? previous.filter((item) => item !== service)
        : [...previous, service],
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('all');
    setSelectedServices([]);
    setMinRating(0);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          Katalog firm
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Znajdź partnera do stworzenia kuchni marzeń
        </h1>
        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          Zebraliśmy 100 pracowni kuchennych z dziesięciu największych miast w Polsce. Skorzystaj z filtrów,
          aby szybko zawęzić listę do firm, które najlepiej odpowiadają Twoim potrzebom projektowym i montażowym.
        </p>
      </header>

      <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Wyszukaj firmę</span>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nazwa firmy, miasto lub słowo kluczowe"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              type="search"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Miasto</span>
            <select
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">Wszystkie miasta</option>
              {cityFilters.map((city) => (
                <option key={city.city} value={city.city}>
                  {city.city} · woj. {city.voivodeship}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Minimalna ocena</span>
            <select
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {ratingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-medium text-slate-700">Zakres usług</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {serviceFilters.map((service) => {
              const isSelected = selectedServices.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>{hasActiveFilters ? activeFiltersSummary : 'Brak aktywnych filtrów – lista pokazuje wszystkie firmy.'}</p>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            Wyczyść filtry
          </button>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Wyniki wyszukiwania</h2>
            <p className="text-sm text-slate-600">
              {sortedCompanies.length > 0
                ? `Znaleziono ${formatCountLabel(sortedCompanies.length)} z całej Polski.`
                : 'Nie znaleziono firm spełniających wybrane kryteria.'}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {hasActiveFilters ? 'Filtry aktywne' : 'Wszystkie firmy'}
          </span>
        </div>

        {sortedCompanies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            <p>
              Spróbuj zmienić kryteria wyszukiwania lub wyczyścić filtry, aby zobaczyć pełną listę 100 partnerów kuchennych z
              największych miast.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {sortedCompanies.map((company) => (
              <article
                key={company.id}
                className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{company.city} · woj. {company.voivodeship}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{company.name}</h3>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Ocena {company.rating.toFixed(1)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{company.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {company.services.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Odwiedź stronę
                  </a>
                  <span className="text-xs text-slate-500">Źródło: wyszukiwanie „meble kuchenne {company.city}”</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
