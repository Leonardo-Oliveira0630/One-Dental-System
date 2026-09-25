import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Video, Image as ImageIcon, Search, ChevronLeft, 
  ChevronRight, ArrowLeft, Play, Info, CheckCircle2, Bookmark,
  HelpCircle, ExternalLink, Calendar, Compass, User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { subscribeTutorials } from '../services/firebaseService';
import { Tutorial, UserRole } from '../types';

export const TutorialsView = () => {
  const { t } = useTranslation();
  const { currentUser, currentOrg } = useApp();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Carousel Slide State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Detect context type accurately (Dentist / Clinic vs Lab)
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isClinicOrDentist = Boolean(
    currentUser?.role === UserRole.CLIENT || 
    currentUser?.role === UserRole.DENTIST ||
    (currentUser as any)?.role === 'CLIENT' ||
    (currentUser as any)?.role === 'DENTIST' ||
    currentOrg?.orgType === 'CLINIC' ||
    (currentUser as any)?.regType === 'DENTIST' ||
    (currentUser as any)?.clinicId
  );

  const [adminAudienceFilter, setAdminAudienceFilter] = useState<'LAB' | 'CLINIC' | null>(null);
  const targetAudience: 'LAB' | 'CLINIC' = adminAudienceFilter || (isClinicOrDentist ? 'CLINIC' : 'LAB');
  const isClient = targetAudience === 'CLINIC';

  // Helper inside component to parse YouTube Video ID
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      return null;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = selectedTutorial?.videoUrl ? getYouTubeId(selectedTutorial.videoUrl) : null;

  useEffect(() => {
    const unsub = subscribeTutorials((data) => {
      setTutorials(data.sort((a, b) => a.orderIndex - b.orderIndex));
    });
    return () => unsub();
  }, []);

  // Reset category if not available in current audience
  useEffect(() => {
    setSelectedCategory('all');
  }, [targetAudience]);

  // Filter tutorials based on user audience (LAB or CLINIC)
  const audienceTutorials = tutorials.filter(tut => {
    const tutAud = (tut.targetAudience || 'LAB').toUpperCase();
    if (targetAudience === 'CLINIC') {
      return tutAud === 'CLINIC' || tutAud === 'DENTIST';
    }
    return tutAud === 'LAB' || tutAud === 'LABORATORY';
  });

  // Get unique categories list
  const categories = ['all', ...Array.from(new Set(audienceTutorials.map(tut => tut.category).filter(Boolean)))];

  // Apply search query and category filters
  const filteredTutorials = audienceTutorials.filter(tut => {
    const matchesSearch = tut.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tut.writtenContent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTutorial = (tut: Tutorial) => {
    setSelectedTutorial(tut);
    setCurrentSlide(0);
    setIsVideoPlaying(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Super Admin Audience Toggle */}
      {isSuperAdmin && (
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Visualizando como:</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">Super Admin</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdminAudienceFilter('LAB')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                targetAudience === 'LAB' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sistema de Laboratório
            </button>
            <button
              onClick={() => setAdminAudienceFilter('CLINIC')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                targetAudience === 'CLINIC' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sistema de Clínica / Dentista
            </button>
          </div>
        </div>
      )}

      {/* Header section */}
      {!selectedTutorial ? (
        <>
          <div className="bg-slate-900 rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-100">
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10">
              <BookOpen size={200} />
            </div>
            <div className="relative z-10 max-w-2xl">
              <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {t('tutorials.helpCenterBadge', 'Central de Ajuda')}
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">
                {t('tutorials.heroTitle', 'Como podemos te ajudar hoje?')}
              </h1>
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                {isClient 
                  ? t('tutorials.heroSubtitleClinic', 'Descubra tutoriais passo a passo guiados por telas, vídeos didáticos e guias escritos detalhando todas as funcionalidades do sistema da sua Clínica Odontológica.')
                  : t('tutorials.heroSubtitleLab', 'Descubra tutoriais passo a passo guiados por telas, vídeos didáticos e guias escritos detalhando todas as funcionalidades do sistema do seu Laboratório.')}
              </p>

              {/* Dynamic Search bar style inside header */}
              <div className="mt-8 relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={t('tutorials.searchPlaceholder', 'Pesquise por uma funcionalidade ou clique... (ex: cadastrar caso, organizar agenda)')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-slate-800 placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl text-xs font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:p-8">
            {/* Category Sidebar Filters */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-4">
                {t('tutorials.categoriesTitle', 'Categorias')}
              </h3>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between ${
                    selectedCategory === cat 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 font-extrabold' 
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                  }`}
                >
                  <span>{cat === 'all' ? t('tutorials.allGuides', 'Ver Todos os Guias') : cat}</span>
                  {selectedCategory === cat && <CheckCircle2 size={14} />}
                </button>
              ))}
            </div>

            {/* Tutorials List Grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                {filteredTutorials.map((tut) => (
                  <div 
                    key={tut.id} 
                    onClick={() => handleSelectTutorial(tut)}
                    className="group bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          {tut.category}
                        </span>
                        <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                          <Bookmark size={16} />
                        </div>
                      </div>
                      <h3 className="font-extrabold text-slate-800 text-base mb-2 group-hover:text-blue-600 transition-colors">
                        {tut.title}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed mb-4">
                        {tut.description}
                      </p>
                    </div>

                    <div className="border-t border-slate-50 pt-4 flex gap-3 items-center">
                      {tut.steps && tut.steps.length > 0 && (
                        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase leading-none">
                          <ImageIcon size={12} /> {t('tutorials.slidesCount', '{{count}} Slides', { count: tut.steps.length })}
                        </span>
                      )}
                      {tut.videoUrl && (
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase leading-none">
                          <Video size={12} /> {t('tutorials.videoLesson', 'Vídeo Aula')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTutorials.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                    <HelpCircle size={48} className="mx-auto text-slate-300 mb-3 animate-pulse" />
                    <h4 className="font-extrabold text-slate-700 text-sm">{t('tutorials.noTutorialsFound', 'Nenhum tutorial encontrado')}</h4>
                    <p className="text-slate-400 text-xs mt-1">{t('tutorials.noTutorialsFoundDesc', 'Experimente remover os filtros de busca ou alterar a categoria.')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Detailed Tutorial Reader View */
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
          <button 
            onClick={() => setSelectedTutorial(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase tracking-wider mb-4 border border-slate-200/80 bg-white px-4 py-2 rounded-xl cursor-pointer"
          >
            <ArrowLeft size={16} /> {t('tutorials.backToGuides', 'Voltar para os Guias')}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:p-8">
            
            {/* Left/Middle: Image sliders & Videos and Written documentation */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Carousel Steps Area */}
              {selectedTutorial.steps && selectedTutorial.steps.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <ImageIcon className="text-emerald-500" size={16} /> {t('tutorials.imageCarouselTitle', 'Carrossel de Imagens do Sistema (Passo a Passo)')}
                      </h3>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('tutorials.visualClickGuide', 'Acompanhe visualmente onde deve clicar')}</p>
                    </div>
                    <span className="bg-slate-200 text-slate-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full">
                      {t('tutorials.slideXofY', 'SLIDE {{current}} DE {{total}}', { current: currentSlide + 1, total: selectedTutorial.steps.length })}
                    </span>
                  </div>

                  {/* Main slide display */}
                  <div className="relative aspect-video bg-slate-900 group">
                    <img 
                      src={selectedTutorial.steps[currentSlide].imageUrl} 
                      alt={selectedTutorial.steps[currentSlide].title} 
                      className="w-full h-full object-cover select-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60';
                      }}
                    />
                    
                    {/* Dark gradient for title spacing */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 text-white text-sm">
                      <h4 className="font-extrabold text-white text-base mb-1">
                        {selectedTutorial.steps[currentSlide].title}
                      </h4>
                      <p className="text-slate-200 text-xs leading-relaxed">
                        {selectedTutorial.steps[currentSlide].description}
                      </p>
                    </div>

                    {/* Navigation controllers */}
                    <button
                      disabled={currentSlide === 0}
                      onClick={() => setCurrentSlide(prev => prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      disabled={currentSlide === selectedTutorial.steps.length - 1}
                      onClick={() => setCurrentSlide(prev => prev + 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>

                  {/* Mini thumbnail tabs picker */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto justify-center">
                    {selectedTutorial.steps.map((st, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                          i === currentSlide ? 'bg-blue-600 scale-125' : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={st.title}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Video Tutorial Area */}
              {selectedTutorial.videoUrl && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                    <Video className="text-blue-500" size={18} />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{t('tutorials.videoGuideTitle', 'Vídeo Explicativo Integrado')}</h3>
                  </div>

                  <div className="bg-slate-950 aspect-video rounded-2xl overflow-hidden relative group">
                    {!isVideoPlaying ? (
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/45 text-white p-4 bg-cover bg-center"
                        style={ytId ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.6)), url(https://img.youtube.com/vi/${ytId}/hqdefault.jpg)` } : undefined}
                      >
                        <button 
                          onClick={() => setIsVideoPlaying(true)}
                          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all transform hover:scale-110 shadow-lg shadow-blue-500/30 relative z-10 cursor-pointer"
                        >
                          <Play size={28} className="ml-1" />
                        </button>
                        <p className="text-white font-extrabold text-xs mt-3 bg-slate-900/80 px-4 py-1.5 rounded-full uppercase tracking-wider relative z-10">{t('tutorials.watchDemoVideo', 'Assistir Vídeo Demonstrativo')}</p>
                      </div>
                    ) : (
                      ytId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={selectedTutorial.title}
                        />
                      ) : (
                        <video 
                          src={selectedTutorial.videoUrl} 
                          controls 
                          autoPlay 
                          className="w-full h-full object-contain"
                        />
                      )
                    )}
                  </div>

                  {selectedTutorial.videoSubtitle && (
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-2xl flex gap-3 items-start">
                      <Info className="text-blue-600 shrink-0" size={18} />
                      <div>
                        <p className="text-xs text-blue-800 font-extrabold uppercase tracking-wide">{t('tutorials.whatHappensInVideo', 'O que vai acontecer no vídeo:')}</p>
                        <p className="text-xs text-blue-700/90 leading-relaxed mt-1 font-semibold">{selectedTutorial.videoSubtitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comprehensive Written Guide */}
              <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-100 pb-3 uppercase tracking-tight">
                  {t('tutorials.practicalWrittenGuide', 'Guia Escrito Prático')}
                </h3>
                <div className="prose text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedTutorial.writtenContent || t('tutorials.noWrittenGuide', 'Este tutorial não possui guia escrito preenchido nesta versão.')}
                </div>
              </div>

            </div>

            {/* Right: Tutorial Metadata panel */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4">
                <div>
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {selectedTutorial.category}
                  </span>
                  <h1 className="text-lg font-black text-slate-800 mt-3 tracking-tight">
                    {selectedTutorial.title}
                  </h1>
                  <p className="text-slate-500 text-xs leading-relaxed mt-2">
                    {selectedTutorial.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Compass size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">{t('tutorials.targetAudienceTitle', 'Público Alvo')}</p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTutorial.targetAudience === 'LAB' ? t('tutorials.labOnly', 'Apenas Laboratório') : t('tutorials.clinicOnly', 'Apenas Clínica e Dentista')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500">
                    <Calendar size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">{t('tutorials.guideLevelTitle', 'Nível do Guia')}</p>
                      <p className="text-xs font-bold text-slate-700">{t('tutorials.recommendedAccess', 'Acesso Recomendado')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 flex gap-3 items-center">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  <div>
                    <h4 className="font-extrabold text-emerald-800 text-xs">{t('tutorials.learnAtYourPaceTitle', 'Aprenda no seu tempo')}</h4>
                    <p className="text-[10px] text-emerald-700/80 mt-0.5 font-bold">{t('tutorials.learnAtYourPaceDesc', 'Os guias ficam disponíveis 24h para você.')}</p>
                  </div>
                </div>
              </div>

              {/* Side panel index guides list */}
              <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4">{t('tutorials.otherCategoryTutorialsTitle', 'Outros tutoriais desta categoria')}</h4>
                <div className="space-y-3">
                  {audienceTutorials
                    .filter(tut => tut.id !== selectedTutorial.id && tut.category === selectedTutorial.category)
                    .map(tut => (
                      <div 
                        key={tut.id}
                        onClick={() => handleSelectTutorial(tut)}
                        className="group flex gap-3 items-center cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <BookOpen size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-700 group-hover:text-blue-600 transition-colors truncate">{tut.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{tut.description}</p>
                        </div>
                      </div>
                    ))}
                  {audienceTutorials.filter(tut => tut.id !== selectedTutorial.id && tut.category === selectedTutorial.category).length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">{t('tutorials.noOtherGuides', 'Não há outros guias nesta categoria.')}</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
