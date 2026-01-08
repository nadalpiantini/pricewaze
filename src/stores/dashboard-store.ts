'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType =
  | 'market-overview'
  | 'price-alerts'
  | 'favorites'
  | 'negotiations'
  | 'recent-activity'
  | 'quick-actions'
  | 'stats-summary'
  | 'property-performance';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  settings?: Record<string, unknown>;
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

interface DashboardStore {
  // Layout state
  layout: GridLayoutItem[];
  widgets: WidgetConfig[];
  isEditing: boolean;

  // Actions
  setLayout: (layout: GridLayoutItem[]) => void;
  setWidgets: (widgets: WidgetConfig[]) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  toggleWidgetVisibility: (id: string) => void;
  updateWidgetSettings: (id: string, settings: Record<string, unknown>) => void;
  setIsEditing: (editing: boolean) => void;
  resetToDefaults: () => void;

  // Server sync
  isSyncing: boolean;
  lastSyncedAt: string | null;
  saveToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

// Widget display names
export const WIDGET_TITLES: Record<WidgetType, string> = {
  'market-overview': 'Market Overview',
  'price-alerts': 'Price Alerts',
  'favorites': 'Favorites',
  'negotiations': 'Negotiations',
  'recent-activity': 'Recent Activity',
  'quick-actions': 'Quick Actions',
  'stats-summary': 'Stats Summary',
  'property-performance': 'Property Performance',
};

// Widget descriptions
export const WIDGET_DESCRIPTIONS: Record<WidgetType, string> = {
  'market-overview': 'Zone statistics and market trends',
  'price-alerts': 'Your recent price alerts and notifications',
  'favorites': 'Quick access to saved properties',
  'negotiations': 'Active negotiation status and actions',
  'recent-activity': 'Your latest updates and actions',
  'quick-actions': 'Shortcuts to common tasks',
  'stats-summary': 'Key metrics at a glance',
  'property-performance': 'Property analytics and engagement',
};

// Default layout configuration
const DEFAULT_LAYOUT: GridLayoutItem[] = [
  { i: 'stats-summary', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  { i: 'market-overview', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'price-alerts', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'quick-actions', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'negotiations', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'favorites', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'recent-activity', x: 0, y: 10, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'property-performance', x: 6, y: 10, w: 6, h: 4, minW: 4, minH: 3 },
];

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats-summary', type: 'stats-summary', title: WIDGET_TITLES['stats-summary'], visible: true },
  { id: 'market-overview', type: 'market-overview', title: WIDGET_TITLES['market-overview'], visible: true },
  { id: 'price-alerts', type: 'price-alerts', title: WIDGET_TITLES['price-alerts'], visible: true },
  { id: 'quick-actions', type: 'quick-actions', title: WIDGET_TITLES['quick-actions'], visible: true },
  { id: 'negotiations', type: 'negotiations', title: WIDGET_TITLES['negotiations'], visible: true },
  { id: 'favorites', type: 'favorites', title: WIDGET_TITLES['favorites'], visible: true },
  { id: 'recent-activity', type: 'recent-activity', title: WIDGET_TITLES['recent-activity'], visible: true },
  { id: 'property-performance', type: 'property-performance', title: WIDGET_TITLES['property-performance'], visible: true },
];

let widgetCounter = 100;

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      layout: DEFAULT_LAYOUT,
      widgets: DEFAULT_WIDGETS,
      isEditing: false,
      isSyncing: false,
      lastSyncedAt: null,

      setLayout: (layout) => set({ layout }),

      setWidgets: (widgets) => set({ widgets }),

      addWidget: (type) => {
        const id = `${type}-${++widgetCounter}`;
        const newWidget: WidgetConfig = {
          id,
          type,
          title: WIDGET_TITLES[type],
          visible: true,
        };

        // Find a good position for the new widget
        const { layout, widgets } = get();
        const maxY = Math.max(...layout.map(l => l.y + l.h), 0);

        const newLayoutItem: GridLayoutItem = {
          i: id,
          x: 0,
          y: maxY,
          w: 6,
          h: 4,
          minW: 3,
          minH: 3,
        };

        set({
          widgets: [...widgets, newWidget],
          layout: [...layout, newLayoutItem],
        });
      },

      removeWidget: (id) => {
        const { widgets, layout } = get();
        set({
          widgets: widgets.filter(w => w.id !== id),
          layout: layout.filter(l => l.i !== id),
        });
      },

      toggleWidgetVisibility: (id) => {
        const { widgets } = get();
        set({
          widgets: widgets.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        });
      },

      updateWidgetSettings: (id, settings) => {
        const { widgets } = get();
        set({
          widgets: widgets.map(w =>
            w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w
          ),
        });
      },

      setIsEditing: (editing) => set({ isEditing: editing }),

      resetToDefaults: () => set({
        layout: DEFAULT_LAYOUT,
        widgets: DEFAULT_WIDGETS,
      }),

      saveToServer: async () => {
        const { layout, widgets } = get();
        set({ isSyncing: true });

        try {
          const response = await fetch('/api/dashboard/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout, widgets }),
          });

          if (!response.ok) {
            throw new Error('Failed to save dashboard config');
          }

          set({ lastSyncedAt: new Date().toISOString() });
        } catch (error) {
          console.error('Failed to save dashboard config:', error);
          throw error;
        } finally {
          set({ isSyncing: false });
        }
      },

      loadFromServer: async () => {
        set({ isSyncing: true });

        try {
          const response = await fetch('/api/dashboard/config');

          if (!response.ok) {
            if (response.status === 404) {
              // No config exists, use defaults
              return;
            }
            throw new Error('Failed to load dashboard config');
          }

          const data = await response.json();

          if (data.layout && data.widgets) {
            set({
              layout: data.layout,
              widgets: data.widgets,
              lastSyncedAt: data.updated_at,
            });
          }
        } catch (error) {
          console.error('Failed to load dashboard config:', error);
          // Keep using local/default config on error
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'pricewaze-dashboard',
      partialize: (state) => ({
        layout: state.layout,
        widgets: state.widgets,
      }),
    }
  )
);
