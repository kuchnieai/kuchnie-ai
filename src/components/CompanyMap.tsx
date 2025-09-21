'use client';

import { useEffect, useMemo } from 'react';
import type { LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';

import type { Company } from '@/lib/companies';

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  Bydgoszcz: { lat: 53.12348, lng: 18.00844 },
  'Gdańsk': { lat: 54.35205, lng: 18.64637 },
  Katowice: { lat: 50.26489, lng: 19.02378 },
  'Kraków': { lat: 50.06465, lng: 19.94498 },
  Lublin: { lat: 51.24645, lng: 22.56844 },
  'Poznań': { lat: 52.40637, lng: 16.92517 },
  Szczecin: { lat: 53.42894, lng: 14.55302 },
  'Warszawa': { lat: 52.22977, lng: 21.01178 },
  'Wrocław': { lat: 51.10789, lng: 17.03854 },
  'Łódź': { lat: 51.75925, lng: 19.45598 },
};

const DEFAULT_CENTER: LatLngTuple = [52.237049, 19.015164];
const DEFAULT_ZOOM = 6;
const FOCUS_ZOOM = 11;

export type CompanyMapProps = {
  companies: Company[];
  selectedCity?: string;
  onCitySelect?: (city: string) => void;
};

type CityGroup = {
  city: string;
  voivodeship: string;
  coordinates: LatLngTuple;
  companies: Company[];
};

const MapViewUpdater = ({ center, zoom }: { center: LatLngTuple; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8, easeLinearity: 0.25 });
  }, [center, zoom, map]);

  return null;
};

const CompanyMap = ({ companies, selectedCity, onCitySelect }: CompanyMapProps) => {
  const normalizedSelectedCity =
    selectedCity && cityCoordinates[selectedCity] ? selectedCity : null;

  const cityGroups = useMemo(() => {
    const grouped = new Map<string, CityGroup>();

    companies.forEach((company) => {
      const coordinates = cityCoordinates[company.city];
      if (!coordinates) {
        return;
      }

      if (!grouped.has(company.city)) {
        grouped.set(company.city, {
          city: company.city,
          voivodeship: company.voivodeship,
          coordinates: [coordinates.lat, coordinates.lng],
          companies: [],
        });
      }

      grouped.get(company.city)!.companies.push(company);
    });

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      companies: [...group.companies].sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [companies]);

  const focusCenter = useMemo<LatLngTuple>(() => {
    if (normalizedSelectedCity) {
      const coords = cityCoordinates[normalizedSelectedCity];
      return [coords.lat, coords.lng];
    }

    return DEFAULT_CENTER;
  }, [normalizedSelectedCity]);

  const focusZoom = normalizedSelectedCity ? FOCUS_ZOOM : DEFAULT_ZOOM;

  const maxGroupSize = useMemo(() => {
    return cityGroups.reduce((max, group) => Math.max(max, group.companies.length), 0);
  }, [cityGroups]);

  const visibleCityCount = cityGroups.length;

  return (
    <div className="relative h-[420px] w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={5}
        maxZoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewUpdater center={focusCenter} zoom={focusZoom} />

        {cityGroups.map((group) => {
          const isSelected = normalizedSelectedCity === group.city;
          const scaledRadius = maxGroupSize
            ? 8 + (group.companies.length / maxGroupSize) * 6
            : 8;
          const radius = isSelected ? scaledRadius + 2 : scaledRadius;

          return (
            <CircleMarker
              key={group.city}
              center={group.coordinates}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#0f172a' : '#1e3a8a',
                fillColor: isSelected ? '#0f172a' : '#2563eb',
                fillOpacity: 0.8,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => {
                  onCitySelect?.(group.city);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-900">{group.city}</span>
                  <span className="text-xs font-medium text-slate-600">
                    {group.companies.length} firm
                  </span>
                </div>
              </Tooltip>
              <Popup>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {group.city} · woj. {group.voivodeship}
                    </p>
                    <p className="text-xs text-slate-600">
                      {group.companies.length} {group.companies.length === 1 ? 'firma' : 'firmy'} w katalogu
                    </p>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {group.companies.map((company) => {
                      const servicesSummary =
                        company.services.slice(0, 2).join(' · ') || 'Pełen zakres usług';

                      return (
                        <div key={company.id} className="space-y-1 rounded-lg border border-slate-200 p-2">
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-slate-900 hover:text-slate-700"
                          >
                            {company.name}
                          </a>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{servicesSummary}</span>
                            <span className="font-medium text-emerald-700">
                              {company.rating.toFixed(1)} ★
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {onCitySelect ? (
                    <button
                      type="button"
                      onClick={() => onCitySelect(group.city)}
                      className="w-full rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      {normalizedSelectedCity === group.city
                        ? 'Pokaż wszystkie miasta'
                        : `Filtruj firmy w mieście ${group.city}`}
                    </button>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow">
        {visibleCityCount > 0
          ? `Na mapie: ${visibleCityCount} ${visibleCityCount === 1 ? 'miasto' : 'miasta'} · ${companies.length} firm`
          : 'Brak firm spełniających wybrane kryteria'}
      </div>
    </div>
  );
};

export default CompanyMap;
