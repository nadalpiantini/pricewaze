import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  BellOffIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center p-8",
  {
    variants: {
      variant: {
        default: "",
        search: "",
        favorites: "",
        notifications: "",
        properties: "",
      },
      size: {
        sm: "p-4 gap-2 [&_[data-slot=empty-state-icon]]:size-8",
        default: "p-8 gap-3 [&_[data-slot=empty-state-icon]]:size-12",
        lg: "p-12 gap-4 [&_[data-slot=empty-state-icon]]:size-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const variantIcons = {
  default: InboxIcon,
  search: SearchIcon,
  favorites: HeartIcon,
  notifications: BellOffIcon,
  properties: HomeIcon,
}

const variantDefaults = {
  default: {
    title: "No items found",
    description: "There are no items to display at the moment.",
  },
  search: {
    title: "No results found",
    description: "Try adjusting your search or filters to find what you're looking for.",
  },
  favorites: {
    title: "No favorites yet",
    description: "Items you mark as favorites will appear here.",
  },
  notifications: {
    title: "No notifications",
    description: "You're all caught up! Check back later for new updates.",
  },
  properties: {
    title: "No properties found",
    description: "There are no properties matching your criteria.",
  },
}

interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

function EmptyState({
  className,
  variant = "default",
  size,
  icon,
  title,
  description,
  action,
  children,
  ...props
}: EmptyStateProps) {
  const IconComponent = variantIcons[variant ?? "default"]
  const defaults = variantDefaults[variant ?? "default"]

  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ variant, size }), className)}
      {...props}
    >
      <div
        data-slot="empty-state-icon"
        className="rounded-full bg-muted p-3 text-muted-foreground"
      >
        {icon ?? <IconComponent className="size-6" />}
      </div>

      <div className="space-y-1">
        <h3
          data-slot="empty-state-title"
          className="font-semibold text-foreground"
        >
          {title ?? defaults.title}
        </h3>
        <p
          data-slot="empty-state-description"
          className="text-sm text-muted-foreground max-w-sm"
        >
          {description ?? defaults.description}
        </p>
      </div>

      {action && (
        <Button
          data-slot="empty-state-action"
          variant="default"
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}

      {children}
    </div>
  )
}

function EmptyStateIcon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty-state-icon"
      className={cn(
        "rounded-full bg-muted p-3 text-muted-foreground [&>svg]:size-6",
        className
      )}
      {...props}
    />
  )
}

function EmptyStateTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="empty-state-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function EmptyStateDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("text-sm text-muted-foreground max-w-sm", className)}
      {...props}
    />
  )
}

function EmptyStateAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="empty-state-action"
      className={cn("mt-2", className)}
      {...props}
    />
  )
}

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
  emptyStateVariants,
}
