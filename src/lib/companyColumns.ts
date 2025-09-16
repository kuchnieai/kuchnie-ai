import type { CompanyDetailKey } from "@/types/company";

export type CompanyColumn = {
  key: CompanyDetailKey;
  label: string;
};

export const companyColumns: CompanyColumn[] = [
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
