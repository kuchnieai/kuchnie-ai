import CompanyMap from "@/components/CompanyMap";
import { companyColumns } from "@/lib/companyColumns";
import type { Company } from "@/types/company";

const baseCompanies: Company[] = [
  {
    name: "IZI KUCHNIE",
    city: "Gdańsk",
    promotion: "Kuchnie bez vat",
    expires: "Jeszcze 23 dni",
    distance: "5 km",
    budget: "💲💲💲💲",
    leadTime: "8-13 tyg",
    rating: "8,2/10",
    specialization: "Studio kuchni",
    type: "na wymiar",
    modules: "moduły",
    installation: "Z montażem",
    guarantee: "Gwar 20 lat",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 250 zł",
    contact: "Umów się",
    lat: 54.352025,
    lng: 18.646638,
  },
  {
    name: "KUCHNIE LAJT",
    city: "Gdynia",
    promotion: "Bon 2000 zł",
    expires: "Jeszcze 2 dni",
    distance: "10 km",
    budget: "💲💲",
    leadTime: "6-8 tyg",
    rating: "9,3/10",
    specialization: "Studio kuchni",
    type: "na wymiar",
    modules: "-",
    installation: "Bez montażu",
    guarantee: "Gwar 25 lat",
    appliances: "-",
    project: "Projekt 300zł",
    measurement: "Pomiar 0 zł",
    contact: "Umów się",
    lat: 54.518889,
    lng: 18.53054,
  },
  {
    name: "MOONER",
    city: "Sopot",
    promotion: "Air fraier gratis",
    expires: "Jeszcze 7 dni",
    distance: "27 km",
    budget: "💲💲💲💲",
    leadTime: "5-7 tyg",
    rating: "8,9/10",
    specialization: "Biuro projektowe",
    type: "na wymiar",
    modules: "-",
    installation: "Z montażem",
    guarantee: "Gwar 2 lata",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 100 zł",
    contact: "Umów się",
    lat: 54.441581,
    lng: 18.560095,
  },
  {
    name: "DZIK DESIGN",
    city: "Gdańsk",
    promotion: "30% taniej",
    expires: "Jeszcze 20 dni",
    distance: "32 km",
    budget: "💲💲💲💲💲",
    leadTime: "6-8 tyg",
    rating: "9,1/10",
    specialization: "Projektant",
    type: "na wymiar",
    modules: "moduły",
    installation: "Z montażem",
    guarantee: "Gwar 2 lata",
    appliances: "-",
    project: "Projekt 0zł",
    measurement: "Pomiar 250 zł",
    contact: "Umów się",
    lat: 54.360846,
    lng: 18.638326,
  },
  {
    name: "BAIRI",
    city: "Gdynia",
    promotion: "Zlew gratis",
    expires: "Jeszcze 12 dni",
    distance: "48 km",
    budget: "💲💲💲",
    leadTime: "5-9 tyg",
    rating: "8,1/10",
    specialization: "Sklep meblowy",
    type: "na wymiar",
    modules: "-",
    installation: "Z montażem",
    guarantee: "Gwar 5 lat",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 0 zł",
    contact: "Umów się",
    lat: 54.500367,
    lng: 18.548284,
  },
  {
    name: "FAMA DESIGN",
    city: "Sopot",
    promotion: "Taniej o 23%",
    expires: "Jeszcze 14 dni",
    distance: "60 km",
    budget: "💲💲💲💲💲",
    leadTime: "6-9 tyg",
    rating: "7,9/10",
    specialization: "Stolarz",
    type: "na wymiar",
    modules: "-",
    installation: "Z montażem",
    guarantee: "Gwar 2 lata",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 100 zł",
    contact: "Umów się",
    lat: 54.444873,
    lng: 18.569302,
  },
  {
    name: "Gdańskie",
    city: "Gdańsk",
    promotion: "Bon 2500 zł",
    expires: "Jeszcze 21 dni",
    distance: "70 km",
    budget: "💲",
    leadTime: "7-10 tyg",
    rating: "8,5/10",
    specialization: "Studio kuchni",
    type: "na wymiar",
    modules: "moduły",
    installation: "Z montażem",
    guarantee: "Gwar 2 lata",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 0 zł",
    contact: "Umów się",
    lat: 54.355278,
    lng: 18.649444,
  },
];

const additionalCompanies: Company[] = Array.from({ length: 30 }, (_, index) => {
  const column = index % 6;
  const row = Math.floor(index / 6);
  const baseLat = 52.2297;
  const baseLng = 21.0122;
  const latOffset = (row - 2) * 0.05;
  const lngOffset = (column - 2) * 0.06;

  return {
    name: `FIRMA ${index + 1}`,
    city: "Warszawa",
    promotion: "Promocja",
    expires: `Jeszcze ${index + 5} dni`,
    distance: `${10 + index} km`,
    budget: "💲💲",
    leadTime: "6-8 tyg",
    rating: "8,0/10",
    specialization: "Studio kuchni",
    type: "na wymiar",
    modules: "moduły",
    installation: "Z montażem",
    guarantee: "Gwar 2 lata",
    appliances: "AGD",
    project: "Projekt 0zł",
    measurement: "Pomiar 0 zł",
    contact: "Umów się",
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset,
  };
});

const companies: Company[] = [...baseCompanies, ...additionalCompanies];

export default function FirmyPage() {
  return (
    <main className="p-6 pb-24">
      <section className="mb-6">
        <CompanyMap companies={companies} />
      </section>
      <h1 className="text-2xl font-bold mb-4">Firmy</h1>
      <div className="overflow-x-auto">
        <table className="min-w-max text-sm border border-blue-200 rounded-lg shadow-sm overflow-hidden">
          <thead className="bg-blue-50">
            <tr>
              <th className="sticky left-0 z-10 bg-blue-50 px-4 py-2 text-left">
                Firma
              </th>
              {companyColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2 text-left whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company, idx) => {
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
              return (
                <tr key={`${company.name}-${idx}`} className={`${rowBg} hover:bg-blue-50`}>
                  <td
                    className={`sticky left-0 z-10 ${rowBg} px-4 py-2 font-semibold text-blue-700`}
                  >
                    {company.name}
                  </td>
                  {companyColumns.map((col) => (
                    <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                      {company[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
