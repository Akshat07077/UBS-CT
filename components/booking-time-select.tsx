"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  bookingSlotsFrom,
  ensureTimeInSlots,
  formatTime12h,
  DEFAULT_PICKUP_TIME,
} from "@/lib/constants/booking-times";

type BookingTimeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  className?: string;
  disabled?: boolean;
};

export function BookingTimeSelect({
  id,
  value,
  onChange,
  minTime,
  className,
  disabled,
}: BookingTimeSelectProps) {
  const slots = useMemo(() => bookingSlotsFrom(minTime), [minTime]);
  const selected = ensureTimeInSlots(value, slots, slots[0] ?? DEFAULT_PICKUP_TIME);

  useEffect(() => {
    if (slots.length === 0 || value === selected) return;
    if (!slots.includes(value)) onChange(selected);
  }, [value, selected, slots, onChange]);

  return (
    <div className="space-y-1">
      <select
        id={id}
        value={selected}
        disabled={disabled || slots.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          className
        )}
      >
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {formatTime12h(slot)}
          </option>
        ))}
      </select>
    </div>
  );
}
