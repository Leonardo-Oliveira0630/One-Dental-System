import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Job, JobStatus, SectorMovement, Sector, UserRole } from '../../types';
import { 
  User, 
  Users, 
  Stethoscope, 
  Box, 
  FileText, 
  Clock, 
  AlertCircle, 
  Search, 
  X, 
  MapPin, 
  Layers, 
  ArrowRight, 
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const Kanban = () => {
  const { jobs, sectors, allUsers, currentOrg } = useApp();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SECTORS' | 'COLLABORATORS'>('ALL');

  // Filtra apenas os trabalhos ativos (não entregues e não cancelados)
  const allActiveJobs = useMemo(() => {
    return jobs.filter(
      job => job.status !== JobStatus.DELIVERED && job.status !== JobStatus.CANCELLED
    );
  }, [jobs]);

  // Helper para resolver o nome do setor
  const getSectorName = (sectorKey?: string): string => {
    if (!sectorKey || sectorKey === 'TRANSITION') return 'Setor de Transição';
    const found = sectors.find(
      s => s.id === sectorKey || s.name.toLowerCase() === sectorKey.toLowerCase()
    );
    return found ? found.name : sectorKey;
  };

  // Helper para obter os movimentos ativos (sem data de saída)
  const getJobActiveMovements = (job: Job): SectorMovement[] => {
    if (!job.sectorMovements || job.sectorMovements.length === 0) return [];
    return job.sectorMovements.filter(mov => !mov.exitTime);
  };

  // Helper completo para obter os setores e colaboradores atuais do caso (multi-setor)
  const getJobActiveSectorsInfo = (job: Job) => {
    const activeMovements = getJobActiveMovements(job);
    
    if (activeMovements.length > 0) {
      return activeMovements.map(mov => ({
        id: mov.id || Math.random().toString(),
        sectorKey: mov.sector,
        sectorName: getSectorName(mov.sector),
        entryUserName: mov.entryUserName || 'Colaborador não identificado',
        entryUserId: mov.entryUserId,
        entryTime: mov.entryTime ? new Date(mov.entryTime) : undefined,
      }));
    }

    // Se não houver movimento ativo registrado, mas houver currentSector
    if (job.currentSector && job.currentSector !== 'TRANSITION') {
      return [{
        id: 'current_sector',
        sectorKey: job.currentSector,
        sectorName: getSectorName(job.currentSector),
        entryUserName: undefined,
        entryUserId: undefined,
        entryTime: job.sectorEntryTime ? new Date(job.sectorEntryTime) : undefined,
      }];
    }

    // Transição / Triagem
    return [{
      id: 'transition',
      sectorKey: 'TRANSITION',
      sectorName: 'Setor de Transição',
      entryUserName: undefined,
      entryUserId: undefined,
      entryTime: undefined,
    }];
  };

  // Filtro de busca geral (Paciente, Dentista, Número de OS, Número de Caixa)
  const searchNormalized = searchTerm.trim().toLowerCase();

  const searchFilteredJobs = useMemo(() => {
    if (!searchNormalized) return [];
    
    return allActiveJobs.filter(job => {
      const matchPatient = (job.patientName || '').toLowerCase().includes(searchNormalized);
      const matchDentist = (job.dentistName || '').toLowerCase().includes(searchNormalized);
      const matchOs = (job.osNumber || '').toLowerCase().includes(searchNormalized) || 
                      job.id.toLowerCase().includes(searchNormalized);
      const matchBox = (job.boxNumber || '').toLowerCase().includes(searchNormalized);

      return matchPatient || matchDentist || matchOs || matchBox;
    });
  }, [allActiveJobs, searchNormalized]);

  // Lista de trabalhos a ser exibida nos Kanbans (se houver busca, filtra os quadros)
  const displayJobs = useMemo(() => {
    if (!searchNormalized) return allActiveJobs;
    return searchFilteredJobs;
  }, [allActiveJobs, searchFilteredJobs, searchNormalized]);

  // -------------------------------------------------------------
  // 1. AGRUPAMENTO POR SETORES (Container 1)
  // -------------------------------------------------------------
  const groupedJobsBySector = useMemo(() => {
    const groups: Record<string, { job: Job; movement?: SectorMovement }[]> = {
      'TRANSITION': []
    };

    sectors.forEach(sector => {
      groups[sector.id] = [];
    });

    displayJobs.forEach(job => {
      const activeMovements = getJobActiveMovements(job);

      if (activeMovements.length > 0) {
        let placedInAtLeastOne = false;

        activeMovements.forEach(mov => {
          // Procura pelo setor correspondente por ID ou Nome
          const matchedSector = sectors.find(
            s => s.id === mov.sector || s.name.toLowerCase() === mov.sector.toLowerCase()
          );

          if (matchedSector) {
            groups[matchedSector.id].push({ job, movement: mov });
            placedInAtLeastOne = true;
          }
        });

        if (!placedInAtLeastOne) {
          groups['TRANSITION'].push({ job, movement: activeMovements[0] });
        }
      } else if (job.currentSector && job.currentSector !== 'TRANSITION') {
        const matchedSector = sectors.find(
          s => s.id === job.currentSector || s.name.toLowerCase() === job.currentSector?.toLowerCase()
        );

        if (matchedSector) {
          groups[matchedSector.id].push({ job });
        } else {
          groups['TRANSITION'].push({ job });
        }
      } else {
        groups['TRANSITION'].push({ job });
      }
    });

    return groups;
  }, [displayJobs, sectors]);

  // -------------------------------------------------------------
  // 2. AGRUPAMENTO POR COLABORADORES (Container 2)
  // -------------------------------------------------------------
  // Lista de todos os colaboradores do laboratório
  const collaboratorsList = useMemo(() => {
    const labUsers = allUsers.filter(u => u.role !== UserRole.CLIENT);
    const map = new Map<string, { id: string; name: string }>();

    labUsers.forEach(u => {
      map.set(u.id, { id: u.id, name: u.name });
    });

    // Adiciona colaboradores que aparecem em movimentações ativas
    allActiveJobs.forEach(job => {
      const activeMovements = getJobActiveMovements(job);
      activeMovements.forEach(mov => {
        if (mov.entryUserName && !map.has(mov.entryUserId || mov.entryUserName)) {
          const key = mov.entryUserId || mov.entryUserName;
          map.set(key, {
            id: mov.entryUserId || key,
            name: mov.entryUserName
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, allActiveJobs]);

  const groupedJobsByCollaborator = useMemo(() => {
    const groups: Record<string, { job: Job; movements: SectorMovement[] }[]> = {
      'UNASSIGNED': []
    };

    collaboratorsList.forEach(collab => {
      groups[collab.id] = [];
    });

    displayJobs.forEach(job => {
      const activeMovements = getJobActiveMovements(job);

      if (activeMovements.length > 0) {
        // Mapeia os movimentos por colaborador
        const userMovementsMap = new Map<string, SectorMovement[]>();

        activeMovements.forEach(mov => {
          const collabKey = mov.entryUserId || 
            collaboratorsList.find(c => c.name.toLowerCase() === mov.entryUserName?.toLowerCase())?.id;

          if (collabKey && groups[collabKey]) {
            if (!userMovementsMap.has(collabKey)) {
              userMovementsMap.set(collabKey, []);
            }
            userMovementsMap.get(collabKey)!.push(mov);
          }
        });

        if (userMovementsMap.size > 0) {
          userMovementsMap.forEach((movs, collabKey) => {
            groups[collabKey].push({ job, movements: movs });
          });
        } else {
          groups['UNASSIGNED'].push({ job, movements: activeMovements });
        }
      } else {
        groups['UNASSIGNED'].push({ job, movements: [] });
      }
    });

    return groups;
  }, [displayJobs, collaboratorsList]);

  // Contadores para o cabeçalho
  const totalActiveCases = allActiveJobs.length;
  const inTransitionCount = (groupedJobsBySector['TRANSITION'] || []).length;
  const inSectorsCount = totalActiveCases - inTransitionCount;

  return (
    <div className="flex flex-col min-h-full bg-slate-50 p-3 md:p-6 pb-24 md:pb-12 print:hidden">
      
      {/* Header com Título e Estatísticas Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-[#00B8D9] h-7 w-7" />
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kanban de Produção</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Acompanhe o fluxo de casos em tempo real por setores e por colaboradores
          </p>
        </div>

        {/* Badges de Métricas */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">Total Ativos:</span>
            <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {totalActiveCases}
            </span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-xs font-bold text-slate-700">Em Setores:</span>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
              {inSectorsCount}
            </span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-xs font-bold text-slate-700">Em Transição:</span>
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
              {inTransitionCount}
            </span>
          </div>
        </div>
      </div>

      {/* CAMPO DE BUSCA PRINCIPAL */}
      <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200 shadow-sm mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquise por Paciente, Dentista, Nº da OS ou Nº da Caixa para ver setor e colaborador..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#00B8D9] rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dicas de Busca e Seletor de visualização */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <SlidersHorizontal size={13} className="text-[#00B8D9]" />
            <span>Busca instantânea com suporte a multi-setor e colaborador de entrada.</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ambos os Quadros
            </button>
            <button
              onClick={() => setActiveTab('SECTORS')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'SECTORS' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por Setores
            </button>
            <button
              onClick={() => setActiveTab('COLLABORATORS')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'COLLABORATORS' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por Colaboradores
            </button>
          </div>
        </div>

        {/* PAINEL DE RESULTADO DETALHADO DA BUSCA */}
        {searchTerm.trim() !== '' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-500 h-4 w-4" />
                <h3 className="text-sm font-bold text-slate-800">
                  Resultado da Localização Rápida ({searchFilteredJobs.length} {searchFilteredJobs.length === 1 ? 'caso encontrado' : 'casos encontrados'})
                </h3>
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
              >
                Limpar filtro
              </button>
            </div>

            {searchFilteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchFilteredJobs.map(job => {
                  const activeSectors = getJobActiveSectorsInfo(job);
                  const isMultiSector = activeSectors.length > 1;

                  return (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="bg-slate-50/80 hover:bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                    >
                      {/* Topo do Card de Busca */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          <FileText size={12} className="text-slate-400" />
                          OS #{job.osNumber || job.id.slice(-6).toUpperCase()}
                        </div>
                        {job.boxNumber && (
                          <div className="flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <Box size={12} />
                            Cx {job.boxNumber}
                          </div>
                        )}
                        {isMultiSector && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md border border-purple-200">
                            Multi-Setor ({activeSectors.length})
                          </span>
                        )}
                      </div>

                      {/* Paciente e Dentista */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-indigo-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-800 truncate">{job.patientName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-teal-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-600 truncate">{job.dentistName}</span>
                        </div>
                      </div>

                      {/* ONDE SE ENCONTRA: SETOR(ES) E COLABORADOR(ES) */}
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 space-y-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Localização Atual</span>
                          <ExternalLink size={11} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                        {activeSectors.map((sectorInfo) => (
                          <div 
                            key={sectorInfo.id} 
                            className="flex flex-col gap-1 pb-1.5 last:pb-0 border-b last:border-0 border-slate-100 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <MapPin size={13} className="text-red-500 shrink-0" />
                                <span className="text-xs">{sectorInfo.sectorName}</span>
                              </div>
                              {sectorInfo.entryTime && (
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <Clock size={10} />
                                  {format(sectorInfo.entryTime, "dd/MM 'às' HH:mm")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pl-4 text-xs">
                              <span className="text-slate-400 text-[11px]">Colaborador:</span>
                              {sectorInfo.entryUserName ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[11px]">
                                  {sectorInfo.entryUserName}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                                  <AlertCircle size={11} /> Sem colaborador ativo
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">Nenhum caso encontrado para "{searchTerm}"</p>
                <p className="text-xs text-slate-400 mt-1">Verifique a ortografia do paciente, dentista, número da OS ou número da caixa.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONTAINER 1: KANBAN POR SETORES */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'ALL' || activeTab === 'SECTORS') && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <MapPin size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">1. Fluxo por Setores</h2>
                <p className="text-xs text-slate-500 font-medium">Visualização por bancadas e etapas de produção do laboratório</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {sectors.length + 1} Colunas
            </span>
          </div>

          <div className="overflow-x-auto pb-4 pt-1 kanban-scrollbar">
            <div className="flex gap-4 items-start min-w-max">
              {/* Setor de Transição */}
              <SectorColumn
                title="Setor de Transição"
                description="Casos aguardando entrada em setor"
                items={groupedJobsBySector['TRANSITION'] || []}
                isTransition={true}
                navigate={navigate}
              />

              {/* Setores Customizados */}
              {sectors.map(sector => (
                <SectorColumn
                  key={sector.id}
                  title={sector.name}
                  items={groupedJobsBySector[sector.id] || []}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTAINER 2: KANBAN POR COLABORADORES */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'ALL' || activeTab === 'COLLABORATORS') && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">2. Casos por Colaboradores</h2>
                <p className="text-xs text-slate-500 font-medium">Visualização dos casos sob responsabilidade de cada profissional</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {collaboratorsList.length + 1} Colunas
            </span>
          </div>

          <div className="overflow-x-auto pb-4 pt-1 kanban-scrollbar">
            <div className="flex gap-4 items-start min-w-max">
              {/* Coluna Sem Colaborador / Não Atribuídos */}
              <CollaboratorColumn
                title="Sem Colaborador Ativo"
                subtitle="Aguardando início por técnico"
                items={groupedJobsByCollaborator['UNASSIGNED'] || []}
                isUnassigned={true}
                getSectorName={getSectorName}
                navigate={navigate}
              />

              {/* Colunas de cada Colaborador */}
              {collaboratorsList.map(collab => (
                <CollaboratorColumn
                  key={collab.id}
                  title={collab.name}
                  items={groupedJobsByCollaborator[collab.id] || []}
                  getSectorName={getSectorName}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// -------------------------------------------------------------
// COMPONENTE: COLUNA DE SETOR (CONTAINER 1)
// -------------------------------------------------------------
const SectorColumn = ({
  title,
  description,
  items,
  isTransition = false,
  navigate,
}: {
  title: string;
  description?: string;
  items: { job: Job; movement?: SectorMovement }[];
  isTransition?: boolean;
  navigate: (path: string) => void;
}) => {
  return (
    <div className={`flex flex-col w-80 shrink-0 rounded-2xl border min-h-[420px] max-h-[680px] ${
      isTransition 
        ? 'bg-slate-100/90 border-slate-300/80 border-dashed' 
        : 'bg-slate-100 border-slate-200'
    }`}>
      {/* Header da Coluna */}
      <div className={`p-3.5 shrink-0 rounded-t-2xl border-b ${
        isTransition 
          ? 'bg-slate-200/60 border-slate-200' 
          : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-2.5 h-2.5 rounded-full ${isTransition ? 'bg-amber-500' : 'bg-blue-600'} shrink-0`}></span>
            <h3 className="font-bold text-slate-800 text-sm truncate" title={title}>{title}</h3>
          </div>
          <span className="bg-white border border-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-lg shadow-2xs">
            {items.length}
          </span>
        </div>
        {description && (
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{description}</p>
        )}
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-scrollbar">
        {items.map(({ job, movement }) => {
          return (
            <div
              key={`${job.id}-${movement?.id || 'base'}`}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
            >
              {/* Header do Card: OS e Caixa */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  <FileText size={12} className="text-slate-400" />
                  OS #{job.osNumber || job.id.slice(-6).toUpperCase()}
                </div>
                {job.boxNumber && (
                  <div className="flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    <Box size={12} className="text-blue-500" />
                    Cx {job.boxNumber}
                  </div>
                )}
              </div>

              {/* Informações Principais: Dentista e Paciente */}
              <div className="space-y-1 mb-2.5">
                <div className="flex items-start gap-1.5">
                  <User size={13} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-800 line-clamp-1">{job.patientName}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Stethoscope size={13} className="text-teal-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-600 line-clamp-1">{job.dentistName}</span>
                </div>
              </div>

              {/* Rodapé: Colaborador e Horário de Entrada */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                {movement?.entryUserName ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-200">
                      {movement.entryUserName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{movement.entryUserName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
                    <AlertCircle size={11} /> Sem colaborador ativo
                  </div>
                )}

                {movement?.entryTime && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 pl-0.5">
                    <Clock size={10} />
                    Entrada: {format(new Date(movement.entryTime), "dd/MM 'às' HH:mm")}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 opacity-60">
            <Box size={22} className="text-slate-300" />
            <span className="text-xs font-bold text-center">Nenhum caso</span>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// COMPONENTE: COLUNA DE COLABORADOR (CONTAINER 2)
// -------------------------------------------------------------
const CollaboratorColumn = ({
  title,
  subtitle,
  items,
  isUnassigned = false,
  getSectorName,
  navigate,
}: {
  title: string;
  subtitle?: string;
  items: { job: Job; movements: SectorMovement[] }[];
  isUnassigned?: boolean;
  getSectorName: (key?: string) => string;
  navigate: (path: string) => void;
}) => {
  return (
    <div className={`flex flex-col w-80 shrink-0 rounded-2xl border min-h-[420px] max-h-[680px] ${
      isUnassigned 
        ? 'bg-slate-100/90 border-slate-300/80 border-dashed' 
        : 'bg-slate-100 border-slate-200'
    }`}>
      {/* Header da Coluna */}
      <div className={`p-3.5 shrink-0 rounded-t-2xl border-b ${
        isUnassigned 
          ? 'bg-slate-200/60 border-slate-200' 
          : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 ${
              isUnassigned 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}>
              {isUnassigned ? '?' : title.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-bold text-slate-800 text-sm truncate" title={title}>{title}</h3>
          </div>
          <span className="bg-white border border-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-lg shadow-2xs">
            {items.length}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{subtitle}</p>
        )}
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-scrollbar">
        {items.map(({ job, movements }) => {
          // Obtém os setores ativos deste caso sob este colaborador
          const activeSectors = movements.length > 0
            ? movements.map(m => ({
                name: getSectorName(m.sector),
                time: m.entryTime ? new Date(m.entryTime) : undefined,
              }))
            : [{
                name: job.currentSector ? getSectorName(job.currentSector) : 'Setor de Transição',
                time: job.sectorEntryTime ? new Date(job.sectorEntryTime) : undefined,
              }];

          return (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group"
            >
              {/* Header do Card: OS e Caixa */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  <FileText size={12} className="text-slate-400" />
                  OS #{job.osNumber || job.id.slice(-6).toUpperCase()}
                </div>
                {job.boxNumber && (
                  <div className="flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    <Box size={12} className="text-blue-500" />
                    Cx {job.boxNumber}
                  </div>
                )}
              </div>

              {/* Informações Principais: Dentista e Paciente */}
              <div className="space-y-1 mb-2.5">
                <div className="flex items-start gap-1.5">
                  <User size={13} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-800 line-clamp-1">{job.patientName}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Stethoscope size={13} className="text-teal-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-600 line-clamp-1">{job.dentistName}</span>
                </div>
              </div>

              {/* Rodapé: SETORES QUE ESTE COLABORADOR ESTÁ EXECUTANDO (Sem repetir o nome do colaborador) */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                {activeSectors.map((sectorItem, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      <MapPin size={11} className="text-red-500 shrink-0" />
                      <span className="truncate">{sectorItem.name}</span>
                    </div>

                    {sectorItem.time && (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {format(sectorItem.time, "HH:mm")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 opacity-60">
            <Users size={22} className="text-slate-300" />
            <span className="text-xs font-bold text-center">Nenhum caso ativo</span>
          </div>
        )}
      </div>
    </div>
  );
};
