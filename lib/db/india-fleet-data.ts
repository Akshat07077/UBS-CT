import type { CarListingJson } from "@/lib/rental-listing";
import { DEFAULT_FUEL_POLICY } from "@/lib/rental-listing";
import { SERVICE_CITY } from "@/lib/constants/locations";

function fleetImg(filename: string) {
  return `/imagess/${encodeURIComponent(filename)}`;
}

function listing(
  base: Omit<
    CarListingJson,
    "driverPerDayMin" | "driverPerDayMax" | "securityDepositMin" | "securityDepositMax" | "fuelPolicy" | "promoTag"
  > &
    Partial<
      Pick<
        CarListingJson,
        "driverPerDayMin" | "driverPerDayMax" | "securityDepositMin" | "securityDepositMax" | "fuelPolicy" | "promoTag"
      >
    >
): CarListingJson {
  const {
    driverPerDayMin = 300,
    driverPerDayMax = 500,
    securityDepositMin = 2000,
    securityDepositMax = 10000,
    fuelPolicy = DEFAULT_FUEL_POLICY,
    promoTag = null,
    ...rest
  } = base;
  return {
    ...rest,
    promoTag,
    driverPerDayMin,
    driverPerDayMax,
    securityDepositMin,
    securityDepositMax,
    fuelPolicy,
  };
}

const LOC = SERVICE_CITY;
const SUPPLIER = "UBs Car sRental";

/** Indore fleet — as listed by operations. */
export const INDIA_FLEET = [
  {
    brand: "Kia",
    model: "Sonet",
    year: 2023,
    pricePerDay: "1800",
    transmission: "manual" as const,
    fuelType: "petrol" as const,
    seats: 5,
    location: LOC,
    description:
      "Compact SUV with strong features — ideal for city runs, Sarafa nights, and Indore–Ujjain day trips. Petrol, manual.",
    imageUrl: fleetImg("kia carns.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "mid",
      promoTag: "Most Booked",
      availabilityNote: "Available in Indore",
      pricePerDayMax: 2400,
      tripLocalInr: 1600,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripFullDayInr: 2200,
      tripOutstationPerKm: 14,
    }),
  },
  {
    brand: "Maruti Suzuki",
    model: "Baleno",
    year: 2024,
    pricePerDay: "1500",
    transmission: "manual" as const,
    fuelType: "petrol" as const,
    seats: 5,
    location: LOC,
    description: "Premium hatchback — smooth manual drive for daily commutes and family outings in Indore.",
    imageUrl: fleetImg("Hyundai_i20_(III,_Facelift)_-_f_11102025.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "budget",
      promoTag: "Most Booked",
      availabilityNote: "Available in Indore",
      pricePerDayMax: 2000,
      tripLocalInr: 1400,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripOutstationPerKm: 13,
    }),
  },
  {
    brand: "Maruti Suzuki",
    model: "Fronx",
    year: 2026,
    pricePerDay: "1600",
    transmission: "manual" as const,
    fuelType: "petrol" as const,
    seats: 5,
    location: LOC,
    description:
      "Crossover with petrol + CNG flexibility — economical for long city days. Manual transmission, 2026 model year.",
    imageUrl: fleetImg("tata punc.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "budget",
      availabilityNote: "Petrol + CNG · Indore",
      pricePerDayMax: 2100,
      fuelPolicy: "Petrol + CNG · Fuel not included · Same-to-same return",
      tripLocalInr: 1500,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripOutstationPerKm: 13,
    }),
  },
  {
    brand: "Maruti Suzuki",
    model: "Ertiga",
    year: 2025,
    pricePerDay: "2400",
    transmission: "manual" as const,
    fuelType: "petrol" as const,
    seats: 7,
    location: LOC,
    description:
      "7-seater MPV with petrol + CNG — perfect for family trips, airport pickups, and outstation runs from Indore.",
    imageUrl: fleetImg("ertiga.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "mid",
      promoTag: "Best for Family Trips",
      availabilityNote: "Petrol + CNG · 7 seats",
      pricePerDayMax: 3200,
      fuelPolicy: "Petrol + CNG · Fuel not included · Same-to-same return",
      tripLocalInr: 2000,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripFullDayInr: 2800,
      tripOutstationPerKm: 15,
    }),
  },
  {
    brand: "Toyota",
    model: "Glanza",
    year: 2025,
    pricePerDay: "1700",
    transmission: "manual" as const,
    fuelType: "petrol" as const,
    seats: 5,
    location: LOC,
    description: "Stylish Toyota hatch — petrol manual, great AC and comfort for Indore city and highway drives.",
    imageUrl: fleetImg("wagonR.png"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "budget",
      availabilityNote: "Available in Indore",
      pricePerDayMax: 2200,
      tripLocalInr: 1500,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripOutstationPerKm: 14,
    }),
  },
  {
    brand: "Maruti Suzuki",
    model: "Dzire",
    year: 2018,
    pricePerDay: "1200",
    transmission: "manual" as const,
    fuelType: "diesel" as const,
    seats: 5,
    location: LOC,
    description: "Reliable diesel sedan — excellent mileage for budget-conscious renters and long Indore commutes.",
    imageUrl: fleetImg("2024-maruti-swift-india-launch-9-may-2024-5.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "budget",
      availabilityNote: "Diesel · Manual",
      pricePerDayMax: 1600,
      tripLocalInr: 1200,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripOutstationPerKm: 12,
    }),
  },
  {
    brand: "Maruti Suzuki",
    model: "Swift",
    year: 2021,
    pricePerDay: "1400",
    transmission: "automatic" as const,
    fuelType: "diesel" as const,
    seats: 5,
    location: LOC,
    description: "Maruti Swift diesel with automatic gearbox — easy city driving and strong fuel economy.",
    imageUrl: fleetImg("2024-maruti-swift-india-launch-9-may-2024-5.jpg"),
    available: true,
    listing: listing({
      supplierName: SUPPLIER,
      segment: "budget",
      promoTag: "Most Booked",
      availabilityNote: "Diesel · Automatic",
      pricePerDayMax: 1900,
      tripLocalInr: 1300,
      tripLocalNote: "Local · 8 hrs / 80 km",
      tripOutstationPerKm: 13,
    }),
  },
];
