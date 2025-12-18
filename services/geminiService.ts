
import { GoogleGenAI } from "@google/genai";
import { Job, JobStatus, UrgencyLevel } from "../types";

const initGenAI = () => {
  // In Vite, process.env.API_KEY is replaced by a string literal at build time.
  // We access it directly to ensure the replacement works.
  // Checking 'typeof process' is unnecessary and causes issues in the browser.
  const apiKey = process.env.API_KEY;
  if (apiKey) {
     return new GoogleGenAI({ apiKey });
  }
  
  console.warn("Gemini API Key is missing.");
  return null;
};

export const getProductionInsights = async (jobs: Job[]): Promise<string> => {
  const ai = initGenAI();
  if (!ai) return "Serviço de IA Indisponível (Falta Chave API ou Configuração).";

  // Prepare data summary for the AI
  const totalJobs = jobs.length;
  const delayed = jobs.filter(j => j.dueDate < new Date() && j.status !== JobStatus.COMPLETED).length;
  const vip = jobs.filter(j => j.urgency === UrgencyLevel.VIP && j.status !== JobStatus.COMPLETED).length;
  
  // Group by sector (mock logic for sector distribution)
  const sectorCounts: Record<string, number> = {};
  jobs.forEach(j => {
    if(j.currentSector) {
      sectorCounts[j.currentSector] = (sectorCounts[j.currentSector] || 0) + 1;
    }
  });

  const prompt = `
    Você é um gerente de produção industrial especialista em Laboratórios de Prótese Dentária.
    Analise o seguinte snapshot da produção atual e forneça 3 sugestões táticas e curtas (em bullet-points) para otimizar o fluxo e reduzir atrasos. Responda em Português do Brasil.

    Dados:
    - Total de Trabalhos Ativos: ${totalJobs}
    - Trabalhos Atrasados: ${delayed}
    - Trabalhos VIP/Urgentes Ativos: ${vip}
    - Carga por Setor: ${JSON.stringify(sectorCounts)}

    Formato:
    1. [Título em Negrito]: Conselho
    2. [Título em Negrito]: Conselho
    3. [Título em Negrito]: Conselho
  `;

  try {
    // Corrected model name according to guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Nenhum insight gerado.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Falha ao gerar insights. Verifique a configuração da API.";
  }
};
