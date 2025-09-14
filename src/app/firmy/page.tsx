const columns = [
  { key: "city", label: "Miasto" },
  { key: "brand", label: "Marka" },
  { key: "distance", label: "Dystans" },
  { key: "time", label: "Czas" },
  { key: "budget", label: "Budżet" },
  { key: "rating", label: "Ocena" },
  { key: "price", label: "Cena" },
  { key: "studio", label: "Studio" },
  { key: "modules", label: "Moduły" },
  { key: "visualization", label: "Wizualizacja" },
  { key: "installation", label: "Montaż" },
  { key: "guarantee", label: "Gwarancja" },
  { key: "project", label: "Projekt" },
  { key: "promotion", label: "Promocja" },
  { key: "contact", label: "Kontakt" },
];

const companies = [
  {
    name: "Różowe",
    city: "Gdańsk",
    brand: "Kitchen area",
    distance: "236 m",
    time: "51 m",
    budget: "$$$$",
    rating: "8/10",
    price: "9 200 zł",
    studio: "Studio cooking",
    modules: "w cenie",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Gotowy",
    promotion: "ABO",
    contact: "Umów się",
  },
  {
    name: "Kuchenablat",
    city: "Gdynia",
    brand: "Box 2010",
    distance: "27 km",
    time: "51 m",
    budget: "$$$",
    rating: "8/10",
    price: "9 000 zł",
    studio: "Studio cooking",
    modules: "bez montażu",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Projekt 2014",
    promotion: "ABO",
    contact: "Umów się",
  },
  {
    name: "Wocher",
    city: "Sopot",
    brand: "Antar grass",
    distance: "27 km",
    time: "51 m",
    budget: "$$$",
    rating: "9/10",
    price: "8 000 zł",
    studio: "Studio cooking",
    modules: "w cenie",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Projekt 2014",
    promotion: "ABO",
    contact: "Umów się",
  },
  {
    name: "Ziks Design",
    city: "Gdańsk",
    brand: "Zewy glass",
    distance: "27 km",
    time: "51 m",
    budget: "$$$",
    rating: "8/10",
    price: "9 700 zł",
    studio: "Studio medyczny",
    modules: "w cenie",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Projekt 2014",
    promotion: "ABO",
    contact: "Umów się",
  },
  {
    name: "Bamb",
    city: "Gdańsk",
    brand: "Zewy glass",
    distance: "27 km",
    time: "51 m",
    budget: "$$$",
    rating: "8/10",
    price: "9 900 zł",
    studio: "Studio medyczny",
    modules: "w cenie",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Projekt 2014",
    promotion: "ABO",
    contact: "Umów się",
  },
  {
    name: "Fama Design",
    city: "Gdynia",
    brand: "Teline glass",
    distance: "27 km",
    time: "51 m",
    budget: "$$$",
    rating: "8/10",
    price: "9 100 zł",
    studio: "Studio medyczny",
    modules: "w cenie",
    visualization: "2D",
    installation: "Z montażem",
    guarantee: "2 lata",
    project: "Projekt 2014",
    promotion: "ABO",
    contact: "Umów się",
  },
];

export default function FirmyPage() {
  return (
    <main className="p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">Firmy</h1>
      <div className="mx-auto max-w-[360px] border rounded overflow-x-auto">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 border px-2 py-1">Firma</th>
              {columns.map((col) => (
                <th key={col.key} className="border px-2 py-1 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.name}>
                <td className="sticky left-0 bg-white z-10 border px-2 py-1 font-semibold">
                  {company.name}
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="border px-2 py-1 whitespace-nowrap">
                    {company[col.key as keyof typeof company]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
