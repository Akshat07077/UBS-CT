import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const pickerIndicatorClasses =
  "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    const isDate = type === "date" || type === "datetime-local";
    const isTime = type === "time";
    const isPicker = isDate || isTime;

    const inputEl = (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isPicker && "relative pr-10 appearance-none",
          isPicker && pickerIndicatorClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (!isPicker) return inputEl;

    const Icon = isTime ? Clock : Calendar;

    return (
      <div className="relative w-full">
        {inputEl}
        <Icon
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
          aria-hidden
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
