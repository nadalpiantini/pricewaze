export type VisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

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
  property?: {
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    images: string[];
    price?: number;
    area_m2?: number;
  };
  visitor?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  owner?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface CreateVisitRequest {
  property_id: string;
  scheduled_at: string;
  notes?: string;
}

export interface VerifyVisitRequest {
  verification_code: string;
  latitude?: number;
  longitude?: number;
}

export interface VerifyVisitResponse {
  success: boolean;
  message: string;
  visit: Visit;
  verification: {
    distance: number;
    verified_at: string;
  };
}
