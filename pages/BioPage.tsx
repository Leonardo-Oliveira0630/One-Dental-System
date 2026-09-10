import React, { useState, useEffect } from 'react';
import { BioSettings } from '../types';
import { getBioSettings } from '../services/bioSettings';
import { Globe, MessageCircle, Instagram, Smartphone, Apple, ExternalLink, PlaySquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const BioPage = () => {
  const { theme } = useApp();
  const [settings, setSettings] = useState<BioSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Ensure BioPage is never altered by dark theme
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.remove('dark');
    return () => {
      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme === 'dark' || (!savedTheme && wasDark) || theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
  }, [theme]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getBioSettings();
      // Only get active links and sort them
      const activeLinks = data.links
        .filter(link => link.isActive)
        .sort((a, b) => a.order - b.order);
      setSettings({ ...data, links: activeLinks });
    } catch (error) {
      console.error('Error fetching bio settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe size={24} className="text-blue-500" />;
      case 'playstore':
        return <Smartphone size={24} className="text-emerald-500" />;
      case 'appstore':
        return <Apple size={24} className="text-slate-800" />;
      case 'whatsapp':
        return <MessageCircle size={24} className="text-green-500" />;
      case 'instagram':
        return <Instagram size={24} className="text-pink-500" />;
      case 'youtube':
        return <PlaySquare size={24} className="text-red-500" />;
      default:
        return <ExternalLink size={24} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center force-light">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div id="bio-page-root" className="no-dark-theme force-light min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 text-slate-800">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        
        {/* Header Profile */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md border border-slate-200 overflow-hidden flex items-center justify-center">
            {/* Try to load the svg icon, fallback to text if missing */}
            <img src="/logo labprox.svg" alt="Labprox Logo" className="w-full h-full object-contain p-2" onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl font-bold text-blue-600">L</span>';
            }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Labprox</h1>
            <p className="text-slate-500 mt-1">O sistema completo para seu laboratório</p>
          </div>
        </div>

        {/* Links Container */}
        <div className="flex flex-col gap-4 w-full">
          {settings?.links.map((link) => (
            <a
              key={link.id}
              href={link.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center w-12 h-12 bg-slate-50 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                {getIconForType(link.type)}
              </div>
              <div className="relative flex-1">
                <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                  {link.label}
                </span>
              </div>
              <div className="relative text-slate-300 group-hover:text-blue-500 transition-colors">
                <ExternalLink size={20} />
              </div>
            </a>
          ))}

          {(!settings?.links || settings.links.length === 0) && (
            <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 text-slate-500">
              Nenhum link configurado no momento.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="pt-8 text-center">
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            Acessar Sistema
          </Link>
        </div>

      </div>
    </div>
  );
};
