
import { GoogleGenAI } from "@google/genai";
import { Job, JobStatus, UrgencyLevel } from "../types";

// getProductionInsights provides industrial manager expert advice based on current production data.
export const getProductionInsights = async (jobs: Job[]): Promise<string> => {
  // Always obtain the API key from process.env.API_KEY and create a new instance right before making an API call.
  // This ensures the client uses the most up-to-date configuration.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare data summary for the AI
  const totalJobs = jobs.length;
  const delayed = jobs.filter(j => new Date(j.dueDate) < new Date() && j.status !== JobStatus.COMPLETED).length;
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
    // Generate content using the specified model and prompt as per updated coding guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use the .text property to access the generated string directly
    return response.text || "Nenhum insight gerado.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Falha ao gerar insights. Verifique a configuração da API.";
  }
};
