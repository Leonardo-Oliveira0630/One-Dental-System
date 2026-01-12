
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Info, CreditCard, Loader2, Wallet, Save } from 'lucide-react';

export const FinancialTab = () => {
  const { currentOrg, updateOrganization, createLabWallet } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual states
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // KYC States
  const [kycCpfCnpj, setKycCpfCnpj] = useState('');
  const [kycEmail, setKycEmail] = useState('');
  const [kycPhone, setKycPhone] = useState('');
  const [kycAddress, setKycAddress] = useState('');
  const [kycZip, setKycZip] = useState('');

  const handleCreateWallet = async () => {
    if (!kycCpfCnpj || !currentOrg) return;
    setIsSubmitting(true);
    try {
        const accountData = {
            name: currentOrg.name,
            email: kycEmail,
            cpfCnpj: kycCpfCnpj.replace(/\D/g, ''),
            phone: kycPhone,
            mobilePhone: kycPhone,
            address: kycAddress,
            postalCode: kycZip.replace(/\D/g, ''),
            companyType: kycCpfCnpj.length > 11 ? 'LIMITED' : 'INDIVIDUAL'
        };
        await createLabWallet({ orgId: currentOrg.id, accountData });
        alert("Solicitação enviada!");
    } catch (err: any) { alert("Erro ao criar conta."); } finally { setIsSubmitting(false); }
  };

  const handleSaveFinancial = async () => {
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: { ...currentOrg.financialSettings, pixKey, bankInfo, paymentLink }
      });
      alert("Configurações salvas!");
  };

  const asaasWalletId = currentOrg?.financialSettings?.asaasWalletId;
  const asaasStatus = currentOrg?.financialSettings?.asaasWalletStatus || 'Não Criada';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* CONTA DIGITAL ASAAS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-blue-600" /> Conta Digital ProTrack (Asaas)
              </h3>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${asaasWalletId ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                  {asaasStatus === 'PENDING' ? 'AGUARDANDO APROVAÇÃO' : asaasStatus}
              </div>
          </div>

          {!asaasWalletId ? (
              <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                      <Info className="text-blue-600 shrink-0" size={20} />
                      <p className="text-xs text-blue-800 leading-relaxed">
                          Para receber pagamentos automaticamente dos seus dentistas via cartão e PIX com split automático, você precisa criar uma subconta digital.
                      </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF ou CNPJ</label><input value={kycCpfCnpj} onChange={e => setKycCpfCnpj(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Apenas números" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Notificações</label><input type="email" value={kycEmail} onChange={e => setKycEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label><input value={kycPhone} onChange={e => setKycPhone(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label><input value={kycZip} onChange={e => setKycZip(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço</label><input value={kycAddress} onChange={e => setKycAddress(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Rua, Número, Bairro, Cidade, UF" /></div>
                  </div>
                  <button onClick={handleCreateWallet} disabled={isSubmitting || !kycCpfCnpj} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard /> CRIAR CONTA DIGITAL</>}
                  </button>
              </div>
          ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Sua API Key Asaas (Transações)</p>
                  <p className="font-mono text-sm font-bold text-slate-700 break-all">{asaasWalletId}</p>
              </div>
          )}
      </div>

      {/* RECEBIMENTOS MANUAIS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-green-600" /> Recebimentos Manuais (Offline)</h3>
          <div className="space-y-6">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Chave PIX</label><input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento Externo</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Mercado Pago, PicPay, etc" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Instruções Bancárias</label><textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2 border rounded-xl" rows={3} /></div>
              <div className="pt-4 border-t flex justify-end"><button onClick={handleSaveFinancial} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> Salvar Financeiro</button></div>
          </div>
      </div>
    </div>
  );
};
