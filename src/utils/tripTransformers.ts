import { TripItem } from '../../types.js';
import {
  TripWithDetails,
  Activity,
  Day,
  TripInsert,
  DayInsert,
  ActivityInsert,
  geoPointToGeography,
  geographyToGeoPoint,
  SourceType
} from '../types/database.js';

/**
 * Converts frontend TripItem array to database trip structure
 * Groups items by dayNumber and creates nested trip → days → activities hierarchy
 */
export interface DatabaseTripData {
  trip: TripInsert;
  days: Array<{
    dayNumber: number;
    activities: ActivityInsert[];
  }>;
}

export function tripItemsToDatabase(
  items: TripItem[],
  tripTitle: string
): DatabaseTripData {
  if (items.length === 0) {
    throw new Error('Cannot create trip from empty items array');
  }

  // Extract trip-level metadata
  const cities = Array.from(new Set(items.map(item => item.city)));
  const totalBudget = items.reduce((sum, item) => sum + (item.cost || 0), 0);
  const mainCity = cities[0] || 'Unknown';
  const currency = items.find(item => item.currency)?.currency || 'USD';

  // Group items by dayNumber
  const groupedByDay = items.reduce((acc, item) => {
    const day = item.dayNumber || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<number, TripItem[]>);

  // Convert to database format
  const trip: TripInsert = {
    title: tripTitle,
    city: mainCity,
    cities,
    total_budget: totalBudget > 0 ? totalBudget : null,
    currency,
    is_public: false
  };

  const days = Object.entries(groupedByDay)
    .map(([dayNum, dayItems]) => ({
      dayNumber: parseInt(dayNum),
      activities: dayItems.map((item, index) => tripItemToActivity(item, index))
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return { trip, days };
}

/**
 * Converts a single TripItem to database Activity (without day_id, which is added later)
 */
function tripItemToActivity(item: TripItem, orderIndex: number): ActivityInsert {
  return {
    day_id: '', // Will be set when inserting
    order_index: orderIndex,
    place_name: item.placeName,
    category: item.category,
    city: item.city,
    location:
      item.lat && item.lng
        ? geoPointToGeography({ lat: item.lat, lng: item.lng })
        : null,
    address: item.address || null,
    description: item.description || null,
    rating: item.rating || null,
    website_url: item.websiteUrl || null,
    image_url: item.imageUrl || null,
    cost: item.cost || null,
    currency: item.currency || null,
    travel_time_next: item.travelTimeNext || null,
    source: 'MANUAL' as SourceType,
    original_context: item.originalContext || null,
    is_verified: item.isVerified || false
  };
}

/**
 * Converts database TripWithDetails to frontend TripItem array
 * Flattens the nested structure: trip → days → activities to flat array
 */
export function databaseToTripItems(tripData: TripWithDetails): TripItem[] {
  if (!tripData.days || tripData.days.length === 0) {
    return [];
  }

  const items: TripItem[] = [];

  // Iterate through days and activities
  for (const day of tripData.days) {
    if (!day.activities) continue;

    // Sort activities by order_index
    const sortedActivities = [...day.activities].sort(
      (a, b) => a.order_index - b.order_index
    );

    for (const activity of sortedActivities) {
      items.push(activityToTripItem(activity, day.day_number));
    }
  }

  return items;
}

/**
 * Converts a single database Activity to frontend TripItem
 */
function activityToTripItem(activity: Activity, dayNumber: number): TripItem {
  const geoPoint = geographyToGeoPoint(activity.location);

  return {
    id: activity.id,
    placeName: activity.place_name,
    category: activity.category,
    city: activity.city,
    originalContext: activity.original_context || '',
    rating: activity.rating || undefined,
    description: activity.description || undefined,
    websiteUrl: activity.website_url || undefined,
    address: activity.address || undefined,
    isVerified: activity.is_verified,
    dayNumber,
    cost: activity.cost || undefined,
    currency: activity.currency || undefined,
    imageUrl: activity.image_url || undefined,
    lat: geoPoint?.lat,
    lng: geoPoint?.lng,
    travelTimeNext: activity.travel_time_next || undefined
  };
}

/**
 * Converts SavedProfile format to TripItem array (for migration)
 */
export interface SavedProfile {
  id: string;
  title: string;
  items: TripItem[];
  createdAt: number;
  cities: string[];
  totalBudget?: number;
}

export function savedProfileToTripData(profile: SavedProfile): DatabaseTripData {
  return tripItemsToDatabase(profile.items, profile.title);
}
