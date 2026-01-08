
import { TripItem } from "../types";

// Get backend URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const extractItineraryFromText = async (text: string): Promise<TripItem[]> => {
  const response = await fetch(`${API_URL}/import/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Failed to extract from text: ${response.statusText}`);
  }

  const data = await response.json();

  return data.activities.map((activity: any, index: number) => ({
    id: `${Date.now()}-${index}`,
    placeName: activity.placeName,
    category: activity.category,
    city: activity.city,
    originalContext: activity.originalContext || text,
    rating: activity.rating,
    description: activity.description,
    websiteUrl: activity.websiteUrl,
    address: activity.address,
    cost: activity.cost,
    dayNumber: 1, // Default to day 1, will be optimized later
    lat: activity.lat,
    lng: activity.lng,
    isVerified: true
  }));
};

export const extractItineraryFromImage = async (base64Image: string): Promise<TripItem[]> => {
  const response = await fetch(`${API_URL}/import/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });

  if (!response.ok) {
    throw new Error(`Failed to extract from image: ${response.statusText}`);
  }

  const data = await response.json();

  return data.activities.map((activity: any, index: number) => ({
    id: `${Date.now()}-${index}`,
    placeName: activity.placeName,
    category: activity.category,
    city: activity.city,
    originalContext: activity.originalContext || 'Screenshot',
    rating: activity.rating,
    description: activity.description,
    websiteUrl: activity.websiteUrl,
    address: activity.address,
    cost: activity.cost,
    dayNumber: 1,
    lat: activity.lat,
    lng: activity.lng,
    isVerified: true
  }));
};

/**
 * Gets weather context for the trip
 * Simplified version - returns empty for now
 * TODO: Integrate with weather API or backend endpoint
 */
export const getWeatherForecast = async (cities: string[]): Promise<Record<string, string>> => {
  // Simplified - return empty weather data
  return {};
};

export const identifyLandmarkFromImage = async (base64Image: string): Promise<TripItem | null> => {
  try {
    const response = await fetch(`${API_URL}/import/ar-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.activity) {
      return null;
    }

    return {
      id: `ar-${Date.now()}`,
      placeName: data.activity.placeName,
      category: data.activity.category || 'Landmark',
      city: data.activity.city,
      description: data.activity.description,
      lat: data.activity.lat,
      lng: data.activity.lng,
      rating: data.activity.rating,
      isVerified: true,
      originalContext: 'AR Scan',
      dayNumber: 1
    };
  } catch (e) {
    return null;
  }
};

export const getTravelEstimates = async (items: TripItem[]): Promise<string[]> => {
  // Simplified - return empty travel estimates
  // TODO: Integrate with Google Maps API or backend endpoint
  if (items.length < 2) return [];
  return Array(items.length - 1).fill('~10 min');
};

export const optimizeAndGroupRoute = async (items: TripItem[]): Promise<TripItem[]> => {
  // Simple optimization: group by city, max 8 items per day
  const maxItemsPerDay = 8;
  const groupedByCity: Record<string, TripItem[]> = {};

  // Group by city
  items.forEach(item => {
    if (!groupedByCity[item.city]) {
      groupedByCity[item.city] = [];
    }
    groupedByCity[item.city].push(item);
  });

  // Assign day numbers
  let dayNumber = 1;
  const optimized: TripItem[] = [];

  Object.values(groupedByCity).forEach(cityItems => {
    for (let i = 0; i < cityItems.length; i += maxItemsPerDay) {
      const chunk = cityItems.slice(i, i + maxItemsPerDay);
      chunk.forEach((item, idx) => {
        optimized.push({
          ...item,
          dayNumber,
          travelTimeNext: idx < chunk.length - 1 ? '~15 min' : undefined
        });
      });
      dayNumber++;
    }
  });

  return optimized;
};
