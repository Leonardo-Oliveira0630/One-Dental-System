const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const regexToReplace = /export const createSupplierPayment = onCall\(async \(request: any\) => \{[\s\S]*?return \{ \n      success: true, \n      paymentId: payRes\.data\.id, \n      invoiceUrl: payRes\.data\.invoiceUrl \|\| payRes\.data\.bankSlipUrl, \n      pixQrCode, \n      pixCopyPaste \n    \};\n  \} catch \(error: any\) \{\n    const msg = error\.response\?\.data\?\.errors\?\.\[0\]\?\.description \|\| error\.message;\n    throw new HttpsError\("internal", msg\);\n  \}\n\}\);/g;

const newCode = `export const createSupplierPayment = onCall(async (request: any) => {
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
      billingType: "UNDEFINED",
      value: orderData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: \`Pedido Loja Fornecedor - \${orderData.buyerOrgId}\`,
    };

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - finalSplitPercent}];
    }

    const payRes = await axios.post(\`\${url}/payments\`, payload, {
      headers: {access_token: key},
    });

    const newOrderData = {
      ...orderData,
      asaasPaymentId: payRes.data.id,
      asaasInvoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl,
      paymentStatus: payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED' ? 'PAID' : 'PENDING'
    };

    await db.collection("supplierOrders").doc(orderData.id).set(newOrderData);

    return { 
      success: true, 
      paymentId: payRes.data.id, 
      invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl
    };
  } catch (error: any) {
    const msg = error.response?.data?.errors?.[0]?.description || error.message;
    throw new HttpsError("internal", msg);
  }
});`;

if (code.match(regexToReplace)) {
  code = code.replace(regexToReplace, newCode);
  fs.writeFileSync('functions/src/index.ts', code);
  console.log("Success");
} else {
  console.log("Regex not found");
}
