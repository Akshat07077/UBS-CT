"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

export type { HandoverLocationValue };

type GeocodeResult = { displayName: string; lat: number; lng: number };

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#D4AF37;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function dedupeGeocodeResults(rows: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.lat.toFixed(4)}:${row.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 450);
  const searchWrapRef = useRef<HTMLDivElement>(null);

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
      setResultsOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as GeocodeResult[];
        if (!cancelled) {
          const next = dedupeGeocodeResults(Array.isArray(data) ? data : []);
          setResults(next);
          setResultsOpen(next.length > 0);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setResultsOpen(false);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setResultsOpen(false);
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
    setResultsOpen(false);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
        <p className="text-xs text-muted-foreground leading-relaxed">{helperText}</p>
      </div>

      <div ref={searchWrapRef} className="relative z-30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onChange({ ...value, address: next });
              if (next.trim().length >= 3) setResultsOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setResultsOpen(true);
            }}
            placeholder="Search address, landmark, or area in India"
            className="rounded-xl pl-9 pr-10 bg-background border-border/80 h-11"
            required={required}
            name="handoverLocation"
            autoComplete="off"
          />
          {(searching || reversing) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary pointer-events-none" />
          )}
        </div>

        {resultsOpen && results.length > 0 && (
          <ul
            role="listbox"
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+8px)] z-50",
              "max-h-52 overflow-y-auto overscroll-contain luxury-scroll",
              "rounded-xl border border-border bg-card text-card-foreground",
              "shadow-2xl ring-1 ring-black/30"
            )}
          >
            {results.map((row, index) => (
              <li key={`${row.lat}-${row.lng}-${index}`} role="option">
                <button
                  type="button"
                  className="block w-full text-left px-3.5 py-3 text-sm leading-snug hover:bg-muted/90 focus:bg-muted/90 focus:outline-none border-b border-border/60 last:border-b-0 transition-colors"
                  onClick={() => selectResult(row)}
                >
                  <span className="line-clamp-2 text-foreground">{row.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="map-location-picker-map relative z-0 isolate h-56 sm:h-64 overflow-hidden rounded-xl border border-border/70 bg-[#1a1a1a] shadow-inner">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom
          className="h-full w-full"
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
        <p className="absolute bottom-2 left-2 right-2 z-[3] text-[10px] text-center text-white/95 bg-black/65 backdrop-blur-sm rounded-lg px-2 py-1.5 pointer-events-none">
          Tap the map to move the pin · Free OpenStreetMap
        </p>
      </div>

      {value.lat != null && value.lng != null && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="min-w-0 flex-1">
            Pin set at {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs rounded-lg shrink-0"
            onClick={() => {
              setQuery("");
              onChange({ address: "", lat: null, lng: null });
              setResults([]);
              setResultsOpen(false);
            }}
          >
            Clear pin
          </Button>
        </div>
      )}
    </div>
  );
}
