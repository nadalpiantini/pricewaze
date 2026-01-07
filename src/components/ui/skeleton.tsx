import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "animate-pulse bg-muted",
  {
    variants: {
      variant: {
        text: "rounded-md",
        circular: "rounded-full",
        rectangular: "rounded-md",
        card: "rounded-xl",
      },
    },
    defaultVariants: {
      variant: "text",
    },
  }
)

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
}

function Skeleton({
  className,
  variant = "text",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const computedStyle = {
    ...style,
    width: width ?? (variant === "circular" ? height : undefined),
    height: height ?? (variant === "text" ? "1em" : undefined),
  }

  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ variant }), className)}
      style={computedStyle}
      aria-hidden="true"
      {...props}
    />
  )
}

function SkeletonText({
  className,
  lines = 3,
  ...props
}: Omit<SkeletonProps, "variant"> & { lines?: number }) {
  return (
    <div data-slot="skeleton-text" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={cn(
            "h-4",
            index === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
          {...props}
        />
      ))}
    </div>
  )
}

function SkeletonCard({ className, ...props }: Omit<SkeletonProps, "variant">) {
  return (
    <div
      data-slot="skeleton-card"
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-1/2" />
          <Skeleton variant="text" className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}

function SkeletonAvatar({
  className,
  size = 40,
  ...props
}: Omit<SkeletonProps, "variant"> & { size?: number }) {
  return (
    <Skeleton
      data-slot="skeleton-avatar"
      variant="circular"
      width={size}
      height={size}
      className={className}
      {...props}
    />
  )
}

function SkeletonButton({
  className,
  width = 100,
  ...props
}: Omit<SkeletonProps, "variant">) {
  return (
    <Skeleton
      data-slot="skeleton-button"
      variant="rectangular"
      width={width}
      height={36}
      className={className}
      {...props}
    />
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  skeletonVariants,
}
