"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const toISODate = (date: Date) => format(date, "yyyy-MM-dd");

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: (date: Date) => boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd-MMM-yyyy",
  disabled,
  className,
  id,
  minDate,
  maxDate,
  disabledDates,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDate(value);

  const minParsed = typeof minDate === "string" ? parseDate(minDate) : minDate;
  const maxParsed = typeof maxDate === "string" ? parseDate(maxDate) : maxDate;

  const isDateDisabled = (date: Date) => {
    if (minParsed) {
      const min = new Date(minParsed);
      min.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d < min) return true;
    }
    if (maxParsed) {
      const max = new Date(maxParsed);
      max.setHours(23, 59, 59, 999);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d > max) return true;
    }
    if (disabledDates) {
      return disabledDates(date);
    }
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between gap-2 rounded-lg px-2.5 font-normal shadow-xs bg-transparent border-input hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer dark:bg-input/30",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? format(selected, "dd-MMM-yyyy") : placeholder}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-60 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          disabled={minParsed || maxParsed || disabledDates ? isDateDisabled : undefined}
          onSelect={(date) => {
            if (date) {
              onChange(toISODate(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
