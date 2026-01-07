# Commit Message: Sprint Signals + Routes

```
feat: Add Waze-style property signals and smart visit planner

## Features

### Property Signals (Waze-style)
- Add temporal decay system (signals lose strength over time)
- Community confirmation (≥3 users in 30 days)
- Realtime updates via Supabase
- Color-coded badges (gray=unconfirmed, red=confirmed negative, green=confirmed positive)
- System signals: high_activity, many_visits, competing_offers
- User signals: noise, humidity, misleading_photos, price_issue

### Smart Visit Planner
- Multi-stop route optimization using OSRM
- Drag & drop reordering of stops
- Interactive Mapbox map with route visualization
- Deep links to Waze and Google Maps
- Export/share routes (text + Web Share API)
- Estimated time and distance indicators
- Integration with PropertyDetail ("Add to Route")

## Technical Improvements
- Idempotent SQL migrations with auto-repair
- Reusable typed components
- Zero linting errors
- CI/CD workflows for lint, build, and migration checks

## Files Changed
- New components: AddToRouteDialog, DraggableRouteStopsList, RouteMap, RouteStopsList
- New libs: routeExport, navigation, optimizeRoute
- Migrations: 3 new SQL migrations for signals and routes
- Dependencies: @dnd-kit packages for drag & drop

## Testing
- ✅ Linting: No errors
- ✅ Type checking: No errors
- ✅ Migrations: Idempotent and tested

Closes: Signals Waze sprint
Related: Smart Visit Planner feature
```

