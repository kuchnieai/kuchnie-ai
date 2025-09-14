const columns = [
  { key: "specialization", label: "Specjalizacja" },
  { key: "rating", label: "Ocena" },
  { key: "distance", label: "Dystans" },
  { key: "city", label: "Miasto" },
  { key: "promotion", label: "Promocja" },
  { key: "expires", label: "Ważność" },
  { key: "budget", label: "Budżet" },
  { key: "leadTime", label: "Realizacja" },
  { key: "type", label: "Typ" },
  { key: "modules", label: "Moduły" },
  { key: "installation", label: "Montaż" },
  { key: "guarantee", label: "Gwarancja" },
  { key: "appliances", label: "AGD" },
  { key: "project", label: "Projekt" },
  { key: "measurement", label: "Pomiar" },
  { key: "contact", label: "Akcje" },
];

const baseCompanies = [
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
  },
];

const additionalCompanies = Array.from({ length: 30 }, (_, i) => ({
  name: `FIRMA ${i + 1}`,
  city: "Warszawa",
  promotion: "Promocja",
  expires: `Jeszcze ${i + 5} dni`,
  distance: `${10 + i} km`,
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
}));

const companies = [...baseCompanies, ...additionalCompanies];

export default function FirmyPage() {
  return (
    <main className="p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">Firmy</h1>
      <div className="overflow-x-auto">
        <table className="min-w-max text-sm border border-blue-200 rounded-lg shadow-sm overflow-hidden">
          <thead className="bg-blue-50">
            <tr>
              <th className="sticky left-0 bg-blue-50 px-4 py-2 text-left">
                Firma
              </th>
              {columns.map((col) => (
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
                <tr key={company.name} className={`${rowBg} hover:bg-blue-50`}>
                  <td
                    className={`sticky left-0 ${rowBg} px-4 py-2 font-semibold text-blue-700`}
                  >
                    {company.name}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                      {company[col.key as keyof typeof company]}
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

