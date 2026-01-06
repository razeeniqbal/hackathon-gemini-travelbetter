// Trip service - CRUD operations using Supabase
import { supabase, handleSupabaseError } from '../lib/supabase';
import type {
  Trip,
  TripInsert,
  TripUpdate,
  TripWithDetails,
  Day,
  DayInsert,
  Activity,
  ActivityInsert,
  GeoPoint,
  geoPointToGeography
} from '../types/database';

// ==========================================
// TRIPS
// ==========================================

export async function getAllTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(handleSupabaseError(error, 'Get trips'));
  }

  return data || [];
}

export async function getTripById(id: string): Promise<TripWithDetails | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      days (
        *,
        activities (
          *
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Get trip'));
  }

  return data as TripWithDetails;
}

export async function getTripByShareToken(token: string): Promise<TripWithDetails | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      days (
        *,
        activities (
          *
        )
      )
    `)
    .eq('share_token', token)
    .eq('is_public', true)
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Get shared trip'));
  }

  return data as TripWithDetails;
}

export async function createTrip(trip: TripInsert): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Create trip'));
  }

  return data;
}

export async function updateTrip(id: string, updates: TripUpdate): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Update trip'));
  }

  return data;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(handleSupabaseError(error, 'Delete trip'));
  }
}

export async function setHotelLocation(
  tripId: string,
  hotelName: string,
  location: GeoPoint,
  address?: string
): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update({
      hotel_name: hotelName,
      hotel_location: `POINT(${location.lng} ${location.lat})`,
      hotel_address: address
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Set hotel location'));
  }

  return data;
}

export async function toggleTripPublic(tripId: string): Promise<Trip> {
  // Get current state
  const { data: trip } = await supabase
    .from('trips')
    .select('is_public, share_token')
    .eq('id', tripId)
    .single();

  const newPublicState = !trip?.is_public;
  const updates: TripUpdate = { is_public: newPublicState };

  // Generate share token if making public and doesn't have one
  if (newPublicState && !trip?.share_token) {
    updates.share_token = generateShareToken();
  }

  return updateTrip(tripId, updates);
}

// ==========================================
// DAYS
// ==========================================

export async function addDayToTrip(tripId: string, dayNumber: number): Promise<Day> {
  const { data, error } = await supabase
    .from('days')
    .insert({
      trip_id: tripId,
      day_number: dayNumber
    })
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Add day'));
  }

  return data;
}

export async function deleteDay(dayId: string): Promise<void> {
  const { error } = await supabase
    .from('days')
    .delete()
    .eq('id', dayId);

  if (error) {
    throw new Error(handleSupabaseError(error, 'Delete day'));
  }
}

// ==========================================
// ACTIVITIES
// ==========================================

export async function addActivityToDay(activity: ActivityInsert): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Add activity'));
  }

  return data;
}

export async function updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(handleSupabaseError(error, 'Update activity'));
  }

  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(handleSupabaseError(error, 'Delete activity'));
  }
}

export async function reorderActivities(dayId: string, activityIds: string[]): Promise<void> {
  // Update order_index for each activity
  const updates = activityIds.map((id, index) => ({
    id,
    day_id: dayId,
    order_index: index
  }));

  const { error } = await supabase
    .from('activities')
    .upsert(updates);

  if (error) {
    throw new Error(handleSupabaseError(error, 'Reorder activities'));
  }
}

// ==========================================
// REMIX
// ==========================================

export async function remixTrip(
  parentTripId: string,
  newTitle: string,
  attribution?: string
): Promise<Trip> {
  // Get parent trip with all details
  const parentTrip = await getTripById(parentTripId);

  if (!parentTrip) {
    throw new Error('Parent trip not found');
  }

  // Create new trip
  const { data: newTrip, error: tripError } = await supabase
    .from('trips')
    .insert({
      title: newTitle,
      city: parentTrip.city,
      cities: parentTrip.cities,
      hotel_name: parentTrip.hotel_name,
      hotel_location: parentTrip.hotel_location,
      hotel_address: parentTrip.hotel_address
    })
    .select()
    .single();

  if (tripError) {
    throw new Error(handleSupabaseError(tripError, 'Create remixed trip'));
  }

  // Clone days and activities
  for (const day of parentTrip.days || []) {
    const { data: newDay, error: dayError } = await supabase
      .from('days')
      .insert({
        trip_id: newTrip.id,
        day_number: day.day_number,
        notes: day.notes
      })
      .select()
      .single();

    if (dayError) continue;

    // Clone activities
    const activitiesToInsert = (day.activities || []).map(activity => ({
      day_id: newDay.id,
      order_index: activity.order_index,
      place_name: activity.place_name,
      category: activity.category,
      city: activity.city,
      location: activity.location,
      address: activity.address,
      description: activity.description,
      rating: activity.rating,
      website_url: activity.website_url,
      image_url: activity.image_url,
      cost: activity.cost,
      currency: activity.currency,
      source: 'REMIX' as const,
      source_url: `/trips/${parentTripId}`,
      original_context: activity.original_context,
      is_verified: activity.is_verified,
      verification_data: activity.verification_data
    }));

    if (activitiesToInsert.length > 0) {
      await supabase.from('activities').insert(activitiesToInsert);
    }
  }

  // Create remix link
  await supabase.from('remix_links').insert({
    parent_trip_id: parentTripId,
    child_trip_id: newTrip.id,
    attribution_reason: attribution
  });

  return newTrip;
}

export async function getTripLineage(tripId: string) {
  // Get parent trips (what this was remixed from)
  const { data: parents } = await supabase
    .from('remix_links')
    .select('parent_trip_id, attribution_reason, trips!parent_trip_id(*)')
    .eq('child_trip_id', tripId);

  // Get child trips (what was remixed from this)
  const { data: children } = await supabase
    .from('remix_links')
    .select('child_trip_id, attribution_reason, trips!child_trip_id(*)')
    .eq('parent_trip_id', tripId);

  return {
    parents: parents || [],
    children: children || []
  };
}

// ==========================================
// HELPERS
// ==========================================

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
