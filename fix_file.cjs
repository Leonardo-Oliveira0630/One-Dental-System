const fs = require('fs');

const content = `import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Organization } from '../types';
import * as api from '../services/firebaseService';

interface WhatsAppTemplatesEditorProps {
  currentOrg: Organization;
  onUpdate: () => void;
}

export function WhatsAppTemplatesEditor({ currentOrg, onUpdate }: WhatsAppTemplatesEditorProps) {
  const [templates, setTemplates] = useState(currentOrg.whatsappTemplates || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', body: '', type: 'CUSTOM' as any, active: true });
  const [saving, setSaving] = useState(false);

  const defaultTemplates = {
    CLINIC: {
      type: 'CLINIC_APPOINTMENT',
      name: 'Confirmação de Consulta',
      body: 'Olá {{patient_name}}, sua consulta está agendada para {{date}} às {{time}}. Responda 1 para CONFIRMAR ou 2 para CANCELAR.'
    },
    LAB: {
      type: 'LAB_DISPATCH',
      name: 'Aviso de Motoboy (Rota)',
      body: 'Olá {{dentist_name}}, informamos que os seguintes trabalhos estão em rota:\\n{{jobs_list}}'
    },
    SUPPLIER: {
      type: 'SUPPLIER_UPDATE',
      name: 'Atualização de Pedido',
      body: 'Seu pedido #{{order_id}} foi atualizado para o status: {{status}}'
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.body) return alert('Preencha os campos obrigatórios.');
    setSaving(true);
    try {
      let newTemplates = [...templates];
      if (editingId === 'new') {
        newTemplates.push({ ...editForm, id: Date.now().toString() } as any);
      } else {
        newTemplates = newTemplates.map(t => t.id === editingId ? { ...t, ...editForm } : t);
      }
      
      await api.updateOrganization(currentOrg.id, { whatsappTemplates: newTemplates });
      setTemplates(newTemplates);
      setEditingId(null);
      onUpdate();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este modelo?')) return;
    try {
      const newTemplates = templates.filter(t => t.id !== id);
      await api.updateOrganization(currentOrg.id, { whatsappTemplates: newTemplates });
      setTemplates(newTemplates);
      onUpdate();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Modelos de Mensagem (WhatsApp)</h3>
            <p className="text-sm text-slate-500">Configure os textos automáticos e personalizados.</p>
          </div>
          <button 
            onClick={() => { 
              const dflt = defaultTemplates[currentOrg.targetAudience as keyof typeof defaultTemplates] || { type: 'CUSTOM', name: '', body: '' };
              setEditForm({ name: dflt.name, body: dflt.body, type: dflt.type as any, active: true }); 
              setEditingId('new'); 
            }} 
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Novo Modelo
          </button>
        </div>

        <div className="space-y-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
              {editingId === tpl.id ? (
                <div className="space-y-3">
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="CUSTOM">Personalizado (Envio Manual)</option>
                    {currentOrg.targetAudience === 'CLINIC' && (
                      <>
                        <option value="CLINIC_APPOINTMENT">Automático: Consulta Agendada (Convite)</option>
                        <option value="CLINIC_APPOINTMENT_CONFIRMED">Automático: Consulta Confirmada (Resposta)</option>
                        <option value="CLINIC_APPOINTMENT_CANCELED">Automático: Consulta Cancelada</option>
                      </>
                    )}
                    {currentOrg.targetAudience === 'LAB' && (
                      <>
                        <option value="LAB_DISPATCH">Automático: Motoboy em Rota</option>
                        <option value="LAB_DELIVERED">Automático: Trabalho Entregue</option>
                      </>
                    )}
                    {currentOrg.targetAudience === 'SUPPLIER' && (
                      <option value="SUPPLIER_UPDATE">Automático: Atualização de Pedido</option>
                    )}
                  </select>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome do Modelo"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={editForm.body}
                    onChange={e => setEditForm({ ...editForm, body: e.target.value })}
                    placeholder="Corpo da Mensagem"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[100px]"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={editForm.active}
                      onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                      id={\`active-\${tpl.id}\`}
                    />
                    <label htmlFor={\`active-\${tpl.id}\`}>Modelo Ativo</label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                        {!tpl.active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Inativo</span>}
                        {tpl.type !== 'CUSTOM' && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Automático</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditForm(tpl); setEditingId(tpl.id); }} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(tpl.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 whitespace-pre-wrap font-mono">
                    {tpl.body}
                  </div>
                </>
              )}
            </div>
          ))}
          
          {editingId === 'new' && (
            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 flex flex-col gap-3">
               <select
                  value={editForm.type}
                  onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                >
                  <option value="CUSTOM">Personalizado (Envio Manual)</option>
                  {currentOrg.targetAudience === 'CLINIC' && (
                    <>
                      <option value="CLINIC_APPOINTMENT">Automático: Consulta Agendada / Confirmação</option>
                      <option value="CLINIC_APPOINTMENT_CANCELED">Automático: Consulta Cancelada</option>
                    </>
                  )}
                  {currentOrg.targetAudience === 'LAB' && (
                    <>
                      <option value="LAB_DISPATCH">Automático: Motoboy em Rota</option>
                      <option value="LAB_DELIVERED">Automático: Trabalho Entregue</option>
                    </>
                  )}
                  {currentOrg.targetAudience === 'SUPPLIER' && (
                    <option value="SUPPLIER_UPDATE">Automático: Atualização de Pedido</option>
                  )}
                </select>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome do Modelo"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                />
                <textarea
                  value={editForm.body}
                  onChange={e => setEditForm({ ...editForm, body: e.target.value })}
                  placeholder="Corpo da Mensagem. Variáveis suportadas: {{patient_name}}, {{dentist_name}}, {{job_id}}, {{jobs_list}}, {{date}}, {{time}}"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[100px] bg-white"
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={editForm.active}
                    onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                    id="active-new"
                  />
                  <label htmlFor="active-new">Modelo Ativo</label>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
            </div>
          )}
          
          {templates.length === 0 && editingId !== 'new' && (
            <div className="text-center py-8 text-slate-400">
              Nenhum modelo de mensagem configurado.
            </div>
          )}
        </div>
        
        <div className="mt-4 text-xs text-slate-500">
          <p><strong>Dica:</strong> Modelos "Automáticos" são enviados pelo sistema automaticamente em eventos específicos, desde que estejam ativos.</p>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
