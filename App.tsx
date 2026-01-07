
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compass, Sparkles, Bookmark, Check, Wand2, DollarSign, Map as MapIcon, Share2, Camera, X, Copy, QrCode, Calendar, Download, Cloud, Loader2, Navigation, Trash2 } from 'lucide-react';
import { TripItem, AppView, SavedProfile } from './types';
import InputSection from './components/InputSection';
import ItineraryCard from './components/ItineraryCard';
import MapOverview from './components/MapOverview';
import ExploreView from './components/ExploreView';
import { extractItineraryFromText, extractItineraryFromImage, optimizeAndGroupRoute, getTravelEstimates, identifyLandmarkFromImage, getWeatherForecast } from './services/geminiService';
import { fileToBase64, exportToICS, getMultiStopRouteUrl } from './utils/helpers';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { saveCurrentTrip, loadTrip, loadTripByShareToken, deleteTrip, generateShareLink, getAllSavedTrips, updateTripActivities } from './src/hooks/useTrips';

const App: React.FC = () => {
  const [itinerary, setItinerary] = useState<TripItem[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>(window.location.origin);
  const [weatherData, setWeatherData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LIST);
  const [isSaved, setIsSaved] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAROpen, setIsAROpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check if loading shared trip from URL path /shared/:token
    const path = window.location.pathname;
    const sharedMatch = path.match(/^\/shared\/([a-z0-9]+)$/);

    if (sharedMatch) {
      const token = sharedMatch[1];
      loadSharedTrip(token);
    }
  }, []);

  const loadSharedTrip = async (token: string) => {
    setIsLoadingTrip(true);
    try {
      const items = await loadTripByShareToken(token);
      setItinerary(items);
      // Clear URL after loading
      window.history.replaceState(null, "", "/");
    } catch (error) {
      console.error('Failed to load shared trip:', error);
      setError('Invalid share link or trip not found.');
    } finally {
      setIsLoadingTrip(false);
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      const cities: string[] = Array.from(new Set(itinerary.map(i => i.city)));
      if (cities.length === 0) return;
      const forecasts = await getWeatherForecast(cities);
      setWeatherData(forecasts);
    };
    fetchWeather();
  }, [itinerary]);

  // Fetch saved trips when switching to library view
  useEffect(() => {
    if (currentView === AppView.DISCOVER) {
      fetchSavedTrips();
    }
  }, [currentView]);

  const fetchSavedTrips = async () => {
    try {
      const trips = await getAllSavedTrips();
      // Transform to SavedProfile format for compatibility
      setSavedProfiles(trips.map(trip => ({
        id: trip.id,
        title: trip.title,
        items: [], // Items not loaded until trip is opened
        createdAt: new Date(trip.createdAt).getTime(),
        cities: trip.cities,
        totalBudget: trip.totalBudget
      })));
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      setError('Failed to load saved trips.');
    }
  };

  // Auto-save: Debounced sync to database when itinerary changes
  useEffect(() => {
    if (!currentTripId || itinerary.length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        await updateTripActivities(currentTripId, itinerary);
        console.log('Trip auto-saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [itinerary, currentTripId]);

  const totalBudget = useMemo(() => 
    itinerary.reduce((sum, item) => sum + (item.cost || 0), 0), 
  [itinerary]);

  // Generate share link when trip is saved
  useEffect(() => {
    const generateShare = async () => {
      if (!currentTripId) {
        setShareUrl(window.location.origin);
        return;
      }

      try {
        const token = await generateShareLink(currentTripId);
        setShareUrl(`${window.location.origin}/shared/${token}`);
      } catch (error) {
        console.error('Failed to generate share link:', error);
        setShareUrl(window.location.origin);
      }
    };

    generateShare();
  }, [currentTripId]);

  const handleProcessText = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true); setError(null);
    try {
      const items = await extractItineraryFromText(text);
      setItinerary(prev => [...prev, ...items]);
    } catch (err) { setError("Analysis failed."); } finally { setIsLoading(false); }
  };

  const handleProcessImage = async (file: File) => {
    setIsLoading(true); setError(null);
    try {
      const base64 = await fileToBase64(file);
      const items = await extractItineraryFromImage(base64);
      setItinerary(prev => [...prev, ...items]);
    } catch (err) { setError("Reading failed."); } finally { setIsLoading(false); }
  };

  const handleOptimize = async () => {
    if (itinerary.length < 2) return;
    setIsLoading(true);
    try {
      const optimized = await optimizeAndGroupRoute(itinerary);
      setItinerary(optimized);
    } catch (err) { setError("Optimization failed."); } finally { setIsLoading(false); }
  };

  const handleReset = () => {
    if (itinerary.length > 0 && window.confirm("Are you sure you want to clear the current itinerary?")) {
      setItinerary([]);
      setError(null);
    }
  };

  const handleReorder = async (day: string, newOrder: TripItem[]) => {
    const dayNum = Number(day);
    const otherItems = itinerary.filter(it => it.dayNumber !== dayNum);
    const tempItinerary = [...otherItems, ...newOrder].sort((a,b) => (a.dayNumber || 0) - (b.dayNumber || 0));
    setItinerary(tempItinerary);
    
    if (newOrder.length > 1) {
      setIsRecalculating(true);
      try {
        const estimates = await getTravelEstimates(newOrder);
        const updatedOrder = newOrder.map((it, i) => ({
          ...it,
          travelTimeNext: estimates[i] || undefined
        }));
        setItinerary(prev => {
          const others = prev.filter(it => it.dayNumber !== dayNum);
          return [...others, ...updatedOrder].sort((a,b) => (a.dayNumber || 0) - (b.dayNumber || 0));
        });
      } catch (e) {
        console.error("Travel update failed", e);
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  const startAR = async () => {
    setIsAROpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { setError("Camera access denied."); setIsAROpen(false); }
  };

  const captureAR = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsLoading(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    setIsAROpen(false);
    try {
      const landmark = await identifyLandmarkFromImage(base64);
      if (landmark) setItinerary(prev => [...prev, { ...landmark, dayNumber: prev.length > 0 ? prev[prev.length - 1].dayNumber : 1 }]);
    } catch (err) { setError("AR error."); } finally { setIsLoading(false); }
  };

  const saveToLibrary = async () => {
    if (itinerary.length === 0) return;
    const title = prompt("Trip Name:", `Trip to ${itinerary[0].city}`);
    if (!title) return;

    setIsLoadingTrip(true);
    try {
      const tripId = await saveCurrentTrip(itinerary, title);
      setCurrentTripId(tripId);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      // Refresh saved trips list if in library view
      if (currentView === AppView.DISCOVER) {
        await fetchSavedTrips();
      }
    } catch (error) {
      console.error('Failed to save trip:', error);
      setError('Failed to save trip. Please try again.');
    } finally {
      setIsLoadingTrip(false);
    }
  };

  const groupedItinerary = useMemo(() => {
    const days: Record<number, TripItem[]> = {};
    itinerary.forEach(item => {
      const d = item.dayNumber || 1;
      if (!days[d]) days[d] = [];
      days[d].push(item);
    });
    return Object.entries(days).sort(([a], [b]) => Number(a) - Number(b));
  }, [itinerary]);

  return (
    <div className="min-h-screen pb-28 bg-[#F9FAFB] text-gray-900 font-sans overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentView === AppView.MAP && <MapOverview key="map" items={itinerary} onBack={() => setCurrentView(AppView.LIST)} />}
        {currentView === AppView.DISCOVER && (
          <ExploreView
            key="library"
            profiles={savedProfiles}
            onLoadProfile={async (p) => {
              setIsLoadingTrip(true);
              try {
                const items = await loadTrip(p.id);
                setItinerary(items);
                setCurrentTripId(p.id);
                setCurrentView(AppView.LIST);
              } catch (error) {
                console.error('Failed to load trip:', error);
                setError('Failed to load trip.');
              } finally {
                setIsLoadingTrip(false);
              }
            }}
            onDeleteProfile={async (id) => {
              try {
                await deleteTrip(id);
                setSavedProfiles(prev => prev.filter(p => p.id !== id));
              } catch (error) {
                console.error('Failed to delete trip:', error);
                setError('Failed to delete trip.');
              }
            }}
            onStartNew={() => setCurrentView(AppView.LIST)}
          />
        )}
      </AnimatePresence>

      {currentView === AppView.LIST && (
        <>
          <header className="sticky top-0 z-50 bg-[#F9FAFB]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Compass size={22} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black tracking-tight">LazyTravel</h1>
            </div>
            <div className="flex gap-2">
              {itinerary.length > 0 && (
                <>
                  <button onClick={handleReset} className="p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-red-500 hover:bg-red-50 transition-colors active:scale-95" title="Clear Itinerary">
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => exportToICS(itinerary, `Trip to ${itinerary[0].city}`)} className="p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-blue-600 active:scale-95">
                    <Calendar size={20} />
                  </button>
                  <button onClick={() => setIsQRModalOpen(true)} className="p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-gray-500 active:scale-95">
                    <Share2 size={20} />
                  </button>
                </>
              )}
            </div>
          </header>

          <main className="max-w-xl mx-auto px-6 py-8 relative">
            <InputSection 
              onProcessText={handleProcessText}
              onProcessImage={handleProcessImage}
              onOpenAR={startAR}
              isLoading={isLoading}
              error={error}
            />

            {itinerary.length > 0 && (
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <button onClick={handleOptimize} className="bg-blue-600 text-white px-5 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                      <Wand2 size={14} /> Optimize
                    </button>
                    <a href={getMultiStopRouteUrl(itinerary)} target="_blank" rel="noopener noreferrer" className="bg-gray-900 text-white px-5 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                      <Navigation size={14} className="text-blue-400" /> Open Route
                    </a>
                  </div>
                  <button onClick={saveToLibrary} className={`p-3 rounded-2xl transition-all ${isSaved ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {isSaved ? <Check size={20} /> : <Bookmark size={20} />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-10">
              {groupedItinerary.map(([day, items]) => (
                <div key={day}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-gray-900 text-white px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest">Day {day}</div>
                    {weatherData[items[0].city] && <div className="text-[10px] font-bold text-blue-500 flex items-center gap-1"><Cloud size={12}/>{weatherData[items[0].city]}</div>}
                  </div>
                  
                  <Reorder.Group axis="y" values={items} onReorder={(newOrder) => handleReorder(day, newOrder)}>
                    {items.map((item, idx) => (
                      <ItineraryCard
                        key={item.id}
                        item={item}
                        onUpdate={(id, up) => setItinerary(prev => prev.map(it => it.id === id ? {...it, ...up} : it))}
                        onDelete={(id) => setItinerary(prev => prev.filter(it => it.id !== id))}
                        isFirst={idx === 0}
                        isLast={idx === items.length - 1}
                        index={idx + 1}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              ))}
            </div>
          </main>
        </>
      )}

      {/* AR Scanner Overlay */}
      <AnimatePresence>
        {isAROpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-10 right-6"><button onClick={() => setIsAROpen(false)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full border border-white/20"><X size={24} /></button></div>
            <div className="absolute bottom-16 flex flex-col items-center gap-6 w-full px-10">
              <button onClick={captureAR} className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2 shadow-2xl active:scale-90 transition-all"><div className="w-12 h-12 bg-blue-600 rounded-full" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-gray-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 sm:max-w-md sm:mx-auto text-white z-[100] border border-white/10">
        <button onClick={() => setCurrentView(AppView.DISCOVER)} className={`flex flex-col items-center gap-1 ${currentView === AppView.DISCOVER ? 'text-blue-400' : 'text-gray-400'}`}><Compass size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Library</span></button>
        <button onClick={() => setCurrentView(AppView.LIST)} className={`flex flex-col items-center gap-1 ${currentView === AppView.LIST ? 'text-blue-400' : 'text-gray-400'}`}><Sparkles size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Plan</span></button>
        <button disabled={itinerary.length === 0} onClick={() => setCurrentView(AppView.MAP)} className={`flex flex-col items-center gap-1 ${currentView === AppView.MAP ? 'text-blue-400' : 'text-gray-400'}`}><MapIcon size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Map</span></button>
      </nav>
    </div>
  );
};

export default App;
