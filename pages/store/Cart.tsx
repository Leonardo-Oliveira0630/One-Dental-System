import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, ArrowRight, CreditCard, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Cart = () => {
  const { cart, removeFromCart, createWebOrder } = useApp();
  const navigate = useNavigate();
  
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const total = cart.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !patientName) return;

    createWebOrder(patientName, new Date(date), notes);
    navigate('/my-orders');
  };

  if (cart.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 bg-indigo-50 rounded-full mb-4 text-indigo-300">
                <ArrowRight size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Seu carrinho está vazio</h2>
            <p className="text-slate-500 mb-6">Inicie um novo trabalho selecionando produtos do catálogo.</p>
            <button onClick={() => navigate('/store')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                Ir para o Catálogo
            </button>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Itens do Pedido</h2>
        {cart.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs">
                        IMG
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <p className="text-sm text-slate-500">Qtd: {item.quantity} x R$ {item.basePrice}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700">R$ {item.basePrice * item.quantity}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Checkout Form */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CreditCard className="text-indigo-600" />
            Detalhes do Trabalho
        </h2>
        
        <form onSubmit={handleCheckout} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                <input 
                    required
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: João da Silva"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega Desejada</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        required
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Cor, Instruções)</label>
                <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Cor A2, entregar urgente..."
                />
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500">Total Estimado</span>
                    <span className="text-2xl font-bold text-slate-900">R$ {total}</span>
                </div>
                
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                    Enviar Pedido
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};