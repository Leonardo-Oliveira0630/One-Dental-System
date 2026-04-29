
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

export const searchInternationalZip = async (zip: string, countryCode: string = 'us'): Promise<AddressResult | null> => {
    try {
        // Zippopotam.us (Free, no auth required)
        const response = await fetch(`https://api.zippopotam.us/${countryCode}/${zip}`);
        if (response.ok) {
            const data = await response.json();
            const place = data.places[0];
            return {
                cep: data['post code'],
                address: '',
                neighborhood: '',
                city: place['place name'],
                state: place['state abbreviation'],
                country: data.country
            };
        }
    } catch (error) {
        console.error("Error fetching international ZIP from Zippopotam:", error);
    }
    return null;
};

/**
 * FedEx Address Validation API
 * Note: Requires FedEx API Client ID and Client Secret
 */
export const searchFedExAddress = async (streetLines: string[], city: string, stateOrProvinceCode: string, postalCode: string, countryCode: string): Promise<any> => {
    const clientId = (import.meta as any).env.VITE_FEDEX_CLIENT_ID;
    const clientSecret = (import.meta as any).env.VITE_FEDEX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn("FedEx API keys not configured.");
        return null; // Can't proceed without token
    }

    try {
        // 1. Get OAuth Token
        const authResponse = await fetch('https://apis.fedex.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        if (!authResponse.ok) return null;
        const authData = await authResponse.json();
        const token = authData.access_token;

        // 2. Validate Address
        const validateResponse = await fetch('https://apis.fedex.com/address/v1/addresses/resolve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                addressesToValidate: [{
                    address: {
                        streetLines,
                        city,
                        stateOrProvinceCode,
                        postalCode,
                        countryCode
                    }
                }]
            })
        });

        if (validateResponse.ok) {
            const data = await validateResponse.json();
            return data;
        }
    } catch (error) {
        console.error("Error with FedEx Address Validation:", error);
    }
    return null;
};
