import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
// Fix: Added missing FileText import from lucide-react
import { 
  ShieldCheck, Info, CreditCard, Loader2, Wallet, Save, 
  Building2, MapPin, User, Phone, Mail, Calendar, DollarSign, FileText 
} from 'lucide-react';

export const FinancialTab = () => {
  const { currentOrg, updateOrganization, createLabWallet } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados Manuais (PIX/Banco direto)
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Estados KYC (Para Conta Digital Asaas)
  const [kycData, setKycData] = useState({
    name: currentOrg?.name || '',
    email: '',
    cpfCnpj: '',
    birthDate: '',
    companyType: 'INDIVIDUAL', // INDIVIDUAL, LIMITED, ASSOCIATION
    phone: '',
    mobilePhone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '', // Bairro
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
      
      {/* CONTA DIGITAL ASAAS (KYC) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" /> Conta Digital ProTrack (Asaas)
                  </h3>
                  <p className="text-sm text-slate-500">Abertura de conta para Split de Pagamentos Automático.</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${asaasWalletId ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                  {asaasStatus === 'PENDING' ? 'ANÁLISE PENDENTE NO ASAAS' : asaasStatus.toUpperCase()}
              </div>
          </div>

          {!asaasWalletId ? (
              <form onSubmit={handleCreateWallet} className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 items-start mb-6">
                      <Info className="text-blue-600 shrink-0 mt-1" size={20} />
                      <div className="text-xs text-blue-800 leading-relaxed">
                          <p className="font-bold mb-1 uppercase">Importante:</p>
                          Para receber pagamentos via Cartão e PIX diretamente na sua conta com split automático da taxa ProTrack, preencha os dados reais do titular ou da empresa.
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

                  <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard /> SOLICITAR ABERTURA DE CONTA DIGITAL</>}
                  </button>
              </form>
          ) : (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck size={40} />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mb-2">Sua Conta Digital está Ativa!</h4>
                  <p className="text-sm text-slate-500 max-w-md mb-6">
                      Você já pode receber pagamentos com split automático. Os valores cairão na sua Wallet do Asaas.
                  </p>
                  <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 w-full max-w-lg text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ID da Carteira (API Key):</p>
                      <p className="font-mono text-sm font-bold text-slate-700 break-all">{asaasWalletId}</p>
                  </div>
              </div>
          )}
      </div>

      {/* RECEBIMENTOS MANUAIS (OFFLINE) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Wallet className="text-green-600" /> Recebimentos Diretos (Offline)
              </h3>
              <p className="text-sm text-slate-500">Exibidos apenas como instrução no extrato do dentista.</p>
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