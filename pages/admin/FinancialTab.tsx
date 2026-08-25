import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, Info, CreditCard, Loader2, Wallet, Save, 
  Building2, MapPin, Phone, Mail, Calendar, DollarSign, 
  FileText, ExternalLink, Key, Check, Trash2, Clock, Plus, AlertCircle, RefreshCw
} from 'lucide-react';
import { testBrevoConnection } from '../../services/brevoService';

export const FinancialTab = () => {
  const { currentOrg, updateOrganization, createLabWallet } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupMode, setSetupMode] = useState<'CHOICE' | 'MANUAL' | 'CREATE'>('CHOICE');

  // Estados Manuais (PIX/Banco direto)
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Estados Brevo (Envio de Extratos e E-mails via Google Cloud)
  const [brevoApiKey, setBrevoApiKey] = useState(currentOrg?.brevoApiKey || '');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState(currentOrg?.brevoSenderEmail || currentOrg?.email || '');
  const [brevoSenderName, setBrevoSenderName] = useState(currentOrg?.brevoSenderName || currentOrg?.name || 'Labprox Laboratório');
  const [isSavingBrevo, setIsSavingBrevo] = useState(false);
  const [isTestingBrevo, setIsTestingBrevo] = useState(false);
  const [brevoTestResult, setBrevoTestResult] = useState<{ status: 'IDLE' | 'SUCCESS' | 'ERROR'; message?: string }>({ status: 'IDLE' });

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
    if (!currentOrg || !window.confirm("Remover a conta Asaas? O split deixará de funcionar.")) return;
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

  const handleSaveBrevo = async () => {
      if (!currentOrg) return;
      setIsSavingBrevo(true);
      try {
          await updateOrganization(currentOrg.id, {
              brevoApiKey: brevoApiKey.trim(),
              brevoSenderEmail: brevoSenderEmail.trim().toLowerCase(),
              brevoSenderName: brevoSenderName.trim()
          });
          alert("Configurações do Brevo salvas com sucesso!");
      } catch (err: any) {
          alert("Erro ao salvar Brevo: " + (err.message || err));
      } finally {
          setIsSavingBrevo(false);
      }
  };

  const handleTestBrevo = async () => {
    setIsTestingBrevo(true);
    setBrevoTestResult({ status: 'IDLE' });
    try {
      const res = await testBrevoConnection(currentOrg?.id);
      if (res.valid) {
        setBrevoTestResult({
          status: 'SUCCESS',
          message: res.email ? `Autenticado com sucesso! Conta: ${res.email}` : 'Conexão validada com sucesso pelo Google Cloud.'
        });
      } else {
        setBrevoTestResult({
          status: 'ERROR',
          message: res.message || 'Falha ao autenticar com o Brevo.'
        });
      }
    } catch (err: any) {
      setBrevoTestResult({
        status: 'ERROR',
        message: err.message || 'Erro ao conectar ao serviço.'
      });
    } finally {
      setIsTestingBrevo(false);
    }
  };

  const asaasWalletId = currentOrg?.financialSettings?.asaasWalletId;
  const asaasStatus = currentOrg?.financialSettings?.asaasWalletStatus || 'Não Criada';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CONTA DIGITAL ASAAS */}
      <div className="bg-white p-4 sm:p-6 md:p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" /> Recebimento Automático (Asaas)
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Receba pagamentos via Cartão e PIX com split automático da plataforma.</p>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                          <button 
                            onClick={() => setSetupMode('CREATE')}
                            className="p-4 sm:p-8 border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                          >
                              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Plus size={24} />
                              </div>
                              <h4 className="font-bold text-lg text-slate-800">Criar Nova Conta</h4>
                              <p className="text-sm text-slate-500 mt-2">Ainda não possuo conta no Asaas e quero criar uma subconta integrada.</p>
                          </button>

                          <button 
                            onClick={() => setSetupMode('MANUAL')}
                            className="p-4 sm:p-8 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group"
                          >
                              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Key size={24} />
                              </div>
                              <h4 className="font-bold text-lg text-slate-800">Já possuo conta Asaas</h4>
                              <p className="text-sm text-slate-500 mt-2">Vincule seu Wallet ID existente para gerenciar o split e recebimentos.</p>
                          </button>
                      </div>
                  )}

                  {setupMode === 'MANUAL' && (
                      <div className="space-y-6 max-w-xl">
                          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 items-start">
                              <Info className="text-indigo-600 shrink-0 mt-1" size={20} />
                              <div className="text-xs text-indigo-800 leading-relaxed">
                                  <p className="font-bold mb-1 uppercase">Como obter sua chave:</p>
                                  Acesse seu painel Asaas, vá em <strong>Minha Conta</strong> ou <strong>Integrações</strong> e copie o seu <strong>Wallet ID (ID da Carteira)</strong>.
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Seu ID da Carteira Asaas (Wallet ID)</label>
                              <input 
                                value={manualAsaasKey}
                                onChange={e => setManualAsaasKey(e.target.value)}
                                placeholder="Ex: 5f83... (ID da Carteira)"
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                              />
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
                                  Os dados serão enviados ao Asaas. A conta passará por uma análise de segurança de até 48h.
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:p-6">
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
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Bairro</label>
                                      <input name="province" required value={kycData.province} onChange={handleKycChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-4 pt-4">
                              <button onClick={() => setSetupMode('CHOICE')} className="px-6 py-2 font-bold text-slate-500">Voltar</button>
                              <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70">
                                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard /> SOLICITAR ABERTURA</>}
                              </button>
                          </div>
                      </form>
                  )}
              </div>
          ) : (
              <div className="bg-slate-50 p-4 sm:p-8 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck size={40} />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mb-2">Sua Conta Digital está Vinculada!</h4>
                  <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                      O sistema já está apto a processar pagamentos e realizar o split automático da comissão.
                  </p>
                  <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 w-full max-w-lg text-left relative group">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ID da Carteira (Wallet ID):</p>
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
      <div className="bg-white p-4 sm:p-6 md:p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Wallet className="text-green-600" /> Recebimentos Diretos (Offline)
              </h3>
              <p className="text-sm text-slate-500">Dados exibidos apenas como instrução no faturamento manual.</p>
          </div>
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Sua Chave PIX Principal</label>
                      <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="E-mail, celular ou chave aleatória" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento Externo</label>
                      <input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="Mercado Pago, PicPay, etc" />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Instruções Bancárias</label>
                  <textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" rows={3} placeholder="Banco, Agência, Conta, Nome do Titular..." />
              </div>
              <div className="pt-4 border-t flex justify-end">
                  <button onClick={handleSaveManual} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95">
                    <Save size={18}/> SALVAR CONFIGURAÇÕES MANUAIS
                  </button>
              </div>
          </div>
      </div>

      {/* INTEGRAÇÃO BREVO (E-MAILS & EXTRATOS) */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Mail className="text-blue-600" /> Envio de E-mails e Extratos (Brevo API)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Processamento seguro via Google Cloud Functions para envio automático de extratos em PDF e cobranças por e-mail.
                  </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestBrevo}
                  disabled={isTestingBrevo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black uppercase transition-colors disabled:opacity-50"
                >
                  {isTestingBrevo ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <RefreshCw size={14} className="text-blue-600" />}
                  {isTestingBrevo ? 'Testando...' : 'Testar Conexão'}
                </button>
                <a 
                  href="https://app.brevo.com/settings/keys/api" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-black uppercase transition-colors"
                >
                  Obter Chave no Brevo <ExternalLink size={14} />
                </a>
              </div>
          </div>

          {brevoTestResult.status === 'SUCCESS' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
              <Check className="text-emerald-600 shrink-0" size={18} />
              <span>{brevoTestResult.message}</span>
            </div>
          )}

          {brevoTestResult.status === 'ERROR' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
              <AlertCircle className="text-rose-600 shrink-0" size={18} />
              <span>{brevoTestResult.message}</span>
            </div>
          )}

          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Chave de API do Brevo (v3 API Key)</label>
                      <input 
                        type="password" 
                        value={brevoApiKey} 
                        onChange={e => {
                          setBrevoApiKey(e.target.value);
                          setBrevoTestResult({ status: 'IDLE' });
                        }} 
                        placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                        className="w-full px-4 py-2.5 font-mono text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">
                        Salva com criptografia e lida com segurança pela Cloud Function no Google Cloud (não exposta ao cliente).
                      </p>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">E-mail do Remetente Autorizado</label>
                      <input 
                        type="email" 
                        value={brevoSenderEmail} 
                        onChange={e => setBrevoSenderEmail(e.target.value)} 
                        placeholder="financeiro@seulaboratorio.com.br" 
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm" 
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Deve ser um e-mail verificado em Senders &amp; IP no Brevo.
                      </p>
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Exibição do Remetente</label>
                      <input 
                        type="text" 
                        value={brevoSenderName} 
                        onChange={e => setBrevoSenderName(e.target.value)} 
                        placeholder="Ex: Laboratório Sorriso Dental" 
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm" 
                      />
                  </div>
              </div>
              <div className="pt-4 border-t flex justify-end">
                  <button 
                    onClick={handleSaveBrevo} 
                    disabled={isSavingBrevo}
                    className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingBrevo ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} SALVAR CONFIGURAÇÃO DO BREVO
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};