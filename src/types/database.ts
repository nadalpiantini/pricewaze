// PriceMap Database Types
// All tables use 'pricewaze_' prefix in Supabase sujeto10 project

export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial' | 'office';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired';
export type VisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'inactive';
export type UserRole = 'buyer' | 'seller' | 'agent' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  boundary: unknown; // PostGIS POLYGON
  avg_price_m2: number | null;
  total_listings: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  zone_id: string | null;
  title: string;
  description: string | null;
  property_type: PropertyType;
  price: number;
  area_m2: number;
  price_per_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  year_built: number | null;
  address: string;
  latitude: number;
  longitude: number;
  location: unknown; // PostGIS POINT
  images: string[];
  features: string[];
  status: PropertyStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  zone?: Zone;
  owner?: Profile;
}

export interface PropertyPriceHistory {
  id: string;
  property_id: string;
  price: number;
  price_per_m2: number;
  changed_at: string;
}

export interface Offer {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  parent_offer_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Relations
  property?: Property;
  buyer?: Profile;
  seller?: Profile;
  counter_offers?: Offer[];
}

export interface Visit {
  id: string;
  property_id: string;
  visitor_id: string;
  owner_id: string;
  scheduled_at: string;
  verification_code: string;
  verified_at: string | null;
  verification_latitude: number | null;
  verification_longitude: number | null;
  status: VisitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  property?: Property;
  visitor?: Profile;
}

export interface Agreement {
  id: string;
  offer_id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  content: string; // AI-generated contract
  final_price: number;
  terms: Record<string, unknown>;
  signed_by_buyer: boolean;
  signed_by_seller: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface Comparison {
  id: string;
  user_id: string;
  property_ids: string[];
  name: string | null;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface PropertyFilters {
  zone_id?: string;
  property_type?: PropertyType;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: PropertyStatus;
}

export interface PricingAnalysis {
  property_id: string;
  suggested_price: number;
  zone_average: number;
  fairness_score: number; // 0-100
  negotiation_power: number; // 0-100
  comparable_properties: Property[];
  price_range: {
    min: number;
    max: number;
  };
}

// Alerts System
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string | null;
  filters: Record<string, unknown>;
  is_active: boolean;
  notification_frequency: 'instant' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
}

export interface PropertyAlert {
  id: string;
  saved_search_id: string;
  property_id: string;
  alert_type: 'new_property' | 'price_change' | 'status_change';
  notified_at: string | null;
  created_at: string;
  property?: Property;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  property_id: string;
  threshold_type: 'any' | 'percentage' | 'amount';
  threshold_value: number | null;
  notified_at: string | null;
  created_at: string;
  property?: Property;
}

// Market Signals & Alert Rules System
export interface MarketSignal {
  id: string;
  zone_id: string | null;
  property_id: string | null;
  signal_type: 'price_drop' | 'price_increase' | 'inventory_spike' | 'inventory_drop' | 'trend_change' | 'new_listing' | 'status_change';
  severity: 'info' | 'warning' | 'critical';
  payload: Record<string, unknown>;
  created_at: string;
  zone?: Zone;
  property?: Property;
}

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  zone_id: string | null;
  property_id: string | null;
  rule: Record<string, unknown>; // JSON Logic
  active: boolean;
  notification_channels: ('in_app' | 'email' | 'push')[];
  created_at: string;
  updated_at: string;
  zone?: Zone;
  property?: Property;
}

export interface AlertEvent {
  id: string;
  user_id: string;
  rule_id: string;
  signal_id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  read_at: string | null;
  created_at: string;
  rule?: AlertRule;
  signal?: MarketSignal;
}

export interface NotificationPreferences {
  user_id: string;
  in_app: boolean;
  email: boolean;
  push: boolean;
  frequency: 'instant' | 'daily_digest' | 'weekly_digest';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

// Reviews and Ratings
export interface Review {
  id: string;
  property_id: string;
  user_id: string;
  rating: number; // 1-5
  title: string | null;
  comment: string | null;
  verified_visit: boolean;
  visit_id: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  property?: Property;
}

export interface AgentRating {
  id: string;
  agent_id: string;
  user_id: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
  updated_at: string;
  agent?: Profile;
  user?: Profile;
}

export interface ReviewHelpful {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

// Property Signals (Waze-style)
export type PropertySignalType = 
  // System signals (automatic)
  | 'high_activity'        // System: many views
  | 'many_visits'          // System: verified visits
  | 'competing_offers'     // System: active offers
  | 'long_time_on_market'  // System: much time without closing
  | 'recent_price_change'  // System: recent price change
  // User negative signals (post-visit)
  | 'noise'                // User: zona ruidosa
  | 'humidity'             // User: posible humedad
  | 'misleading_photos'    // User: fotos engañosas
  | 'poor_parking'         // User: parqueo complicado
  | 'security_concern'     // User: sensación de inseguridad
  | 'maintenance_needed'   // User: mantenimiento evidente
  | 'price_issue'          // User: precio percibido como fuera de mercado
  // User positive signals (post-visit)
  | 'quiet_area'           // User: zona tranquila confirmada
  | 'good_condition'       // User: propiedad bien mantenida
  | 'transparent_listing'; // User: fotos y descripción fieles

export type SignalSource = 'system' | 'user';

// Raw signal event (individual report) - matches pricewaze_property_signals_raw
export interface PropertySignalRaw {
  id: string;
  property_id: string;
  signal_type: PropertySignalType;
  source: SignalSource;
  user_id?: string | null; // NULL for system signals
  visit_id?: string | null; // NULL for system signals
  created_at: string;
  property?: Property;
  user?: Profile;
  visit?: Visit;
}

// Legacy alias for backward compatibility
export interface PropertySignal extends PropertySignalRaw {}

export interface SignalReport {
  id: string;
  property_id: string;
  user_id: string;
  signal_type: 
    | 'noise' | 'humidity' | 'misleading_photos' | 'poor_parking' 
    | 'security_concern' | 'maintenance_needed' | 'price_issue'
    | 'quiet_area' | 'good_condition' | 'transparent_listing';
  visit_id: string;
  created_at: string;
  property?: Property;
  user?: Profile;
  visit?: Visit;
}

export interface PropertySignalState {
  property_id: string;
  signals: Record<PropertySignalType, number>; // { "noise": 3, "humidity": 1, "many_visits": 6 }
  updated_at: string;
  property?: Property;
}

// Signal state with decay and confirmation (Waze-style) - matches pricewaze_property_signal_state
// One row per property_id + signal_type
export interface PropertySignalTypeState {
  property_id: string;
  signal_type: PropertySignalType;
  strength: number; // Decayed strength (0-100+)
  confirmed: boolean; // Confirmed by ≥3 users in last 30 days
  last_seen_at: string; // Last time this signal was reported
  updated_at: string;
  property?: Property;
}

// Alias for consistency with database table name
export type PropertySignalState = PropertySignalTypeState;

// Chat System
export interface Conversation {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  buyer?: Profile;
  seller?: Profile;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'offer_link' | 'visit_link';
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  sender?: Profile;
}

// Property Media
export interface PropertyMedia {
  id: string;
  property_id: string;
  media_type: 'image' | 'video_360' | 'virtual_tour' | 'video';
  category: 'exterior' | 'interior' | 'floor_plan' | 'amenities' | 'other' | null;
  url: string;
  thumbnail_url: string | null;
  order_index: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Visit Routes (Smart Visit Planner)
export interface VisitRoute {
  id: string;
  user_id: string;
  name: string;
  start_location: { coordinates: [number, number] } | null;
  created_at: string;
  updated_at: string;
  stops?: VisitStop[];
}

export interface VisitStop {
  id: string;
  route_id: string;
  property_id: string | null;
  address: string;
  location: { lat: number; lng: number } | { coordinates: [number, number] };
  order_index: number;
  created_at: string;
  property?: Property;
}
