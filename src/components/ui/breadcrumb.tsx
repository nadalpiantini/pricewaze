import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const breadcrumbVariants = cva("flex flex-wrap items-center gap-1.5 text-sm", {
  variants: {
    variant: {
      default: "",
      minimal: "text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface BreadcrumbProps
  extends React.ComponentProps<"nav">,
    VariantProps<typeof breadcrumbVariants> {}

function Breadcrumb({ className, variant, ...props }: BreadcrumbProps) {
  return (
    <nav
      data-slot="breadcrumb"
      aria-label="Breadcrumb"
      className={cn(breadcrumbVariants({ variant }), className)}
      {...props}
    />
  )
}

function BreadcrumbList({
  className,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  )
}

interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  asChild?: boolean
  isCurrent?: boolean
}

function BreadcrumbLink({
  asChild,
  className,
  isCurrent,
  ...props
}: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="breadcrumb-link"
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "transition-colors hover:text-foreground",
        isCurrent && "font-medium text-foreground pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbPage({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  )
}

interface BreadcrumbEllipsisProps {
  onClick?: () => void
  className?: string
}

function BreadcrumbEllipsis({
  className,
  onClick,
}: BreadcrumbEllipsisProps) {
  const baseClassName = cn(
    "flex h-9 w-9 items-center justify-center",
    onClick && "cursor-pointer hover:bg-accent rounded-md transition-colors",
    className
  )

  if (onClick) {
    return (
      <button
        type="button"
        data-slot="breadcrumb-ellipsis"
        role="button"
        aria-label="Show more breadcrumbs"
        onClick={onClick}
        className={baseClassName}
      >
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">More</span>
      </button>
    )
  }

  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      className={baseClassName}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More</span>
    </span>
  )
}

interface BreadcrumbItemData {
  label: string
  href?: string
  isCurrent?: boolean
}

interface CollapsibleBreadcrumbProps extends BreadcrumbProps {
  items: BreadcrumbItemData[]
  maxItems?: number
  separator?: React.ReactNode
}

function CollapsibleBreadcrumb({
  items,
  maxItems = 3,
  separator,
  className,
  ...props
}: CollapsibleBreadcrumbProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const shouldCollapse = items.length > maxItems && !isExpanded

  const visibleItems = React.useMemo(() => {
    if (!shouldCollapse) return items

    // Show first item, ellipsis, and last (maxItems - 1) items
    const start = items.slice(0, 1)
    const end = items.slice(-(maxItems - 1))
    return [...start, { label: "...", isEllipsis: true } as BreadcrumbItemData & { isEllipsis?: boolean }, ...end]
  }, [items, maxItems, shouldCollapse])

  return (
    <Breadcrumb className={className} {...props}>
      <BreadcrumbList>
        {visibleItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {"isEllipsis" in item && item.isEllipsis ? (
                <BreadcrumbEllipsis onClick={() => setIsExpanded(true)} />
              ) : item.isCurrent ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < visibleItems.length - 1 && (
              <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  CollapsibleBreadcrumb,
  breadcrumbVariants,
}
