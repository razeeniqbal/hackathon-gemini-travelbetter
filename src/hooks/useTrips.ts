import { TripItem } from '../../types.js';
import {
  tripItemsToDatabase,
  databaseToTripItems,
  savedProfileToTripData,
  type SavedProfile
} from '../utils/tripTransformers.js';
import {
  getAllTrips as dbGetAllTrips,
  getTripById as dbGetTripById,
  getTripByShareToken as dbGetTripByShareToken,
  createTrip as dbCreateTrip,
  deleteTrip as dbDeleteTrip,
  toggleTripPublic as dbToggleTripPublic,
  addDayToTrip,
  addActivityToDay,
  deleteActivity,
  updateActivity as dbUpdateActivity
} from '../services/tripService.js';
import type { Trip, TripWithDetails } from '../types/database.js';

/**
 * Hook for database trip operations
 * Provides high-level functions that handle data transformation between frontend and database
 */

/**
 * Save current itinerary to database
 * Creates trip → days → activities hierarchy
 */
export async function saveCurrentTrip(
  items: TripItem[],
  title: string
): Promise<string> {
  if (items.length === 0) {
    throw new Error('Cannot save empty trip');
  }

  // Transform to database format
  const { trip, days } = tripItemsToDatabase(items, title);

  // Create trip
  const createdTrip = await dbCreateTrip(trip);

  // Create days and activities
  for (const dayData of days) {
    // Create day
    const createdDay = await addDayToTrip(createdTrip.id, dayData.dayNumber);

    // Create activities for this day
    for (const activity of dayData.activities) {
      await addActivityToDay({
        ...activity,
        day_id: createdDay.id
      });
    }
  }

  return createdTrip.id;
}

/**
 * Load trip from database by ID
 */
export async function loadTrip(tripId: string): Promise<TripItem[]> {
  const tripData = await dbGetTripById(tripId);

  if (!tripData) {
    throw new Error('Trip not found');
  }

  return databaseToTripItems(tripData);
}

/**
 * Load trip by share token (for shared links)
 */
export async function loadTripByShareToken(token: string): Promise<TripItem[]> {
  const tripData = await dbGetTripByShareToken(token);

  if (!tripData) {
    throw new Error('Shared trip not found or not public');
  }

  return databaseToTripItems(tripData);
}

/**
 * Get all saved trips for library view
 */
export interface TripSummary {
  id: string;
  title: string;
  cities: string[];
  totalBudget?: number;
  createdAt: string;
  activityCount: number;
}

export async function getAllSavedTrips(): Promise<TripSummary[]> {
  const trips = await dbGetAllTrips();

  return trips.map(trip => ({
    id: trip.id,
    title: trip.title,
    cities: trip.cities,
    totalBudget: trip.total_budget || undefined,
    createdAt: trip.created_at,
    activityCount: 0 // Will be populated if we fetch with details
  }));
}

/**
 * Delete trip and all associated data
 */
export async function deleteTrip(tripId: string): Promise<void> {
  await dbDeleteTrip(tripId);
}

/**
 * Update trip activities (for auto-save)
 * Deletes all existing activities and recreates them
 * MVP approach - simpler than diffing individual changes
 */
export async function updateTripActivities(
  tripId: string,
  items: TripItem[]
): Promise<void> {
  if (items.length === 0) {
    // Don't update if no items
    return;
  }

  // Get existing trip structure
  const tripData = await dbGetTripById(tripId);
  if (!tripData) {
    throw new Error('Trip not found');
  }

  // Transform new items to database format
  const { days: newDays } = tripItemsToDatabase(items, tripData.title);

  // Delete all existing days (cascade deletes activities)
  for (const day of tripData.days || []) {
    await dbDeleteTrip(day.id);
  }

  // Recreate days and activities
  for (const dayData of newDays) {
    const createdDay = await addDayToTrip(tripId, dayData.dayNumber);

    for (const activity of dayData.activities) {
      await addActivityToDay({
        ...activity,
        day_id: createdDay.id
      });
    }
  }
}

/**
 * Generate share link for trip
 * Makes trip public and returns share token
 */
export async function generateShareLink(tripId: string): Promise<string> {
  const trip = await dbToggleTripPublic(tripId);

  if (!trip.is_public || !trip.share_token) {
    throw new Error('Failed to generate share link');
  }

  return trip.share_token;
}

/**
 * Migrate localStorage saved profiles to database
 */
export async function migrateLocalStorageTrips(
  profiles: SavedProfile[]
): Promise<void> {
  for (const profile of profiles) {
    try {
      const { trip, days } = savedProfileToTripData(profile);
      const createdTrip = await dbCreateTrip(trip);

      for (const dayData of days) {
        const createdDay = await addDayToTrip(createdTrip.id, dayData.dayNumber);

        for (const activity of dayData.activities) {
          await addActivityToDay({
            ...activity,
            day_id: createdDay.id
          });
        }
      }
    } catch (error) {
      console.error(`Failed to migrate trip "${profile.title}":`, error);
      // Continue with next trip
    }
  }
}
