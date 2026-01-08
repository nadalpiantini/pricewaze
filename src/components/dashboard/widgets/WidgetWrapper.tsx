'use client';

import { ReactNode, useState } from 'react';
import { GripVertical, X, RefreshCw, Minimize2, Maximize2, Sparkles } from 'lucide-react';
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
  accentColor?: 'cyan' | 'lime' | 'purple' | 'amber' | 'rose';
  icon?: ReactNode;
}

const accentColors = {
  cyan: {
    glow: 'var(--signal-cyan)',
    bg: 'rgba(0, 212, 255, 0.1)',
    border: 'rgba(0, 212, 255, 0.3)',
  },
  lime: {
    glow: 'var(--signal-lime)',
    bg: 'rgba(170, 220, 0, 0.1)',
    border: 'rgba(170, 220, 0, 0.3)',
  },
  purple: {
    glow: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.1)',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  amber: {
    glow: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  rose: {
    glow: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.1)',
    border: 'rgba(244, 63, 94, 0.3)',
  },
};

export function WidgetWrapper({
  id,
  title,
  children,
  className,
  headerAction,
  isLoading,
  error,
  onRefresh,
  accentColor = 'cyan',
  icon,
}: WidgetWrapperProps) {
  const { isEditing, removeWidget, toggleWidgetVisibility } = useDashboardStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const colors = accentColors[accentColor];

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  return (
    <div
      className={cn(
        'widget-glass h-full flex flex-col',
        isEditing && 'ring-2 ring-[var(--signal-cyan)]/30',
        className
      )}
      style={{
        '--widget-accent': colors.glow,
        '--widget-accent-bg': colors.bg,
        '--widget-accent-border': colors.border,
      } as React.CSSProperties}
    >
      {/* Premium Header */}
      <div className="widget-header-glow flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          {isEditing && (
            <div className="cursor-grab active:cursor-grabbing widget-drag-handle p-1 -ml-1 rounded hover:bg-white/5 transition-colors">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {icon && (
            <div
              className="p-2 rounded-lg transition-all duration-300"
              style={{
                background: colors.bg,
                boxShadow: `0 0 20px ${colors.glow}30`
              }}
            >
              {icon}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {headerAction}

          {onRefresh && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/5 focus-ring-premium"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-500",
                  isRefreshing && "animate-spin"
                )}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white/5 focus-ring-premium"
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
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5">
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove widget</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="widget-glass border-[var(--dashboard-border)]">
                <DropdownMenuItem
                  onClick={() => toggleWidgetVisibility(id)}
                  className="hover:bg-white/5"
                >
                  Hide widget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => removeWidget(id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Remove widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div
        className={cn(
          'flex-1 overflow-auto px-4 pb-4 transition-all duration-300',
          isMinimized && 'hidden'
        )}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center min-h-[120px]">
            <div className="space-y-3 w-full">
              <div className="skeleton-premium h-4 w-3/4" />
              <div className="skeleton-premium h-4 w-1/2" />
              <div className="skeleton-premium h-4 w-2/3" />
              <div className="flex justify-center pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 animate-pulse" style={{ color: colors.glow }} />
                  <span>Loading...</span>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center min-h-[120px]">
            <div className="empty-state-premium p-6">
              <div
                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(244, 63, 94, 0.1)' }}
              >
                <X className="h-6 w-6 text-rose-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500"
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
