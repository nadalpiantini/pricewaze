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
