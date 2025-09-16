import CompanyMap from '@/components/CompanyMap';
import type { Company } from '@/types/company';

const FALLBACK_COMPANIES: Company[] = [
  {
    id: 'izi-kuchnie',
    name: 'IZI KUCHNIE',
    city: 'Gdańsk',
    lat: 54.352025,
    lng: 18.646638,
    url: 'https://www.izikuchnie.pl/',
    promotion: 'Kuchnie bez VAT',
    rating: '8,2/10',
    specialization: 'Studio kuchni',
    leadTime: '8-13 tygodni',
    budget: '💲💲💲💲',
  },
  {
    id: 'kuchnie-lajt',
    name: 'KUCHNIE LAJT',
    city: 'Gdynia',
    lat: 54.51889,
    lng: 18.53054,
    url: 'https://kuchnielajt.pl/',
    promotion: 'Bon 2000 zł',
    rating: '9,3/10',
    specialization: 'Studio kuchni',
    leadTime: '6-8 tygodni',
    budget: '💲💲',
  },
  {
    id: 'mooner',
    name: 'MOONER',
    city: 'Sopot',
    lat: 54.441581,
    lng: 18.5601,
    url: 'https://mooner.pl/',
    promotion: 'Air fryer gratis',
    rating: '8,9/10',
    specialization: 'Biuro projektowe',
    leadTime: '5-7 tygodni',
    budget: '💲💲💲💲',
  },
  {
    id: 'warsaw-studio',
    name: 'Warsaw Kitchen Studio',
    city: 'Warszawa',
    lat: 52.229675,
    lng: 21.012228,
    url: 'https://warsawkitchenstudio.pl/',
    promotion: 'Projekt gratis',
    rating: '9,1/10',
    specialization: 'Studio kuchni premium',
    leadTime: '6-9 tygodni',
    budget: '💲💲💲💲💲',
  },
  {
    id: 'krakow-masters',
    name: 'Kraków Masters',
    city: 'Kraków',
    lat: 50.06465,
    lng: 19.94498,
    url: 'https://krakowmasters.pl/',
    promotion: 'Rabat 15%',
    rating: '8,7/10',
    specialization: 'Pracownia stolarska',
    leadTime: '7-10 tygodni',
    budget: '💲💲💲',
  },
];

async function getCompanies(): Promise<Company[]> {
  // TODO: Replace with real database query once available
  return FALLBACK_COMPANIES;
}

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

export default async function FirmyPage() {
  const companies = await getCompanies();

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
              if (EXCLUDED_FIELDS.has(key)) {
                return false;
              }

              if (value === null || value === undefined || value === '') {
                return false;
              }

              return true;
            });

            return (
              <li key={company.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
