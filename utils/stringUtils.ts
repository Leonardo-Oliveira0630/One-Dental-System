/**
 * Utilitários de manipulação e busca de texto sem acentos e com tolerância a variações fonéticas/ortográficas.
 */

/**
 * Remove acentos, diacríticos e normaliza o texto para minúsculas e sem espaços extras.
 * Ex: "João da Conceição" -> "joao da conceicao"
 */
export function normalizeText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Remove toda pontuação e caracteres não alfanuméricos após a normalização.
 * Útil para comparar CPFs, CNPJs, telefones e CROs (ex: "123.456.789-00" -> "12345678900").
 */
export function removePunctuation(text: any): string {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

/**
 * Calcula a distância de Levenshtein entre duas strings para tolerância a pequenos erros de digitação.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Verifica se uma palavra da busca é similar ou compatível com uma palavra do alvo.
 */
export function isSimilarWord(queryWord: string, targetWord: string): boolean {
  if (!queryWord || !targetWord) return false;
  
  // Correspondência exata ou substring
  if (targetWord.includes(queryWord) || queryWord.includes(targetWord)) return true;

  // Prefixo (ex: "odon" bate com "odontologia")
  if (targetWord.startsWith(queryWord) || queryWord.startsWith(targetWord)) return true;

  // Tolerância a variações ortográficas (ex: Luiz / Luis, Mateus / Matheus, Rafael / Raphaela)
  const maxLen = Math.max(queryWord.length, targetWord.length);
  if (maxLen <= 3) {
    return queryWord === targetWord;
  }
  
  const dist = levenshteinDistance(queryWord, targetWord);
  if (maxLen <= 5) {
    return dist <= 1; // 1 caractere de diferença para palavras curtas
  }
  if (maxLen <= 8) {
    return dist <= 2; // 2 caracteres de diferença para palavras médias
  }
  return dist <= 3; // 3 para palavras longas
}

/**
 * Função principal de busca resiliente:
 * - Não diferencia maiúsculas de minúsculas
 * - Remove acentos e caracteres especiais (á, à, ã, â, é, ê, í, ó, ô, õ, ú, ü, ç, etc.)
 * - Suporta múltiplos termos em qualquer ordem (ex: "silva joao" encontra "Dr. João Carlos da Silva")
 * - Busca inteligente em múltiplos campos (Nome, Clínica, E-mail, CRO, CPF/CNPJ, Telefone)
 * - Tolerante a pontuações em documentos e telefones
 * - Tolerante a variações fonéticas e pequenos erros de digitação em nomes parecidos
 */
export function matchesSearchQuery(query: string, ...targetFields: (string | number | null | undefined)[]): boolean {
  const normQuery = normalizeText(query);
  if (!normQuery) return true;

  const rawTargetCombined = targetFields.filter(Boolean).map(f => String(f)).join(' ');
  const normTarget = normalizeText(rawTargetCombined);
  if (!normTarget) return false;

  // 1. Verificação direta de substring normalizada (rápido e exato)
  if (normTarget.includes(normQuery)) return true;

  // 2. Verificação de números/documentos sem pontuação (ex: CPF, CRO, Telefone)
  const cleanQueryAlphanum = removePunctuation(normQuery);
  const cleanTargetAlphanum = removePunctuation(rawTargetCombined);
  if (cleanQueryAlphanum.length >= 3 && cleanTargetAlphanum.includes(cleanQueryAlphanum)) {
    return true;
  }

  // 3. Verificação por tokens/palavras da busca
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  const targetWords = normTarget.split(/[\s,.\-_/\\()]+/).filter(w => w.length > 0);

  // Cada token digitado pelo usuário deve ser encontrado ou ser similar a alguma palavra do alvo
  const allTokensMatched = queryTokens.every(qToken => {
    // Se o token existe como substring no texto alvo completo
    if (normTarget.includes(qToken)) return true;

    // Se o token alfanumérico existe no alvo alfanumérico
    const cleanQToken = removePunctuation(qToken);
    if (cleanQToken.length >= 3 && cleanTargetAlphanum.includes(cleanQToken)) return true;

    // Se é similar a alguma das palavras do alvo
    return targetWords.some(tWord => isSimilarWord(qToken, tWord));
  });

  return allTokensMatched;
}

export interface SearchableClient {
  name?: string | null;
  clinicName?: string | null;
  email?: string | null;
  cro?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  [key: string]: any;
}

const COMMON_HONORIFICS = new Set([
  'dr', 'dra', 'dr.', 'dra.', 'doutor', 'doutora',
  'prof', 'profa', 'prof.', 'profa.', 'cd', 'cirurgiao', 'cirurgia'
]);

/**
 * Extrai palavras de um nome desconsiderando honoríficos comuns (Dr., Dra., etc.)
 * para que buscas por primeiro nome encontrem tanto "Marcos Silva" quanto "Dr. Marcos Silva" com máxima relevância.
 */
function extractClientNameTokens(name: any): { words: string[]; rawWords: string[]; hasHonorific: boolean } {
  const norm = normalizeText(name);
  if (!norm) return { words: [], rawWords: [], hasHonorific: false };
  const rawWords = norm.split(/[\s,.\-_/\\()]+/).filter(w => w.length > 0);
  if (rawWords.length > 1 && COMMON_HONORIFICS.has(rawWords[0])) {
    return { words: rawWords.slice(1), rawWords, hasHonorific: true };
  }
  return { words: rawWords, rawWords, hasHonorific: false };
}

/**
 * Calcula a pontuação de relevância de um cliente para uma busca (menor pontuação = maior prioridade no resultado).
 * 
 * Hierarquia de relevância:
 * 1. Correspondência exata no primeiro nome (ex: buscou "Marcos" e o primeiro nome é "Marcos")
 * 2. Correspondência por prefixo no primeiro nome (ex: buscou "Mar" e o primeiro nome começa com "Mar": "Maria", "Mario", "Marcio", "Marcos")
 *    - Quanto mais próximo do comprimento da busca, melhor posicionado.
 * 3. Correspondência exata em segundo nome ou sobrenome (ex: buscou "Marcos" e o cliente se chama "João Marcos")
 * 4. Correspondência por prefixo em segundo nome ou sobrenome
 * 5. Correspondência em nome da clínica/consultório
 * 6. Correspondência por outros dados (documentos, CRO, telefone, e-mail)
 * 7. Semelhança fonética/ortográfica (distância de Levenshtein)
 * 
 * Retorna `null` se o cliente não atender aos critérios da busca.
 */
export function calculateClientSearchScore(query: string, client: SearchableClient): number | null {
  const normQuery = normalizeText(query);
  if (!normQuery) return 0;

  // Tratar honoríficos na busca também (ex: usuário digitou "Dr Marcos")
  let queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1 && COMMON_HONORIFICS.has(queryTokens[0])) {
    queryTokens = queryTokens.slice(1);
  }
  if (queryTokens.length === 0) return 0;

  const { words: nameWords, hasHonorific } = extractClientNameTokens(client.name);
  const normClinic = normalizeText(client.clinicName);
  const clinicWords = normClinic ? normClinic.split(/[\s,.\-_/\\()]+/).filter(w => w.length > 0) : [];
  
  const rawDocs = [client.cro, client.cpfCnpj, client.phone, client.whatsapp, client.email].filter(Boolean).map(String).join(' ');
  const cleanDocs = removePunctuation(rawDocs);
  const normDocs = normalizeText(rawDocs);

  const tokenScores: number[] = [];
  const matchedWordIndices: number[] = [];

  for (const qToken of queryTokens) {
    let bestScoreForToken: number | null = null;
    let bestWordIndex = -1;

    // 1. Avaliar palavras do nome do cliente
    for (let idx = 0; idx < nameWords.length; idx++) {
      const w = nameWords[idx];
      let score: number | null = null;

      if (w === qToken) {
        // Correspondência exata de palavra
        if (idx === 0) score = 10; // Primeiro nome exato (topo absoluto)
        else if (idx === 1) score = 100; // Segundo nome exato
        else if (idx === 2) score = 200; // Terceiro nome exato
        else score = 250 + idx * 5;
      } else if (w.startsWith(qToken)) {
        // Começa com o termo digitado (prefixo)
        const lenDiff = w.length - qToken.length;
        const lenPenalty = Math.min(lenDiff * 0.4, 25);
        if (idx === 0) score = 20 + lenPenalty; // Primeiro nome começa com a busca
        else if (idx === 1) score = 120 + lenPenalty; // Segundo nome começa com a busca
        else if (idx === 2) score = 220 + lenPenalty; // Terceiro nome começa com a busca
        else score = 260 + idx * 5 + lenPenalty;
      } else if (w.includes(qToken)) {
        // Contém no meio da palavra
        const subPos = w.indexOf(qToken);
        if (idx === 0) score = 300 + subPos;
        else score = 400 + idx * 10 + subPos;
      } else if (qToken.length >= 4 && levenshteinDistance(qToken, w) <= 1) {
        // Tolerância a pequenos erros de digitação ou variações (ex: Markos / Marcos, Luiz / Luis, Mateus / Matheus)
        const dist = levenshteinDistance(qToken, w);
        if (idx === 0) score = 500 + dist * 20;
        else score = 600 + dist * 20;
      }

      if (score !== null && (bestScoreForToken === null || score < bestScoreForToken)) {
        bestScoreForToken = score;
        bestWordIndex = idx;
      }
    }

    // 2. Se não encontrou no nome ou se encontrou apenas algo fraco, verificar nome da clínica
    if (bestScoreForToken === null || bestScoreForToken >= 300) {
      for (let cIdx = 0; cIdx < clinicWords.length; cIdx++) {
        const cw = clinicWords[cIdx];
        let cScore: number | null = null;
        if (cw === qToken) {
          cScore = cIdx === 0 ? 320 : 360;
        } else if (cw.startsWith(qToken)) {
          const lenDiff = cw.length - qToken.length;
          cScore = (cIdx === 0 ? 340 : 380) + Math.min(lenDiff * 0.4, 20);
        } else if (cw.includes(qToken)) {
          cScore = 450 + cIdx * 10;
        }

        if (cScore !== null && (bestScoreForToken === null || cScore < bestScoreForToken)) {
          bestScoreForToken = cScore;
          bestWordIndex = 50 + cIdx;
        }
      }
    }

    // 3. Se ainda não encontrou, verificar documentos, telefone, CRO, email
    if (bestScoreForToken === null) {
      const cleanToken = removePunctuation(qToken);
      if (cleanToken.length >= 3 && cleanDocs.includes(cleanToken)) {
        bestScoreForToken = 750;
      } else if (normDocs.includes(qToken)) {
        bestScoreForToken = 780;
      }
    }

    // Se um dos tokens digitados não encontrou nenhuma correspondência, descarta este cliente
    if (bestScoreForToken === null) {
      return null;
    }

    tokenScores.push(bestScoreForToken);
    matchedWordIndices.push(bestWordIndex);
  }

  // Combinar a pontuação de todos os tokens
  let totalScore = tokenScores.reduce((sum, s) => sum + s, 0) / tokenScores.length;

  // Bônus se os múltiplos termos digitados bateram em ordem sequencial no nome (ex: "Marcos" depois "Silva")
  let inOrder = true;
  for (let i = 1; i < matchedWordIndices.length; i++) {
    if (matchedWordIndices[i] <= matchedWordIndices[i - 1] || matchedWordIndices[i] < 0) {
      inOrder = false;
      break;
    }
  }

  if (tokenScores.length > 1) {
    if (inOrder) {
      totalScore -= 5; // Bônus de sequência correta
    } else {
      totalScore += 40; // Penalidade por fora de ordem
    }
  }

  if (hasHonorific) {
    totalScore += 1; // Leve desempate para clientes com Dr./Dra.
  }

  return totalScore;
}

/**
 * Filtra e ordena uma lista de clientes garantindo que os clientes com nomes mais parecidos
 * apareçam primeiro (primeiro nome tem prioridade, seguido de segundo nome/sobrenome).
 */
export function filterAndSortClients<T extends SearchableClient>(
  clients: T[],
  query: string,
  secondarySort?: (a: T, b: T) => number
): T[] {
  const normQuery = normalizeText(query);
  if (!normQuery) {
    if (secondarySort) {
      return [...clients].sort(secondarySort);
    }
    return clients;
  }

  const scored: { item: T; score: number }[] = [];

  for (const client of clients) {
    const score = calculateClientSearchScore(query, client);
    if (score !== null) {
      scored.push({ item: client, score });
    }
  }

  scored.sort((a, b) => {
    // 1. Menor pontuação = mais parecido / prioritário
    if (Math.abs(a.score - b.score) > 0.001) {
      return a.score - b.score;
    }

    // 2. Critério de desempate fornecido (ex: saldo devedor ou ordem alfabética)
    if (secondarySort) {
      const sec = secondarySort(a.item, b.item);
      if (sec !== 0) return sec;
    }

    // 3. Ordem alfabética padrão por nome
    const nameA = a.item.name || '';
    const nameB = b.item.name || '';
    return nameA.localeCompare(nameB, 'pt-BR');
  });

  return scored.map(s => s.item);
}

/**
 * Converte qualquer valor monetário (seja número, string no formato brasileiro "1.550,00" ou internacional "1550.00")
 * em um número de ponto flutuante válido.
 * Ex: "1.550,00" -> 1550
 * Ex: "1550,00" -> 1550
 * Ex: "1550.00" -> 1550
 * Ex: "1550" -> 1550
 * Ex: 1550 -> 1550
 */
export function parseBrazilianCurrency(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  if (!str) return 0;

  // Se tem separador decimal com vírgula (ex: "1.550,00" ou "1550,00" ou "1,55")
  if (str.includes(',')) {
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Se tem múltiplos pontos (ex: "1.550.000")
  if (str.includes('.') && (str.match(/\./g) || []).length > 1) {
    const normalized = str.replace(/\./g, '');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Aplica máscara de moeda brasileira em tempo real no onChange de inputs.
 * Ex: Digitar "155000" -> "1.550,00"
 */
export function formatCurrencyInputMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
