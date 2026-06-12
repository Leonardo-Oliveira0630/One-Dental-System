import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Edit, Trash2, Video, Image as ImageIcon, 
  HelpCircle, ChevronLeft, ChevronRight, Save, PlusCircle, 
  Trash, ArrowUp, ArrowDown, Sparkles 
} from 'lucide-react';
import { subscribeTutorials, apiAddTutorial, apiUpdateTutorial, apiDeleteTutorial } from '../../services/firebaseService';
import { Tutorial, TutorialStep } from '../../types';

export const Tutorials = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [activeAudience, setActiveAudience] = useState<'LAB' | 'CLINIC'>('LAB');
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [writtenContent, setWrittenContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSubtitle, setVideoSubtitle] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);

  // Step adding form states
  const [currentStepTitle, setCurrentStepTitle] = useState('');
  const [currentStepDesc, setCurrentStepDesc] = useState('');
  const [currentStepImg, setCurrentStepImg] = useState('');

  useEffect(() => {
    const unsub = subscribeTutorials((data) => {
      setTutorials(data.sort((a, b) => a.orderIndex - b.orderIndex));
    });
    return () => unsub();
  }, []);

  const openNewTutorialModal = () => {
    setEditingTutorial(null);
    setTitle('');
    setDescription('');
    setCategory('Básico');
    setWrittenContent('');
    setVideoUrl('');
    setVideoSubtitle('');
    setOrderIndex(tutorials.length + 1);
    setSteps([]);
    setIsModalOpen(true);
  };

  const openEditTutorialModal = (t: Tutorial) => {
    setEditingTutorial(t);
    setTitle(t.title);
    setDescription(t.description);
    setCategory(t.category);
    setWrittenContent(t.writtenContent || '');
    setVideoUrl(t.videoUrl || '');
    setVideoSubtitle(t.videoSubtitle || '');
    setOrderIndex(t.orderIndex);
    setSteps(t.steps || []);
    setIsModalOpen(true);
  };

  const handleAddStep = () => {
    if (!currentStepTitle.trim()) {
      alert('O título do slide/imagem é obrigatório.');
      return;
    }
    const newStep: TutorialStep = {
      title: currentStepTitle,
      description: currentStepDesc,
      imageUrl: currentStepImg.trim() || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60'
    };
    setSteps([...steps, newStep]);
    setCurrentStepTitle('');
    setCurrentStepDesc('');
    setCurrentStepImg('');
  };

  const handleRemoveStep = (indexIn: number) => {
    setSteps(steps.filter((_, i) => i !== indexIn));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      const temp = newSteps[index];
      newSteps[index] = newSteps[targetIndex];
      newSteps[targetIndex] = temp;
      setSteps(newSteps);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category.trim()) {
      alert('Título e Categoria são obrigatórios.');
      return;
    }

    const tId = editingTutorial ? editingTutorial.id : `tutorial_${Date.now()}`;
    const targetTutorial: Tutorial = {
      id: tId,
      title,
      description,
      category,
      targetAudience: activeAudience,
      writtenContent,
      videoUrl,
      videoSubtitle,
      orderIndex: Number(orderIndex),
      steps
    };

    try {
      if (editingTutorial) {
        await apiUpdateTutorial(editingTutorial.id, targetTutorial);
      } else {
        await apiAddTutorial(targetTutorial);
      }
      setIsModalOpen(false);
      setEditingTutorial(null);
    } catch (err: any) {
      alert('Erro ao salvar tutorial: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tutorial?')) {
      try {
        await apiDeleteTutorial(id);
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const seedSampleTutorials = async () => {
    const samples: Tutorial[] = [
      {
        id: 'sample_lab_1',
        title: 'Como Cadastrar e Acompanhar Casos Clínicos',
        description: 'Aprenda o passo a passo para lançar novas ordens de serviço e monitorar as etapas de produção.',
        category: 'Trabalhos',
        targetAudience: 'LAB',
        writtenContent: 'Para iniciar a produção de qualquer prótese, você deve criar uma Ordem de Serviço (Caso). Preencha o nome do paciente, selecione o dentista solicitante, os dentes envolvidos, as especificações de material e a cor (Escala Vita ou 3D Master). Você pode anexar fotos/arquivos de escaneamento STL diretamente.',
        orderIndex: 1,
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        videoSubtitle: 'Acompanhando o fluxo de trabalho digital do cadastro até a entrega.',
        steps: [
          {
            title: 'Clique em Novo Caso',
            description: 'No menu principal, acesse a aba "Novo Caso" para abrir o formulário.',
            imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=60'
          },
          {
            title: 'Preencha os Campos Clínicos',
            description: 'Selecione o paciente, o dentista responsável, a data de entrega prometida e a cor desejada.',
            imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=60'
          },
          {
            title: 'Envie para a Produção',
            description: 'Depois de salvar, o trabalho irá aparecer na sua aba de "Trabalhos" com o status "A Iniciar".',
            imageUrl: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&auto=format&fit=crop&q=60'
          }
        ]
      },
      {
        id: 'sample_clinic_1',
        title: 'Como Organizar Sua Agenda de Consultas',
        description: 'Monte e gerencie a agenda diária ou semanal da sua clínica, otimizando as salas e os cirurgiões-dentistas.',
        category: 'Agenda',
        targetAudience: 'CLINIC',
        writtenContent: 'O gerenciamento refinado da agenda evita salas ociosas e conflito de horários entre profissionais. No menu "Agenda" você pode visualizar compromissos por dia, semana ou por sala de atendimento de forma totalmente colorida.',
        orderIndex: 1,
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        videoSubtitle: 'Fazendo o agendamento de uma consulta e associando à sala e ao dentista responsável.',
        steps: [
          {
            title: 'Abra a Agenda',
            description: 'Clique no botão "Agenda" no menu lateral para visualizar os horários disponíveis.',
            imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=60'
          },
          {
            title: 'Selecione o Horário',
            description: 'Clique no quadrante de hora desejado e digite o nome do paciente já cadastrado.',
            imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60'
          }
        ]
      }
    ];

    try {
      for (const sample of samples) {
        await apiAddTutorial(sample);
      }
      alert('Tutoriais de demonstração criados com sucesso!');
    } catch (e: any) {
      alert('Erro ao criar demonstração: ' + e.message);
    }
  };

  const filtered = tutorials.filter(t => t.targetAudience === activeAudience);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            Central de Tutoriais
          </h1>
          <p className="text-slate-500 text-sm">Crie, edite e alimente os guias interativos para Laboratórios e Clínicas Odontológicas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={seedSampleTutorials}
            className="px-4 py-2 border border-dashed border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold rounded-2xl text-xs transition-all flex items-center gap-1"
          >
            <Sparkles size={14} /> Gerar Demonstrativos
          </button>
          <button
            onClick={openNewTutorialModal}
            className="px-5 py-2.5 bg-blue-600 text-white font-black text-xs hover:bg-blue-700 rounded-2xl tracking-wide shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> NOVO TUTORIAL
          </button>
        </div>
      </div>

      {/* Target Audience Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveAudience('LAB')}
          className={`flex-1 py-4 px-6 text-center font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeAudience === 'LAB' 
              ? 'border-blue-600 text-blue-600 font-extrabold bg-blue-50/20' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          SISTEMA DE LABORATÓRIO ({tutorials.filter(t => t.targetAudience === 'LAB').length})
        </button>
        <button
          onClick={() => setActiveAudience('CLINIC')}
          className={`flex-1 py-4 px-6 text-center font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeAudience === 'CLINIC' 
              ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/20' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          SISTEMA DE CLÍNICA / DENTISTA ({tutorials.filter(t => t.targetAudience === 'CLINIC').length})
        </button>
      </div>

      {/* Tutorials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  {t.category}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  Ordem: #{t.orderIndex}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg mb-2">{t.title}</h3>
              <p className="text-slate-500 text-xs line-clamp-3 mb-4 leading-relaxed">{t.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {t.steps && t.steps.length > 0 && (
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    <ImageIcon size={10} /> {t.steps.length} Slides
                  </span>
                )}
                {t.videoUrl && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    <Video size={10} /> Vídeo
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2 flex justify-between items-center">
              <button 
                onClick={() => openEditTutorialModal(t)}
                className="text-slate-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Edit size={14} /> Editar
              </button>
              <button 
                onClick={() => handleDelete(t.id)}
                className="text-red-400 hover:text-red-600 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-slate-50 p-12 text-center rounded-3xl border-2 border-dashed border-slate-200">
            <HelpCircle size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold text-sm">Nenhum tutorial criado para {activeAudience === 'LAB' ? 'Laboratórios' : 'Clínicas'}.</p>
            <p className="text-slate-400 text-xs mt-1">Clique em "Novo Tutorial" ou "Gerar Demonstrativos" para começar.</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in duration-300">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg tracking-tight">
                  {editingTutorial ? 'EDITAR TUTORIAL' : 'CRIAR NOVO TUTORIAL'}
                </h3>
                <p className="text-slate-400 text-[10px] tracking-widest uppercase font-black mt-1">Plataforma: {activeAudience === 'LAB' ? 'Laboratório' : 'Clínica'}</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingTutorial(null); }}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Título do Tutorial</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Como configurar o estoque de dentes de acrílico"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Ex: Financeiro, Produção, Almoxarifado"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Pequena descrição (Subtítulo)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Resumo em 2 ou 3 linhas sobre o que este tutorial ensina."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Posição de Ordenação</label>
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={e => setOrderIndex(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">URL do Vídeo (MP4, YouTube, Vimeo, etc.)</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://vjs.zencdn.net/v/oceans.mp4"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Legenda Explicativa do Vídeo</label>
                <input
                  type="text"
                  value={videoSubtitle}
                  onChange={e => setVideoSubtitle(e.target.value)}
                  placeholder="Descreva brevemente o que se passará no vídeo ou insira uma legenda descritiva."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Texto Explicativo Detalhado (Manual Escrito)</label>
                <textarea
                  value={writtenContent}
                  onChange={e => setWrittenContent(e.target.value)}
                  placeholder="Descreva de forma lógica e completa o circuito de ações. Você pode usar detalhes de cada clique."
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Slider Carousels (Steps) Section */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-500" /> Slides do Carrossel de Imagens ({steps.length})
                  </span>
                </div>

                {steps.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                    {steps.map((st, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm relative flex gap-3 items-start">
                        <img 
                          src={st.imageUrl} 
                          alt={st.title} 
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="flex-1 min-w-0 pr-12">
                          <p className="font-extrabold text-[13px] text-slate-800 truncate">#{i + 1}: {st.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{st.description}</p>
                        </div>
                        <div className="absolute right-2 top-2 flex flex-col gap-1">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveStep(i)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                            title="Remover slide"
                          >
                            <Trash size={14} />
                          </button>
                          <div className="flex gap-1">
                            <button 
                              type="button" 
                              disabled={i === 0}
                              onClick={() => moveStep(i, 'up')}
                              className="p-1 bg-slate-50 hover:bg-slate-100 border text-slate-500 rounded disabled:opacity-30"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button 
                              type="button" 
                              disabled={i === steps.length - 1}
                              onClick={() => moveStep(i, 'down')}
                              className="p-1 bg-slate-50 hover:bg-slate-100 border text-slate-500 rounded disabled:opacity-30"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adding new slide form */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Adicionar Slide Sequencial (Imagens do Passo a Passo)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Título do Passo (Ex: Clique em Salvar)"
                      value={currentStepTitle}
                      onChange={e => setCurrentStepTitle(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="URL da Imagem Ilustrativa do Sistema"
                      value={currentStepImg}
                      onChange={e => setCurrentStepImg(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Descrição detalhada sobre onde clicar e o que essa imagem ilustra..."
                      value={currentStepDesc}
                      onChange={e => setCurrentStepDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                    >
                      <PlusCircle size={14} /> ADICIONAR SLIDE AO CARROSSEL
                    </button>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingTutorial(null); }}
                  className="px-5 py-3 bg-slate-100 text-slate-500 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl tracking-wide shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Save size={14} /> SALVAR TUTORIAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
