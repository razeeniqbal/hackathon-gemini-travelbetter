
export interface TripSource {
  title: string;
  uri: string;
}

export interface TripItem {
  id: string;
  placeName: string;
  category: string;
  city: string;
  originalContext: string;
  // Enhanced fields from Grounding
  rating?: number;
  description?: string;
  websiteUrl?: string;
  address?: string;
  isVerified?: boolean;
  dayNumber?: number; // For multi-day splitting
  cost?: number; // Budget tracking
  currency?: string;
  imageUrl?: string; // AI generated or fetched
  // Real Map & Travel Fields
  lat?: number;
  lng?: number;
  travelTimeNext?: string; // e.g. "15 min walk"
  sources?: TripSource[]; // From Search Grounding
}

export interface SavedProfile {
  id: string;
  title: string;
  items: TripItem[];
  createdAt: number;
  cities: string[];
  totalBudget?: number;
}

export enum InputMode {
  SCREENSHOT = 'SCREENSHOT',
  TEXT = 'TEXT'
}

export enum AppView {
  LIST = 'LIST',
  MAP = 'MAP',
  DISCOVER = 'DISCOVER'
}

export interface GeminiParsingResult {
  items: TripItem[];
}
