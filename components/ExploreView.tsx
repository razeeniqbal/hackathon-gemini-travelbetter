
import React from 'react';
import { Calendar, MapPin, ChevronRight, Trash2, FolderOpen, Plus, Compass } from 'lucide-react';
import { SavedProfile } from '../types';

interface ExploreViewProps {
  profiles: SavedProfile[];
  onLoadProfile: (profile: SavedProfile) => void;
  onDeleteProfile: (id: string) => void;
  onStartNew: () => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ profiles, onLoadProfile, onDeleteProfile, onStartNew }) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-xl mx-auto px-6 pt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Library</h2>
            <p className="text-gray-500 mt-1">Saved routes and past adventures</p>
          </div>
          <button 
            onClick={onStartNew}
            className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>

        {profiles.length > 0 ? (
          <div className="grid gap-4">
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className="group relative bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => onLoadProfile(profile)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {profile.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-gray-400">
                      <Calendar size={12} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">
                        {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProfile(profile.id);
                    }}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {profile.cities.slice(0, 3).map((city, idx) => (
                    <span key={idx} className="bg-gray-50 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-100">
                      {city}
                    </span>
                  ))}
                  {profile.cities.length > 3 && (
                    <span className="text-[10px] font-bold text-gray-400 py-1">+{profile.cities.length - 3} more</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <MapPin size={14} className="text-blue-500" />
                    {profile.items.length} stops
                  </div>
                  <div className="text-blue-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Open Route
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-[3rem] shadow-sm px-10">
            <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No saved profiles yet</h3>
            <p className="text-gray-500 leading-relaxed mb-8">
              Once you build an itinerary, save it to your library to access it anytime.
            </p>
            <button 
              onClick={onStartNew}
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mx-auto hover:bg-black transition-all shadow-lg"
            >
              Start Planning
            </button>
          </div>
        )}

        <div className="mt-12 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] text-white shadow-xl shadow-blue-200">
           <div className="flex items-center gap-3 mb-2">
              <Compass className="text-blue-200" />
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Discover Inspiration</span>
           </div>
           <h4 className="text-xl font-bold mb-2">Trending Destinations</h4>
           <p className="text-blue-100 text-sm mb-6 opacity-90">Browse community-sourced routes for your next big trip.</p>
           <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition-all">
              Coming Soon
           </button>
        </div>
      </div>
    </div>
  );
};

export default ExploreView;
