import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Activity schema for Gemini structured output
const ACTIVITY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          placeName: { type: Type.STRING },
          category: { type: Type.STRING, description: "e.g., Restaurant, Hotel, Sightseeing, Shopping" },
          city: { type: Type.STRING },
          originalContext: { type: Type.STRING },
          rating: { type: Type.NUMBER, description: "Rating out of 5" },
          description: { type: Type.STRING, description: "One sentence summary" },
          websiteUrl: { type: Type.STRING, description: "Official website or Maps link" },
          address: { type: Type.STRING },
          cost: { type: Type.NUMBER, description: "Estimated cost in local currency" },
          lat: { type: Type.NUMBER, description: "Latitude" },
          lng: { type: Type.NUMBER, description: "Longitude" }
        },
        required: ["placeName", "category", "city"],
      },
    },
  },
};

export interface ExtractedActivity {
  placeName: string;
  category: string;
  city: string;
  originalContext: string;
  rating?: number;
  description?: string;
  websiteUrl?: string;
  address?: string;
  cost?: number;
  lat?: number;
  lng?: number;
}

export async function extractFromText(text: string): Promise<ExtractedActivity[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Extract travel destinations and activities from this text.
    Use Google Search to verify place names, get accurate coordinates, and find ratings.

    Text: ${text}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA,
    },
  });

  const result = JSON.parse(response.text || '{"items": []}');
  return result.items || [];
}

export async function extractFromImage(base64Image: string): Promise<ExtractedActivity[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text: "Extract travel destinations from this screenshot. Use Google Search to verify places and get coordinates." },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA,
    },
  });

  const result = JSON.parse(response.text || '{"items": []}');
  return result.items || [];
}

export async function extractFromXHSLink(url: string): Promise<ExtractedActivity[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `This is a Xiaohongshu (小红书) link: ${url}

    Use Google Search to fetch the content and extract travel recommendations.
    Look for place names, restaurants, attractions, and activities mentioned.
    Verify each place with Google Search to get accurate coordinates and details.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA,
    },
  });

  const result = JSON.parse(response.text || '{"items": []}');
  return result.items || [];
}

export async function extractFromXHSScreenshot(base64Image: string): Promise<ExtractedActivity[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text: `This is a screenshot from Xiaohongshu (小红书) app.

      Extract all travel recommendations including:
      - Place names (in both Chinese and English if available)
      - Locations/addresses
      - User comments about the places
      - Any ratings or tags

      Use Google Search to verify each place and get accurate coordinates, ratings, and descriptions.` },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA,
    },
  });

  const result = JSON.parse(response.text || '{"items": []}');
  return result.items || [];
}

export async function identifyLandmark(base64Image: string): Promise<ExtractedActivity | null> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text: "Identify this landmark or place. Use Google Search to get accurate coordinates, rating, and description." },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          item: {
            type: Type.OBJECT,
            properties: {
              placeName: { type: Type.STRING },
              category: { type: Type.STRING },
              city: { type: Type.STRING },
              description: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              rating: { type: Type.NUMBER }
            },
            required: ["placeName", "city"]
          }
        }
      },
    },
  });

  const result = JSON.parse(response.text || '{"item": null}');
  return result.item;
}

export async function optimizeRoute(activities: { placeName: string; city: string; lat?: number; lng?: number }[]): Promise<{ optimizedOrder: number[]; dayGrouping: Record<number, number[]> }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Optimize this travel itinerary for the best route and group into days.
    Consider:
    - Logical order (breakfast → sightseeing → lunch → museum → dinner)
    - Minimize backtracking
    - Group 8-10 activities per day
    - Keep nearby places together

    Activities: ${JSON.stringify(activities.map((a, i) => ({ index: i, ...a })))}

    Return the optimized order as indices and day grouping.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizedOrder: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Array of activity indices in optimized order"
          },
          dayGrouping: {
            type: Type.OBJECT,
            description: "Map of day number to array of activity indices"
          }
        }
      },
    },
  });

  const result = JSON.parse(response.text || '{"optimizedOrder": [], "dayGrouping": {}}');
  return result;
}
