"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  BOOKING_TIME_SLOTS,
  bookingSlotsFrom,
  ensureTimeInSlots,
  formatTime12h,
  DEFAULT_PICKUP_TIME,
} from "@/lib/constants/booking-times";
import { AlertCircle } from "lucide-react";

type BookingTimeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Optional: only restrict past times on same-day pickup (usually omit to show all slots). */
  minTime?: string;
  hintMessage?: string | null;
  className?: string;
  disabled?: boolean;
};

export function BookingTimeSelect({
  id,
  value,
  onChange,
  minTime,
  hintMessage,
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
    <div className="space-y-1.5">
      <select
        id={id}
        value={selected}
        disabled={disabled || slots.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-12 w-full rounded-xl border bg-background px-3 text-sm text-foreground",
          hintMessage ? "border-amber-500/60 focus:ring-amber-500/30" : "border-border focus:ring-primary/30",
          "focus:outline-none focus:ring-2",
          className
        )}
      >
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {formatTime12h(slot)}
          </option>
        ))}
      </select>
      {hintMessage ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{hintMessage}</span>
        </p>
      ) : null}
      {slots.length === 0 ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
          No booking times available. Please choose another date.
        </p>
      ) : null}
    </div>
  );
}

/** All standard booking slots (6:00 AM – 11:30 PM). */
export function allBookingTimeSlots(): string[] {
  return BOOKING_TIME_SLOTS;
}
