"use client";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CarCard, type CarData } from "@/components/car-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { CITIES, SERVICE_CITY } from "@/lib/constants/locations";
import { Search, FilterX, Car as CarIcon, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

interface Filters {
  location?: string;
  transmission?: string;
  fuel_type?: string;
  max_price?: number;
  /** all = no param; platform = fleet only; peer = host-listed only */
  listingScope?: "all" | "platform" | "peer";
}

function FilterPanel({ filters, onChange, onClear }: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string | number | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory</Label>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: "all" as const, label: "All vehicles" },
              { value: "platform" as const, label: `${brand.shortName} fleet` },
              { value: "peer" as const, label: "Community hosts" },
            ] as const
          ).map(({ value, label }) => (
            <label
              key={value}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                (filters.listingScope ?? "all") === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="listingScope"
                className="accent-primary"
                checked={(filters.listingScope ?? "all") === value}
                onChange={() => onChange("listingScope", value === "all" ? undefined : value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transmission</Label>
          <select
            className="flex h-11 w-full rounded-xl border border-border/50 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filters.transmission || "all"}
            onChange={(e) => onChange("transmission", e.target.value === "all" ? undefined : e.target.value)}
          >
            <option value="all">Any Transmission</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Type</Label>
          <select
            className="flex h-11 w-full rounded-xl border border-border/50 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filters.fuel_type || "all"}
            onChange={(e) => onChange("fuel_type", e.target.value === "all" ? undefined : e.target.value)}
          >
            <option value="all">Any Fuel Type</option>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

        <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price / Day</Label>
          <span className="text-sm font-bold text-primary">
            {filters.max_price && filters.max_price < 35000
              ? `₹${filters.max_price.toLocaleString("en-IN")}`
              : "₹35,000+"}
          </span>
        </div>
        <input
          type="range" min="500" max="35000" step="500"
          value={filters.max_price || 35000}
          onChange={(e) => onChange("max_price", parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹500</span><span>₹35,000+</span>
        </div>
      </div>

      <Button variant="outline" className="w-full rounded-xl border-dashed" onClick={onClear}>
        <FilterX className="w-4 h-4 mr-2" /> Clear Filters
      </Button>
    </div>
  );
}

export default function CarsPage() {
  return (
    <Suspense>
      <CarsContent />
    </Suspense>
  );
}

function CarsContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    location: searchParams.get("location") || SERVICE_CITY,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([k, v]) => {
        if (v === undefined || v === "") return false;
        if (k === "listingScope") return false;
        return true;
      })
      .map(([k, v]) => [k, String(v)])
  );
  if (filters.listingScope === "platform") queryString.set("platform_only", "true");
  if (filters.listingScope === "peer") queryString.set("peer_only", "true");
  const qs = queryString.toString();

  // Fetch all cars (no filters) to get per-city counts
  const { data: allCars } = useQuery<CarData[]>({
    queryKey: ["cars-all"],
    queryFn: () => apiFetch<CarData[]>("/api/cars"),
  });

  const { data: cars, isLoading } = useQuery<CarData[]>({
    queryKey: ["cars", filters],
    queryFn: () => apiFetch<CarData[]>(`/api/cars${qs ? `?${qs}` : ""}`),
  });

  const cityCount = (city: string) =>
    allCars?.filter((c) => c.location?.toLowerCase() === city.toLowerCase()).length ?? 0;

  const handleChange = (key: keyof Filters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const selectCity = (city: string) => {
    setFilters((prev) => ({ ...prev, location: prev.location === city ? undefined : city }));
  };

  const clearFilters = () => setFilters({});
  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (v === undefined || v === "") return false;
    if (k === "listingScope" && v === "all") return false;
    return true;
  }).length;

  const secondaryFilterCount = activeCount - (filters.location ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

      {/* City tabs */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight mb-1">Browse Fleet</h1>
        <p className="text-muted-foreground text-sm mb-5">
          {filters.location === SERVICE_CITY
            ? `Our fleet in ${SERVICE_CITY}`
            : filters.location
              ? `Showing cars in ${filters.location}`
              : `All vehicles · ${SERVICE_CITY}`}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CITIES.map((city) => {
            const count = cityCount(city.name);
            const active = filters.location === city.name;
            return (
              <button
                key={city.name}
                onClick={() => selectCity(city.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "border-border bg-card hover:border-primary/40 hover:text-primary"
                }`}
              >
                <span>{city.emoji}</span>
                {city.name}
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${active ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="md:hidden mb-6">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-border bg-card text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            More Filters
            {secondaryFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {secondaryFilterCount}
              </span>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {filtersOpen && (
          <div className="mt-3 p-4 bg-card border border-border rounded-2xl">
            <FilterPanel filters={filters} onChange={handleChange} onClear={clearFilters} />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-lg font-display font-bold tracking-tight mb-5">More Filters</h2>
            <FilterPanel filters={filters} onChange={handleChange} onClear={clearFilters} />
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              <span className="font-bold text-foreground">{cars?.length ?? 0}</span> vehicles found
              {filters.location && (
                <span> in <span className="font-bold text-foreground">{filters.location}</span></span>
              )}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : cars && cars.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border border-dashed border-border">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <CarIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-2">No vehicles found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">Try adjusting your filters or selecting a different city.</p>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={clearFilters}>Reset Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
