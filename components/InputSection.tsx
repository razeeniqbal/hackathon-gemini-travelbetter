
import React, { useState } from 'react';
import { Image as ImageIcon, FileText, Upload, Sparkles, AlertCircle, Camera } from 'lucide-react';
import { InputMode } from '../types';

interface InputSectionProps {
  onProcessText: (text: string) => void;
  onProcessImage: (file: File) => void;
  onOpenAR: () => void;
  isLoading: boolean;
  error: string | null;
}

const InputSection: React.FC<InputSectionProps> = ({ onProcessText, onProcessImage, onOpenAR, isLoading, error }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.SCREENSHOT);
  const [text, setText] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProcessImage(file);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl p-6 border border-gray-100 mb-8 overflow-hidden">
      <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
        <button
          onClick={() => setMode(InputMode.SCREENSHOT)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === InputMode.SCREENSHOT ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ImageIcon size={14} />
          Image
        </button>
        <button
          onClick={() => setMode(InputMode.TEXT)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === InputMode.TEXT ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FileText size={14} />
          Text
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-xs font-bold">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {mode === InputMode.SCREENSHOT ? (
        <div className="grid gap-3">
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className={`border-2 border-dashed border-gray-100 rounded-3xl p-8 flex flex-col items-center gap-3 transition-all ${isLoading ? 'bg-gray-50' : 'group-hover:border-blue-200 group-hover:bg-blue-50/20'}`}>
              <div className={`p-4 rounded-full ${isLoading ? 'bg-gray-200 animate-pulse' : 'bg-blue-50 text-blue-500'}`}>
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="font-black text-gray-800 text-xs uppercase tracking-widest">{isLoading ? 'Processing...' : 'Upload Screenshot'}</p>
                <p className="text-[10px] text-gray-400 mt-1">Chat notes or social snippets</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onOpenAR}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            <Camera size={16} className="text-blue-400" />
            Live AR Scan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
            placeholder="Paste your messy travel notes here..."
            className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-medium resize-none transition-all disabled:opacity-50"
          />
          <button
            onClick={() => onProcessText(text)}
            disabled={isLoading || !text.trim()}
            className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100"
          >
            {isLoading ? 'Wait for Gemini...' : 'Generate Route'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InputSection;
