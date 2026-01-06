
import { TripItem } from "../types";

export const getNavigationUrl = (placeName: string, city: string): string => {
  const chinaCities = ["China", "Shanghai", "Beijing", "Chengdu", "Guangzhou", "Shenzhen", "Hangzhou", "Xi'an", "Chongqing", "Suzhou"];
  const isChina = chinaCities.some(c => city.toLowerCase().includes(c.toLowerCase()));

  if (isChina) {
    return `http://api.map.baidu.com/geocoder?address=${encodeURIComponent(placeName)}&output=html`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName}, ${city}`)}`;
};

/**
 * Generates a Google Maps URL with multiple stops
 */
export const getMultiStopRouteUrl = (items: TripItem[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return getNavigationUrl(items[0].placeName, items[0].city);

  const origin = encodeURIComponent(`${items[0].placeName}, ${items[0].city}`);
  const destination = encodeURIComponent(`${items[items.length - 1].placeName}, ${items[items.length - 1].city}`);
  
  const waypoints = items.slice(1, -1)
    .map(item => encodeURIComponent(`${item.placeName}, ${item.city}`))
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1];
      if (base64String) resolve(base64String);
      else reject(new Error("Failed to convert image"));
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Generates and downloads an .ics file for the trip
 */
export const exportToICS = (items: TripItem[], tripTitle: string) => {
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LazyTravel//NONSGML v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  items.forEach((item, index) => {
    const start = new Date();
    start.setDate(start.getDate() + (item.dayNumber || 1));
    start.setHours(9 + (index % 5), 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const dateToICS = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${item.id}@lazytravel.app`);
    icsContent.push(`DTSTAMP:${now}`);
    icsContent.push(`DTSTART:${dateToICS(start)}`);
    icsContent.push(`DTEND:${dateToICS(end)}`);
    icsContent.push(`SUMMARY:${item.placeName}`);
    icsContent.push(`LOCATION:${item.address || item.city}`);
    icsContent.push(`DESCRIPTION:${item.description || 'Travel stop via LazyTravel'}`);
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `${tripTitle.replace(/\s+/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
