
export interface AddressResult {
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Searches for a Brazilian address using a CEP (Postal Code)
 * Tries BrasilAPI first, then ViaCEP as fallback
 */
export const searchCEP = async (cep: string): Promise<AddressResult | null> => {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;

  try {
    // Try BrasilAPI
    const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`);
    if (brasilApiResponse.ok) {
      const data = await brasilApiResponse.json();
      return {
        cep: data.cep,
        address: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        country: 'Brasil'
      };
    }

    // Fallback to ViaCEP
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    if (viaCepResponse.ok) {
        const data = await viaCepResponse.json();
        if (data.erro) return null;
        return {
            cep: data.cep,
            address: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            country: 'Brasil'
        };
    }
  } catch (error) {
    console.error("Error fetching CEP:", error);
  }

  return null;
};

/**
 * Search international addresses using Smarty (US Only or International)
 * Note: Requires API Key
 */
export const searchSmartyAddress = async (searchTerm: string): Promise<any[]> => {
    const authId = (import.meta as any).env.VITE_SMARTY_AUTH_ID;
    const authToken = (import.meta as any).env.VITE_SMARTY_AUTH_TOKEN;

    if (!authId || !authToken) {
        console.warn("Smarty API keys not configured.");
        return [];
    }

    try {
        const url = `https://us-autocomplete-pro.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}&search=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.suggestions || [];
        }
    } catch (error) {
        console.error("Error fetching from Smarty:", error);
    }
    return [];
};

/**
 * Search international addresses using Loqate
 * Note: Requires API Key
 */
export const searchLoqateAddress = async (searchTerm: string, containerId?: string): Promise<any[]> => {
    const key = (import.meta as any).env.VITE_LOQATE_API_KEY;

    if (!key) {
        console.warn("Loqate API key not configured.");
        return [];
    }

    try {
        const url = `https://api.addressy.com/Capture/Interactive/Find/v1.10/json3.ws?Key=${key}&Text=${encodeURIComponent(searchTerm)}${containerId ? `&Container=${containerId}` : ''}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.Items || [];
        }
    } catch (error) {
        console.error("Error fetching from Loqate:", error);
    }
    return [];
};

export const fetchLoqateRetrieve = async (id: string): Promise<any | null> => {
    const key = (import.meta as any).env.VITE_LOQATE_API_KEY;
    if (!key) return null;

    try {
        const url = `https://api.addressy.com/Capture/Interactive/Retrieve/v1.00/json3.ws?Key=${key}&Id=${id}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.Items?.[0] || null;
        }
    } catch (error) {
        console.error("Error retrieving from Loqate:", error);
    }
    return null;
};
