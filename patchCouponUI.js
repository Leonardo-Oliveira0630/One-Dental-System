import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const stateCode = `  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<SupplierOrder | null>(null);
  
  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);`;

content = content.replace("  const [orderSuccess, setOrderSuccess] = useState<SupplierOrder | null>(null);", stateCode);

const couponValidationCode = `  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    try {
      const q = api.query(api.collection(api.db, 'supplierCoupons'), api.where('code', '==', couponCodeInput.toUpperCase()));
      const snap = await api.getDocs(q);
      
      if (snap.empty) {
        setCouponError('Cupom inválido ou não encontrado.');
        setAppliedCoupon(null);
        return;
      }
      
      const c = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      
      if (!c.active) {
        setCouponError('Este cupom não está mais ativo.');
        setAppliedCoupon(null);
        return;
      }
      
      if (c.maxUses && c.usedCount >= c.maxUses) {
        setCouponError('Este cupom já atingiu o limite de usos.');
        setAppliedCoupon(null);
        return;
      }
      
      // If it has applicableProductIds, verify if ANY item in cart matches
      if (c.applicableProductIds && c.applicableProductIds.length > 0) {
        const cartProductIds = cart.map(item => item.product.id);
        const hasApplicableProduct = cartProductIds.some(id => c.applicableProductIds.includes(id));
        if (!hasApplicableProduct) {
          setCouponError('Este cupom não é válido para os produtos no carrinho.');
          setAppliedCoupon(null);
          return;
        }
      }
      
      setAppliedCoupon(c);
    } catch (e) {
      console.error(e);
      setCouponError('Erro ao validar cupom.');
    } finally {
      setCheckingCoupon(false);
    }
  };`;

const searchHelperStr = "  const getSupplierName = (orgId: string) => {";
content = content.replace(searchHelperStr, couponValidationCode + "\n\n" + searchHelperStr);

fs.writeFileSync(filePath, content);
