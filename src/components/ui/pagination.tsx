"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const paginationVariants = cva(
  "flex items-center gap-1",
  {
    variants: {
      size: {
        default: "",
        sm: "[&_button]:h-8 [&_button]:w-8 [&_button]:text-xs",
        lg: "[&_button]:h-11 [&_button]:w-11 [&_button]:text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface PaginationProps extends VariantProps<typeof paginationVariants> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  siblingCount?: number
}

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = []

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  const leftSibling = Math.max(2, currentPage - siblingCount)
  const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount)

  // Add left ellipsis if needed
  if (leftSibling > 2) {
    pages.push("ellipsis")
  }

  // Add pages around current
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i)
    }
  }

  // Add right ellipsis if needed
  if (rightSibling < totalPages - 1) {
    pages.push("ellipsis")
  }

  // Always show last page if more than 1 page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  size,
  siblingCount = 1,
}: PaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages, siblingCount)

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent, page: number) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onPageChange(page)
      }
    },
    [onPageChange]
  )

  if (totalPages <= 1) return null

  return (
    <nav
      data-slot="pagination"
      role="navigation"
      aria-label="Pagination navigation"
      className={cn(paginationVariants({ size }), className)}
    >
      <PaginationPrevious
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      />

      <ul className="flex items-center gap-1">
        {pages.map((page, index) => (
          <li key={`${page}-${index}`}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationItem
                page={page}
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                onKeyDown={(e) => handleKeyDown(e, page)}
              />
            )}
          </li>
        ))}
      </ul>

      <PaginationNext
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      />
    </nav>
  )
}

interface PaginationItemProps {
  page: number
  isActive: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

function PaginationItem({ page, isActive, onClick, onKeyDown }: PaginationItemProps) {
  return (
    <Button
      data-slot="pagination-item"
      variant={isActive ? "default" : "outline"}
      size="icon"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-current={isActive ? "page" : undefined}
      aria-label={`Page ${page}`}
      className="h-9 w-9"
    >
      {page}
    </Button>
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="pagination-previous"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9", className)}
      {...props}
    >
      <ChevronLeftIcon className="size-4" />
      <span className="sr-only">Previous page</span>
    </Button>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="pagination-next"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9", className)}
      {...props}
    >
      <ChevronRightIcon className="size-4" />
      <span className="sr-only">Next page</span>
    </Button>
  )
}

function PaginationEllipsis({ className }: { className?: string }) {
  return (
    <span
      data-slot="pagination-ellipsis"
      aria-hidden="true"
      className={cn(
        "flex h-9 w-9 items-center justify-center text-muted-foreground",
        className
      )}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  paginationVariants,
}
