import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface ChannelConfig {
  id: string;
  provider: string;
  phoneNumber: string;
  status: string;
}

export function WhatsAppChannelSettings({ orgId, companyId }: { orgId: string, companyId?: string }) {
  const [channel, setChannel] = useState<ChannelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const q = query(
          collection(db, 'communication_channels'),
          where('orgId', '==', orgId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setChannel({ id: docData.id, ...docData.data() } as ChannelConfig);
          setPhoneNumber(docData.data().phoneNumber || '');
          setApiKey(docData.data().apiKey || '');
        }
      } catch (error) {
        console.error("Error fetching channel:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();
  }, [orgId]);

  const handleSave = async () => {
    if (!phoneNumber) return;
    setSaving(true);
    try {
      if (channel?.id) {
        await updateDoc(doc(db, 'communication_channels', channel.id), {
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          apiKey: apiKey.trim(),
          updatedAt: serverTimestamp()
        });
        setChannel({ ...channel, phoneNumber: phoneNumber.replace(/\D/g, '') });
      } else {
        const docRef = await addDoc(collection(db, 'communication_channels'), {
          tenantId: orgId,
          companyId: companyId || orgId,
          orgId: orgId,
          provider: 'YCloud', 
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          apiKey: apiKey.trim(),
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setChannel({
          id: docRef.id,
          provider: 'YCloud',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          status: 'ACTIVE'
        });
      }
      alert("Configurações de WhatsApp salvas com sucesso!");
    } catch (error) {
      console.error("Error saving channel:", error);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Carregando configurações de WhatsApp...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Conexão WhatsApp (Omnichannel)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Conecte seu número de WhatsApp Business para enviar mensagens automáticas aos seus clientes.
      </p>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700">Provedor</label>
          <input
            type="text"
            disabled
            value="YCloud (Padrão)"
            className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Seu Número de WhatsApp (WABA)</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Ex: 5511999999999"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Insira o número com código do país (ex: 55 para o Brasil).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sua API Key (Opcional - YCloud)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Deixe em branco para usar a API Global"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Conexão'}
        </button>

        {channel && (
          <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-100">
            <p className="text-sm text-green-700 font-medium">
              ✓ Canal Conectado 
            </p>
            <p className="text-xs text-green-600 mt-1">
              Provedor: {channel.provider} | Status: {channel.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
