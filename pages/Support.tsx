import React, { useState } from 'react';
import { 
  HelpCircle, ArrowLeft, Mail, MessageSquare, Phone, Clock, Shield, 
  Key, FileText, ChevronDown, ChevronUp, ExternalLink, CheckCircle, Smartphone, UserCheck
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Support = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const faqItems = [
        {
            question: "Como solicitar suporte técnico ou atendimento especializado?",
            answer: "Você pode falar diretamente com nossa equipe técnica através do canal oficial no WhatsApp ou pelo e-mail suporte@labprox.com.br. Nosso atendimento funciona de segunda a sexta-feira, das 08:00 às 18:00 (horário de Brasília)."
        },
        {
            question: "Como funcionam os backups e a segurança dos dados clínicos e laboratoriais?",
            answer: "Todos os dados de pacientes, modelos 3D, ordens de serviço e transações financeiras são sincronizados em nuvem criptografada de alta disponibilidade (SSL/TLS 256 bits), com rotinas contínuas de redundância e conformidade com as normas sanitárias e LGPD."
        },
        {
            question: "Como redefinir minha senha de acesso?",
            answer: "Na tela de login, clique no link 'Esqueceu a senha?'. Informe seu e-mail cadastrado e você receberá um link seguro para redefinição imediata de senha."
        },
        {
            question: "Como solicitar a exclusão da minha conta e dados pessoais (LGPD)?",
            answer: "Em conformidade com a LGPD e as diretrizes da Apple/Google, você pode solicitar a exclusão completa da sua conta acessando 'Meu Perfil' > 'Excluir Conta' dentro do aplicativo, ou enviando uma solicitação formal para dpo@labprox.com.br com o assunto 'Solicitação de Exclusão de Dados'."
        },
        {
            question: "Como conectar um laboratório a uma clínica odontológica parceira?",
            answer: "Laboratórios e dentistas podem se conectar através do menu 'Parcerias / Clientes', convidando parceiros por e-mail, link direto ou QR Code para troca instantânea de ordens de serviço e tabelas de preços."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800">
            <div className="max-w-4xl mx-auto bg-white p-5 sm:p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                
                {/* Header Back Button */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold text-xs uppercase tracking-widest">Voltar para o Início</span>
                    </button>
                    <Link 
                        to="/login" 
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Ir para o Login →
                    </Link>
                </div>
                
                {/* Title Banner */}
                <div className="flex items-start md:items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <HelpCircle size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Suporte Técnico & Central de Ajuda</h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
                            Atendimento ao cliente, canal de suporte para a App Store / Google Play e documentação do ecossistema Labprox.
                        </p>
                    </div>
                </div>

                {/* Direct Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-base">
                            <MessageSquare size={22} className="text-emerald-600" />
                            <span>Suporte via WhatsApp</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Atendimento rápido via mensagens de texto e áudio com nossa equipe de suporte.
                        </p>
                        <a 
                            href="https://wa.me/5511999999999?text=Ol%C3%A1%2C+preciso+de+suporte+no+Labprox" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                            <span>Iniciar Conversa no WhatsApp</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>

                    <div className="p-5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2.5 text-blue-900 font-bold text-base">
                            <Mail size={22} className="text-blue-600" />
                            <span>Suporte por E-mail</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Envie dúvidas, reportes de problemas ou solicitações técnicas por e-mail.
                        </p>
                        <a 
                            href="mailto:suporte@labprox.com.br" 
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                            <span>suporte@labprox.com.br</span>
                            <Mail size={14} />
                        </a>
                    </div>
                </div>

                {/* Operating Hours and Info Banner */}
                <div className="p-4 bg-slate-100/80 border border-slate-200/80 rounded-2xl flex items-center gap-3 text-xs text-slate-700 font-medium">
                    <Clock size={20} className="text-slate-500 shrink-0" />
                    <div>
                        <strong className="text-slate-900 font-bold">Horário de Atendimento:</strong> Segunda a Sexta-feira, das 08:00 às 18:00 (Horário de Brasília - BRT). Respostas por e-mail em até 24 horas úteis.
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <HelpCircle size={20} className="text-blue-600" />
                        <span>Perguntas Frequentes (FAQ)</span>
                    </h2>

                    <div className="space-y-3">
                        {faqItems.map((item, index) => (
                            <div 
                                key={index} 
                                className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 bg-white"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full text-left p-4 font-bold text-slate-800 text-sm flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                                >
                                    <span>{item.question}</span>
                                    {openFaq === index ? (
                                        <ChevronUp size={18} className="text-blue-600 shrink-0" />
                                    ) : (
                                        <ChevronDown size={18} className="text-slate-400 shrink-0" />
                                    )}
                                </button>
                                {openFaq === index && (
                                    <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Links Footer Section */}
                <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-4 font-bold">
                        <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                            Política de Privacidade (LGPD)
                        </Link>
                        <span>•</span>
                        <Link to="/terms" className="hover:text-blue-600 transition-colors">
                            Termos de Uso
                        </Link>
                    </div>
                    <div className="text-[11px]">
                        © 2026 Labprox. Todos os direitos reservados.
                    </div>
                </div>

            </div>
        </div>
    );
};
