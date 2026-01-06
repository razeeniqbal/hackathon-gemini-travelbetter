
import React, { useState } from 'react';
import { MapPin, Navigation, Edit2, Trash2, Utensils, Camera, Hotel, Map as MapIcon, X, Star, Timer, Globe, CheckCircle } from 'lucide-react';
import { TripItem } from '../types';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { getNavigationUrl } from '../utils/helpers';

interface ItineraryCardProps {
  item: TripItem;
  onUpdate: (id: string, updates: Partial<TripItem>) => void;
  onDelete: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant')) return <Utensils size={14} />;
  if (cat.includes('hotel') || cat.includes('stay')) return <Hotel size={14} />;
  if (cat.includes('sight') || cat.includes('park')) return <Camera size={14} />;
  return <MapIcon size={14} />;
};

const ItineraryCard: React.FC<ItineraryCardProps> = ({ item, onUpdate, onDelete, isLast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.placeName);
  const dragControls = useDragControls();

  const handleSave = () => {
    onUpdate(item.id, { placeName: editedName });
    setIsEditing(false);
  };

  return (
    <Reorder.Item value={item} id={item.id} dragListener={false} dragControls={dragControls} className="mb-4">
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
        <div className="flex gap-4">
          <div onPointerDown={(e) => dragControls.start(e)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing shrink-0">
            <CategoryIcon category={item.category} />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 text-sm font-bold" />
                <button onClick={handleSave} className="text-blue-600"><CheckCircle size={20}/></button>
              </div>
            ) : (
              <h3 className="font-black text-gray-900 truncate flex items-center gap-2">
                {item.placeName}
                {item.isVerified && <CheckCircle size={14} className="text-blue-500" />}
              </h3>
            )}
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.category} • {item.city}</p>
            
            {item.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>}
            
            <div className="flex items-center gap-3 mt-3">
              <a href={getNavigationUrl(item.placeName, item.city)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-blue-100">
                <Navigation size={12} /> Navigate
              </a>
              <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-600"><Edit2 size={14}/></button>
              <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
          </div>
        </div>
        
        {!isLast && item.travelTimeNext && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-[10px] font-black text-gray-400">
            <Timer size={12} className="text-blue-400" />
            {item.travelTimeNext}
          </div>
        )}
      </div>
    </Reorder.Item>
  );
};

export default ItineraryCard;
