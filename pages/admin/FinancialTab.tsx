
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, Info, CreditCard, Loader2, Wallet, Save, 
  Building2, MapPin, User, Phone, Mail, Calendar, DollarSign, FileText, ExternalLink, Key, Check, AlertCircle, Trash2,
  // Added missing icons to resolve "Cannot find name 'Clock'" and "Cannot find name 'Plus'" errors
  Clock, Plus
} from 'lucide-react';

export const FinancialTab = () => {
  const { currentOrg, updateOrganization, createLabWallet } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupMode, setSetupMode] = useState<'CHOICE' | 'MANUAL' | 'CREATE'>('CHOICE');

  // Estados Manuais (PIX/Banco direto)
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Estado para inserção manual da Wallet do Asaas
  const [manualAsaasKey, setManualAsaasKey] = useState('');

  // Estados KYC (Para Conta Digital Asaas)
  const [kycData, setKycData] = useState({
    name: currentOrg?.name || '',
    email: '',
    cpfCnpj: '',
    birthDate: '',
    companyType: 'INDIVIDUAL', 
    phone: '',
    mobilePhone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '', 
    incomeValue: ''
  });

  const handleKycChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setKycData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycData.cpfCnpj || !currentOrg) return;
    
    setIsSubmitting(true);
    try {
        const payload = {
            orgId: currentOrg.id,
            accountData: {
                ...kycData,
                cpfCnpj: kycData.cpfCnpj.replace(/\D/g, ''),
                postalCode: kycData.postalCode.replace(/\D/g, ''),
                incomeValue: parseFloat(kycData.incomeValue) || 0
            }
        };
        await createLabWallet(payload);
        alert("Solicitação de abertura de conta enviada ao Asaas!");
    } catch (err: any) {
        alert("Erro: " + (err.message || "Falha ao criar conta."));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLinkManualAsaas = async () => {
      if (!manualAsaasKey.trim() || !currentOrg) return;
      setIsSubmitting(true);
      try {
          await updateOrganization(currentOrg.id, {
              financialSettings: {
                  ...currentOrg.financialSettings,
                  asaasWalletId: manualAsaasKey.trim(),
                  asaasWalletStatus: 'APPROVED'
              }
          });
          alert("Conta Asaas vinculada com sucesso!");
          setSetupMode('CHOICE');
      } catch (err) {
          alert("Erro ao vincular conta.");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleRemoveAsaas = async () => {
    if (!currentOrg || !window.confirm("Tem certeza que deseja remover a conta Asaas? O split de pagamentos deixará de funcionar.")) return;
    setIsSubmitting(true);
    try {
        await updateOrganization(currentOrg.id, {
            financialSettings: {
                ...currentOrg.financialSettings,
                asaasWalletId: "",
                asaasWalletStatus: ""
            }
        });
        alert("Configuração removida.");
    } catch (err) {
        alert("Erro ao remover.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveManual = async () => {
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: { 
            ...currentOrg.financialSettings, 
            pixKey, 
            bankInfo, 
            paymentLink 
          }
      });
      alert("Configurações manuais salvas!");
  };

  const asaasWalletId = currentOrg?.financialSettings?.asaasWalletId;
  const asaasStatus = currentOrg?.financialSettings?.asaasWalletStatus || 'Não Criada';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CONTA DIGITAL ASAAS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" /> Recebimento Automático (Asaas)
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Configure sua conta para receber pagamentos via Cartão e PIX direto na sua carteira.</p>
              </div>
              {asaasWalletId && (
                <div className={`px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 ${asaasStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    {asaasStatus === 'APPROVED' ? <Check size={14}/> : <Clock size={14}/>}
                    {asaasStatus === 'PENDING' ? 'ANÁLISE PENDENTE NO ASAAS' : asaasStatus.toUpperCase()}
                </div>
              )}
          </div>

          {!asaasWalletId ? (
              <div className="animate-in fade-in duration-300">
                  {setupMode === 'CHOICE' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <button 
                            onClick={() => setSetupMode('CREATE')}
                            className="p-8 border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                          >
                              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Plus size={24} />
                              </div>
                              <h4 className="font-bold text-lg text-slate-800">Criar Nova Conta</h4>
                              <p className="text-sm text-slate-500 mt-2">Ainda não possuo conta no Asaas e quero criar uma subconta integrada para faturar meus pedidos.</p>
                          </button>

                          <button 
                            onClick={() => setSetupMode('MANUAL')}
                            className="p-8 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group"
                          >
                              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Key size={24} />
                              </div>
                              <h4 className="font-bold text-lg text-slate-800">Já possuo conta Asaas</h4>
                              <p className="text-sm text-slate-500 mt-2">Já tenho acesso ao Asaas e quero apenas vincular minha API Key para que o sistema direcione os pagamentos.</p>
                          </button>
                      </div>
                  )}

                  {setupMode === 'MANUAL' && (
                      <div className="space-y-6 max-w-xl">
                          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 items-start">
                              <Info className="text-indigo-600 shrink-0 mt-1" size={20} />
                              <div className="text-xs text-indigo-800 leading-relaxed">
                                  <p className="font-bold mb-1 uppercase">Como obter sua chave:</p>
                                  Acesse seu painel Asaas, vá em <strong>Configurações da Conta > Integrações</strong> e gere uma nova Chave de API. Copie e cole abaixo para que o sistema possa realizar o split.
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sua API Key do Asaas (Wallet ID)</label>
                              <div className="flex gap-2">
                                  <input 
                                    value={manualAsaasKey}
                                    onChange={e => setManualAsaasKey(e.target.value)}
                                    placeholder="Ex: $a.as.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                  />
                              </div>
                          </div>

                          <div className="flex gap-3">
                               <button onClick={() => setSetupMode('CHOICE')} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
                               <button 
                                onClick={handleLinkManualAsaas} 
                                disabled={isSubmitting || !manualAsaasKey}
                                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                               >
                                   {isSubmitting ? <Loader2 className="animate-spin" /> : <><Check size={20}/> VINCULAR MINHA CONTA</>}
                               </button>
                          </div>
                      </div>
                  )}

                  {setupMode === 'CREATE' && (
                      <form onSubmit={handleCreateWallet} className="space-y-6">
                          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 items-start mb-6">
                              <Info className="text-blue-600 shrink-0 mt-1" size={20} />
                              <div className="text-xs text-blue-800 leading-relaxed">
                                  <p className="font-bold mb-1 uppercase">Processo de Abertura:</p>
                                  Preencha os dados abaixo. Eles serão enviados ao Asaas para criação automática da sua subconta. Após o envio, a conta passará por uma análise de segurança de até 48h.
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Razão Social / Nome Completo</label>
                                  <div className="relative">
                                      <Building2 className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input name="name" required value={kycData.name} onChange={handleKycChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">CPF ou CNPJ</label>
                                  <div className="relative">
                                      <FileText className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input name="cpfCnpj" required value={kycData.cpfCnpj} onChange={handleKycChange} placeholder="Apenas números" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Tipo de Empresa</label>
                                  <select name="companyType" value={kycData.companyType} onChange={handleKycChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                      <option value="INDIVIDUAL">Pessoa Física / MEI</option>
                                      <option value="LIMITED">LTDA / Empresa</option>
                                      <option value="ASSOCIATION">Associação / ONG</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Data de Nascimento (Se PF)</label>
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input type="date" name="birthDate" value={kycData.birthDate} onChange={handleKycChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">E-mail Administrativo</label>
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input type="email" name="email" required value={kycData.email} onChange={handleKycChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Telefone Fixo</label>
                                  <div className="relative">
                                      <Phone className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input name="phone" value={kycData.phone} onChange={handleKycChange} placeholder="(00) 0000-0000" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Celular / WhatsApp</label>
                                  <div className="relative">
                                      <Phone className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input name="mobilePhone" required value={kycData.mobilePhone} onChange={handleKycChange} placeholder="(00) 90000-0000" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Faturamento Mensal Est.</label>
                                  <div className="relative">
                                      <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input type="number" name="incomeValue" required value={kycData.incomeValue} onChange={handleKycChange} placeholder="Ex: 5000" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>

                              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                                  <div className="md:col-span-1">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">CEP</label>
                                      <div className="relative">
                                          <MapPin className="absolute left-3 top-3 text-slate-400" size={18}/>
                                          <input name="postalCode" required value={kycData.postalCode} onChange={handleKycChange} placeholder="00000-000" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                      </div>
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Logradouro / Rua</label>
                                      <input name="address" required value={kycData.address} onChange={handleKycChange} placeholder="Av. Paulista, etc" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Número</label>
                                      <input name="addressNumber" required value={kycData.addressNumber} onChange={handleKycChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Complemento</label>
                                      <input name="complement" value={kycData.complement} onChange={handleKycChange} placeholder="Sala 12, etc" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Bairro</label>
                                      <input name="province" required value={kycData.province} onChange={handleKycChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-4 pt-4">
                              <button onClick={() => setSetupMode('CHOICE')} className="px-6 py-2 font-bold text-slate-500">Voltar</button>
                              <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70">
                                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard /> SOLICITAR ABERTURA DE CONTA DIGITAL</>}
                              </button>
                          </div>
                      </form>
                  )}
              </div>
          ) : (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck size={40} />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mb-2">Sua Conta Digital está Vinculada!</h4>
                  <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                      O sistema já está apto a processar pagamentos e realizar o split automático da comissão da plataforma.
                  </p>
                  <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 w-full max-w-lg text-left relative group">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">API Key / ID da Carteira (Confidencial):</p>
                      <p className="font-mono text-sm font-bold text-slate-700 break-all pr-12">
                          {asaasWalletId.substring(0, 10)}**********************************
                      </p>
                      <button 
                        onClick={handleRemoveAsaas}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remover Vinculação"
                      >
                          <Trash2 size={20} />
                      </button>
                  </div>
                  <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="mt-6 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                      Acessar Painel Asaas <ExternalLink size={12}/>
                  </a>
              </div>
          )}
      </div>

      {/* RECEBIMENTOS MANUAIS (OFFLINE) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Wallet className="text-green-600" /> Recebimentos Diretos (Offline)
              </h3>
              <p className="text-sm text-slate-500">Dados exibidos apenas como instrução no faturamento manual para dentistas.</p>
          </div>
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Sua Chave PIX Principal</label>
                      <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Ex: e-mail, celular ou chave aleatória" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento Externo</label>
                      <input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="Mercado Pago, PicPay, etc" />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Instruções para Transferência Bancária</label>
                  <textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" rows={3} placeholder="Banco, Agência, Conta, Nome do Titular..." />
              </div>
              <div className="pt-4 border-t flex justify-end">
                  <button onClick={handleSaveManual} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95">
                    <Save size={18}/> SALVAR CONFIGURAÇÕES MANUAIS
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
