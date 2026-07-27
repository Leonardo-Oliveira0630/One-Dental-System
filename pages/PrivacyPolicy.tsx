import React from 'react';
import { Shield, ArrowLeft, Mail, Lock, FileText, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicy = () => {
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
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Política de Privacidade & Proteção de Dados (LGPD)</h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
                            Conformidade integral com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) • Atualizado em Julho de 2026
                        </p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 text-sm md:text-base leading-relaxed space-y-6">
                    
                    {/* RESUMO EXECUTIVO LGPD */}
                    <div className="p-4 md:p-6 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3 not-prose">
                        <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                            <UserCheck size={20} className="text-blue-600" />
                            <span>Resumo de Compromisso LGPD</span>
                        </div>
                        <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                            Nossa plataforma foi desenvolvida sob o princípio da <strong>Privacidade por Design (Privacy by Design)</strong>. Garantimos aos nossos usuários e aos pacientes cadastrados transparência total, criptografia ponta a ponta, controle irrestrito sobre seus dados e mecanismos automatizados de exclusão definitiva mediante confirmação de segurança por e-mail.
                        </p>
                    </div>

                    <section>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            1. Papéis na Proteção de Dados (Controlador vs. Operador)
                        </h2>
                        <p>
                            Para fins do Art. 5º da LGPD:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Clínicas e Laboratórios Odontológicos (Contratantes):</strong> Atuam como <strong>Controladores</strong> dos dados pessoais e sensíveis de seus respectivos pacientes, protéticos, dentistas e colaboradores, sendo responsáveis pelas decisões referentes ao tratamento desses dados.
                            </li>
                            <li>
                                <strong>Nossa Plataforma:</strong> Atua como <strong>Operadora</strong>, realizando o tratamento de dados exclusivamente em nome e segundo as instruções do Controlador, aplicando rigidez técnica e operacional de segurança.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            2. Dados Pessoais Coletados e Tratados
                        </h2>
                        <p>
                            Coletamos e tratamos apenas os dados estritamente necessários para a execução dos serviços de gestão odontológica e laboratorial:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Dados Cadastrais de Usuários:</strong> Nome completo, CPF/CNPJ, e-mail, telefone/WhatsApp, foto de perfil, papel de acesso (Admin, Gestor, Colaborador, Cliente/Dentista) e dados da organização.
                            </li>
                            <li>
                                <strong>Dados Pessoais Sensíveis de Saúde (Art. 5º, II):</strong> Prontuários odontológicos, histórico clínico, anamneses, prescrições, fotos de odontogramas, especificações de trabalhos protéticos e imagens radiográficas de pacientes cadastrados pelas clínicas.
                            </li>
                            <li>
                                <strong>Dados Financeiros e de Cobrança:</strong> Histórico de pagamentos, faturas, lotes de cobrança e chaves PIX/cartão processados com criptografia via parceiros de pagamento (ex: Asaas).
                            </li>
                            <li>
                                <strong>Dados de Navegação e Dispositivo:</strong> Endereço IP, tokens de notificação Push (FCM), logs de acesso e preferências do sistema.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            3. Hipóteses Legais para Tratamento (Bases Legais)
                        </h2>
                        <p>
                            O tratamento de dados em nossa plataforma é fundamentado estritamente nas seguintes hipóteses da LGPD:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Execução de Contrato (Art. 7º, V e Art. 11, II, "d"):</strong> Para prestação dos serviços de gestão, acompanhamento de ordens de serviço e faturamento.</li>
                            <li><strong>Tutela da Saúde (Art. 11, II, "f"):</strong> Para gestão de prontuários e procedimentos odontológicos em serviços de saúde.</li>
                            <li><strong>Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):</strong> Guarda de documentos fiscais, contábeis e prontuários conforme normas do Conselho Federal de Odontologia (CFO).</li>
                            <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para melhoria contínua da segurança da informação, prevenção a fraudes e suporte técnico.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            4. Direitos dos Titulares de Dados (Art. 18 da LGPD)
                        </h2>
                        <p>
                            Você, como titular de dados pessoais, possui os seguintes direitos garantidos por lei, exercitáveis diretamente na plataforma ou via contato com o Encarregado (DPO):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose my-4">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Confirmação da existência de tratamento
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Acesso facilitado aos dados mantidos
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Correção de dados incompletos ou desatualizados
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Portabilidade e exportação de relatórios
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Eliminação definitiva da conta e dados (Direito ao Esquecimento)
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                                ✓ Revogação de consentimentos e oposições
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            5. Mecanismo Real de Exclusão de Dados (Direito à Eliminação)
                        </h2>
                        <p>
                            Cumprindo rigorosamente o Art. 18, VI da LGPD, disponibilizamos em <strong>Meu Perfil &gt; Excluir Conta</strong> um procedimento automatizado e transparente:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Usuários Comuns:</strong> Podem excluir sua conta de acesso e credenciais de forma imediata.
                            </li>
                            <li>
                                <strong>Administradores da Organização:</strong> Podem acionar o apagamento completo do sistema da empresa (incluindo cadastros, ordens de serviço, mensagens, tabelas de preço e vínculos de usuários).
                            </li>
                            <li>
                                <strong>Verificação de Segurança Obrigatória:</strong> Qualquer solicitação de exclusão exige a inserção de um código de confirmação de 6 dígitos enviado ao e-mail cadastrado do titular + digitação da palavra de confirmação <code>EXCLUIR</code>, garantindo que nenhum dado seja apagado indevidamente.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            6. Segurança da Informação & Armazenamento
                        </h2>
                        <p>
                            Empregamos infraestrutura de classe mundial (Google Cloud & Firebase) com os seguintes padrões de proteção:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Criptografia em Trânsito e em Repouso:</strong> Conexões forçadas via HTTPS/TLS 1.3 e armazenamento criptografado (AES-256).</li>
                            <li><strong>Controle de Acesso Baseado em Papéis (RBAC):</strong> Isolamento de dados por organização (Tenant Separation) e Firestore Security Rules estritas.</li>
                            <li><strong>Auditoria e Prevenção a Acessos Não Autorizados:</strong> Monitoramento contínuo de tentativas de autenticação e tokens JWT efêmeros.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900">
                            7. Encarregado de Proteção de Dados (DPO) & Contato
                        </h2>
                        <p>
                            Para exercer seus direitos de titular, tirar dúvidas sobre o tratamento de seus dados pessoais ou reportar incidentes de segurança, entre em contato diretamente com nosso Encarregado de Proteção de Dados (DPO):
                        </p>
                        <div className="p-4 bg-slate-900 text-white rounded-2xl not-prose space-y-2 mt-3">
                            <div className="flex items-center gap-2 font-bold text-sm text-blue-400">
                                <Mail size={18} />
                                <span>Canal Oficial de Privacidade e DPO</span>
                            </div>
                            <p className="text-xs text-slate-300">
                                <strong>E-mail do DPO:</strong> dpo@smileprox.com.br / leooliveira0630@gmail.com
                            </p>
                            <p className="text-xs text-slate-400">
                                Prazo de resposta para requisições de titulares: Até 15 dias úteis, conforme regulamentação da ANPD.
                            </p>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

