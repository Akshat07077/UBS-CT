"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  DEFAULT_MAP_CENTER,
  type HandoverLocationValue,
} from "@/lib/handover-location";
import { Loader2, MapPin, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";

export type { HandoverLocationValue };

type GeocodeResult = { displayName: string; lat: number; lng: number };

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#D4AF37;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapLocationPicker({
  value,
  onChange,
  required = false,
  label = "Pickup & drop location",
  helperText = "Same point for pickup and return. Search or tap the map to set the pin.",
}: {
  value: HandoverLocationValue;
  onChange: (next: HandoverLocationValue) => void;
  required?: boolean;
  label?: string;
  helperText?: string;
}) {
  const [query, setQuery] = useState(value.address);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 450);

  const mapCenter = useMemo<[number, number]>(() => {
    if (value.lat != null && value.lng != null) return [value.lat, value.lng];
    return [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];
  }, [value.lat, value.lng]);

  const mapZoom = value.lat != null && value.lng != null ? 15 : 5;

  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as GeocodeResult[];
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setReversing(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const data = (await res.json()) as GeocodeResult & { error?: string };
        const address = data.displayName ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setQuery(address);
        onChange({ address, lat, lng });
        setResults([]);
      } catch {
        const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setQuery(address);
        onChange({ address, lat, lng });
      } finally {
        setReversing(false);
      }
    },
    [onChange]
  );

  const selectResult = (row: GeocodeResult) => {
    setQuery(row.displayName);
    onChange({ address: row.displayName, lat: row.lat, lng: row.lng });
    setResults([]);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange({ ...value, address: next });
          }}
          placeholder="Search address, landmark, or area in India"
          className="rounded-xl pl-9"
          required={required}
          name="handoverLocation"
        />
        {(searching || reversing) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
            {results.map((row) => (
              <li key={`${row.lat}-${row.lng}-${row.displayName.slice(0, 24)}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/80 border-b border-border/40 last:border-0"
                  onClick={() => selectResult(row)}
                >
                  {row.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-border/60 h-56 sm:h-64 relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom
          className="h-full w-full z-0"
          style={{ background: "#1a1a1a" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewSync center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onPick={reverseGeocode} />
          {value.lat != null && value.lng != null && (
            <Marker position={[value.lat, value.lng]} icon={markerIcon} />
          )}
        </MapContainer>
        <p className="absolute bottom-2 left-2 right-2 text-[10px] text-center text-white/90 bg-black/50 rounded-lg px-2 py-1 pointer-events-none">
          Tap the map to move the pin · Free OpenStreetMap
        </p>
      </div>

      {value.lat != null && value.lng != null && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => {
              setQuery("");
              onChange({ address: "", lat: null, lng: null });
              setResults([]);
            }}
          >
            Clear pin
          </Button>
        </div>
      )}
    </div>
  );
}
