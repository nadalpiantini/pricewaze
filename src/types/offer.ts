export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired';

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
  property?: {
    id: string;
    title: string;
    address: string;
    price: number;
    area_m2: number;
    price_per_m2: number;
    images: string[];
  };
  buyer?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  seller?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  parent_offer?: Offer;
  counter_offers?: Offer[];
}

export interface CreateOfferRequest {
  property_id: string;
  amount: number;
  message?: string;
}

export interface CounterOfferRequest {
  amount: number;
  message?: string;
}

export interface NegotiationThread {
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    images: string[];
  };
  offers: Offer[];
  current_status: OfferStatus;
  latest_offer: Offer;
  started_at: string;
  buyer: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  seller: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}
