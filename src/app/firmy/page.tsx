'use client';

import dynamic from 'next/dynamic';
import type { Company } from '@/types/company';

// ⬇️ Mapa tylko w przeglądarce — zero SSR, żeby nie wywaliło się na `window`.
const CompanyMap = dynamic(() => import('@/components/CompanyMap'), {
  ssr: false,
  loading: () => <div className="h-96 w-full rounded-2xl bg-slate-100" />,
});

// Dla pewności wyłączamy jakiekolwiek próby pre-renderu/kejszowania tej strony.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const FALLBACK_COMPANIES: Company[] = [
  {
    id: 'izi-kuchnie',
    name: 'IZI KUCHNIE',
    city: 'Gdańsk',
    lat: 54.3589297,
    lng: 18.6057662,
    url: 'https://www.izikuchnie.pl/',
    address: 'ul. Franciszka Schuberta 1A/2, 80-171 Gdańsk',
    phone: '+48 500 100 990',
    description:
      'Meble kuchnie na zamówienie na terenie całego kraju - przygotujemy dla Ciebie bezpłatny projekt. Wejdź i zamów online z dostawą do domu!',
  },
  {
    id: 'kuchnie-piechocki',
    name: 'Kuchnie Piechocki',
    city: 'Gdańsk',
    lat: 54.3078964,
    lng: 18.5856069,
    url: 'https://kuchniepiechocki.pl/',
    address: 'ul. Wielkopolska 66, 80-180 Gdańsk',
    phone: '+48 796 626 711',
    description:
      'Naszą ofertę kierujemy do klientów poszukujących trwałych i funkcjonalnych mebli oraz oryginalnych rozwiązań. Dzięki wieloletniemu doświadczeniu jesteśmy w stanie zrealizować każde zamówienie w oparciu o materiały cenione w całej Europie.',
  },
  {
    id: 'gdanskie-kuchnie',
    name: 'Gdańskie Kuchnie',
    city: 'Gdańsk',
    lat: 54.3464898,
    lng: 18.601955,
    url: 'https://gdanskiekuchnie.pl/',
    address: 'ul. Kartuska 218, 80-122 Gdańsk',
    phone: '+48 500 600 058',
    description:
      'Od 13 lat projektujemy, produkujemy i montujemy kuchnie na wymiar dla firm i osób prywatnych w Trójmieście. Za nami ponad 1500 realizacji i każde nowe zlecenie traktujemy jako kolejne wyzwanie.',
  },
  {
    id: 'ikea-gdansk',
    name: 'IKEA Gdańsk',
    city: 'Gdańsk',
    lat: 54.3725813,
    lng: 18.5208388,
    url: 'https://www.ikea.com/pl/pl/stores/gdansk/',
    address: 'ul. Złota Karczma 26, 80-298 Gdańsk',
    phone: '+48 22 275 01 23',
    description:
      'Tu znajdziesz adres, godziny otwarcia sklepu, oferty specjalne oraz wiele lokalnych informacji o sklepie IKEA Gdańsk.',
  },
  {
    id: 'halupczok-gdansk',
    name: 'Halupczok Gdańsk',
    city: 'Gdańsk',
    lat: 54.3885215,
    lng: 18.5905665,
    url: 'https://meble-halupczok.pl/salony-sprzedazy/kuchnie-gdansk/',
    address: 'al. Grunwaldzka 211 (City Meble), 80-266 Gdańsk',
    phone: '+48 58 666 00 66',
    description:
      'Salon Halupczok w Gdańsku to przestrzeń z najnowszymi kolekcjami mebli kuchennych Fenice, Marsala, Imperia, Eleganza i Marrone przygotowanymi dla miłośników dobrego designu.',
  },
  {
    id: 'mhm-studio',
    name: 'MHM Studio Mebli Kuchennych',
    city: 'Gdańsk',
    lat: 54.4072984,
    lng: 18.5701781,
    url: 'https://mhmkuchnie.eu/',
    address: 'al. Grunwaldzka 489, 80-309 Gdańsk',
    phone: '+48 669 001 778',
    description:
      'Studio Mebli Kuchennych MHM oferuje nowoczesne meble kuchenne na wymiar dla klientów z Gdańska i całego Trójmiasta.',
  },
  {
    id: 'p3-studio',
    name: 'P3 Studio',
    city: 'Gdańsk',
    lat: 54.3885215,
    lng: 18.5905665,
    url: 'https://p3studio.pl/',
    address: 'al. Grunwaldzka 211 lok. 0.16, 80-266 Gdańsk',
    phone: '+48 733 655 037',
    description:
      'Piękne kuchnie na wymiar dla Gdańska, Gdyni i Sopotu – zespół P3 Studio projektuje i realizuje nowoczesne kuchnie na zamówienie.',
  },
];

const EXCLUDED_FIELDS = new Set(['id', 'name', 'city', 'lat', 'lng', 'url']);

const humanizeKey = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function FirmyPage() {
  const companies: Company[] = FALLBACK_COMPANIES;

  return (
    <main className="px-6 pb-24">
      <section className="mx-auto max-w-6xl">
        <CompanyMap companies={companies} />
      </section>

      <section className="mx-auto mt-12 max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Firmy partnerskie</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Poniżej znajdziesz listę firm dostępnych w naszym katalogu. Wersja mapowa
            umożliwia szybkie wyszukanie partnerów w Twojej okolicy, a lista stanowi
            tekstowy fallback dla wyszukiwarek i użytkowników preferujących klasyczny
            przegląd.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2">
          {companies.map((company) => {
            const additionalFields = Object.entries(company).filter(([key, value]) => {
              if (EXCLUDED_FIELDS.has(key)) return false;
              if (value === null || value === undefined || value === '') return false;
              return true;
            });

            return (
              <li
                key={company.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <article className="space-y-3">
                  <header className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
                    {company.city ? (
                      <p className="text-sm text-slate-500">{company.city}</p>
                    ) : null}
                    {company.url ? (
                      <a
                        href={company.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Odwiedź stronę
                      </a>
                    ) : null}
                  </header>

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
    </main>
  );
}
