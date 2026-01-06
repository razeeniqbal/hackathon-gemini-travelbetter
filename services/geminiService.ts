
import { GoogleGenAI, Type } from "@google/genai";
import { TripItem, TripSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ITINERARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          placeName: { type: Type.STRING },
          category: { type: Type.STRING },
          city: { type: Type.STRING },
          originalContext: { type: Type.STRING },
          rating: { type: Type.NUMBER, description: "Average rating out of 5" },
          description: { type: Type.STRING, description: "One sentence summary" },
          websiteUrl: { type: Type.STRING, description: "Official website or Maps link" },
          address: { type: Type.STRING, description: "Physical address" },
          cost: { type: Type.NUMBER, description: "Estimated cost in local currency" },
          dayNumber: { type: Type.INTEGER, description: "Suggested day (1, 2, etc.)" },
          lat: { type: Type.NUMBER, description: "Latitude" },
          lng: { type: Type.NUMBER, description: "Longitude" },
          travelTimeNext: { type: Type.STRING, description: "Travel time to next, e.g., '12 min walk'" }
        },
        required: ["id", "placeName", "category", "city"],
      },
    },
  },
};

const extractSources = (response: any): TripSource[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || 'Source',
      uri: chunk.web.uri
    }));
};

export const extractItineraryFromText = async (text: string): Promise<TripItem[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Extract travel stops. Verify using Google Search for accuracy. Notes: ${text}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ITINERARY_SCHEMA,
    },
  });
  
  const result = JSON.parse(response.text || '{"items": []}');
  const sources = extractSources(response);
  
  return result.items.map((item: any) => ({ 
    ...item, 
    isVerified: true,
    sources: sources.length > 0 ? sources : undefined
  }));
};

export const extractItineraryFromImage = async (base64Image: string): Promise<TripItem[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text: "Extract travel stops from this screenshot. Use Google Search to verify names and coordinates." },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: ITINERARY_SCHEMA,
    },
  });
  
  const result = JSON.parse(response.text || '{"items": []}');
  const sources = extractSources(response);
  
  return result.items.map((item: any) => ({ 
    ...item, 
    isVerified: true,
    sources: sources.length > 0 ? sources : undefined
  }));
};

/**
 * Gets weather context for the trip
 */
export const getWeatherForecast = async (cities: string[]): Promise<Record<string, string>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What is the typical or current weather (temp and condition) for these cities: ${cities.join(", ")}? Keep it very short like '22°C, Sunny'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            forecasts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING },
                  weather: { type: Type.STRING }
                }
              }
            }
          }
        },
      },
    });
    const result = JSON.parse(response.text || '{"forecasts": []}');
    const map: Record<string, string> = {};
    result.forecasts.forEach((f: any) => map[f.city] = f.weather);
    return map;
  } catch (e) {
    return {};
  }
};

export const identifyLandmarkFromImage = async (base64Image: string): Promise<TripItem | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: "Identify this landmark. Return details. Search for coordinates." },
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
                id: { type: Type.STRING },
                placeName: { type: Type.STRING },
                category: { type: Type.STRING },
                city: { type: Type.STRING },
                description: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              },
              required: ["id", "placeName", "city"]
            }
          }
        },
      },
    });
    const result = JSON.parse(response.text || '{"item": null}');
    return result.item ? { ...result.item, isVerified: true, originalContext: 'AR Scan' } : null;
  } catch (e) {
    return null;
  }
};

export const getTravelEstimates = async (items: TripItem[]): Promise<string[]> => {
  if (items.length < 2) return [];
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Travel estimates between: ${JSON.stringify(items.map(i => `${i.placeName}, ${i.city}`))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimates: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
      },
    });
    const result = JSON.parse(response.text || '{"estimates": []}');
    return result.estimates;
  } catch (e) {
    return Array(items.length - 1).fill('');
  }
};

export const optimizeAndGroupRoute = async (items: TripItem[]): Promise<TripItem[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Optimize and group by days: ${JSON.stringify(items.map(i => ({ id: i.id, name: i.placeName, city: i.city })))}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizedItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                dayNumber: { type: Type.INTEGER },
                travelTimeNext: { type: Type.STRING }
              }
            }
          }
        },
      },
    },
  });
  const result = JSON.parse(response.text || '{"optimizedItems": []}');
  const mapping = new Map(result.optimizedItems.map((m: any) => [m.id, { day: m.dayNumber, next: m.travelTimeNext }]));
  return [...items].sort((a, b) => {
    const dayA = (mapping.get(a.id) as any)?.day ?? 1;
    const dayB = (mapping.get(b.id) as any)?.day ?? 1;
    return dayA - dayB;
  }).map(item => ({
    ...item,
    dayNumber: (mapping.get(item.id) as any)?.day ?? 1,
    travelTimeNext: (mapping.get(item.id) as any)?.next ?? item.travelTimeNext
  }));
};
