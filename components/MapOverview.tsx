
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navigation, ArrowLeft, X, Map as MapIcon, Crosshair, Timer } from 'lucide-react';
import { TripItem } from '../types';
import { getNavigationUrl, getMultiStopRouteUrl } from '../utils/helpers';
import L from 'leaflet';

interface MapOverviewProps {
  items: TripItem[];
  onBack: () => void;
}

const MapOverview: React.FC<MapOverviewProps> = ({ items, onBack }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const selectedItem = useMemo(() => 
    items.find(item => item.id === selectedItemId), 
    [items, selectedItemId]
  );

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    const center: [number, number] = items[0]?.lat && items[0]?.lng 
      ? [items[0].lat, items[0].lng] 
      : [31.2304, 121.4737];

    leafletMapRef.current = L.map(mapRef.current, { center, zoom: 13, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 20
    }).addTo(leafletMapRef.current);

    return () => { leafletMapRef.current?.remove(); leafletMapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const pathCoords: L.LatLngExpression[] = [];

    map.eachLayer((layer) => { if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer); });

    items.forEach((item, idx) => {
      if (item.lat && item.lng) {
        const pos: [number, number] = [item.lat, item.lng];
        pathCoords.push(pos);
        
        // Main Stop Marker
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="p-2 rounded-full shadow-lg border-2 border-white ${idx === 0 ? 'bg-blue-600' : 'bg-gray-800'} text-white flex items-center justify-center font-black text-[10px] w-8 h-8">${idx + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
        const marker = L.marker(pos, { icon }).addTo(map);
        marker.on('click', () => setSelectedItemId(item.id));

        // Travel Time Label at Midpoint (if travelTimeNext exists)
        if (idx < items.length - 1 && item.travelTimeNext) {
          const nextItem = items[idx + 1];
          if (nextItem.lat && nextItem.lng) {
            const midpoint: [number, number] = [
              (item.lat + nextItem.lat) / 2,
              (item.lng + nextItem.lng) / 2
            ];
            
            const timeIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="bg-white/90 backdrop-blur-sm border border-blue-100 px-2 py-1 rounded-full shadow-sm text-[8px] font-black text-blue-500 whitespace-nowrap flex items-center gap-1">
                       <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                       ${item.travelTimeNext}
                     </div>`,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            });
            L.marker(midpoint, { icon: timeIcon, interactive: false, zIndexOffset: 500 }).addTo(map);
          }
        }
      }
    });

    if (pathCoords.length > 1) {
      L.polyline(pathCoords, { color: '#3B82F6', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
      map.fitBounds(L.latLngBounds(pathCoords), { padding: [50, 50] });
    }
  }, [items]);

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-300">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <div>
            <h2 className="text-lg font-black tracking-tight">Interactive Map</h2>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{items.length} Destinations</p>
          </div>
        </div>
        <a 
          href={getMultiStopRouteUrl(items)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg"
        >
          <Navigation size={14} className="text-blue-400" />
          Navigate Route
        </a>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div ref={mapRef} className="w-full h-full" />
        
        <button 
          onClick={() => leafletMapRef.current?.locate()} 
          className="absolute bottom-8 right-6 w-12 h-12 bg-white shadow-2xl rounded-2xl flex items-center justify-center text-blue-600 z-[5] border border-gray-100"
        >
          <Crosshair size={20} />
        </button>

        {selectedItem && (
          <div className="absolute bottom-8 left-6 right-6 z-[10] animate-in slide-in-from-bottom duration-300">
            <div className="bg-white rounded-[2.5rem] p-4 shadow-2xl flex flex-col border border-blue-50">
              <div className="flex items-center gap-4">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-inner" />
                ) : (
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><MapIcon size={24} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 truncate">{selectedItem.placeName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{selectedItem.city}</p>
                  
                  {selectedItem.travelTimeNext && (
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full w-fit border border-indigo-100/50">
                      <Timer size={10} />
                      Next: {selectedItem.travelTimeNext}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <a href={getNavigationUrl(selectedItem.placeName, selectedItem.city)} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg hover:bg-blue-700 transition-colors"><Navigation size={20} /></a>
                  <button onClick={() => setSelectedItemId(null)} className="bg-gray-50 text-gray-400 p-3.5 rounded-2xl hover:bg-gray-100 transition-colors"><X size={20} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
           {items.map((item, idx) => (
             <button 
               key={item.id} 
               onClick={() => {
                 setSelectedItemId(item.id);
                 if (item.lat && item.lng) leafletMapRef.current?.setView([item.lat, item.lng], 15);
               }}
               className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${selectedItemId === item.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
             >
               <span className="text-[10px] font-black">{idx + 1}</span>
               <span className="text-xs font-bold whitespace-nowrap">{item.placeName}</span>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export default MapOverview;
