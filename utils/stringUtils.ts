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
