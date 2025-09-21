'use client';

import { useEffect, useMemo } from 'react';
import { DivIcon, type LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';

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
const GOLDEN_ANGLE = 137.508;
const PIN_SIZE: [number, number] = [32, 40];

const createPinIcon = (variant: 'default' | 'active' | 'dimmed') => {
  const fill = variant === 'active' ? '#0f172a' : '#f97316';
  const innerFill = variant === 'active' ? '#e2e8f0' : '#ffffff';
  const opacity = variant === 'dimmed' ? 0.55 : 1;

  const html = `
    <svg width="${PIN_SIZE[0]}" height="${PIN_SIZE[1]}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 6px 12px rgba(15,23,42,0.35));opacity:${opacity};">
      <path d="M16 0C9.37258 0 4 5.37258 4 12C4 21 16 40 16 40C16 40 28 21 28 12C28 5.37258 22.6274 0 16 0Z" fill="${fill}" />
      <circle cx="16" cy="12" r="6" fill="${innerFill}" />
    </svg>
  `;

  return new DivIcon({
    className: 'company-map-pin leaflet-div-icon',
    html,
    iconSize: PIN_SIZE,
    iconAnchor: [PIN_SIZE[0] / 2, PIN_SIZE[1] - 2],
    popupAnchor: [0, -PIN_SIZE[1] + 10],
    tooltipAnchor: [0, -PIN_SIZE[1] + 12],
  });
};

const computeCompanyPosition = (
  base: LatLngTuple,
  index: number,
): LatLngTuple => {
  if (index === 0) {
    return base;
  }

  const angle = ((index - 1) * GOLDEN_ANGLE * Math.PI) / 180;
  const ring = Math.floor((index - 1) / 8);
  const radius = 0.008 + ring * 0.004;
  const latitudeOffset = radius * Math.cos(angle);
  const longitudeOffset =
    (radius * Math.sin(angle)) /
    Math.cos((base[0] * Math.PI) / 180);

  return [base[0] + latitudeOffset, base[1] + longitudeOffset];
};

export type CompanyMapProps = {
  companies: Company[];
  selectedCity?: string;
  onCitySelect?: (city: string) => void;
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

  const companyMarkers = useMemo(() => {
    const grouped = new Map<
      string,
      { base: LatLngTuple; companies: Company[] }
    >();

    companies.forEach((company) => {
      const coordinates = cityCoordinates[company.city];
      if (!coordinates) {
        return;
      }

      if (!grouped.has(company.city)) {
        grouped.set(company.city, {
          base: [coordinates.lat, coordinates.lng],
          companies: [],
        });
      }

      grouped.get(company.city)!.companies.push(company);
    });

    return Array.from(grouped.entries()).flatMap(([city, group]) => {
      const sortedCompanies = [...group.companies].sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return a.name.localeCompare(b.name);
      });

      return sortedCompanies.map((company, index) => ({
        company,
        city,
        coordinates: computeCompanyPosition(group.base, index),
      }));
    });
  }, [companies]);

  const focusCenter = useMemo<LatLngTuple>(() => {
    if (normalizedSelectedCity) {
      const coords = cityCoordinates[normalizedSelectedCity];
      return [coords.lat, coords.lng];
    }

    return DEFAULT_CENTER;
  }, [normalizedSelectedCity]);

  const focusZoom = normalizedSelectedCity ? FOCUS_ZOOM : DEFAULT_ZOOM;

  const pinIcons = useMemo(() => ({
    default: createPinIcon('default'),
    active: createPinIcon('active'),
    dimmed: createPinIcon('dimmed'),
  }), []);

  const visibleCityCount = useMemo(() => {
    return new Set(companyMarkers.map((marker) => marker.city)).size;
  }, [companyMarkers]);

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

        {companyMarkers.map((marker) => {
          const isSelectedCity = normalizedSelectedCity === marker.city;
          const iconVariant = normalizedSelectedCity
            ? isSelectedCity
              ? 'active'
              : 'dimmed'
            : 'default';

          return (
            <Marker
              key={marker.company.id}
              position={marker.coordinates}
              icon={pinIcons[iconVariant]}
              eventHandlers={{
                click: () => {
                  onCitySelect?.(marker.city);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-900">
                    {marker.company.name}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {marker.city} · ocena {marker.company.rating.toFixed(1)}
                  </span>
                </div>
              </Tooltip>
              <Popup>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {marker.company.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {marker.city} · woj. {marker.company.voivodeship}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Ocena {marker.company.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {marker.company.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {marker.company.services.slice(0, 4).map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-700"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={marker.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Odwiedź stronę
                    </a>
                    {onCitySelect ? (
                      <button
                        type="button"
                        onClick={() => onCitySelect(marker.city)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        {normalizedSelectedCity === marker.city
                          ? 'Pokaż wszystkie miasta'
                          : `Filtruj firmy w mieście ${marker.city}`}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow">
        {companyMarkers.length > 0
          ? `Na mapie: ${visibleCityCount} ${visibleCityCount === 1 ? 'miasto' : 'miasta'} · ${companyMarkers.length} firm`
          : 'Brak firm spełniających wybrane kryteria'}
      </div>
    </div>
  );
};

export default CompanyMap;
