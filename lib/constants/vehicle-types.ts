export const VEHICLE_TYPES = ["car", "bike", "scooty"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: "Car",
  bike: "Bike",
  scooty: "Scooty",
};

export const VEHICLE_TYPE_PLURAL: Record<VehicleType, string> = {
  car: "Cars",
  bike: "Bikes",
  scooty: "Scooties",
};

export function isTwoWheeler(type: VehicleType | string | undefined | null): boolean {
  return type === "bike" || type === "scooty";
}

export function defaultSeatsForVehicleType(type: VehicleType): number {
  return isTwoWheeler(type) ? 2 : 5;
}

export function seatsLabelForVehicleType(type: VehicleType | string | undefined | null): string {
  return isTwoWheeler(type) ? "Riders" : "Seats";
}

export function vehicleBrowseLabel(type: VehicleType | "all"): string {
  if (type === "all") return "All vehicles";
  return VEHICLE_TYPE_PLURAL[type];
}
