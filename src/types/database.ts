// TypeScript types for Supabase database
// Auto-generated types based on schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SourceType =
  | 'TEXT'
  | 'SCREENSHOT'
  | 'XHS_LINK'
  | 'XHS_SCREENSHOT'
  | 'AR_SCAN'
  | 'REMIX'
  | 'MANUAL'

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          title: string
          hotel_name: string | null
          hotel_location: unknown | null // PostGIS geography type
          hotel_address: string | null
          city: string
          cities: string[]
          total_budget: number | null
          currency: string
          is_public: boolean
          share_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          hotel_name?: string | null
          hotel_location?: unknown | null
          hotel_address?: string | null
          city: string
          cities?: string[]
          total_budget?: number | null
          currency?: string
          is_public?: boolean
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          hotel_name?: string | null
          hotel_location?: unknown | null
          hotel_address?: string | null
          city?: string
          cities?: string[]
          total_budget?: number | null
          currency?: string
          is_public?: boolean
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      days: {
        Row: {
          id: string
          trip_id: string
          day_number: number
          date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          day_number: number
          date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          day_number?: number
          date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          day_id: string
          order_index: number
          place_name: string
          category: string
          city: string
          location: unknown | null // PostGIS geography type
          address: string | null
          description: string | null
          rating: number | null
          website_url: string | null
          image_url: string | null
          cost: number | null
          currency: string | null
          travel_time_next: string | null
          distance_from_hotel: number | null
          source: SourceType
          source_url: string | null
          original_context: string | null
          is_verified: boolean
          verification_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_id: string
          order_index: number
          place_name: string
          category: string
          city: string
          location?: unknown | null
          address?: string | null
          description?: string | null
          rating?: number | null
          website_url?: string | null
          image_url?: string | null
          cost?: number | null
          currency?: string | null
          travel_time_next?: string | null
          distance_from_hotel?: number | null
          source: SourceType
          source_url?: string | null
          original_context?: string | null
          is_verified?: boolean
          verification_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_id?: string
          order_index?: number
          place_name?: string
          category?: string
          city?: string
          location?: unknown | null
          address?: string | null
          description?: string | null
          rating?: number | null
          website_url?: string | null
          image_url?: string | null
          cost?: number | null
          currency?: string | null
          travel_time_next?: string | null
          distance_from_hotel?: number | null
          source?: SourceType
          source_url?: string | null
          original_context?: string | null
          is_verified?: boolean
          verification_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      remix_links: {
        Row: {
          id: string
          parent_trip_id: string
          child_trip_id: string
          attribution_reason: string | null
          modification_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parent_trip_id: string
          child_trip_id: string
          attribution_reason?: string | null
          modification_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          parent_trip_id?: string
          child_trip_id?: string
          attribution_reason?: string | null
          modification_type?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      trips_with_details: {
        Row: {
          id: string
          title: string
          hotel_name: string | null
          hotel_lng: number | null
          hotel_lat: number | null
          hotel_address: string | null
          city: string
          cities: string[]
          total_budget: number | null
          currency: string
          is_public: boolean
          share_token: string | null
          created_at: string
          updated_at: string
          day_count: number
          activity_count: number
        }
      }
    }
    Functions: {
      calculate_distance_from_hotel: {
        Args: { activity_id: string }
        Returns: number
      }
      get_activities_near_hotel: {
        Args: { p_trip_id: string; radius_meters?: number }
        Returns: {
          activity_id: string
          place_name: string
          distance: number
        }[]
      }
    }
    Enums: {
      source_type: SourceType
    }
  }
}

// Helper types for easier use
export type Trip = Database['public']['Tables']['trips']['Row']
export type TripInsert = Database['public']['Tables']['trips']['Insert']
export type TripUpdate = Database['public']['Tables']['trips']['Update']

export type Day = Database['public']['Tables']['days']['Row']
export type DayInsert = Database['public']['Tables']['days']['Insert']
export type DayUpdate = Database['public']['Tables']['days']['Update']

export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export type RemixLink = Database['public']['Tables']['remix_links']['Row']
export type RemixLinkInsert = Database['public']['Tables']['remix_links']['Insert']

// Extended types with relations
export type TripWithDetails = Trip & {
  days: (Day & {
    activities: Activity[]
  })[]
}

export type DayWithActivities = Day & {
  activities: Activity[]
}

// Geo helpers
export interface GeoPoint {
  lat: number
  lng: number
}

// Convert lat/lng to PostGIS geography string
export function geoPointToGeography(point: GeoPoint): string {
  return `POINT(${point.lng} ${point.lat})`
}

// Parse PostGIS geography to lat/lng (simplified)
export function geographyToGeoPoint(geography: unknown): GeoPoint | null {
  // Supabase returns PostGIS geography as GeoJSON
  // This is a simplified parser - adjust based on actual format
  if (!geography) return null

  try {
    if (typeof geography === 'string') {
      // Format: "POINT(lng lat)" or GeoJSON
      const match = geography.match(/POINT\(([-.\d]+) ([-.\d]+)\)/)
      if (match) {
        return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
      }
    }
    // Handle GeoJSON format if needed
    // @ts-ignore
    if (geography.coordinates) {
      // @ts-ignore
      const [lng, lat] = geography.coordinates
      return { lng, lat }
    }
  } catch (e) {
    console.error('Failed to parse geography:', e)
  }

  return null
}
