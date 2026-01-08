'use client';

import { ReactNode, useState } from 'react';
import { GripVertical, X, Settings, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';

interface WidgetWrapperProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function WidgetWrapper({
  id,
  title,
  children,
  className,
  headerAction,
  isLoading,
  error,
  onRefresh,
}: WidgetWrapperProps) {
  const { isEditing, removeWidget, toggleWidgetVisibility } = useDashboardStore();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <Card className={cn('h-full flex flex-col overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3 shrink-0">
        <div className="flex items-center gap-2">
          {isEditing && (
            <div className="cursor-grab active:cursor-grabbing widget-drag-handle">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>

        <div className="flex items-center gap-1">
          {headerAction}

          {onRefresh && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="sr-only">Refresh</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">{isMinimized ? 'Expand' : 'Minimize'}</span>
          </Button>

          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove widget</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleWidgetVisibility(id)}>
                  Hide widget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => removeWidget(id)}
                  className="text-destructive"
                >
                  Remove widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          'flex-1 overflow-auto px-4 pb-4',
          isMinimized && 'hidden'
        )}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <p className="text-sm">{error}</p>
              {onRefresh && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onRefresh}
                  className="mt-2"
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
