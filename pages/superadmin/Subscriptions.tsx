
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, Filter, CheckCircle, XCircle, Pause, Play, 
  MoreVertical, ExternalLink, Mail, Building2, Calendar,
  AlertTriangle, Clock, Activity
} from 'lucide-react';
import { Organization, SubscriptionPlan } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Subscriptions: React.FC = () => {
  const { allOrganizations, allPlans, updateOrganization, setSubscriptionStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOrgs = allOrganizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || org.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPlanName = (planId: string) => {
    return allPlans.find(p => p.id === planId)?.name || 'Plano não encontrado';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'TRIAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'OVERDUE': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FREE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TEST': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'TRIAL': return <Clock className="w-4 h-4" />;
      case 'OVERDUE': return <AlertTriangle className="w-4 h-4" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      case 'PENDING': return <Pause className="w-4 h-4" />;
      case 'FREE': return <CheckCircle className="w-4 h-4" />;
      case 'TEST': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleToggleStatus = async (org: Organization, targetStatus?: string) => {
    const newStatus = targetStatus || (org.subscriptionStatus === 'ACTIVE' ? 'PENDING' : 'ACTIVE');
    try {
      if (['FREE', 'TEST', 'CANCELLED'].includes(newStatus)) {
         await setSubscriptionStatus(org.id, newStatus);
      } else {
         await updateOrganization(org.id, { subscriptionStatus: newStatus as any });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Assinaturas</h1>
          <p className="text-gray-500">Acompanhe e controle o acesso das organizações</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar organização..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="TRIAL">Trial</option>
            <option value="PENDING">Pendentes</option>
            <option value="OVERDUE">Inadimplentes</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrgs.map(org => (
          <div key={org.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Building2 className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{org.name}</h3>
                    <p className="text-xs text-gray-500">{org.orgType === 'LAB' ? 'Laboratório' : 'Clínica'}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusColor(org.subscriptionStatus)}`}>
                  {getStatusIcon(org.subscriptionStatus)}
                  {org.subscriptionStatus}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-medium">Plano</p>
                  <p className="text-sm font-medium text-gray-700">{getPlanName(org.planId)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-medium">Desde</p>
                  <p className="text-sm font-medium text-gray-700">
                    {org.createdAt && !isNaN(new Date(org.createdAt).getTime()) ? format(new Date(org.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </p>
                </div>
              </div>

              {org.orgType === 'CLINIC' && (
                <div className="p-3 bg-teal-50/50 border border-teal-150 rounded-lg space-y-2 mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-teal-850 uppercase tracking-wider flex items-center gap-1">
                      <Activity className="w-3 h-3 text-teal-600 animate-pulse" /> Registro CRO de Dentista
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      org.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {org.isApproved ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-650 space-y-0.5 font-medium">
                    <p><strong>CRO:</strong> {org.croUf || 'N/A'} - {org.croNumero || 'N/A'} ({org.croCategoria || 'CD'})</p>
                    <p>
                      <strong>Verificação Pública:</strong>{' '}
                      <span className={org.croValid ? 'text-emerald-700' : 'text-amber-700'}>
                        {org.croValid ? 'Validado via API' : 'Não localizado / Não validado'}
                      </span>
                    </p>
                  </div>
                  
                  <button
                    onClick={async () => {
                      try {
                        await updateOrganization(org.id, { isApproved: !org.isApproved });
                      } catch (err) {
                        console.error("Erro ao aprovar/reprovar organização clinic:", err);
                      }
                    }}
                    className={`w-full text-center py-1.5 rounded text-[11px] font-bold transition-all border ${
                      org.isApproved 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                    }`}
                  >
                    {org.isApproved ? 'Revogar Aprovação CRO' : 'Aprovar Manualmente'}
                  </button>
                </div>
              )}

              {org.trialEndsAt && !isNaN(new Date(org.trialEndsAt).getTime()) && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>Trial termina em: {format(new Date(org.trialEndsAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleToggleStatus(org)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      org.subscriptionStatus === 'ACTIVE'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    {org.subscriptionStatus === 'ACTIVE' ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Liberar
                      </>
                    )}
                  </button>
                  
                  {org.subscriptionStatus !== 'CANCELLED' && (
                    <button
                      onClick={() => handleToggleStatus(org, 'CANCELLED')}
                      className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                      title="Cancelar Assinatura"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  
                  {org.subscriptionStatus !== 'FREE' && (
                    <button
                      onClick={() => handleToggleStatus(org, 'FREE')}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors"
                      title="Tornar Conta Grátis"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}

                  {org.subscriptionStatus !== 'TEST' && (
                    <button
                      onClick={() => handleToggleStatus(org, 'TEST')}
                      className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm font-medium transition-colors"
                      title="Marcar como Conta Teste"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="pt-4 border-t border-gray-100 mt-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700 uppercase tracking-widest">Split Customizado</span>
                    <span className="text-gray-500 font-mono">
                      {org.financialSettings?.customSplitPercent !== undefined 
                        ? `${org.financialSettings.customSplitPercent}%` 
                        : 'Padrão do Plano'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="0" max="100" step="0.01"
                      placeholder="%"
                      className="w-16 px-2 py-1 text-xs border rounded-md"
                      id={`split-input-${org.id}`}
                    />
                    <button 
                      onClick={async () => {
                        const input = document.getElementById(`split-input-${org.id}`) as HTMLInputElement;
                        if (input && input.value !== '') {
                          const val = parseFloat(input.value);
                          await updateOrganization(org.id, {
                            financialSettings: {
                              ...org.financialSettings,
                              customSplitPercent: val
                            }
                          });
                          input.value = '';
                        }
                      }}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-md border border-amber-300"
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={async () => {
                         const patch: any = { financialSettings: { ...org.financialSettings } };
                         patch.financialSettings.customSplitPercent = null;
                         await updateOrganization(org.id, patch);
                      }}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-md border border-gray-300"
                    >
                      Reset
                    </button>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhuma organização encontrada</h3>
          <p className="text-gray-500">Tente ajustar seus filtros de busca</p>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
