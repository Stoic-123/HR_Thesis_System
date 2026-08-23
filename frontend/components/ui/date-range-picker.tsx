"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  fromLabel?: string;
  toLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  fromLabel = "From",
  toLabel = "To",
  disabled,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <div className="flex flex-col gap-1.5 min-w-[140px] sm:min-w-[165px]">
        <Label className="text-xs font-medium text-muted-foreground">{fromLabel}</Label>
        <DatePicker
          value={startDate}
          maxDate={endDate}
          onChange={(val) => {
            onStartDateChange(val);
            if (endDate && val > endDate) {
              onEndDateChange(val);
            }
          }}
          placeholder="dd-MMM-yyyy"
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-1.5 min-w-[140px] sm:min-w-[165px]">
        <Label className="text-xs font-medium text-muted-foreground">{toLabel}</Label>
        <DatePicker
          value={endDate}
          minDate={startDate}
          onChange={(val) => {
            onEndDateChange(val);
          }}
          placeholder="dd-MMM-yyyy"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
