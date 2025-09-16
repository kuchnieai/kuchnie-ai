"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import type { Company } from "@/types/company";
import { companyColumns } from "@/lib/companyColumns";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [52.237049, 21.017532];
const DEFAULT_ZOOM = 6;

export default function CompanyMapClient({
  companies,
}: {
  companies: Company[];
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  const bounds = useMemo(() => {
    if (!companies.length) {
      return null;
    }

    const points = companies.map((company) => [company.lat, company.lng]) as [
      number,
      number
    ][];

    return L.latLngBounds(points);
  }, [companies]);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
      if (isFullscreen && bounds) {
        mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [isFullscreen, bounds]);

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "company-marker",
        html: '<span class="marker-dot"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      }),
    []
  );

  return (
    <div
      className={
        isFullscreen ? "fixed inset-0 z-50 bg-black/60" : ""
      }
    >
      <div
        className={`${
          isFullscreen
            ? "relative h-full w-full cursor-default overflow-hidden bg-white"
            : "relative h-80 w-full cursor-zoom-in overflow-hidden rounded-2xl border border-blue-200 bg-white shadow"
        }`}
        onClick={() => {
          if (!isFullscreen) {
            setIsFullscreen(true);
          }
        }}
        role="presentation"
      >
        {isFullscreen && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsFullscreen(false);
            }}
            className="absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-semibold text-gray-600 shadow-md transition hover:bg-white hover:text-gray-900"
            aria-label="Zamknij mapę"
          >
            ×
          </button>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={isFullscreen}
          className={`h-full w-full ${
            isFullscreen ? "cursor-grab" : "pointer-events-none"
          }`}
          attributionControl
          bounds={bounds ?? undefined}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
            if (bounds) {
              mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
            }
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          {companies.map((company) => (
            <Marker
              key={`${company.name}-${company.lat}-${company.lng}`}
              position={[company.lat, company.lng]}
              icon={markerIcon}
            >
              <Popup className="company-popup">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-base font-semibold text-blue-700">
                      {company.name}
                    </h3>
                  </div>
                  <div className="grid gap-1 text-sm">
                    {companyColumns.map((column) => (
                      <div
                        key={column.key}
                        className="flex items-start justify-between gap-3"
                      >
                        <span className="font-medium text-gray-500">
                          {column.label}
                        </span>
                        <span className="text-gray-800">
                          {company[column.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {!isFullscreen && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
            <span className="rounded-full bg-white/95 px-4 py-1 text-sm font-medium text-blue-700 shadow-md">
              Kliknij, aby powiększyć mapę
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
