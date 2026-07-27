import React from 'react';
import { FileText, ArrowLeft, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsOfUse = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-6 md:p-12 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-bold text-sm uppercase tracking-widest">Voltar para o Início</span>
                </button>
                
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Termos e Condições de Uso da Plataforma</h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
                            Contrato de Licenciamento de Software (SaaS) • Atualizado em Julho de 2026
                        </p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 text-sm md:text-base leading-relaxed space-y-6">
                    
                    <section>
                        <h2 className="text-lg font-black text-slate-900">1. Aceitação dos Termos e Objeto</h2>
                        <p>
                            Ao criar uma conta ou utilizar a plataforma de gestão de laboratórios de prótese e clínicas odontológicas, você (pessoa física ou jurídica contratante) concorda com estes Termos de Uso e com nossa Política de Privacidade. A plataforma opera sob modelo Software como Serviço (SaaS).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">2. Responsabilidade do Usuário e Dados de Saúde</h2>
                        <p>
                            O Usuário/Contratante é integralmente responsável por:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Manter a confidencialidade de suas credenciais de acesso (login e senha).</li>
                            <li>Garantir que possui base legal (consentimento ou hipótese regulatória do CFO/LGPD) para cadastrar dados e prontuários odontológicos de seus pacientes na plataforma.</li>
                            <li>A exatidão e veracidade dos dados clínicos, prescrições e ordens de serviço inseridas na plataforma.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">3. Direitos de Propriedade dos Dados e Exportação</h2>
                        <p>
                            Os dados cadastrados pelo Usuário (prontuários, tabelas de preços, cadastros de clientes e histórico financeiro) pertencem exclusivamente ao Usuário/Contratante. A plataforma garante a possibilidade de exportação e visualização de dados e relatórios a qualquer momento durante a vigência do contrato.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">4. Cancelamento, Rescisão e Exclusão Definitiva (LGPD)</h2>
                        <p>
                            O Contratante pode encerrar sua assinatura a qualquer momento. Conforme regulamentado em nossa Política de Privacidade:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                O Administrador da conta possui o direito de executar a <strong>Exclusão Total do Sistema</strong> diretamente no painel do usuário, mediante verificação por código de segurança via e-mail.
                            </li>
                            <li>
                                Após a confirmação da exclusão, todos os registros e credenciais serão destruídos de forma definitiva do banco de dados, ressalvada a retenção de dados obrigatória para cumprimento de obrigação fiscal ou regulatória.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">5. Disponibilidade e Suporte Técnico</h2>
                        <p>
                            Esforçamo-nos para manter o índice de disponibilidade do sistema em 99,5% (SLA), com backups automatizados diários e suporte técnico disponível através de nossos canais oficiais.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">6. Foro e Legislação Aplicável</h2>
                        <p>
                            Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial a Lei nº 13.709/2018 (LGPD), a Lei nº 12.965/2014 (Marco Civil da Internet) e o Código de Defesa do Consumidor. Fica eleito o Foro da Comarca do domicilio do Usuário ou da sede da operadora para dirimir eventuais controvérsias.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

