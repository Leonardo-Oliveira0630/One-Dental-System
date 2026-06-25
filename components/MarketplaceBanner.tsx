import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MarketplaceBanner = () => {
  const { globalSettings } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners = globalSettings?.marketplaceBanners || [];

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const getButtonSizeClass = (size?: string) => {
    switch(size) {
      case 'sm': return 'px-4 py-2 text-sm';
      case 'lg': return 'px-8 py-4 text-lg';
      default: return 'px-6 py-3 text-base';
    }
  };

  return (
    <div className="w-full h-[600px] relative overflow-hidden group bg-slate-100">
      <div 
        className="w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out absolute inset-0"
        style={{ backgroundImage: `url(${currentBanner.imageUrl})` }}
      />
      
      {/* Overlay to ensure text readability if needed, or just standard content */}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center p-6 transition-opacity duration-700">
        {currentBanner.text && (
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 drop-shadow-lg max-w-4xl tracking-tight">
            {currentBanner.text}
          </h2>
        )}
        
        {currentBanner.button?.show && (
          <a
            href={currentBanner.button.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-bold rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 ${getButtonSizeClass(currentBanner.button.size)}`}
            style={{ backgroundColor: currentBanner.button.color || '#EE4D2D', color: '#fff' }}
          >
            {currentBanner.button.text}
          </a>
        )}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={24} />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
