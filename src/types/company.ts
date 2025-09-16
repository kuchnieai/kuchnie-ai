export type Company = {
  name: string;
  city: string;
  promotion: string;
  expires: string;
  distance: string;
  budget: string;
  leadTime: string;
  rating: string;
  specialization: string;
  type: string;
  modules: string;
  installation: string;
  guarantee: string;
  appliances: string;
  project: string;
  measurement: string;
  contact: string;
  lat: number;
  lng: number;
};

export type CompanyDetailKey = Exclude<keyof Company, "name" | "lat" | "lng">;
