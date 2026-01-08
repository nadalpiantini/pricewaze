# UI/UX Improvements Plan (Phase 2)

**Version**: 1.0.0
**Date**: 2026-01-08
**Status**: Planning Complete

---

## Overview

This document outlines the UI/UX improvement roadmap based on the analysis of modern trading platforms and dashboard best practices. Implementation follows the Edward Honour methodology with Theme → Task decomposition.

---

## Sprint 7: Personalized Dashboard with Configurable Widgets

### Objective
Enable users to customize their dashboard with movable, resizable widgets displaying relevant real estate intelligence.

### Theme: Dashboard Personalization

#### Task 7.1: Widget System Architecture

**Components to Create:**
```
src/components/dashboard/
├── widgets/
│   ├── WidgetContainer.tsx      # Drag/drop container (react-grid-layout)
│   ├── WidgetWrapper.tsx        # Common widget chrome (title, actions, resize)
│   ├── MarketOverviewWidget.tsx # Zone statistics summary
│   ├── PriceAlertsWidget.tsx    # Recent price alerts
│   ├── FavoritesWidget.tsx      # Saved properties quick view
│   ├── NegotiationsWidget.tsx   # Active negotiations status
│   ├── RecentActivityWidget.tsx # User activity feed
│   ├── QuickActionsWidget.tsx   # Shortcuts to common actions
│   └── index.ts
├── DashboardGrid.tsx            # Main grid layout component
├── WidgetPicker.tsx             # Add widget modal
└── DashboardSettings.tsx        # Layout save/load
```

**State Management:**
```typescript
// src/stores/dashboard-store.ts
interface DashboardStore {
  layout: GridLayout[];           // react-grid-layout items
  widgets: WidgetConfig[];        // Active widgets
  setLayout: (layout: GridLayout[]) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  saveToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}
```

**Database Schema:**
```sql
-- Store user dashboard preferences
CREATE TABLE pricewaze_dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]',
  widgets JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Dependencies:**
- `react-grid-layout` - Grid layout with drag/drop
- Already have: `zustand`, `@tanstack/react-query`

#### Task 7.2: Core Widget Components

**MarketOverviewWidget:**
- Zone statistics (avg price, trend)
- Sparkline chart (7-day trend)
- Quick actions: View zone, Set alert

**PriceAlertsWidget:**
- Recent 5 alerts with priority indicators
- Filter by type
- Quick dismiss/action

**NegotiationsWidget:**
- Active negotiation count by status
- Pending action items
- Quick navigation

**FavoritesWidget:**
- Saved properties carousel
- Quick price check
- Compare action

#### Task 7.3: Persistence & Sync

**API Endpoints:**
```
GET /api/dashboard/config     # Load user config
PUT /api/dashboard/config     # Save user config
POST /api/dashboard/reset     # Reset to defaults
```

**Default Layout:**
```typescript
const DEFAULT_LAYOUT: WidgetConfig[] = [
  { i: 'market', x: 0, y: 0, w: 6, h: 4, type: 'market-overview' },
  { i: 'alerts', x: 6, y: 0, w: 6, h: 4, type: 'price-alerts' },
  { i: 'negotiations', x: 0, y: 4, w: 4, h: 3, type: 'negotiations' },
  { i: 'favorites', x: 4, y: 4, w: 8, h: 3, type: 'favorites' },
];
```

### Estimated Effort: 16-24 hours

---

## Sprint 8: Data Visualization Enhancement

### Objective
Improve data visualizations across the platform for better decision-making and user engagement.

### Theme: Visual Intelligence

#### Task 8.1: Chart Component Library

**Standardize Recharts Usage:**
```
src/components/charts/
├── PriceHistoryChart.tsx        # Property price over time
├── MarketTrendChart.tsx         # Zone trend visualization
├── ComparisonRadar.tsx          # Property comparison radar
├── PriceDistribution.tsx        # Histogram of zone prices
├── NegotiationTimeline.tsx      # Offer/counter visualization
├── FairnessGauge.tsx            # Fairness score gauge
├── ChartContainer.tsx           # Standard wrapper with loading/error
└── chart-theme.ts               # Consistent colors/styles
```

**Theme Configuration:**
```typescript
// src/components/charts/chart-theme.ts
export const chartTheme = {
  colors: {
    primary: '#0891b2',      // cyan-600
    secondary: '#10b981',    // emerald-500
    positive: '#22c55e',     // green-500
    negative: '#ef4444',     // red-500
    neutral: '#6b7280',      // gray-500
    background: '#ffffff',
    grid: '#e5e7eb',
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    sizes: { xs: 10, sm: 12, md: 14, lg: 16 },
  },
  animations: {
    duration: 300,
    easing: 'ease-out',
  },
};
```

#### Task 8.2: Property Comparison Visualization

**Radar Chart for Property Comparison:**
- Axes: Price, Size, Location Score, Amenities, Market Health
- Up to 3 properties overlay
- Interactive tooltips

**Implementation:**
```typescript
interface ComparisonData {
  property: Property;
  metrics: {
    price: number;        // normalized 0-100
    size: number;         // normalized 0-100
    location: number;     // zone health score
    amenities: number;    // feature count score
    value: number;        // fairness score inverted
  };
}
```

#### Task 8.3: Real-Time Data Updates

**WebSocket Integration for Live Data:**
- Price change notifications
- New listing alerts
- Market signal updates

**Pattern:**
```typescript
// Use TanStack Query with refetch intervals
const { data } = useQuery({
  queryKey: ['zone-stats', zoneId],
  queryFn: fetchZoneStats,
  refetchInterval: 60000, // 1 minute
  refetchOnWindowFocus: true,
});
```

### Estimated Effort: 12-16 hours

---

## Sprint 9: Real-Time Alerts UX

### Objective
Improve the notification and alert experience with non-intrusive, actionable notifications.

### Theme: Proactive Intelligence

#### Task 9.1: Notification System Enhancement

**Current State:**
- Uses `sonner` for toast notifications
- Basic implementation

**Improvements:**
```
src/components/notifications/
├── NotificationCenter.tsx       # Slide-out panel
├── NotificationBadge.tsx        # Header badge with count
├── NotificationItem.tsx         # Individual notification
├── NotificationFilters.tsx      # Filter by type/priority
├── NotificationSettings.tsx     # User preferences
└── hooks/
    ├── useNotifications.ts      # Query hook
    └── useNotificationSocket.ts # Real-time updates
```

**Notification Types:**
```typescript
type NotificationType =
  | 'price_drop'        // Property price decreased
  | 'new_listing'       // Matching property listed
  | 'offer_received'    // New offer on your property
  | 'counter_offer'     // Counter-offer received
  | 'negotiation_update'// Status change
  | 'market_signal'     // Zone signal detected
  | 'visit_reminder'    // Upcoming visit
  | 'ai_insight'        // AI-generated recommendation
  | 'system';           // System announcements
```

**Priority Levels:**
```typescript
type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

const priorityConfig = {
  critical: {
    sound: true,
    persist: true,
    style: 'bg-red-500',
  },
  high: {
    sound: true,
    persist: false,
    duration: 10000,
    style: 'bg-orange-500',
  },
  medium: {
    sound: false,
    persist: false,
    duration: 5000,
    style: 'bg-blue-500',
  },
  low: {
    sound: false,
    persist: false,
    duration: 3000,
    style: 'bg-gray-500',
  },
};
```

#### Task 9.2: Alert Configuration UI

**User Preferences:**
- Enable/disable by type
- Notification channels (in-app, email, push)
- Quiet hours
- Batch vs immediate

**Settings UI:**
```typescript
interface AlertPreferences {
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      channel: ('inApp' | 'email' | 'push')[];
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  batchDigest: boolean; // Combine low-priority into digest
}
```

#### Task 9.3: Smart Alert Grouping

**Group similar alerts:**
- Multiple price drops → "5 properties dropped in price"
- Same property updates → Collapse into single notification
- Time-based batching for non-urgent

### Estimated Effort: 12-16 hours

---

## Sprint 10: Gamification Enhancement

### Objective
Enhance engagement through achievement systems, progress tracking, and social features.

### Theme: User Engagement

#### Task 10.1: Achievement System Review

**Current State:**
- Basic badge system exists
- Points tracking implemented
- API endpoints functional

**Enhancements:**
```
src/components/gamification/
├── AchievementCard.tsx          # Individual achievement display
├── AchievementGrid.tsx          # All achievements overview
├── ProgressBar.tsx              # Progress toward next level
├── LeaderboardWidget.tsx        # Optional competitive element
├── StreakTracker.tsx            # Daily engagement tracking
├── MilestoneModal.tsx           # Celebration on achievement
└── TrustScoreBadge.tsx          # User credibility indicator
```

**New Achievement Categories:**
```typescript
const achievementCategories = {
  explorer: [
    { id: 'first_search', name: 'Explorer', desc: 'Perform your first search' },
    { id: 'zone_explorer', name: 'Zone Master', desc: 'Explore 10 different zones' },
    { id: 'map_guru', name: 'Map Guru', desc: 'Use map view for 1 hour total' },
  ],
  negotiator: [
    { id: 'first_offer', name: 'Deal Maker', desc: 'Submit your first offer' },
    { id: 'counter_master', name: 'Counter Master', desc: 'Successfully counter 5 offers' },
    { id: 'deal_closer', name: 'Closer', desc: 'Complete a negotiation' },
  ],
  analyst: [
    { id: 'price_checker', name: 'Price Hawk', desc: 'Check pricing analysis 10 times' },
    { id: 'alert_setter', name: 'Vigilant', desc: 'Set up 5 price alerts' },
    { id: 'comparison_pro', name: 'Analyst', desc: 'Compare 20 properties' },
  ],
  community: [
    { id: 'first_review', name: 'Reviewer', desc: 'Write your first property review' },
    { id: 'helpful_10', name: 'Helpful', desc: 'Get 10 helpful votes on reviews' },
    { id: 'trusted', name: 'Trusted Member', desc: 'Achieve 80+ trust score' },
  ],
};
```

#### Task 10.2: Progress Visualization

**User Profile Enhancements:**
- Level progress bar
- Achievement showcase (top 3)
- Trust score explanation
- Activity timeline

**XP System:**
```typescript
const xpValues = {
  property_view: 5,
  search: 2,
  favorite: 10,
  price_check: 15,
  offer_submitted: 50,
  offer_accepted: 200,
  review_written: 30,
  review_helpful: 10,
  visit_completed: 25,
  negotiation_won: 500,
};

const levelThresholds = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2200,   // Level 7
  3000,   // Level 8
  4000,   // Level 9
  5000,   // Level 10 (Expert)
];
```

#### Task 10.3: Engagement Mechanics

**Daily Challenges:**
```typescript
interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  expiresAt: Date;
}

// Examples:
// "View 5 properties today" - 25 XP
// "Compare 3 properties" - 40 XP
// "Check price analysis" - 20 XP
```

**Streaks:**
- Track consecutive days of activity
- Bonus XP for streaks (7 days = 2x, 30 days = 3x)
- Streak protection (1 miss allowed per week)

### Estimated Effort: 14-20 hours

---

## Implementation Priority Matrix

| Sprint | Feature | Business Value | Technical Complexity | Priority |
|--------|---------|----------------|---------------------|----------|
| 7 | Personalized Dashboard | HIGH | MEDIUM | P1 |
| 8 | Data Visualization | HIGH | LOW | P1 |
| 9 | Real-Time Alerts | MEDIUM | MEDIUM | P2 |
| 10 | Gamification | MEDIUM | LOW | P2 |

---

## Technical Dependencies

### New Packages Required

```json
{
  "dependencies": {
    "react-grid-layout": "^1.4.4"
  }
}
```

### Existing Packages (Already Installed)
- `recharts` - Charting
- `sonner` - Toasts
- `zustand` - State management
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Icons

---

## Database Migrations Required

### Sprint 7: Dashboard Config
```sql
-- migrations/20260108_dashboard_config.sql
CREATE TABLE pricewaze_dashboard_configs (...);
```

### Sprint 9: Notification Preferences
```sql
-- migrations/20260108_notification_prefs.sql
ALTER TABLE pricewaze_profiles
ADD COLUMN notification_preferences JSONB DEFAULT '{}';
```

### Sprint 10: Daily Challenges
```sql
-- migrations/20260108_daily_challenges.sql
CREATE TABLE pricewaze_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  challenge_type VARCHAR(50),
  target INT,
  progress INT DEFAULT 0,
  xp_reward INT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Dashboard | Widget usage rate | >60% users customize |
| Visualization | Time on analysis pages | +25% increase |
| Notifications | Alert action rate | >40% clicked |
| Gamification | Daily active users | +30% increase |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance with many widgets | Medium | High | Virtualization, lazy loading |
| Notification fatigue | High | Medium | Smart grouping, preferences |
| Gamification abuse | Low | Low | Rate limits, validation |
| Mobile responsiveness | Medium | High | Mobile-first grid breakpoints |

---

## References

- [Dashboard Design Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Gamification in SaaS](https://cieden.com/top-gamification-techniques-for-saas)
- [React Grid Layout Docs](https://github.com/react-grid-layout/react-grid-layout)
- [Recharts Documentation](https://recharts.org/en-US/)
