import dynamic from 'next/dynamic';

import type { Company } from '@/types/company';

const CompanyMapClient = dynamic(() => import('./CompanyMapClient'), {
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg">
      Ładowanie mapy…
    </div>
  ),
});

export type CompanyMapProps = {
  companies: Company[];
};

export default function CompanyMap({ companies }: CompanyMapProps) {
  return <CompanyMapClient companies={companies} />;
}
