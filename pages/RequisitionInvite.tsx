import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Lock, ShieldCheck, Loader2, Building, CheckCircle, AlertTriangle } from 'lucide-react';
import { db, auth } from '../services/firebaseConfig';
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import { UserRole } from '../types';

const { doc, getDoc, setDoc, updateDoc } = firestorePkg as any;
const { createUserWithEmailAndPassword } = authPkg as any;

export const RequisitionInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orgId = searchParams.get('orgId') || '';
  const dentistId = searchParams.get('dentistId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [labName, setLabName] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [cro, setCro] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchInviteData = async () => {
      if (!orgId || !dentistId) {
        setError('Link de convite inválido ou incompleto.');
        setLoading(false);
        return;
      }

      try {
        // Fetch Lab Info
        const labDoc = await getDoc(doc(db, 'organizations', orgId));
        if (!labDoc.exists()) {
          setError('Laboratório de origem não encontrado.');
          setLoading(false);
          return;
        }
        setLabName(labDoc.data().name || 'Laboratório');

        // Fetch Dentist Info
        const dentistDoc = await getDoc(doc(db, `organizations/${orgId}/manualDentists`, dentistId));
        if (!dentistDoc.exists()) {
          setError('Cadastro de dentista não encontrado neste laboratório.');
          setLoading(false);
          return;
        }
        
        const dData = dentistDoc.data();
        setDentistName(dData.name || '');
        setDentistEmail(dData.email || '');
        setDentistPhone(dData.phone || '');
        setClinicName(dData.clinicName || '');
        setCro(dData.cro || '');
        
        if (dData.userId) {
          setError('Este convite já foi utilizado para ativar uma conta.');
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching invite details:', err);
        setError('Erro ao carregar os detalhes do convite.');
        setLoading(false);
      }
    };

    fetchInviteData();
  }, [orgId, dentistId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setSaving(true);

    try {
      // 1. Create authentication user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, dentistEmail, password);
      const uid = userCred.user.uid;

      // 2. Create basic clinic organization for the dentist
      const clinicOrgId = `clinic_${Date.now()}`;
      const clinicOrgObj = {
        id: clinicOrgId,
        name: clinicName || `Consultório de ${dentistName}`,
        planId: 'basic', // basic plan without clinic module
        subscriptionStatus: 'ACTIVE',
        createdAt: new Date(),
        orgType: 'CLINIC',
      };
      await setDoc(doc(db, 'organizations', clinicOrgId), clinicOrgObj);

      // 3. Create Dentist User Profile
      const userProfileObj = {
        id: uid,
        name: dentistName,
        email: dentistEmail,
        role: UserRole.CLIENT,
        organizationId: clinicOrgId,
        clinicName: clinicName || `Consultório de ${dentistName}`,
        phone: dentistPhone,
        cro,
        manualDentistId: dentistId,
        connectedLabId: orgId,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        createdAt: new Date()
      };
      await setDoc(doc(db, 'users', uid), userProfileObj);

      // 4. Update Manual Dentist reference in Lab to mark as activated
      await updateDoc(doc(db, `organizations/${orgId}/manualDentists`, dentistId), {
        userId: uid,
        status: 'ACTIVE'
      });

      // 5. Establish standard connection between Clinic and Lab
      const connId = `conn_${clinicOrgId}_${orgId}`;
      const connClinic = { 
        id: connId, 
        organizationId: orgId, 
        organizationName: labName, 
        status: 'ACTIVE', 
        createdAt: new Date() 
      };
      await setDoc(doc(db, `organizations/${clinicOrgId}/connections`, connId), connClinic);

      const connLab = { 
        id: connId, 
        organizationId: clinicOrgId, 
        organizationName: clinicName || `Consultório de ${dentistName}`, 
        status: 'ACTIVE', 
        createdAt: new Date() 
      };
      await setDoc(doc(db, `organizations/${orgId}/connections`, connId), connLab);

      setSuccess(true);
      setSaving(false);

      // Auto login redirects automatically through standard state observer or we navigate manually
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error activating dentist user account:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta no sistema.');
      } else {
        setError(err.message || 'Erro ao criar conta de acesso online.');
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Validando seu convite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Stethoscope size={36} />
          </span>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-800 tracking-tight">
          Ativar Conta de Requisição
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Você foi convidado(a) por <strong className="text-blue-600 font-bold">{labName}</strong> para utilizar o portal de requisições online.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-3xl sm:px-10">
          {error && !success && (
            <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-start gap-2.5 text-sm text-red-600 border border-red-100">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div>
                <span className="font-semibold block">Aviso</span>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="p-6 bg-emerald-50 rounded-2xl text-center flex flex-col items-center gap-3">
              <CheckCircle className="text-emerald-500" size={48} />
              <h3 className="text-lg font-bold text-slate-800">Parabéns, {dentistName}!</h3>
              <p className="text-sm text-slate-600">
                Sua conta foi ativada com sucesso! Você está sendo redirecionado para a plataforma...
              </p>
            </div>
          )}

          {!success && !error.includes('inválido') && !error.includes('origem') && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={dentistName}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  E-mail de Cadastro
                </label>
                <input
                  type="email"
                  disabled
                  value={dentistEmail}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  Crie sua Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  Confirme a Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha criada"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={18} /> Ativar Minha Conta
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}

          {error && (error.includes('inválido') || error.includes('origem')) && (
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="font-bold text-sm text-blue-600 hover:text-blue-500"
              >
                Voltar para a página de Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
