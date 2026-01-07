"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      size: {
        default: "",
        sm: "[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:w-4",
        lg: "[&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {
  showValues?: boolean
  formatValue?: (value: number) => string
}

function Slider({
  className,
  size,
  showValues = false,
  formatValue = (v) => v.toString(),
  defaultValue,
  value,
  ...props
}: SliderProps) {
  const currentValue = value ?? defaultValue ?? [0]

  return (
    <div data-slot="slider-wrapper" className="w-full">
      {showValues && (
        <div className="mb-2 flex justify-between text-sm text-muted-foreground">
          <span data-slot="slider-min-value">{formatValue(currentValue[0] ?? 0)}</span>
          {currentValue.length > 1 && (
            <span data-slot="slider-max-value">{formatValue(currentValue[1] ?? 0)}</span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        data-slot="slider"
        className={cn(sliderVariants({ size }), className)}
        defaultValue={defaultValue}
        value={value}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className="absolute h-full bg-primary"
          />
        </SliderPrimitive.Track>
        {(value ?? defaultValue ?? [0]).map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            data-slot="slider-thumb"
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent cursor-grab active:cursor-grabbing"
            aria-label={
              (value ?? defaultValue ?? [0]).length > 1
                ? index === 0
                  ? "Minimum value"
                  : "Maximum value"
                : "Value"
            }
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  )
}

interface RangeSliderProps extends Omit<SliderProps, "value" | "defaultValue" | "onValueChange"> {
  min?: number
  max?: number
  step?: number
  value?: [number, number]
  defaultValue?: [number, number]
  onValueChange?: (value: [number, number]) => void
}

function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = [min, max],
  onValueChange,
  showValues = true,
  formatValue = (v) => v.toString(),
  ...props
}: RangeSliderProps) {
  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange as (value: number[]) => void}
      showValues={showValues}
      formatValue={formatValue}
      {...props}
    />
  )
}

export { Slider, RangeSlider, sliderVariants }
