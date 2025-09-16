import dynamic from "next/dynamic";
import type { Company } from "@/types/company";

const CompanyMapClient = dynamic(() => import("./CompanyMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-sm">
      <span className="text-sm font-medium text-blue-600">Ładowanie mapy...</span>
    </div>
  ),
});

export default function CompanyMap({ companies }: { companies: Company[] }) {
  return <CompanyMapClient companies={companies} />;
}
