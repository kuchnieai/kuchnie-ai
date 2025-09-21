'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L, { Map as LeafletMap } from 'leaflet';

import type { Company } from '@/lib/companies';
import { cityCoordinates } from '@/lib/city-coordinates';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type CompanyMapProps = {
  companies: Company[];
};

type CityMarker = {
  city: string;
  voivodeship: string;
  position: [number, number];
  companies: Company[];
};

const defaultCenter: [number, number] = [52.1, 19.4];
const defaultZoom = 6;

const formatCompanyCount = (count: number) => {
  if (count === 1) {
    return '1 firmę';
  }
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `${count} firmy`;
  }
  return `${count} firm`;
};

const formatCityCount = (count: number) => {
  if (count === 1) {
    return '1 mieście';
  }
  return `${count} miastach`;
};

const servicesPreview = (services: string[]) => {
  if (services.length <= 3) {
    return services;
  }

  return [...services.slice(0, 3), `+${services.length - 3}`];
};

export default function CompanyMap({ companies }: CompanyMapProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, [isClient]);

  const markers = useMemo<CityMarker[]>(() => {
    const grouped = new Map<string, Company[]>();

    companies.forEach((company) => {
      if (!cityCoordinates[company.city]) {
        return;
      }

      if (!grouped.has(company.city)) {
        grouped.set(company.city, []);
      }

      grouped.get(company.city)!.push(company);
    });

    return Array.from(grouped.entries())
      .map(([city, cityCompanies]) => {
        const coordinates = cityCoordinates[city];
        return {
          city,
          voivodeship: cityCompanies[0]?.voivodeship ?? '',
          position: [coordinates.lat, coordinates.lng] as [number, number],
          companies: [...cityCompanies].sort((a, b) => {
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            return a.name.localeCompare(b.name);
          }),
        } satisfies CityMarker;
      })
      .sort((first, second) => first.city.localeCompare(second.city));
  }, [companies]);

  useEffect(() => {
    if (!isClient || !mapRef.current) {
      return;
    }

    if (markers.length === 0) {
      mapRef.current.setView(defaultCenter, defaultZoom);
      return;
    }

    if (markers.length === 1) {
      mapRef.current.setView(markers[0].position, 11);
      return;
    }

    const bounds = L.latLngBounds(markers.map((marker) => marker.position));
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, isClient]);

  return (
    <div className="relative h-[420px] w-full">
      {isClient ? (
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          scrollWheelZoom={false}
          preferCanvas={false}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
          />
          {markers.map((marker) => (
            <Marker key={marker.city} position={marker.position}>
              <Popup className="company-popup" maxWidth={360} minWidth={260}>
                <div className="flex min-w-[240px] max-w-[320px] flex-col gap-4 p-4">
                  <header className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {marker.city} · woj. {marker.voivodeship}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">
                      Najlepiej oceniane studia kuchenne
                    </h3>
                    <p className="text-xs text-slate-600">
                      {formatCompanyCount(marker.companies.length)} dostępne w tym mieście.
                    </p>
                  </header>

                  <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                    {marker.companies.map((company) => (
                      <article
                        key={company.id}
                        className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm transition hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-900">{company.name}</h4>
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {company.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">{company.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {servicesPreview(company.services).map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-600"
                        >
                          Odwiedź stronę
                          <span aria-hidden>→</span>
                        </a>
                      </article>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
          Ładujemy mapę firm...
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 flex max-w-xs flex-col gap-1 rounded-2xl bg-white/95 p-4 text-slate-600 shadow-lg backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">Wyniki na mapie</p>
        {companies.length > 0 && markers.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-slate-900">{formatCompanyCount(companies.length)}</p>
            <p className="text-xs">Partnerzy w {formatCityCount(markers.length)}.</p>
          </>
        ) : (
          <p className="text-xs">Brak firm spełniających wybrane kryteria.</p>
        )}
      </div>
    </div>
  );
}
