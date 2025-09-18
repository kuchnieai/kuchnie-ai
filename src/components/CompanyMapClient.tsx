'use client';

import 'leaflet/dist/leaflet.css';

import {
  divIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
  type Marker as LeafletMarker,
} from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import type { Company } from '@/types/company';

type ReactLeafletModule = typeof import('react-leaflet');

const DEFAULT_CENTER: LatLngExpression = [52.237049, 21.017532];
const DEFAULT_ZOOM = 6;
const SINGLE_POINT_ZOOM = 12;
const EXCLUDED_FIELDS = new Set(['id', 'name', 'city', 'lat', 'lng', 'url']);

const humanizeKey = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const extractFields = (company: Company) =>
  Object.entries(company).filter(([key, value]) => {
    if (EXCLUDED_FIELDS.has(key)) {
      return false;
    }

    if (value === null || value === undefined || value === '') {
      return false;
    }

    return true;
  });

type LeafletRendererProps = {
  leaflet: ReactLeafletModule;
  companies: Company[];
  isFullscreen?: boolean;
  selectedCompanyId?: string | null;
  onSelect?: (companyId: string | null) => void;
};

const COMPANY_MARKER_ICON = divIcon({
  className: '',
  iconSize: [28, 40],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 10.532 14 26 14 26s14-15.468 14-26C28 6.268 21.732 0 14 0z"
        fill="#60a5fa"
        stroke="#2563eb"
        stroke-width="2"
      />
      <circle cx="14" cy="14" r="5" fill="#bfdbfe" />
    </svg>
  `,
});

const LeafletRenderer = ({
  leaflet,
  companies,
  isFullscreen = false,
  selectedCompanyId = null,
  onSelect,
}: LeafletRendererProps) => {
  const { MapContainer, TileLayer, Marker, Popup, useMap } = leaflet;
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  const FitBoundsHandler = ({ companies }: { companies: Company[] }) => {
    const map = useMap();

    useEffect(() => {
      if (!map) {
        return;
      }

      const points: Array<[number, number]> = companies
        .map((company) => [company.lat, company.lng] as [number, number])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

      if (points.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        return;
      }

      if (points.length === 1) {
        map.setView(points[0], SINGLE_POINT_ZOOM);
        return;
      }

      const latitudes = points.map(([lat]) => lat);
      const longitudes = points.map(([, lng]) => lng);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const bounds: LatLngBoundsExpression = [
        [minLat, minLng],
        [maxLat, maxLng],
      ];

      map.fitBounds(bounds, { padding: [32, 32] });
    }, [map, companies]);

    return null;
  };

  const SelectedMarkerHandler = ({
    selectedCompanyId: activeCompanyId,
    companies: companiesList,
  }: {
    selectedCompanyId: string | null;
    companies: Company[];
  }) => {
    const mapInstance = useMap();

    useEffect(() => {
      if (!activeCompanyId) {
        return;
      }

      const company = companiesList.find((item) => item.id === activeCompanyId);

      if (!company) {
        return;
      }

      const marker = markerRefs.current[activeCompanyId];

      if (marker) {
        marker.openPopup();
      }

      mapInstance.flyTo([company.lat, company.lng], SINGLE_POINT_ZOOM, {
        duration: 0.7,
      });
    }, [activeCompanyId, companiesList, mapInstance]);

    return null;
  };

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={isFullscreen}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBoundsHandler companies={companies} />
      <SelectedMarkerHandler
        selectedCompanyId={selectedCompanyId}
        companies={companies}
      />
      {companies.map((company) => {
        const additionalFields = extractFields(company);

        return (
          <Marker
            key={company.id}
            position={[company.lat, company.lng]}
            icon={COMPANY_MARKER_ICON}
            eventHandlers={{
              click: () => onSelect?.(company.id),
            }}
            ref={(marker) => {
              if (marker) {
                markerRefs.current[company.id] = marker;

                if (company.id === selectedCompanyId) {
                  marker.openPopup();
                }
              } else {
                delete markerRefs.current[company.id];
              }
            }}
          >
            <Popup className="!p-0" maxWidth={260} minWidth={200}>
              <div className="max-h-48 space-y-2 overflow-y-auto p-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">{company.name}</h3>
                  {company.city ? (
                    <p className="text-sm text-slate-500">{company.city}</p>
                  ) : null}
                  {company.url ? (
                    <a
                      href={company.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Odwiedź stronę
                    </a>
                  ) : null}
                </div>
                {additionalFields.length > 0 ? (
                  <dl className="space-y-1 text-sm">
                    {additionalFields.map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <dt className="font-medium text-slate-600">{humanizeKey(key)}</dt>
                        <dd className="text-right text-slate-700">{formatValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export type CompanyMapClientProps = {
  companies: Company[];
  selectedCompanyId?: string | null;
  onSelect?: (companyId: string | null) => void;
};

const CompanyMapClient = ({ companies, selectedCompanyId = null, onSelect }: CompanyMapClientProps) => {
  const [leaflet, setLeaflet] = useState<ReactLeafletModule | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    import('react-leaflet').then((module) => {
      if (isMounted) {
        setLeaflet(module);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpen = () => setIsFullscreen(true);
  const handleClose = () => setIsFullscreen(false);

  if (!leaflet) {
    return (
      <div className="relative w-full">
        <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Ładowanie mapy…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
        <LeafletRenderer
          leaflet={leaflet}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelect={onSelect}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-4">
          <button
            type="button"
            onClick={handleOpen}
            className="pointer-events-auto rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-white"
            aria-label="Powiększ mapę"
          >
            Powiększ mapę
          </button>
        </div>
      </div>
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-6 top-6 z-[1000] rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-white"
            aria-label="Zamknij pełny ekran mapy"
          >
            ×
          </button>
          <div className="h-full w-full">
            <LeafletRenderer
              leaflet={leaflet}
              companies={companies}
              isFullscreen
              selectedCompanyId={selectedCompanyId}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompanyMapClient;
