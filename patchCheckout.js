import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update cartTotal to return baseTotal and discount
const cartTotalHook = `  const cartTotals = useMemo(() => {
    const baseTotal = cart.reduce((total, item) => {
      const basePrice = (item.product.isPromotion && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice;
      const price = basePrice 
        + (item.variation?.priceModifier || 0)
        + (item.selectedOptions?.reduce((sum, opt) => sum + opt.priceModifier, 0) || 0);
      return total + (price * item.quantity);
    }, 0);

    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
        // Calculate discount only on applicable items
        const applicableTotal = cart.reduce((total, item) => {
          if (appliedCoupon.applicableProductIds.includes(item.product.id)) {
            const basePrice = (item.product.isPromotion && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice;
            const price = basePrice + (item.variation?.priceModifier || 0) + (item.selectedOptions?.reduce((sum, opt) => sum + opt.priceModifier, 0) || 0);
            return total + (price * item.quantity);
          }
          return total;
        }, 0);
        discount = appliedCoupon.discountType === 'PERCENTAGE' 
          ? (applicableTotal * (appliedCoupon.discountValue / 100))
          : Math.min(appliedCoupon.discountValue, applicableTotal);
      } else {
        discount = appliedCoupon.discountType === 'PERCENTAGE'
          ? (baseTotal * (appliedCoupon.discountValue / 100))
          : Math.min(appliedCoupon.discountValue, baseTotal);
      }
    }
    
    return { baseTotal, discount, finalTotal: Math.max(0, baseTotal - discount) };
  }, [cart, appliedCoupon]);`;

content = content.replace(/const cartTotal = useMemo\(\(\) => \{[\s\S]*?\}, \[cart\]\);/, cartTotalHook);

// Fix usages of cartTotal to cartTotals.baseTotal or cartTotals.finalTotal
content = content.replace(/cartTotal/g, "cartTotals.finalTotal");
content = content.replace(/cartTotals\.finalTotals\.finalTotal/g, "cartTotals.finalTotal");
// In the checkout loop
const orderCreation = `        const totalVal = items.reduce((sum, i) => {
          const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
            + (i.variation?.priceModifier || 0)
            + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
          return sum + (unitPrice * i.quantity);
        }, 0);`;

const newOrderCreation = `        let supBaseTotal = items.reduce((sum, i) => {
          const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
            + (i.variation?.priceModifier || 0)
            + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
          return sum + (unitPrice * i.quantity);
        }, 0);
        
        let supDiscount = 0;
        if (appliedCoupon && appliedCoupon.organizationId === supId) {
          if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
             const applicableSupTotal = items.reduce((sum, i) => {
                if (appliedCoupon.applicableProductIds.includes(i.product.id)) {
                  const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
                    + (i.variation?.priceModifier || 0)
                    + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
                  return sum + (unitPrice * i.quantity);
                }
                return sum;
             }, 0);
             supDiscount = appliedCoupon.discountType === 'PERCENTAGE' ? (applicableSupTotal * (appliedCoupon.discountValue / 100)) : Math.min(appliedCoupon.discountValue, applicableSupTotal);
          } else {
             supDiscount = appliedCoupon.discountType === 'PERCENTAGE' ? (supBaseTotal * (appliedCoupon.discountValue / 100)) : Math.min(appliedCoupon.discountValue, supBaseTotal);
          }
        }
        
        const totalVal = Math.max(0, supBaseTotal - supDiscount);`;

content = content.replace(orderCreation, newOrderCreation);

// Add couponCode and discount to newOrder payload
content = content.replace(
  "totalValue: totalVal,",
  "totalValue: totalVal,\n          discountValue: supDiscount > 0 ? supDiscount : undefined,\n          couponCode: supDiscount > 0 ? appliedCoupon.code : undefined,"
);

// Increment coupon used count if used
const incCoupon = `        await addSupplierOrder(newOrder);
        lastOrder = newOrder;`;

const newIncCoupon = `        await addSupplierOrder(newOrder);
        lastOrder = newOrder;
        
        if (supDiscount > 0 && appliedCoupon) {
          try {
            await updateDoc(doc(db, 'supplierCoupons', appliedCoupon.id), {
              usedCount: increment(1)
            });
          } catch(e) {
            console.error('Error incrementing coupon', e);
          }
        }`;

content = content.replace(incCoupon, newIncCoupon);

fs.writeFileSync(filePath, content);
