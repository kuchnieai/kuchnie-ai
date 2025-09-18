import CompanyDirectory from '@/components/CompanyDirectory';
import { FALLBACK_COMPANIES } from '@/data/fallbackCompanies';
import type { Company } from '@/types/company';

async function getCompanies(): Promise<Company[]> {
  // TODO: Replace with real database query once available
  return FALLBACK_COMPANIES;
}

export default async function FirmyPage() {
  const companies = await getCompanies();

  return (
    <main className="px-6 pb-24">
      <CompanyDirectory companies={companies} />
    </main>
  );
}
