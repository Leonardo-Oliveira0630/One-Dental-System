
import { GoogleGenAI } from "@google/genai";
import { Job, JobStatus, UrgencyLevel } from "../types";

export const getProductionInsights = async (jobs: Job[]): Promise<string> => {
  /* Following @google/genai guidelines: Always use the direct initialization format with process.env.API_KEY. Assume the key is pre-configured and accessible. */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  file?: { mimeType: string; b64Data: string }
) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.API_KEY,
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

    Tente encontrar os seguintes campos (ou seus equivalentes nos cabeçalhos fornecidos):
    - Código (SKU)
    - Produto (Nome do item, obrigatório)
    - Categoria
    - Descrição
    - Estoque Atual (número)
    - Estoque Mínimo (número)
    - Custo Médio ou Unitário (número, ex: 10.50)
    - Preço de Venda (número, ex: 25.90)

    Retorne APENAS um JSON array válido de objetos em Português. Exemplo do formato esperado:
    [
      {
        "code": "123",
        "name": "Produto A",
        "category": "Resinas",
        "description": "Descrição do Produto A",
        "currentStock": 10,
        "minStock": 2,
        "costPrice": 10.50,
        "sellPrice": 25.90
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
      model: 'gemini-3.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    if (!response.text) return [];
    
    try {
      const parsed = JSON.parse(response.text);
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
