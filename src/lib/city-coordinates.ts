export type CityCoordinates = {
  lat: number;
  lng: number;
};

export const cityCoordinates = {
  Bydgoszcz: { lat: 53.1235, lng: 18.0084 },
  'Gdańsk': { lat: 54.352, lng: 18.6466 },
  Katowice: { lat: 50.2649, lng: 19.0238 },
  'Kraków': { lat: 50.0647, lng: 19.945 },
  Lublin: { lat: 51.2465, lng: 22.5684 },
  'Poznań': { lat: 52.4064, lng: 16.9252 },
  Szczecin: { lat: 53.4285, lng: 14.5528 },
  'Warszawa': { lat: 52.2297, lng: 21.0122 },
  'Wrocław': { lat: 51.1079, lng: 17.0385 },
  'Łódź': { lat: 51.7592, lng: 19.455 },
} satisfies Record<string, CityCoordinates>;
