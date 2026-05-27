import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <button onClick={() => window.history.back()} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-bold text-sm uppercase tracking-widest">Voltar</span>
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Política de Privacidade</h1>
                        <p className="text-slate-500 mt-1">Última atualização: Maio de 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
                    <h2>1. Informações que Coletamos</h2>
                    <p>
                        Coletamos informações que você nos fornece diretamente ao criar uma conta, utilizar nossos serviços de gestão laboratorial ou odontológica, atualizar seu perfil e entrar em contato conosco.
                    </p>
                    
                    <h2>2. Como Usamos as Informações</h2>
                    <p>Utilizamos suas informações para:</p>
                    <ul>
                        <li>Fornecer, manter e melhorar nossos serviços.</li>
                        <li>Processar transações e enviar avisos relacionados.</li>
                        <li>Responder a seus comentários, perguntas e pedidos de atendimento.</li>
                        <li>Cumprir com obrigações legais e regulatórias.</li>
                    </ul>

                    <h2>3. Compartilhamento de Dados</h2>
                    <p>
                        Não vendemos suas informações pessoais a terceiros. Seus dados podem ser compartilhados com prestadores de serviços que operam em nosso nome, sempre sob acordos estritos de confidencialidade.
                    </p>

                    <h2>4. Segurança dos Dados</h2>
                    <p>
                        Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso, alteração, divulgação ou destruição não autorizada.
                    </p>

                    <h2>5. Seus Direitos</h2>
                    <p>
                        Você tem o direito de acessar, corrigir ou excluir suas informações pessoais. Caso deseje exercer esses direitos, entre em contato através de nossos canais de suporte.
                    </p>
                </div>
            </div>
        </div>
    );
};
