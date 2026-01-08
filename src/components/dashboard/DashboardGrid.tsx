'use client';

import { useCallback, useEffect, useState } from 'react';
import GridLayout, { verticalCompactor } from 'react-grid-layout';
import { Settings, RotateCcw, Save, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardStore, WidgetType, WIDGET_TITLES, WIDGET_DESCRIPTIONS, GridLayoutItem } from '@/stores/dashboard-store';
import type { Layout } from 'react-grid-layout';
import {
  StatsSummaryWidget,
  MarketOverviewWidget,
  PriceAlertsWidget,
  QuickActionsWidget,
  NegotiationsWidget,
  FavoritesWidget,
  RecentActivityWidget,
  PropertyPerformanceWidget,
} from './widgets';

import 'react-grid-layout/css/styles.css';

// Widget component mapping
const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType> = {
  'stats-summary': StatsSummaryWidget,
  'market-overview': MarketOverviewWidget,
  'price-alerts': PriceAlertsWidget,
  'quick-actions': QuickActionsWidget,
  'negotiations': NegotiationsWidget,
  'favorites': FavoritesWidget,
  'recent-activity': RecentActivityWidget,
  'property-performance': PropertyPerformanceWidget,
};

// Available widgets for adding
const AVAILABLE_WIDGETS: WidgetType[] = [
  'stats-summary',
  'market-overview',
  'price-alerts',
  'quick-actions',
  'negotiations',
  'favorites',
  'recent-activity',
  'property-performance',
];

export function DashboardGrid() {
  const {
    layout,
    widgets,
    isEditing,
    isSyncing,
    setLayout,
    setIsEditing,
    addWidget,
    resetToDefaults,
    saveToServer,
    loadFromServer,
  } = useDashboardStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [width, setWidth] = useState(1200);

  // Handle window resize for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      setWidth(window.innerWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load config from server on mount
  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (newLayout: Layout): void => {
      if (isEditing) {
        // Layout from react-grid-layout is readonly, convert to mutable GridLayoutItem[]
        const mutableLayout: GridLayoutItem[] = [...newLayout].map((item) => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
          maxW: item.maxW,
          maxH: item.maxH,
          static: item.static,
          isDraggable: item.isDraggable,
          isResizable: item.isResizable,
        }));
        setLayout(mutableLayout);
      }
    },
    [isEditing, setLayout]
  );

  // Handle save
  const handleSave = async () => {
    try {
      await saveToServer();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  // Handle reset
  const handleReset = () => {
    resetToDefaults();
  };

  // Handle add widget
  const handleAddWidget = (type: WidgetType) => {
    addWidget(type);
    setIsAddDialogOpen(false);
  };

  // Get visible widgets
  const visibleWidgets = widgets.filter((w) => w.visible);
  const visibleLayout = layout.filter((l) =>
    visibleWidgets.some((w) => w.id === l.i)
  );

  // Get widgets that can be added (not currently visible)
  const addableWidgets = AVAILABLE_WIDGETS.filter(
    (type) => !visibleWidgets.some((w) => w.type === type)
  );

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div>
          {isEditing && (
            <p className="text-sm text-muted-foreground">
              Drag widgets to rearrange, resize from corners
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={addableWidgets.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Widget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Widget</DialogTitle>
                    <DialogDescription>
                      Choose a widget to add to your dashboard
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    {addableWidgets.map((type) => (
                      <Button
                        key={type}
                        variant="outline"
                        className="justify-start h-auto p-4"
                        onClick={() => handleAddWidget(type)}
                      >
                        <div className="text-left">
                          <p className="font-medium">{WIDGET_TITLES[type]}</p>
                          <p className="text-xs text-muted-foreground">
                            {WIDGET_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </Button>
                    ))}
                    {addableWidgets.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        All widgets are already on your dashboard
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button size="sm" onClick={handleSave} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Layout
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  Edit Layout
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleReset}>
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="w-full">
        <GridLayout
          width={width}
          layout={visibleLayout}
          gridConfig={{
            cols: 12,
            rowHeight: 60,
            margin: [16, 16] as [number, number],
            containerPadding: null,
            maxRows: Infinity,
          }}
          dragConfig={{
            enabled: isEditing,
            handle: '.widget-drag-handle',
          }}
          resizeConfig={{
            enabled: isEditing,
          }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
          autoSize={true}
        >
          {visibleWidgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.type];
            return (
              <div
                key={widget.id}
                className={isEditing ? 'ring-2 ring-primary/20 rounded-lg' : ''}
              >
                <WidgetComponent />
              </div>
            );
          })}
        </GridLayout>
      </div>
    </div>
  );
}
