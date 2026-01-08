import { createClient } from '@supabase/supabase-js';
import { optimizeRoute } from './geminiService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '' // Use service key for server-side
);

export interface Activity {
  id: string;
  place_name: string;
  city: string;
  location: any; // PostGIS geography
  distance_from_hotel?: number;
}

export interface ClusterResult {
  dayNumber: number;
  activities: Activity[];
  clusterType: 'walking' | 'transit' | 'day_trip';
}

/**
 * Cluster activities around hotel using PostGIS
 */
export async function clusterAroundHotel(
  tripId: string
): Promise<ClusterResult[]> {
  // Get trip with hotel location
  const { data: trip } = await supabase
    .from('trips')
    .select('*, days(*, activities(*))')
    .eq('id', tripId)
    .single();

  if (!trip || !trip.hotel_location) {
    throw new Error('Trip not found or hotel not set');
  }

  // Get all activities with distance from hotel (calculated by database)
  const { data: activitiesWithDistance } = await supabase
    .from('activities')
    .select(`
      id,
      place_name,
      city,
      location,
      distance_from_hotel,
      day_id,
      days!inner(trip_id)
    `)
    .eq('days.trip_id', tripId)
    .order('distance_from_hotel', { ascending: true });

  if (!activitiesWithDistance || activitiesWithDistance.length === 0) {
    return [];
  }

  // Cluster by distance
  const walkingCluster: Activity[] = [];
  const transitCluster: Activity[] = [];
  const dayTripCluster: Activity[] = [];

  for (const activity of activitiesWithDistance) {
    const distance = activity.distance_from_hotel || 0;

    if (distance < 2000) {
      // < 2km walking
      walkingCluster.push(activity as Activity);
    } else if (distance < 10000) {
      // 2-10km transit
      transitCluster.push(activity as Activity);
    } else {
      // > 10km day trip
      dayTripCluster.push(activity as Activity);
    }
  }

  // Group into days (8-10 activities per day)
  const maxActivitiesPerDay = 10;
  const clusters: ClusterResult[] = [];

  let dayNumber = 1;

  // Walking activities (Day 1, 2, etc.)
  for (let i = 0; i < walkingCluster.length; i += maxActivitiesPerDay) {
    clusters.push({
      dayNumber: dayNumber++,
      activities: walkingCluster.slice(i, i + maxActivitiesPerDay),
      clusterType: 'walking'
    });
  }

  // Transit activities
  for (let i = 0; i < transitCluster.length; i += maxActivitiesPerDay) {
    clusters.push({
      dayNumber: dayNumber++,
      activities: transitCluster.slice(i, i + maxActivitiesPerDay),
      clusterType: 'transit'
    });
  }

  // Day trip activities
  for (let i = 0; i < dayTripCluster.length; i += maxActivitiesPerDay) {
    clusters.push({
      dayNumber: dayNumber++,
      activities: dayTripCluster.slice(i, i + maxActivitiesPerDay),
      clusterType: 'day_trip'
    });
  }

  return clusters;
}

/**
 * Apply clustering to trip (update day assignments)
 */
export async function applyClusteringToTrip(tripId: string): Promise<void> {
  const clusters = await clusterAroundHotel(tripId);

  // Get existing days for the trip
  const { data: existingDays } = await supabase
    .from('days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number');

  // Create/update days as needed
  for (const cluster of clusters) {
    let dayId: string;

    // Find or create day
    const existingDay = existingDays?.find(d => d.day_number === cluster.dayNumber);

    if (existingDay) {
      dayId = existingDay.id;
    } else {
      const { data: newDay } = await supabase
        .from('days')
        .insert({
          trip_id: tripId,
          day_number: cluster.dayNumber
        })
        .select()
        .single();

      dayId = newDay!.id;
    }

    // Move activities to this day
    for (let i = 0; i < cluster.activities.length; i++) {
      await supabase
        .from('activities')
        .update({
          day_id: dayId,
          order_index: i
        })
        .eq('id', cluster.activities[i].id);
    }
  }
}

/**
 * Get activities within radius of hotel
 */
export async function getActivitiesNearHotel(
  tripId: string,
  radiusMeters: number = 2000
): Promise<Activity[]> {
  const { data, error } = await supabase
    .rpc('get_activities_near_hotel', {
      p_trip_id: tripId,
      radius_meters: radiusMeters
    });

  if (error) {
    console.error('Error getting nearby activities:', error);
    return [];
  }

  return data || [];
}

/**
 * Optimize route using AI
 */
export async function optimizeTripRoute(tripId: string): Promise<void> {
  // Get trip with all activities
  const { data: trip } = await supabase
    .from('trips')
    .select('*, days(*, activities(*))')
    .eq('id', tripId)
    .single();

  if (!trip || !trip.days) {
    throw new Error('Trip not found');
  }

  // Flatten all activities
  const allActivities = trip.days.flatMap((day: any) =>
    (day.activities || []).map((a: any) => ({
      id: a.id,
      placeName: a.place_name,
      city: a.city,
      lat: a.location ? extractLat(a.location) : undefined,
      lng: a.location ? extractLng(a.location) : undefined
    }))
  );

  if (allActivities.length === 0) return;

  // Use AI to optimize
  const { optimizedOrder, dayGrouping } = await optimizeRoute(allActivities);

  // Apply the optimization
  for (const [dayNumStr, activityIndices] of Object.entries(dayGrouping)) {
    const dayNumber = parseInt(dayNumStr);

    // Find or create day
    let day = trip.days.find((d: any) => d.day_number === dayNumber);
    let dayId: string;

    if (!day) {
      const { data: newDay } = await supabase
        .from('days')
        .insert({
          trip_id: tripId,
          day_number: dayNumber
        })
        .select()
        .single();

      dayId = newDay!.id;
    } else {
      dayId = day.id;
    }

    // Update activities
    for (let i = 0; i < (activityIndices as number[]).length; i++) {
      const activityIndex = (activityIndices as number[])[i];
      const activity = allActivities[activityIndex];

      await supabase
        .from('activities')
        .update({
          day_id: dayId,
          order_index: i
        })
        .eq('id', activity.id);
    }
  }
}

// Helper to extract lat/lng from PostGIS geography
function extractLat(geography: any): number | undefined {
  // Handle GeoJSON format
  if (geography && geography.coordinates) {
    return geography.coordinates[1]; // [lng, lat]
  }
  return undefined;
}

function extractLng(geography: any): number | undefined {
  if (geography && geography.coordinates) {
    return geography.coordinates[0]; // [lng, lat]
  }
  return undefined;
}
