"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      variant: {
        default: "[&_[data-slot=progress-indicator]]:bg-primary",
        success:
          "[&_[data-slot=progress-indicator]]:bg-green-500 dark:[&_[data-slot=progress-indicator]]:bg-green-400",
        warning:
          "[&_[data-slot=progress-indicator]]:bg-yellow-500 dark:[&_[data-slot=progress-indicator]]:bg-yellow-400",
        destructive:
          "[&_[data-slot=progress-indicator]]:bg-destructive",
      },
      size: {
        sm: "h-1.5",
        default: "h-2.5",
        lg: "h-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  showValue?: boolean
}

function Progress({
  className,
  value,
  variant,
  size,
  showValue = false,
  ...props
}: ProgressProps) {
  return (
    <div data-slot="progress-wrapper" className="w-full">
      {showValue && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{value ?? 0}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        data-slot="progress"
        className={cn(progressVariants({ variant, size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full flex-1 transition-all duration-300 ease-in-out"
          style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export { Progress, progressVariants }
