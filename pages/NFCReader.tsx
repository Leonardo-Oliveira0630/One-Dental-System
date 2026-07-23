import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus } from '../types';
import { Loader2, AlertTriangle, Box } from 'lucide-react';

export const NFCReader: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { jobs } = useApp();
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const boxNumber = searchParams.get('box');
        
        if (!boxNumber) {
            setError('Nenhum número de caixa fornecido na tag NFC.');
            return;
        }

        // Tentar encontrar um trabalho ativo com esta caixa
        const activeJob = jobs.find(j => 
            j.boxNumber === boxNumber && 
            ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
        );

        if (activeJob) {
            // Trabalho encontrado! Vamos redirecionar para a página do trabalho com um state para abrir o scanner
            // Como o GlobalScanner está no Layout, ele escuta eventos do teclado.
            // Mas para abrir o modal de scanner, talvez seja mais fácil redirecionar para a página de detalhes 
            // e lá podemos mostrar um botão de movimentação ou o scanner se adapta.
            // Para acionar o GlobalScanner, poderíamos disparar um evento customizado ou usar o contexto.
            // Vamos disparar um evento de teclado simulado para o GlobalScanner pegar, ou apenas redirecionar para os detalhes.
            // O ideal seria que a leitura da caixa pela URL abrisse a mesma interface do scanner.
            // Como o GlobalScanner usa um input invisível ou keypress, podemos tentar injetar o código ou apenas redirecionar.
            
            // Para não quebrar a lógica atual, redirecionamos para os detalhes do caso, e lá o usuário vê que a caixa foi lida.
            // Ou melhor, podemos disparar um evento customizado 'nfcScan' que o GlobalScanner pode escutar!
            window.dispatchEvent(new CustomEvent('nfcScan', { detail: { code: boxNumber } }));
            
            // Redirect para a home (onde o scanner vai aparecer)
            navigate('/dashboard', { replace: true });
        } else {
            setError(`Nenhum trabalho ativo encontrado para a caixa ${boxNumber}.`);
        }
        
    }, [jobs, searchParams, navigate]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Erro de Leitura NFC</h2>
                <p className="text-slate-500 mb-6 max-w-md">{error}</p>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                    Voltar ao Início
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-sm relative overflow-hidden">
                <Box size={32} className="relative z-10" />
                <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Processando Leitura NFC</h2>
            <p className="text-slate-500 mb-6 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Buscando trabalho vinculado à caixa...
            </p>
        </div>
    );
};
