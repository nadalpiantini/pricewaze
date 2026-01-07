"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const datePickerVariants = cva(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-9",
        lg: "h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size">,
    VariantProps<typeof datePickerVariants> {
  label?: string
  error?: string
  minDate?: string
  maxDate?: string
  onDateChange?: (date: string) => void
}

function DatePicker({
  className,
  variant,
  size,
  label,
  error,
  minDate,
  maxDate,
  value,
  onChange,
  onDateChange,
  id,
  ...props
}: DatePickerProps) {
  const inputId = id ?? React.useId()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onDateChange?.(e.target.value)
  }

  return (
    <div data-slot="date-picker" className="w-full space-y-1.5">
      {label && (
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="date"
          value={value}
          min={minDate}
          max={maxDate}
          onChange={handleChange}
          className={cn(
            datePickerVariants({ variant: error ? "error" : variant, size }),
            "pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <CalendarIcon
          className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
  minDate?: string
  maxDate?: string
  startLabel?: string
  endLabel?: string
  error?: string
  className?: string
}

function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate,
  maxDate,
  startLabel = "Start date",
  endLabel = "End date",
  error,
  className,
}: DateRangePickerProps) {
  return (
    <div
      data-slot="date-range-picker"
      className={cn("flex flex-col gap-4 sm:flex-row sm:gap-2", className)}
    >
      <DatePicker
        label={startLabel}
        value={startDate}
        onDateChange={onStartDateChange}
        minDate={minDate}
        maxDate={endDate ?? maxDate}
        error={error}
      />
      <DatePicker
        label={endLabel}
        value={endDate}
        onDateChange={onEndDateChange}
        minDate={startDate ?? minDate}
        maxDate={maxDate}
      />
    </div>
  )
}

export { DatePicker, DateRangePicker, datePickerVariants }
