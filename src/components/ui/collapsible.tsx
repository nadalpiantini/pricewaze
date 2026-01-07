"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const collapsibleVariants = cva("", {
  variants: {
    variant: {
      default: "",
      bordered: "border rounded-lg",
      card: "border rounded-lg bg-card shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface CollapsibleProps
  extends React.ComponentProps<typeof CollapsiblePrimitive.Root>,
    VariantProps<typeof collapsibleVariants> {}

function Collapsible({
  className,
  variant,
  ...props
}: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(collapsibleVariants({ variant }), className)}
      {...props}
    />
  )
}

interface CollapsibleTriggerProps
  extends React.ComponentProps<typeof CollapsiblePrimitive.Trigger> {
  showChevron?: boolean
}

function CollapsibleTrigger({
  className,
  children,
  showChevron = true,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "flex w-full items-center justify-between py-2 font-medium transition-all [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      {showChevron && (
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      )}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className
      )}
      {...props}
    >
      <div className="pb-2 pt-0">{children}</div>
    </CollapsiblePrimitive.Content>
  )
}

// Convenience wrapper for common use case
interface SimpleCollapsibleProps extends VariantProps<typeof collapsibleVariants> {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

function SimpleCollapsible({
  title,
  children,
  defaultOpen,
  open,
  onOpenChange,
  variant,
  className,
  triggerClassName,
  contentClassName,
}: SimpleCollapsibleProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      variant={variant}
      className={className}
    >
      <CollapsibleTrigger className={cn(
        variant === "bordered" || variant === "card" ? "px-4" : "",
        triggerClassName
      )}>
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(
        variant === "bordered" || variant === "card" ? "px-4" : "",
        contentClassName
      )}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  SimpleCollapsible,
  collapsibleVariants,
}
