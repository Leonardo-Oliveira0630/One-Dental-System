const fs = require('fs');
const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  const oldEffect = `  useEffect(() => {
    if (address.zipCode && address.zipCode.length >= 8 && currentOrg?.frenetToken) {
      handleQuoteShipping(address.zipCode);
    }
  }, [address.zipCode, cart]);`;

  const newEffect = `  useEffect(() => {
    const firstSupplierId = cart.length > 0 ? cart[0].product.organizationId : null;
    const supplier = firstSupplierId ? allSuppliers.find(s => s.id === firstSupplierId) : null;
    
    if (address.zipCode && address.zipCode.length >= 8 && supplier?.frenetToken) {
      handleQuoteShipping(address.zipCode, supplier.frenetToken, supplier.cep || '01001000');
    }
  }, [address.zipCode, cart, allSuppliers]);`;

  content = content.replace(oldEffect, newEffect);

  const oldHandle = `  const handleQuoteShipping = async (cep: string) => {
    if (!currentOrg?.frenetToken) return;
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
        originCep: '01001000', // Should be supplier CEP but hardcoding for now, or use currentOrg.cep if exists
        destinationCep: cep,
        items,
        frenetToken: currentOrg.frenetToken
      });`;

  const newHandle = `  const handleQuoteShipping = async (cep: string, token: string, originCep: string) => {
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
      });`;

  content = content.replace(oldHandle, newHandle);
  fs.writeFileSync(file, content);
}
