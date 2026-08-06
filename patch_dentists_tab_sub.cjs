const fs = require('fs');
let content = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf8');

// 1. Add states for sub-dentist
const statesMatch = `const [formData, setFormData] = useState({`;
const subDentistStates = `  const [isAddingSubDentist, setIsAddingSubDentist] = useState(false);
  const [editingSubDentistIndex, setEditingSubDentistIndex] = useState<number | null>(null);
  const defaultSubDentist = {
      id: '', name: '', email: '', phone: '', cpfCnpj: '', cro: '',
      birthDate: '', approvalDate: '', cep: '', address: '',
      number: '', complement: '', neighborhood: '', city: '',
      state: '', country: 'Brasil', clinicName: '', clientType: 'PESSOA_FISICA' as any, deliveryViaPost: false,
      priceTableId: '', billingLimit: 0, 
      isBlocked: false, blockReason: '' as any, temporaryUnblockUntil: null as any,
      isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[]
  };
  const [subDentistFormData, setSubDentistFormData] = useState<any>(defaultSubDentist);
`;
content = content.replace(statesMatch, subDentistStates + "\n  " + statesMatch);

// 2. Add sub-dentists array to formData
content = content.replace(
    "isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[]",
    "isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[], subDentists: [] as any[]"
);

// 3. Add handlers
const handleInputMatch = `const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {`;
const subDentistHandlers = `
  const handleSubDentistInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSubDentistFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSaveSubDentist = () => {
      const newSub = { ...subDentistFormData };
      if (!newSub.id) newSub.id = Math.random().toString(36).substring(2, 9);
      
      setFormData(prev => {
          const subs = [...(prev.subDentists || [])];
          if (editingSubDentistIndex !== null) {
              subs[editingSubDentistIndex] = newSub;
          } else {
              subs.push(newSub);
          }
          return { ...prev, subDentists: subs };
      });
      setIsAddingSubDentist(false);
      setEditingSubDentistIndex(null);
  };
`;
content = content.replace(handleInputMatch, subDentistHandlers + "\n  " + handleInputMatch);

fs.writeFileSync('pages/admin/DentistsTab.tsx', content);
console.log('patched states and handlers');
