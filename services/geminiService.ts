
import { GoogleGenAI } from "@google/genai";
import { Job, JobStatus, UrgencyLevel } from "../types";

export const getProductionInsights = async (jobs: Job[]): Promise<string> => {
  /* Following @google/genai guidelines: Always use the direct initialization format with process.env.API_KEY. Assume the key is pre-configured and accessible. */
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === '""' || apiKey.trim() === '') {
    apiKey = window.prompt("A chave da API Gemini não foi encontrada no ambiente. Por favor, insira sua chave da API (GEMINI_API_KEY) para gerar insights:") || "";
  }
  
  if (!apiKey) {
    return "Falha: Chave de API ausente.";
  }
  
  const ai = new GoogleGenAI({ apiKey: apiKey });

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

export const parseBulkInventory = async (
  text?: string,
  file?: { mimeType: string; b64Data: string },
  providedApiKey?: string
) => {
  let apiKey = providedApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === '""' || apiKey.trim() === '') {
    apiKey = window.prompt("A chave da API Gemini não foi encontrada. Por favor, insira sua chave da API (GEMINI_API_KEY) para usar a IA:") || "";
  }
  
  if (!apiKey) {
    throw new Error("API key is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const prompt = `
    Analise a tabela de produtos fornecida (pode ser texto, CSV, XML, PDF ou Excel) e extraia os itens de estoque.
    A primeira linha da tabela (ou os cabeçalhos) conterá o nome dos respectivos campos.
    A partir da segunda linha, cada linha representa um produto e cada coluna representa o valor do campo.

    Faça o mapeamento correto das colunas considerando:
    - "Código" -> code (string)
    - "Produto" -> name (string, obrigatório)
    - "Categoria" -> category (string)
    - "Estoque atual" -> currentStock (número)
    - "Estoque mínimo" -> minStock (número)
    - "Custo médio" ou "Custo" -> costPrice (número, ignorar o "R$")
    - "Preço de venda" ou "Valor de venda" -> sellPrice (número, ignorar o "R$")
    - "Descrição" -> description (string)

    Atenção: Os valores numéricos monetários na tabela podem conter "R$" e vírgulas para decimais (ex: R$17,33). Converta-os para número float (ex: 17.33).

    Retorne APENAS um JSON array válido de objetos. Exemplo do formato esperado:
    [
      {
        "code": "301.03",
        "name": "EFF - A1.1/C1.1 - ANÁLOGO DO IMPLANTE",
        "category": "ANÁLOGO",
        "description": "ANÁLOGO DO IMPLANTE",
        "currentStock": 36,
        "minStock": 5,
        "costPrice": 17.33,
        "sellPrice": 29.76
      }
    ]
  `;

  try {
    let contents: any;
    if (file) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: file.mimeType,
              data: file.b64Data
            }
          },
          {
            text: prompt
          }
        ]
      };
    } else {
      contents = prompt + `\n\nO texto de entrada é:\n${text}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    if (!response.text) return [];
    
    try {
      let rawText = response.text.trim();
      // Remove markdown code blocks if present
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return [];
    }
  } catch (error) {
    console.error("Gemini Bulk Parse Error:", error);
    return [];
  }
};
