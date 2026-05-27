import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsOfUse = () => {
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <button onClick={() => window.history.back()} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-bold text-sm uppercase tracking-widest">Voltar</span>
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Termos de Uso</h1>
                        <p className="text-slate-500 mt-1">Última atualização: Maio de 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
                    <h2>1. Aceitação dos Termos</h2>
                    <p>
                        Ao acessar e utilizar nossa plataforma de gestão laboratorial e clínica, você concorda em cumprir e estar legalmente vinculado a estes Termos de Uso.
                    </p>
                    
                    <h2>2. Uso da Plataforma</h2>
                    <p>
                        Você concorda em usar a plataforma apenas para fins lícitos e de maneira que não infrinja os direitos de terceiros, nem restrinja ou iniba o uso e usufruto da plataforma por qualquer pessoa.
                    </p>

                    <h2>3. Contas de Usuário</h2>
                    <p>
                        Você é responsável por manter a confidencialidade de sua conta e senha, bem como por restringir o acesso ao seu computador ou dispositivo. Você concorda em aceitar a responsabilidade por todas as atividades que ocorram sob sua conta.
                    </p>

                    <h2>4. Cancelamento ou Suspensão</h2>
                    <p>
                        Reservamo-nos o direito de suspender ou encerrar sua conta e recusar qualquer uso atual ou futuro da plataforma por qualquer motivo, sem aviso prévio.
                    </p>

                    <h2>5. Modificações dos Termos</h2>
                    <p>
                        Podemos revisar e atualizar estes termos periodicamente. O uso contínuo da plataforma após a postagem dos termos revisados significa que você aceita e concorda com as mudanças.
                    </p>
                </div>
            </div>
        </div>
    );
};
