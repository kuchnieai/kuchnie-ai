export type Company = {
  id: string;
  name: string;
  city?: string;
  lat: number;
  lng: number;
  url?: string;
  // mogą być dodatkowe kolumny — pokazuj je w popupie, jeśli istnieją
  [key: string]: unknown;
};
