const fs = require('fs');

const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('const [shippingError, setShippingError] = useState')) {
    content = content.replace(/const \[shippingQuotes, setShippingQuotes\] = useState<any\[\]>\(\[\]\);/, "const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);\n  const [shippingError, setShippingError] = useState<string | null>(null);");
  }

  const oldHandle = `  const handleQuoteShipping = async (cep: string, token: string, originCep: string) => {
    setIsQuotingShipping(true);
    setShippingQuotes([]);
    setSelectedShippingService(null);
    try {
      const items = cart.map(item => ({
        id: item.product.id,
        price: item.product.isPromotion && item.product.promotionalPrice ? item.product.promotionalPrice : item.product.sellPrice,
        quantity: item.quantity,
        weight: 0.5,
        height: 10,
        width: 15,
        length: 20
      }));
      const res = await api.apiCalculateFrenetShipping({
        originCep,
        destinationCep: cep,
        items,
        frenetToken: token
      });
      if (res && res.services) {
        setShippingQuotes(res.services.filter((s: any) => !s.Error));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsQuotingShipping(false);
    }
  };`;

  const newHandle = `  const handleQuoteShipping = async (cep: string, token: string, originCep: string) => {
    setIsQuotingShipping(true);
    setShippingQuotes([]);
    setShippingError(null);
    setSelectedShippingService(null);
    try {
      const items = cart.map(item => ({
        id: item.product.id,
        price: item.product.isPromotion && item.product.promotionalPrice ? item.product.promotionalPrice : item.product.sellPrice,
        quantity: item.quantity,
        weight: 0.5,
        height: 10,
        width: 15,
        length: 20
      }));
      const res = await api.apiCalculateFrenetShipping({
        originCep,
        destinationCep: cep,
        items,
        frenetToken: token
      });
      if (res && res.services) {
        const validServices = res.services.filter((s: any) => !s.Error);
        if (validServices.length > 0) {
          setShippingQuotes(validServices);
        } else {
          // If there are services but all have errors, grab the first error
          const errorService = res.services.find((s: any) => s.Error && s.MsgErro);
          setShippingError(errorService ? errorService.MsgErro : "Nenhuma opção de frete disponível para este CEP.");
        }
      }
    } catch (e: any) {
      console.error(e);
      setShippingError(e.message || "Erro ao calcular frete");
    } finally {
      setIsQuotingShipping(false);
    }
  };`;

  content = content.replace(oldHandle, newHandle);
  
  // also update the render
  const oldRender = `                    ) : shippingQuotes.length > 0 ? (`;
  const newRender = `                    ) : shippingError ? (
                      <div className="p-4 text-center text-red-500 text-sm border border-red-200 rounded-xl bg-red-50">
                        {shippingError}
                      </div>
                    ) : shippingQuotes.length > 0 ? (`;
                    
  content = content.replace(oldRender, newRender);

  fs.writeFileSync(file, content);
}
