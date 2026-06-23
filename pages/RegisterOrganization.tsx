import React, { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building, User, Mail, Lock, CheckCircle, ShieldCheck, Stethoscope, Store, Activity, Database, Users, Ticket, Loader2, Globe, MapPin, ArrowLeft, Phone, FileText, ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import { Coupon } from '../types';
import { searchCEP, searchLoqateAddress, fetchLoqateRetrieve, searchInternationalZip } from '../services/addressService';

export const RegisterOrganization = () => {
  const { registerOrganization, registerOutsourcedLab, registerDentist, registerSupplier, validateCro, allPlans, validateCoupon, createSubscription } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') === 'DENTIST' || searchParams.get('type') === 'CLINIC') ? 'DENTIST' : searchParams.get('type') === 'LAB_OUTSOURCED' ? 'LAB_OUTSOURCED' : 'LAB';
  const initialPlanId = searchParams.get('plan') || '';

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [regType, setRegType] = useState<'LAB' | 'DENTIST' | 'LAB_OUTSOURCED' | 'SUPPLIER'>(initialType as any);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const overflow = scrollWidth > clientWidth;
      setIsOverflowing(overflow);
      // Only show left arrow if scrollable left with a 3px buffer
      setShowLeftArrow(overflow && scrollLeft > 3);
      // Only show right arrow if scrollable right with a 3px buffer
      setShowRightArrow(overflow && (scrollLeft + clientWidth < scrollWidth - 3));
    }
  };

  React.useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      checkOverflow();
    });
    observer.observe(el);

    const handleScroll = () => {
      checkOverflow();
    };
    el.addEventListener('scroll', handleScroll);

    const timer = setTimeout(() => {
      checkOverflow();
    }, 150);

    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [allPlans, regType]);

  
  // Separated State for clarity
  const [labName, setLabName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState(initialPlanId);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  
  // CRO State for Dentists
  const [croUf, setCroUf] = useState('');
  const [croNumero, setCroNumero] = useState('');
  const [croCategoria, setCroCategoria] = useState('CD');
  
  // Address State
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [isInternational, setIsInternational] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [loqateSuggestions, setLoqateSuggestions] = useState<any[]>([]);

  const handleCEPBlur = async () => {
    if (!cep) return;
    setIsSearchingCep(true);
    
    if (isInternational) {
        // Find US or others by ZIP
        const countryCode = country && country !== 'Brasil' ? (country.length === 2 ? country.toLowerCase() : 'us') : 'us';
        const result = await searchInternationalZip(cep, countryCode);
        if (result) {
            setCity(result.city);
            setState(result.state);
            setCountry(result.country);
        } else {
             // Fallback or warning
        }
    } else {
        const result = await searchCEP(cep);
        if (result) {
            setAddress(result.address);
            setNeighborhood(result.neighborhood);
            setCity(result.city);
            setState(result.state);
        }
    }
    setIsSearchingCep(false);
  };

  const handleLoqateSearch = async (text: string) => {
    if (text.length < 3) {
        setLoqateSuggestions([]);
        return;
    }
    const results = await searchLoqateAddress(text);
    setLoqateSuggestions(results);
  };

  const handleSelectLoqate = async (item: any) => {
      if (item.Type === 'Address') {
          const detailed = await fetchLoqateRetrieve(item.Id);
          if (detailed) {
                setAddress(detailed.Line1);
                setNumber(detailed.BuildingNumber || '');
                setNeighborhood(detailed.AdminAreaName2 || '');
                setCity(detailed.City);
                setState(detailed.ProvinceCode || detailed.Province);
                setCep(detailed.PostalCode);
                setCountry(detailed.CountryName);
          }
          setLoqateSuggestions([]);
      } else {
          const results = await searchLoqateAddress('', item.Id);
          setLoqateSuggestions(results);
      }
  };

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Filter plans based on Registration Type (LAB vs CLINIC vs LAB_OUTSOURCED vs SUPPLIER)
  const publicPlans = allPlans.filter(p => p.isPublic && p.active && (p.targetAudience === (regType === 'LAB' ? 'LAB' : regType === 'LAB_OUTSOURCED' ? 'LAB_OUTSOURCED' : regType === 'SUPPLIER' ? 'SUPPLIER' : 'CLINIC')));
  
  // Use displayPlans for rendering
  const displayPlans = publicPlans; 

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    const selectedPlanId = planId || (displayPlans.length > 0 ? displayPlans[0].id : '');
    const coupon = await validateCoupon(couponCode, selectedPlanId);
    if (coupon) {
        setAppliedCoupon(coupon);
        alert("Cupom aplicado com sucesso!");
    } else {
        alert("Cupom inválido ou expirado.");
        setAppliedCoupon(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    if (!cleanCpfCnpj) {
        setError("Erro ao registrar: O campo CPF ou CNPJ é obrigatório.");
        setLoading(false);
        return;
    }
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
        setError("Erro ao registrar: O CPF/CNPJ deve conter 11 (CPF) ou 14 (CNPJ) dígitos.");
        setLoading(false);
        return;
    }

    if (!phone || phone.trim().length < 8) {
        setError("Erro ao registrar: Um número de telefone válido é obrigatório.");
        setLoading(false);
        return;
    }

    try {
      // If no plan selected, pick the first one available
      const selectedPlanId = planId || (displayPlans.length > 0 ? displayPlans[0].id : '');
      if (!selectedPlanId) {
          throw new Error("Nenhum plano de assinatura disponível.");
      }

      const plan = displayPlans.find(p => p.id === selectedPlanId);
      
      let trialEnd = undefined;
      if (plan && plan.trialDays && plan.trialDays > 0) {
          const d = new Date();
          d.setDate(d.getDate() + plan.trialDays);
          if (appliedCoupon && appliedCoupon.discountType === 'TRIAL_EXT') {
              d.setDate(d.getDate() + appliedCoupon.discountValue);
          }
          trialEnd = d;
      }
      if (appliedCoupon && appliedCoupon.discountType === 'FREE_FOREVER') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 10); trialEnd = d;
      }

      let regUser;
      if (regType === 'LAB') {
          regUser = await registerOrganization(email, password, ownerName, labName, selectedPlanId, trialEnd, appliedCoupon?.code, {
              address, number, complement, neighborhood, city, state, cep, country, cpfCnpj: cleanCpfCnpj, phone
          });
          
          // Automatically register subscription and issue the first payment/boleto via Asaas
          if (regUser && regUser.organizationId) {
              try {
                  await createSubscription(
                      regUser.organizationId,
                      selectedPlanId,
                      email,
                      labName,
                      cleanCpfCnpj,
                      appliedCoupon?.code
                  );
              } catch (subErr) {
                  console.error("Erro ao gerar fatura/assinatura Asaas automática:", subErr);
              }
          }
          
          navigate('/dashboard');
      } else if (regType === 'LAB_OUTSOURCED') {
          regUser = await registerOutsourcedLab(email, password, ownerName, labName, selectedPlanId, trialEnd, appliedCoupon?.code, {
              address, number, complement, neighborhood, city, state, cep, country, cpfCnpj: cleanCpfCnpj, phone
          });
          
          if (regUser && regUser.organizationId) {
              try {
                  await createSubscription(
                      regUser.organizationId,
                      selectedPlanId,
                      email,
                      labName,
                      cleanCpfCnpj,
                      appliedCoupon?.code
                  );
              } catch (subErr) {
                  console.error("Erro ao gerar fatura/assinatura Asaas automática:", subErr);
              }
          }
          
          navigate('/store');
      } else if (regType === 'SUPPLIER') {
          regUser = await registerSupplier(email, password, ownerName, labName, selectedPlanId, trialEnd, appliedCoupon?.code, {
              address, number, complement, neighborhood, city, state, cep, country, cpfCnpj: cleanCpfCnpj, phone
          });
          if (regUser && regUser.organizationId) {
              try {
                  await createSubscription(
                      regUser.organizationId,
                      selectedPlanId,
                      email,
                      labName,
                      cleanCpfCnpj,
                      appliedCoupon?.code
                  );
              } catch (subErr) {
                  console.error("Erro ao gerar fatura/assinatura Asaas automática:", subErr);
              }
          }
          navigate('/supplier/dashboard');
      } else {
          // Validate CRO first
          if (!croUf || !croNumero || !croCategoria) {
              setError("Erro ao registrar: Todos os campos do CRO (UF, Número, Categoria) são obrigatórios.");
              setLoading(false);
              return;
          }

          setError("Verificando registro profissional (CRO)...");
          try {
              const check = await validateCro(croUf, croNumero, croCategoria);
              setError(""); // Clear validating state

              // Register Dentist with validation flags
              regUser = await registerDentist(email, password, ownerName, clinicName || 'Consultório Particular', selectedPlanId, trialEnd, appliedCoupon?.code, {
                  address, number, complement, neighborhood, city, state, cep, country, cpfCnpj: cleanCpfCnpj, phone,
                  croUf,
                  croNumero,
                  croCategoria,
                  croValid: check?.valido || false,
                  isApproved: check?.valido || false
              });
              navigate('/store'); // Goes to store
          } catch (validateErr: any) {
              console.error("Erro na consulta de CRO:", validateErr);
              // Safe fallback if API has trouble: let register but require manual review
              regUser = await registerDentist(email, password, ownerName, clinicName || 'Consultório Particular', selectedPlanId, trialEnd, appliedCoupon?.code, {
                  address, number, complement, neighborhood, city, state, cep, country, cpfCnpj: cleanCpfCnpj, phone,
                  croUf,
                  croNumero,
                  croCategoria,
                  croValid: false,
                  isApproved: false
              });
              navigate('/store');
          }
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Tente novamente.";
      
      const errorStr = String(err.code || err.message || '');
      if (errorStr.includes('email-already-in-use') || errorStr.includes('auth/email-already-in-use')) {
        errMsg = "Este endereço de e-mail já está sendo utilizado por outra conta. Se você já possui uma conta, faça login ou utilize um e-mail diferente para criar o seu laboratório.";
      } else if (errorStr.includes('weak-password')) {
        errMsg = "A senha fornecida é muito fraca. Por favor, utilize uma senha com pelo menos 6 caracteres.";
      } else if (errorStr.includes('invalid-email')) {
        errMsg = "O e-mail informado é inválido. Verifique se digitou corretamente.";
      }
      
      setError("Erro ao registrar: " + errMsg);
      setLoading(false);
    }
  };

  const themeColor = 
    regType === 'LAB' ? 'blue' : 
    regType === 'LAB_OUTSOURCED' ? 'purple' : 
    regType === 'SUPPLIER' ? 'indigo' : 'teal';

  const themeBorder = 
    regType === 'LAB' ? 'border-blue-500' : 
    regType === 'LAB_OUTSOURCED' ? 'border-purple-500' : 
    regType === 'SUPPLIER' ? 'border-indigo-500' : 'border-teal-500';

  const themeText = 
    regType === 'LAB' ? 'text-blue-400' : 
    regType === 'LAB_OUTSOURCED' ? 'text-purple-400' : 
    regType === 'SUPPLIER' ? 'text-indigo-400' : 'text-teal-400';

  const themeBg = 
    regType === 'LAB' ? 'bg-blue-500' : 
    regType === 'LAB_OUTSOURCED' ? 'bg-purple-500' : 
    regType === 'SUPPLIER' ? 'bg-indigo-500' : 'bg-teal-500';

  const themeBtnBg = 
    regType === 'LAB' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50' : 
    regType === 'LAB_OUTSOURCED' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/50' : 
    regType === 'SUPPLIER' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50' : 
    'bg-teal-600 hover:bg-teal-500 shadow-teal-900/50';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-800 w-full max-w-4xl p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700 space-y-6">
        
        <div className="space-y-6">
            <div className="text-left mb-6">
                <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6">
                    <ArrowLeft size={14} /> Voltar para o Site
                </Link>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-black/20 ${regType === 'LAB' ? 'bg-blue-600' : regType === 'LAB_OUTSOURCED' ? 'bg-purple-600' : regType === 'SUPPLIER' ? 'bg-indigo-600' : 'bg-teal-600'}`}>
                    {regType === 'LAB' ? <ShieldCheck size={32} className="text-white" /> : regType === 'LAB_OUTSOURCED' ? <Building size={32} className="text-white" /> : regType === 'SUPPLIER' ? <Database size={32} className="text-white" /> : <Stethoscope size={32} className="text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Crie sua Conta</h1>
                <p className="text-slate-400">
                    {regType === 'LAB' ? 'Gestão completa para seu Laboratório.' : regType === 'LAB_OUTSOURCED' ? 'Contrate outros laboratórios através da nossa plataforma.' : regType === 'SUPPLIER' ? 'Venda seus produtos e controle estoque para dentistas e laboratórios.' : 'Gestão clínica e pedidos para Dentistas.'}
                </p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700 flex-wrap md:flex-nowrap gap-1">
                <button type="button" onClick={() => { setRegType('LAB'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs md:text-sm font-bold transition-all min-w-[120px] ${regType === 'LAB' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Building size={18} /> Sou Laboratório</button>
                <button type="button" onClick={() => { setRegType('DENTIST'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs md:text-sm font-bold transition-all min-w-[120px] ${regType === 'DENTIST' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Stethoscope size={18} /> Sou Dentista</button>
                <button type="button" onClick={() => { setRegType('LAB_OUTSOURCED'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs md:text-sm font-bold transition-all min-w-[120px] ${regType === 'LAB_OUTSOURCED' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Store size={18} /> Terceirização Lab</button>
                <button type="button" onClick={() => { setRegType('SUPPLIER'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs md:text-sm font-bold transition-all min-w-[120px] ${regType === 'SUPPLIER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Database size={18} /> Sou Fornecedor</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(regType === 'LAB' || regType === 'LAB_OUTSOURCED' || regType === 'SUPPLIER') ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                {regType === 'SUPPLIER' ? 'Nome do Fornecedor / Empresa' : 'Nome do Laboratório'}
                            </label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input required value={labName} onChange={e => setLabName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600" placeholder={regType === 'SUPPLIER' ? 'Ex: Fornecedor Dental Dental' : 'Ex: Laboratório Smile'} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Clínica</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-3 text-slate-400" size={18}/>
                                <input required value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-teal-500 outline-none placeholder-slate-600" placeholder="Ex: Clínica Sorriso" />
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Seu Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-500" size={18}/>
                            <input required value={ownerName} onChange={e => setOwnerName(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="Ex: João da Silva" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">CPF ou CNPJ (para Faturamento)</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-slate-500" size={18}/>
                            <input required value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="Somente números" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-500" size={18}/>
                            <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="Ex: (11) 99999-9999" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email de Acesso</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-500" size={18}/>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="seu@email.com" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-500" size={18}/>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="••••••••" minLength={6} />
                    </div>
                </div>

                {regType === 'DENTIST' && (
                    <div className="p-4 bg-teal-950/35 rounded-2xl border border-teal-500/20 space-y-4">
                        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={16} /> Validação Profissional (CRO Obrigatório)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">UF do Registro</label>
                                <select 
                                    required 
                                    value={croUf} 
                                    onChange={e => setCroUf(e.target.value.toUpperCase())} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Selecione...</option>
                                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                        <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Número do CRO</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={croNumero} 
                                    onChange={e => setCroNumero(e.target.value.replace(/\D/g, ''))} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500" 
                                    placeholder="Ex: 12345"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                                <select 
                                    required 
                                    value={croCategoria} 
                                    onChange={e => setCroCategoria(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="CD">Cirurgião-Dentista (CD)</option>
                                    <option value="EPAO">Clínica / Entidade (EPAO)</option>
                                    <option value="TPD">Técnico em Prótese (TPD)</option>
                                    <option value="ACD">Auxiliar (ACD)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* ENDEREÇO SECTION */}
                <div className="pt-4 border-t border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                         <label className="block text-xs font-bold text-slate-400 uppercase">Endereço de Atendimento</label>
                         <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                             <button type="button" onClick={() => { setIsInternational(false); setCountry('Brasil'); setLoqateSuggestions([]); }} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${!isInternational ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Brasil</button>
                             <button type="button" onClick={() => { setIsInternational(true); setCountry(''); setLoqateSuggestions([]); }} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${isInternational ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Internacional</button>
                         </div>
                    </div>

                    <div className="space-y-4">
                        {isInternational && (
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar Endereço Inteligente (Loqate, opcional)</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 text-slate-500" size={18}/>
                                    <input 
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder="Comece a digitar o endereço..."
                                        onChange={(e) => handleLoqateSearch(e.target.value)}
                                    />
                                </div>
                                {loqateSuggestions.length > 0 && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                        {loqateSuggestions.map((item, idx) => (
                                            <button 
                                                key={idx} 
                                                type="button"
                                                onClick={() => handleSelectLoqate(item)}
                                                className="w-full px-4 py-3 text-left hover:bg-slate-700 text-sm border-b border-slate-700 last:border-0 flex flex-col"
                                            >
                                                <span className="font-bold text-white">{item.Text}</span>
                                                <span className="text-xs text-slate-400">{item.Description}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'Postal/ZIP Code' : 'CEP'}</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={18}/>
                                    <input 
                                        required 
                                        value={cep} 
                                        onChange={e => setCep(e.target.value)} 
                                        onBlur={handleCEPBlur} 
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder={isInternational ? "Ex: 90210" : "00000-000"} 
                                    />
                                    {isSearchingCep && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-blue-500" />}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'Street / Address' : 'Logradouro'}</label>
                                <input required value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'Apt/Suite' : 'Nº'}</label>
                                <input required value={number} onChange={e => setNumber(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                             </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'District/Area' : 'Bairro'}</label>
                                <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'City' : 'Cidade'}</label>
                                <input required value={city} onChange={e => setCity(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isInternational ? 'State & Country' : 'UF / País'}</label>
                                <input required value={`${state}${country && country !== 'Brasil' ? ` (${country})` : ''}`} onChange={e => {
                                    if (isInternational) {
                                        // user might type state and country
                                        const parts = e.target.value.split('(');
                                        setState(parts[0].trim());
                                        if (parts[1]) setCountry(parts[1].replace(')', '').trim());
                                    } else {
                                        setState(e.target.value.toUpperCase().slice(0, 2));
                                    }
                                }} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* PLAN SELECTION SECTION (Placa de planos) */}
                <div className="pt-6 border-t border-slate-700/50 space-y-4">
                    <div className="flex items-center gap-2 text-white">
                        <Activity className={themeText} size={18} />
                        <label className="block text-xs font-bold text-slate-400 uppercase">Escolha seu Plano de Assinatura</label>
                    </div>

                    {displayPlans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-700 rounded-2xl">
                            <Loader2 className={`animate-spin mb-2 ${themeText}`} />
                            <p className="text-sm">Carregando planos para {
                                regType === 'LAB' ? 'Laboratórios' : 
                                regType === 'LAB_OUTSOURCED' ? 'Terceirização' : 
                                regType === 'SUPPLIER' ? 'Fornecedores' : 'Dentistas'
                            }...</p>
                        </div>
                    ) : (
                        <div className="relative group/carousel px-1">
                            <style>{`
                                .no-scrollbar::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            
                            {/* Left Arrow */}
                            {showLeftArrow && (
                                <button
                                    type="button"
                                    onClick={() => scrollCarousel('left')}
                                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-850 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center shadow-xl transition-all"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            
                            {/* Right Arrow */}
                            {showRightArrow && (
                                <button
                                    type="button"
                                    onClick={() => scrollCarousel('right')}
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-850 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center shadow-xl transition-all"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}

                            <div 
                                ref={carouselRef}
                                onScroll={checkOverflow}
                                className={`flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-3 px-1 no-scrollbar-container ${
                                    isOverflowing ? 'justify-start' : 'justify-center mx-auto'
                                }`}
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <style>{`
                                    .no-scrollbar-container::-webkit-scrollbar {
                                        display: none;
                                    }
                                `}</style>
                                {displayPlans.map(plan => {
                                    const isSelected = planId === plan.id || (!planId && plan.id === displayPlans[0].id);
                                    return (
                                        <div 
                                            key={plan.id} 
                                            onClick={() => setPlanId(plan.id)}
                                            className={`cursor-pointer border-2 rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden flex flex-col justify-between w-[250px] xs:w-[270px] sm:w-[290px] md:w-[245px] lg:w-[260px] flex-shrink-0 snap-center ${
                                                isSelected 
                                                    ? `${themeBorder} bg-slate-800 shadow-lg shadow-black/20`
                                                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-750 hover:border-slate-600'
                                            }`}
                                        >
                                            {plan.trialDays && plan.trialDays > 0 && (
                                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-2.5 py-1 rounded-bl-xl shadow-sm">
                                                    {plan.trialDays} DIAS GRÁTIS
                                                </div>
                                            )}
                                            
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-white font-bold uppercase tracking-wider text-xs">{plan.name}</h4>
                                                        <p className={`text-2xl font-bold mt-1 ${themeText}`}>
                                                            R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-500 font-normal">/mês</span>
                                                        </p>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        isSelected 
                                                            ? `${themeBorder} ${themeBg}` 
                                                            : 'border-slate-600'
                                                    }`}>
                                                        {isSelected && <CheckCircle size={14} className="text-white" />}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-700/50">
                                                    {regType === 'LAB' && (
                                                        <>
                                                            <div className="flex items-center gap-2"><Users size={12} className={themeText}/>{plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</div>
                                                            <div className="flex items-center gap-2"><Database size={12} className={themeText}/>{plan.features.maxStorageGB} GB de Armazenamento</div>
                                                            <div className={`flex items-center gap-2 ${plan.features.hasStoreModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Store size={12} className={plan.features.hasStoreModule ? 'text-green-500' : 'text-slate-600'}/>Loja Virtual</div>
                                                            <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Activity size={12} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Gestão Clínica (Demo)</div>
                                                        </>
                                                    )}
                                                    {regType === 'SUPPLIER' && (
                                                        <>
                                                            <div className="flex items-center gap-2"><CheckCircle size={12} className={themeText}/>Ativação de Vitrine Pública</div>
                                                            <div className="flex items-center gap-2"><Users size={12} className={themeText}/>{plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</div>
                                                            <div className="flex items-center gap-2"><Database size={12} className={themeText}/>Estoque & Vendas Digitais</div>
                                                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                                                                <Percent size={12} className="text-amber-400"/>
                                                                Split na Plataforma: {plan.features.splitPercent !== undefined ? `${plan.features.splitPercent}%` : 'Taxa Padrão'}
                                                            </div>
                                                        </>
                                                    )}
                                                    {regType === 'LAB_OUTSOURCED' && (
                                                        <>
                                                            <div className="flex items-center gap-2"><CheckCircle size={12} className={themeText}/>Recebimento de Pedidos</div>
                                                            <div className="flex items-center gap-2"><Users size={12} className={themeText}/>{plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</div>
                                                            <div className="flex items-center gap-2"><Building size={12} className={themeText}/>Mapeamento de Serviços</div>
                                                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                                                                <Percent size={12} className="text-amber-400"/>
                                                                Split na Plataforma: {plan.features.splitPercent !== undefined ? `${plan.features.splitPercent}%` : 'Taxa Padrão'}
                                                            </div>
                                                        </>
                                                    )}
                                                    {regType === 'DENTIST' && (
                                                        <>
                                                            <div className="flex items-center gap-2"><CheckCircle size={12} className={themeText}/>Pedidos Online Ilimitados</div>
                                                            <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Activity size={12} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Gestão de Consultório</div>
                                                            <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300 font-medium' : 'text-slate-600 line-through'}`}><Users size={12} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Cadastro de Pacientes</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cupom Section Available for BOTH */}
                <div className="flex gap-2 items-end pt-2">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cupom de Desconto</label>
                        <div className="relative">
                            <Ticket className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Código Promocional" disabled={!!appliedCoupon} />
                        </div>
                    </div>
                    <button type="button" onClick={handleApplyCoupon} disabled={!!appliedCoupon || !couponCode} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-600 disabled:opacity-50 h-[42px]">{appliedCoupon ? 'Aplicado' : 'Validar'}</button>
                </div>
                {appliedCoupon && <div className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> {appliedCoupon.discountType === 'FREE_FOREVER' ? 'Acesso Gratuito Vitalício' : appliedCoupon.discountType === 'TRIAL_EXT' ? `+${appliedCoupon.discountValue} dias de teste` : 'Desconto aplicado'}</div>}

                {error && <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center border border-red-500/30 font-medium">{error}</div>}

                <button type="submit" disabled={loading} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 text-white mt-4 flex items-center justify-center gap-2 ${themeBtnBg}`}>
                    {loading ? 'Processando...' : 'Finalizar Cadastro'}
                </button>
                
                <div className="text-center pt-2">
                    <Link to="/login" className="text-slate-400 hover:text-white text-sm transition-colors">Já tem conta? <span className="font-bold underline">Fazer Login</span></Link>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
