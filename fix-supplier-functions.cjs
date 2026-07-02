const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const newFunction = `
/**
 * CRIA PAGAMENTO PARA PEDIDO NA LOJA DE FORNECEDORES (CARTÃO/PIX)
 */
export const createSupplierPayment = onCall(async (request: any) => {
  const {orderData, paymentData} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  
  const db = admin.firestore();
  
  try {
    const {key, url, splitPercent} = await getAsaasConfig();
    const supplierSnap = await db.collection("organizations").doc(orderData.supplierId).get();
    const walletId = supplierSnap.data()?.financialSettings?.asaasWalletId;

    let finalSplitPercent = splitPercent; // comissão da plataforma
    const customSplit = supplierSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== undefined && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    }

    // Criar/buscar cliente
    let customerId = "";
    try {
      const docNum = paymentData.cpfCnpj;
      const searchRes = await axios.get(\`\${url}/customers?cpfCnpj=\${docNum}\`, {
        headers: {access_token: key},
      });
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const customerRes = await axios.post(\`\${url}/customers\`, {
          name: orderData.buyerOrgName || "Cliente",
          cpfCnpj: docNum,
          notificationDisabled: true,
        }, {headers: {access_token: key}});
        customerId = customerRes.data.id;
      }
    } catch (err: any) {
      throw new Error("Erro cliente Asaas: " + (err.response?.data?.errors?.[0]?.description || err.message));
    }

    const payload: any = {
      customer: customerId,
      billingType: paymentData.method,
      value: orderData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: \`Pedido Loja Fornecedor - \${orderData.buyerOrgId}\`,
    };

    if (paymentData.method === "CREDIT_CARD" && paymentData.creditCard) {
      payload.creditCard = {
        holderName: paymentData.creditCard.holderName,
        number: paymentData.creditCard.number,
        expiryMonth: paymentData.creditCard.expiry.split("/")[0],
        expiryYear: "20" + paymentData.creditCard.expiry.split("/")[1],
        ccv: paymentData.creditCard.cvv
      };
      payload.creditCardHolderInfo = {
        name: paymentData.creditCard.holderName,
        email: "email@cliente.com",
        cpfCnpj: paymentData.cpfCnpj,
        postalCode: "01001-000",
        addressNumber: "123",
        phone: "11999999999"
      };
    }

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - finalSplitPercent}];
    }

    const payRes = await axios.post(\`\${url}/payments\`, payload, {
      headers: {access_token: key},
    });

    let pixQrCode = null;
    let pixCopyPaste = null;
    if (paymentData.method === "PIX") {
      try {
        const pixRes = await axios.get(\`\${url}/payments/\${payRes.data.id}/pixQrCode\`, {
          headers: {access_token: key},
        });
        pixQrCode = pixRes.data.encodedImage;
        pixCopyPaste = pixRes.data.payload;
      } catch (err: any) {
        console.error("Erro ao buscar QR Code do PIX:", err.message);
      }
    }

    const newOrderData = {
      ...orderData,
      asaasPaymentId: payRes.data.id,
      asaasInvoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl,
      asaasPixCopyPaste: pixCopyPaste,
      paymentStatus: payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED' ? 'PAID' : 'PENDING'
    };

    await db.collection("supplierOrders").doc(orderData.id).set(newOrderData);

    return { 
      success: true, 
      paymentId: payRes.data.id, 
      invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, 
      pixQrCode, 
      pixCopyPaste 
    };
  } catch (error: any) {
    const msg = error.response?.data?.errors?.[0]?.description || error.message;
    throw new HttpsError("internal", msg);
  }
});
`;

code = code + '\n' + newFunction;

fs.writeFileSync('functions/src/index.ts', code);
