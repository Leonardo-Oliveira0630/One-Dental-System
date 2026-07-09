/* eslint-disable @typescript-eslint/no-explicit-any, max-len, no-trailing-spaces, comma-dangle, quotes, object-curly-spacing, indent */
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";

const asaasApiKeySecret = defineSecret("ASAAS_API_KEY");
const asaasWebhookTokenSecret = defineSecret("ASAAS_WEBHOOK_TOKEN");

setGlobalOptions({ 
  maxInstances: 10,
  secrets: [asaasApiKeySecret, asaasWebhookTokenSecret]
});
import * as admin from "firebase-admin";
import axios from "axios";
// Triggers sync 2
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * CONFIGURAÇÕES E HELPERS
 */
const getAsaasConfig = async () => {
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings").doc("global").get();
  const settings = settingsSnap.data();

  // Prioridade: Secret Manager -> Env Var
  let apiKey = "";
  try {
    apiKey = asaasApiKeySecret.value();
  } catch (e) {
    logger.warn("Secret ASAAS_API_KEY não disponível via Secret Manager.");
  }
  
  if (!apiKey) {
    apiKey = process.env.ASAAS_API_KEY || process.env.asaas_api_key || process.env.asaa_api_key || process.env.ASAA_API_KEY || "";
  }

  if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
    logger.error("ERRO: ASAAS_API_KEY não configurada.");
    throw new Error("Chave de API do Asaas não configurada no servidor. Configure a chave no menu Admin > Configurações ou garanta que a variável ASAAS_API_KEY exista.");
  }

  // Identifica ambiente
  const isProduction = true; // Forcing production as requested

  // URLs Oficiais do Asaas:
  // Produção: https://api.asaas.com/v3 (ou https://www.asaas.com/api/v3)
  const baseUrl = "https://api.asaas.com/v3";

  const envName = isProduction ? "PRODUÇÃO" : "SANDBOX";
  logger.info(`Conectando ao Asaas em modo: ${envName}`);

  return {
    key: apiKey,
    url: baseUrl,
    splitPercent: settings?.platformCommission || 5,
  };
};

async function getOrCreateAsaasCustomer(
  url: string, 
  key: string, 
  name: string, 
  cpfCnpj: string, 
  externalReference: string,
  email: string = ""
): Promise<string> {
  if (externalReference) {
    const searchByRef = await axios.get(`${url}/customers?externalReference=${externalReference}`, {
      headers: {access_token: key},
    });
    if (searchByRef.data.data && searchByRef.data.data.length > 0) {
      return searchByRef.data.data[0].id;
    }
  }

  const cleanCpfCnpj = (cpfCnpj || "").replace(/\D/g, "");
  if (cleanCpfCnpj) {
    const searchRes = await axios.get(`${url}/customers?cpfCnpj=${cleanCpfCnpj}`, {
      headers: {access_token: key},
    });
    
    if (searchRes.data.data && searchRes.data.data.length > 0) {
      let foundCustomer = searchRes.data.data.find((c: any) => c.name.toLowerCase().trim() === name.toLowerCase().trim());
      
      if (foundCustomer) {
        if (!foundCustomer.externalReference && externalReference) {
           await axios.post(`${url}/customers/${foundCustomer.id}`, { externalReference }, {headers: {access_token: key}});
        }
        return foundCustomer.id;
      } else {
        try {
          const customerRes = await axios.post(`${url}/customers`, {
            name,
            cpfCnpj: cleanCpfCnpj,
            email,
            externalReference,
            notificationDisabled: true,
          }, {headers: {access_token: key}});
          return customerRes.data.id;
        } catch (createErr: any) {
          foundCustomer = searchRes.data.data[0];
          await axios.post(`${url}/customers/${foundCustomer.id}`, {
            name,
            externalReference
          }, {headers: {access_token: key}});
          return foundCustomer.id;
        }
      }
    }
  }

  const customerRes = await axios.post(`${url}/customers`, {
    name,
    cpfCnpj: cleanCpfCnpj,
    email,
    externalReference,
    notificationDisabled: true,
  }, {headers: {access_token: key}});
  
  return customerRes.data.id;
}

/**
 * REGISTRA UM NOVO USUÁRIO EM UMA ORGANIZAÇÃO
 */
export const registerUserInOrg = onCall(async (request) => {
  const {email, pass, name, role, organizationId, sector} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password: pass,
      displayName: name,
    });
    const userData = {
      id: userRecord.uid,
      name,
      email,
      role,
      organizationId,
      sector: sector || "Geral",
      createdAt: admin.firestore.Timestamp.now(),
    };
    await admin.firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);
    return {success: true, uid: userRecord.uid};
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * VALIDA O REGISTRO DO CRO DE UM DENTISTA USANDO A API CONSULTAR.IO
 */
export const validateCro = onCall(async (request) => {
  const {uf, numero, categoria} = request.data;
  if (!uf || !numero || !categoria) {
    throw new HttpsError(
      "invalid-argument",
      "UF, número de registro e categoria são obrigatórios."
    );
  }

  const apiKey = process.env.CONSULTARIO_API_KEY;
  if (!apiKey || apiKey === "SUA_CHAVE_AQUI" || apiKey === "") {
    logger.warn(
      "Chave CONSULTARIO_API_KEY não configurada. " +
      "Simulando retorno válido."
    );
    return {
      success: true,
      valido: true,
      name: "DENTISTA TESTE INTEGRACAO",
      situacao: "ATIVO",
      message: "Modo Desenvolvimento (Chave de API não configurada).",
    };
  }

  try {
    logger.info(
      "Consultando CRO na consultar.io... " +
      `UF: ${uf}, Numero: ${numero}, Categoria: ${categoria}`
    );

    const response = await axios.post(
      "https://consultar.io/api/v1/cro/consultar",
      {
        uf,
        numero,
        categoria,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    logger.info("Resposta consultar.io CRO:", data);

    const rawSituacao = data?.situacao ||
      data?.status ||
      data?.situacao_inscricao ||
      data?.situacao_cadastral ||
      "";
    const situacao = rawSituacao.toString().toUpperCase();
    const nomeProfissional = data?.nome || data?.nome_profissional || "";

    const isValido = (
      situacao.includes("ATIVO") ||
      situacao.includes("REGULAR") ||
      situacao.includes("CONSTA") ||
      situacao === "" ||
      data?.valido === true ||
      data?.valid === true
    );

    return {
      success: true,
      valido: isValido,
      name: nomeProfissional,
      situacao: situacao || "NÃO INFORMADA",
    };
  } catch (error: any) {
    logger.error(
      "Erro ao validar CRO na consultar.io:",
      error?.response?.data || error?.message
    );
    const apiMsg = error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;
    throw new HttpsError(
      "internal",
      `Falha na integração com consultar.io: ${apiMsg}`
    );
  }
});

/**
 * EXCLUI UM USUÁRIO VIA ADMIN (AUTH E FIRESTORE)
 */
export const deleteUserAdmin = onCall(async (request) => {
  const {targetUserId} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerSnap.data();
  const isAdmin = callerData?.role === "ADMIN" ||
                  callerData?.role === "SUPER_ADMIN";

  if (!isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem excluir usuários."
    );
  }

  try {
    // 1. Excluir do Firebase Auth
    await admin.auth().deleteUser(targetUserId);

    // 2. Excluir do Firestore
    await db.collection("users").doc(targetUserId).delete();

    return {success: true};
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * ATUALIZA PERFIL DE USUÁRIO VIA ADMIN
 */
export const updateUserAdmin = onCall(async (request) => {
  const {targetUserId, updates} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  const db = admin.firestore();
  try {
    await db.collection("users").doc(targetUserId).update(updates);
    return {success: true};
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * GERA BOLETO EM LOTE PARA TRABALHOS INTERNOS FINALIZADOS
 */
export const generateBatchBoleto = onCall(async (request: any) => {
  const {orgId, dentistId, jobIds, dueDate, customAmount} = request.data;
  const db = admin.firestore();

  logger.info("Iniciando generateBatchBoleto", {orgId, dentistId});

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Acesso negado.");
  }

  try {
    const {key, url, splitPercent} = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;

    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;

    if (customSplit !== undefined && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans")
          .doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== undefined && planSplit !== null) {
            finalSplitPercent = Number(planSplit);
          }
        }
      }
    }

    // 1. Buscar dados do Dentista
    let dentist: any = null;
    const manualSnap = await db.collection("organizations")
      .doc(orgId).collection("manualDentists").doc(dentistId).get();

    if (manualSnap.exists) {
      dentist = manualSnap.data();
    } else {
      const userSnap = await db.collection("users").doc(dentistId).get();
      if (userSnap.exists) dentist = userSnap.data();
    }

    if (!dentist) throw new Error("Dentista não encontrado.");

    // 2. Somar valores
    let total = 0;
    const patients: string[] = [];
    
    if (customAmount !== undefined && customAmount !== null && Number(customAmount) > 0) {
      total = Number(customAmount);
      patients.push("Fatura Personalizada");
    } else {
      for (const id of jobIds) {
        const jSnap = await db.collection("organizations")
          .doc(orgId).collection("jobs").doc(id).get();
        if (jSnap.exists) {
          const val = jSnap.data()?.totalValue;
          total += (val ? Number(val) : 0);
          patients.push(jSnap.data()?.patientName || "Paciente");
        }
      }
    }
    
    if (isNaN(total) || total <= 0) {
      throw new Error("O valor da cobrança deve ser maior que 0 e válido.");
    }

    // 3. Garantir Cliente no Asaas (Tenta buscar por CPF/CNPJ antes de criar)
    const docNum = (dentist.cpfCnpj || dentist.cpf || "").replace(/\D/g, "");
    let customerId = "";
    try {
      customerId = await getOrCreateAsaasCustomer(url, key, dentist.name, docNum, dentistId, dentist.email || "");
    } catch (err: any) {
      const apiErr = err.response?.data?.errors?.[0]?.description;
      const finalMsg = apiErr || err.message;
      logger.error("Erro no cliente Asaas", err.response?.data);
      throw new Error(`Asaas (Cliente): ${finalMsg}`);
    }

    // 4. Criar Cobrança
    const batchId = `batch_${Date.now()}`;
    const cleanDueDate = typeof dueDate === "string" ?
      dueDate.split("T")[0] :
      new Date(dueDate).toISOString().split("T")[0];

    const payload: any = {
      customer: customerId,
      billingType: "BOLETO",
      value: Number(Number(total).toFixed(2)),
      dueDate: cleanDueDate,
      externalReference: `${orgId}___${batchId}`,
      description: `Fatura ProTrack: ${patients.slice(0, 3).join(", ")}...`,
    };

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - finalSplitPercent}];
    }

    const payRes = await axios.post(`${url}/payments`, payload, {
      headers: {access_token: key},
    });

    // 5. Salvar Lote
    const dtParsed = new Date(cleanDueDate + "T12:00:00");
    const finalDueDate = admin.firestore.Timestamp.fromDate(dtParsed);
    const batchDoc = {
      id: batchId,
      organizationId: orgId,
      dentistId,
      dentistName: dentist.name,
      jobIds,
      totalAmount: total,
      status: "PENDING",
      dueDate: finalDueDate,
      invoiceUrl: payRes.data.bankSlipUrl || payRes.data.invoiceUrl,
      asaasPaymentId: payRes.data.id,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await db.collection("organizations")
      .doc(orgId).collection("billingBatches").doc(batchId).set(batchDoc);

    const dbBatch = db.batch();
    jobIds.forEach((id: string) => {
      const ref = db.collection("organizations")
        .doc(orgId).collection("jobs").doc(id);
      dbBatch.update(ref, {
        batchId,
        paymentStatus: "AUTHORIZED",
        asaasPaymentId: payRes.data.id,
      });
    });
    await dbBatch.commit();

    return {success: true, batchId, invoiceUrl: batchDoc.invoiceUrl};
  } catch (error: any) {
    const asaasMsg = error.response?.data?.errors?.[0]?.description;
    const msg = asaasMsg || error.message || "Erro interno no servidor";
    logger.error("Falha no faturamento", {
      msg,
      d: error.response?.data,
    });
    throw new HttpsError("internal", msg);
  }
});

/**
 * CRIA SUB-CONTA (WALLET) NO ASAAS PARA O LABORATÓRIO
 */
export const createLabSubAccount = onCall(async (request: any) => {
  const {orgId, accountData} = request.data;
  const {key, url} = await getAsaasConfig();
  try {
    const res = await axios.post(`${url}/accounts`, accountData, {
      headers: {access_token: key},
    });
    await admin.firestore()
      .collection("organizations")
      .doc(orgId)
      .update({
        "financialSettings.asaasWalletId": res.data.walletId || res.data.id || res.data.apiKey,
        "financialSettings.asaasApiKey": res.data.apiKey,
        "financialSettings.asaasWalletStatus": "PENDING",
      });
    return {success: true};
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * CRIA PAGAMENTO PARA PEDIDO DA LOJA VIRTUAL (CARTÃO/PIX)
 */
export const createOrderPayment = onCall(async (request: any) => {
  const {jobData, paymentData} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  
  const db = admin.firestore();
  
  try {
    const {key, url, splitPercent} = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(jobData.organizationId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;

    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== undefined && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== undefined && planSplit !== null) {
            finalSplitPercent = Number(planSplit);
          }
        }
      }
    }

    // Criar/buscar cliente
    let customerId = "";
    try {
      const docNum = paymentData.cpfCnpj;
      customerId = await getOrCreateAsaasCustomer(url, key, jobData.dentistName || "Cliente Loja", docNum, jobData.dentistId || "", "");
    } catch (err: any) {
      throw new Error("Erro cliente Asaas: " + (err.response?.data?.errors?.[0]?.description || err.message));
    }


    // Process Vouchers (if any)
    if (jobData.vouchersUsed && jobData.vouchersUsed.length > 0) {
      // Simplistic deduction: we just mark the voucher as used.
      // A full implementation would calculate how much of the voucher was consumed.
      // We will deduct the consumed amount based on the cart quantities.
      
      const vQties: Record<string, number> = {};
      const vRefs: Record<string, any> = {};
      
      for (const vId of jobData.vouchersUsed) {
        const vRef = db.collection("organizations").doc(jobData.organizationId).collection("vouchers").doc(vId);
        const snap = await vRef.get();
        if (snap.exists) {
            vQties[vId] = snap.data()?.remainingQuantity || 0;
            vRefs[vId] = vRef;
        }
      }
      
      const writeBatch = db.batch();
      
      for (const item of jobData.items) {
          const itemTypeIds = [item.jobTypeId, item.originalJobTypeId];
          let qtyToCover = item.quantity;
          
          for (const vId of jobData.vouchersUsed) {
              const snap = await vRefs[vId].get();
              if (snap.exists) {
                  const vData = snap.data();
                  let variationMatches = true;
                  if (vData.applyToAllVariations === false) {
                      if (vData.promoVariationOptionIds && vData.promoVariationOptionIds.length > 0) {
                          variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.some((id: string) => vData.promoVariationOptionIds.includes(id)));
                      } else if (vData.promoVariationOptionId) {
                          variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.includes(vData.promoVariationOptionId));
                      }
                  }
                  
                  if (itemTypeIds.includes(vData.jobTypeId) && variationMatches && vQties[vId] > 0 && qtyToCover > 0) {
                      const coveredQty = Math.min(vQties[vId], qtyToCover);
                      vQties[vId] -= coveredQty;
                      qtyToCover -= coveredQty;
                  }
              }
          }
      }
      
      for (const vId of jobData.vouchersUsed) {
          if (vRefs[vId]) {
              writeBatch.update(vRefs[vId], { 
                  remainingQuantity: vQties[vId],
                  status: vQties[vId] <= 0 ? 'EXHAUSTED' : 'ACTIVE',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
          }
      }
      await writeBatch.commit();
    }

    // If totalValue is 0 (e.g. fully paid by vouchers or 100% discount)
    if (jobData.totalValue === 0) {
      const newJobId = `web_${Date.now()}`;
      const newJobData = {
        ...jobData,
        id: newJobId,
        paymentStatus: 'PAID'
      };
      await db.collection("organizations")
        .doc(jobData.organizationId)
        .collection("jobs")
        .doc(newJobId)
        .set(newJobData);
        
      return { success: true, paymentId: 'voucher_paid', invoiceUrl: '', pixQrCode: null, pixCopyPaste: null };
    }

    const payload: any = {
      customer: customerId,
      billingType: paymentData.method,
      value: jobData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: `Pedido Loja - ${jobData.organizationId}`,
    };

    if (paymentData.successUrl) {
      payload.callback = {
        successUrl: paymentData.successUrl,
        autoRedirect: true
      };
    }

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

    const payRes = await axios.post(`${url}/payments`, payload, {
      headers: {access_token: key},
    });

    let pixQrCode = null;
    let pixCopyPaste = null;
    if (paymentData.method === "PIX") {
      try {
        const pixRes = await axios.get(`${url}/payments/${payRes.data.id}/pixQrCode`, {
          headers: {access_token: key},
        });
        pixQrCode = pixRes.data.encodedImage;
        pixCopyPaste = pixRes.data.payload;
      } catch (err: any) {
        console.error("Erro ao buscar QR Code do PIX:", err.message);
      }
    }

    const newJobId = `web_${Date.now()}`;
    const newJobData = {
      ...jobData,
      id: newJobId,
      asaasPaymentId: payRes.data.id,
      paymentStatus: payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED' ? 'PAID' : 'PENDING'
    };

    await db.collection("organizations")
      .doc(jobData.organizationId)
      .collection("jobs")
      .doc(newJobId)
      .set(newJobData);

    return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, pixQrCode, pixCopyPaste };
  } catch (error: any) {
    const msg = error.response?.data?.errors?.[0]?.description || error.message;
    throw new HttpsError("internal", msg);
  }
});

/**
 * CRIA COBRANÇA PARA PACIENTE DA CLÍNICA
 */
export const createPatientPayment = onCall(async (request: any) => {
  const {orgId, patientId, totalAmount, dueDate, title} = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  
  const db = admin.firestore();
  
  try {
    const {key, url, splitPercent} = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;

    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== undefined && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== undefined && planSplit !== null) {
            finalSplitPercent = Number(planSplit);
          }
        }
      }
    }

    const patientSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(patientId).get();
    const patientData = patientSnap.data() || { name: "Paciente " + patientId, document: "00000000000" };

    let customerId = "";
    try {
      const docNum = (patientData.document || "00000000000").replace(/\D/g, "");
      customerId = await getOrCreateAsaasCustomer(url, key, patientData.name, docNum, patientId, "");
    } catch (err: any) {
      throw new Error("Erro cliente Asaas (Paciente): " + (err.response?.data?.errors?.[0]?.description || err.message));
    }

    const payload: any = {
      customer: customerId,
      billingType: "BOLETO", // Pode ser configurado pelo dentista
      value: totalAmount,
      dueDate: dueDate.split("T")[0],
      description: title || "Fatura Clínica",
    };

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - finalSplitPercent}];
    }

    const payRes = await axios.post(`${url}/payments`, payload, {
      headers: {access_token: key},
    });

    return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl };
  } catch (error: any) {
    const msg = error.response?.data?.errors?.[0]?.description || error.message;
    throw new HttpsError("internal", msg);
  }
});

/**
 * SINCRONIZA STATUS DE ASSINATURA SAAS
 */
export const setSubscriptionStatus = onCall(
  async (request: any) => {
    // Verificar se o usuário é admin/superadmin
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Usuário não autenticado."
      );
    }

    const {orgId, status} = request.data;
    if (!orgId || !status) {
      throw new HttpsError(
        "invalid-argument",
        "Parâmetros orgId e status são obrigatórios."
      );
    }

    const {key, url} = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .get();
      if (!orgSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Organização não encontrada."
        );
      }

      const orgData = orgSnap.data();
      const subId = orgData?.subscriptionId;

      if (status === "FREE" || status === "TEST" || status === "CANCELLED") {
        if (subId) {
          try {
            logger.info(
              `Cancelando Asaas ${subId} para org ${orgId} devido a ${status}`
            );
            await axios.delete(`${url}/subscriptions/${subId}`, {
              headers: {access_token: key},
            });
          } catch (e: any) {
            logger.warn(
              "Erro ao deletar assinatura no Asaas:",
              e.response?.data || e.message
            );
          }
        }
      }

      await admin.firestore().collection("organizations").doc(orgId).update({
        subscriptionStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true, status};
    } catch (error: any) {
      logger.error("Erro em setSubscriptionStatus:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

export const checkSubscriptionStatus = onCall(
  async (request: any) => {
    const {orgId} = request.data;
    if (!orgId) {
      throw new HttpsError(
        "invalid-argument",
        "orgId é obrigatório."
      );
    }

    const {key, url} = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .get();

      if (!orgSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Organização não encontrada."
        );
      }

      const currentStatus = orgSnap.data()?.subscriptionStatus;
      if (currentStatus === "FREE" || currentStatus === "TEST") {
        return {status: currentStatus};
      }

      const subId = orgSnap.data()?.subscriptionId;
      if (!subId) return {status: "NONE"};

      const res = await axios.get(`${url}/subscriptions/${subId}`, {
        headers: {access_token: key},
      });

      const asaasStatus = res.data.status;
      let status = "PENDING";

      if (asaasStatus === "ACTIVE") {
        try {
          const paymentsRes = await axios.get(
            `${url}/payments?subscription=${subId}&limit=10`,
            {headers: {access_token: key}}
          );
          const payments = paymentsRes.data.data || [];
          const hasOverdue = payments.some((p: any) => p.status === "OVERDUE");
          const hasReceived = payments.some((p: any) => p.status === "RECEIVED" || p.status === "CONFIRMED");
          const hasPending = payments.some((p: any) => p.status === "PENDING");

          if (hasOverdue) {
            status = "OVERDUE";
          } else if (hasPending && !hasReceived) {
            // Subscription created, but first payment still pending
            status = "PENDING";
          } else {
            status = "ACTIVE";
          }
        } catch (err: any) {
          logger.warn("Erro ao buscar faturas na verificação:", err.message);
          status = "ACTIVE"; // fallback if api fails
        }
      } else if (asaasStatus === "EXPIRED" || asaasStatus === "OVERDUE") {
        status = "OVERDUE";
      } else if (asaasStatus === "DELETED") {
        status = "CANCELLED";
      }

      await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .update({subscriptionStatus: status});

      return {status};
    } catch (error: any) {
      logger.error("Erro em checkSubscriptionStatus:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * WEBHOOK PARA ATUALIZAÇÃO AUTOMÁTICA DE PAGAMENTOS
 */
/**
 * CRIA ASSINATURA SAAS
 */
export const createSaaSSubscription = onCall(async (req: any) => {
  const {orgId, planId, email, name, cpfCnpj} = req.data;
  const {key, url} = await getAsaasConfig();

  try {
    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");

    // Buscar Informações da Organização para pegar dados de Endereço e Telefone
    const orgSnap = await admin.firestore()
      .collection("organizations")
      .doc(orgId)
      .get();

    let orgData: any = {};
    if (orgSnap.exists) {
      orgData = orgSnap.data() || {};
    }

    const phone = orgData.phone || "";
    const cep = orgData.cep || "";
    const address = orgData.address || "";
    const number = orgData.number || "";
    const complement = orgData.complement || "";
    const neighborhood = orgData.neighborhood || "";

    // Buscar ou Criar Customer
    let customerId = "";
    try {
      customerId = await getOrCreateAsaasCustomer(url, key, name, cleanCpfCnpj, orgId, email);
      // Optional: Update with address/phone
      await axios.post(`${url}/customers/${customerId}`, {
         phone, mobilePhone: phone, postalCode: cep, address, addressNumber: number, complement, province: neighborhood
      }, {headers: {access_token: key}});
    } catch (e: any) {
      throw new Error("Erro cliente Asaas: " + e.message);
    }

    // Valor do Plano
    let value = 99.00;
    const planSnap = await admin.firestore()
      .collection("subscriptionPlans")
      .doc(planId)
      .get();
    if (planSnap.exists && planSnap.data()?.price !== undefined) {
      value = planSnap.data()?.price;
    }

    // Calcular data de vencimento da fatura com base no trial
    let nextDue = new Date().toISOString().split("T")[0];

    if (orgSnap.exists) {
      const trialEndsAt = orgData.trialEndsAt;
      if (trialEndsAt) {
        let trialDate: Date;
        const isObj = typeof trialEndsAt === "object" &&
          "seconds" in (trialEndsAt as any);
        if (isObj) {
          trialDate = new Date((trialEndsAt as any).seconds * 1000);
        } else {
          trialDate = new Date(trialEndsAt);
        }

        // Garante que a data está no futuro (pelo menos hoje + 1 dia)
        if (trialDate.getTime() > Date.now() + 86400000) {
          nextDue = trialDate.toISOString().split("T")[0];
        }
      }
    }

    // Criar Assinatura no Asaas
    const subRes = await axios.post(
      `${url}/subscriptions`,
      {
        customer: customerId,
        billingType: "UNDEFINED",
        value: value,
        nextDueDate: nextDue,
        cycle: "MONTHLY",
        description: `Assinatura Plano ${planId}`,
      },
      {headers: {access_token: key}}
    );

    // Buscar a primeira fatura gerada para obter o link do checkout
    let paymentLink = "";
    try {
      const paymentsRes = await axios.get(
        `${url}/payments?subscription=${subRes.data.id}&limit=1`,
        {headers: {access_token: key}}
      );
      if (paymentsRes.data.data && paymentsRes.data.data.length > 0) {
        paymentLink = paymentsRes.data.data[0].invoiceUrl;
      }
    } catch (payErr: any) {
      logger.warn(
        "Erro ao buscar a fatura inicial da assinatura no Asaas:",
        payErr.message
      );
    }

    await admin.firestore().collection("organizations").doc(orgId).update({
      asaasCustomerId: customerId,
      subscriptionId: subRes.data.id,
      subscriptionStatus: "PENDING",
      planId: planId,
    });

    return {success: true, paymentLink: paymentLink || subRes.data.id};
  } catch (error: any) {
    logger.error("Erro em createSaaSSubscription:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * BUSCA FATURAS (BOLETOS/PAGAMENTOS) DO SAAS NO ASAAS
 */
export const getSaaSInvoices = onCall(async (request: any) => {
  const {orgId} = request.data;
  const {key, url} = await getAsaasConfig();

  try {
    const orgSnap = await admin.firestore()
      .collection("organizations")
      .doc(orgId)
      .get();
    const customerId = orgSnap.data()?.asaasCustomerId;
    if (!customerId) return [];

    const res = await axios.get(
      `${url}/payments?customer=${customerId}&limit=50`,
      {headers: {access_token: key}}
    );
    return res.data.data;
  } catch (error: any) {
    logger.error("Erro em getSaaSInvoices:", error);
    throw new HttpsError("internal", error.message);
  }
});

export const asaasWebhook = onRequest(
  async (req: any, res: any) => {
    const db = admin.firestore();
    try {
      // Validar Asaas-Access-Token do Webhook
      let webhookToken = "";
      try {
        webhookToken = asaasWebhookTokenSecret.value();
      } catch (e) {
        logger.warn("Secret ASAAS_WEBHOOK_TOKEN não disponível via Secret Manager.");
      }

      if (!webhookToken) {
        webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || "";
      }

      if (webhookToken) {
        const authHeader = req.headers["asaas-access-token"] ||
                           req.headers["Asaas-Access-Token"];
        if (authHeader !== webhookToken) {
          logger.warn("Webhook token inválido", {received: authHeader});
          res.status(401).send("Unauthorized");
          return;
        }
      }

      const event = req.body;
      const isPaid = event.event === "PAYMENT_RECEIVED" ||
                     event.event === "PAYMENT_CONFIRMED";
      const isOverdue = event.event === "PAYMENT_OVERDUE";
      const isCancelled = event.event === "PAYMENT_DELETED" ||
                          event.event === "PAYMENT_REFUNDED";

      const customerId = event.payment?.customer;

      if (isPaid) {
        const ref = event.payment?.externalReference || "";
        if (ref.includes("___")) {
          const [orgId, id] = ref.split("___");
          if (id.startsWith("batch_")) {
            await db.collection("organizations")
              .doc(orgId).collection("billingBatches").doc(id)
              .update({status: "PAID"});

            const batchSnap = await db.collection("organizations")
              .doc(orgId).collection("billingBatches").doc(id).get();
            const jobIds = batchSnap.data()?.jobIds || [];
            const writeBatch = db.batch();
            jobIds.forEach((jid: string) => {
              const jRef = db.collection("organizations")
                .doc(orgId).collection("jobs").doc(jid);
              writeBatch.update(jRef, {paymentStatus: "PAID"});
            });
            await writeBatch.commit();
          }
        } else if (customerId && event.payment?.subscription) {
          // SaaS Subscription payment
          const orgsSnapshot = await db.collection("organizations")
            .where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({subscriptionStatus: "ACTIVE"});
          }
        }
        
        // CHECK IF IT IS A STORE JOB (ONLINE ORDER)
        if (event.payment?.id) {
          const jobsSnap = await db.collectionGroup("jobs").where("asaasPaymentId", "==", event.payment.id).get();
          if (!jobsSnap.empty) {
            const jobDoc = jobsSnap.docs[0];
            const jobData = jobDoc.data();
            
            if (jobData.paymentStatus !== "PAID") {
              await jobDoc.ref.update({ paymentStatus: "PAID" });
            }
            
            // GENERATE VOUCHERS IF COMBO OR PROMO ITEMS
            const hasPromoItems = jobData.items?.some((item: any) => !!item.isPromo || !!item.isVoucherCombo || !!item.originalJobTypeId);
            if ((jobData.isComboPurchase || hasPromoItems) && !jobData.vouchersGenerated) {
              const writeBatch = db.batch();
              let generatedAny = false;
              let idx = 0;
              
              for (const item of jobData.items || []) {
                const shouldGenerate = !!item.isPromo || !!item.isVoucherCombo || !!item.originalJobTypeId || !!jobData.isComboPurchase;
                if (shouldGenerate) {
                  generatedAny = true;
                  const voucherId = `voucher_${Date.now()}_${idx}`;
                  const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                  
                  const voucherRef = db.collection("organizations")
                    .doc(jobData.organizationId)
                    .collection("vouchers")
                    .doc(voucherId);
                    
                  let isVoucherCombo = item.isVoucherCombo === true;
                  let promoQuantity = 1;
                  let applyToAllVariations = true;
                  let promoVariationOptionId = '';
                  let promoVariationOptionIds = [];
                  let promoVariationOptionName = '';
                  let promoVariationGroupName = '';

                  if (item.promotionQuantity !== undefined && item.promotionQuantity !== null) {
                    promoQuantity = Number(item.promotionQuantity);
                    applyToAllVariations = item.applyToAllVariations !== false;
                    promoVariationOptionId = item.promoVariationOptionId || '';
                    promoVariationOptionIds = item.promoVariationOptionIds || [];
                    promoVariationOptionName = item.promoVariationOptionName || '';
                    promoVariationGroupName = item.promoVariationGroupName || '';
                  } else {
                    try {
                      const jtDoc = await db.collection("organizations")
                        .doc(jobData.organizationId)
                        .collection("jobTypes")
                        .doc(item.jobTypeId)
                        .get();
                      if (jtDoc.exists) {
                        const jtData = jtDoc.data();
                        isVoucherCombo = jtData?.isVoucherCombo === true;
                        promoQuantity = Number(jtData?.promotionQuantity || 1);
                        applyToAllVariations = jtData?.applyToAllVariations !== false;
                        promoVariationOptionId = jtData?.promoVariationOptionId || '';
                        promoVariationOptionIds = jtData?.promoVariationOptionIds || [];
                        promoVariationOptionName = jtData?.promoVariationOptionName || '';
                        promoVariationGroupName = jtData?.promoVariationGroupName || '';
                      }
                    } catch (err: any) {
                      logger.error(`Error fetching jobType ${item.jobTypeId} during webhook voucher generation:`, err.message);
                    }
                  }

                  const finalQty = isVoucherCombo ? (item.quantity * promoQuantity) : item.quantity;
                    
                  writeBatch.set(voucherRef, {
                    id: voucherId,
                    code,
                    organizationId: jobData.organizationId,
                    clientId: jobData.dentistUserId || jobData.dentistId || "",
                    clientName: jobData.dentistName || "Dentista",
                    jobTypeId: item.originalJobTypeId || item.jobTypeId,
                    jobTypeName: item.name, 
                    promotionName: item.name,
                    initialQuantity: finalQty,
                    remainingQuantity: finalQty,
                    status: 'ACTIVE',
                    orderId: jobDoc.id,
                    applyToAllVariations,
                    promoVariationOptionId,
                    promoVariationOptionIds,
                    promoVariationOptionName,
                    promoVariationGroupName,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                }
                idx++;
              }
              
              if (generatedAny) {
                writeBatch.update(jobDoc.ref, { vouchersGenerated: true });
                await writeBatch.commit();
              }
            }
          }
        }
      } else if (isOverdue) {
        if (customerId && event.payment?.subscription) {
          // SaaS Subscription overdue
          const orgsSnapshot = await db.collection("organizations")
            .where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({subscriptionStatus: "OVERDUE"});
          }
        }
      } else if (isCancelled) {
        if (customerId && event.payment?.subscription) {
          // SaaS Subscription cancelled
          const orgsSnapshot = await db.collection("organizations")
            .where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({subscriptionStatus: "CANCELLED"});
          }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      logger.error("Erro no asaasWebhook:", error);
      res.status(500).send("Erro");
    }
  }
);



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
      customerId = await getOrCreateAsaasCustomer(url, key, orderData.buyerOrgName || "Cliente", docNum, orderData.buyerOrgId, "");
    } catch (err: any) {
      throw new Error("Erro cliente Asaas: " + (err.response?.data?.errors?.[0]?.description || err.message));
    }

    const payload: any = {
      customer: customerId,
      billingType: "UNDEFINED",
      value: orderData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: `Pedido Loja Fornecedor - ${orderData.buyerOrgId}`,
    };

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - finalSplitPercent}];
    }

    const payRes = await axios.post(`${url}/payments`, payload, {
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
});

export const calculateFrenetShipping = onCall({ cors: true }, async (req: any) => {
  const { originCep, destinationCep, items, frenetToken } = req.data;
  
  if (!originCep || !destinationCep || !frenetToken) {
    return { error: 'Missing CEP or Frenet Token.' };
  }

  // Calculate total weight and dimensions (approximate)
  let totalWeight = 0;
  let totalValue = 0;
  items.forEach((item: any) => {
    totalWeight += (item.weight || 0.5) * item.quantity;
    totalValue += (item.price * item.quantity);
  });

  const payload = {
    SellerCEP: originCep.replace(/\D/g, ''),
    RecipientCEP: destinationCep.replace(/\D/g, ''),
    ShipmentInvoiceValue: totalValue,
    ShippingItemArray: items.map((item: any) => ({
      Height: item.height || 10,
      Length: item.length || 20,
      Quantity: item.quantity,
      Weight: item.weight || 0.5,
      Width: item.width || 15,
      SKU: item.id,
      Category: "Produtos Odontológicos"
    })),
    RecipientCountry: "BR"
  };

  try {
    const response = await axios.post('https://api.frenet.com.br/shipping/quote', payload, {
      headers: {
        'token': frenetToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.ShippingSevicesArray) {
      return { services: response.data.ShippingSevicesArray };
    } else {
      return { services: [] };
    }
  } catch (error: any) {
    logger.error("Erro Frenet:", error.response?.data || error.message);
    throw new HttpsError('internal', 'Erro ao calcular frete na Frenet.');
  }
});

/**
 * GERENCIA DECISÃO DE PEDIDO WEB (APROVAR OU REJEITAR)
 */
export const manageOrderDecision = onCall(async (request: any) => {
  const { orgId, jobId, decision, reason } = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  
  const db = admin.firestore();
  try {
    const jobRef = db.collection("organizations").doc(orgId).collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    if (decision === 'APPROVE') {
      await jobRef.update({
        status: "APPROVED",
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (decision === 'REJECT') {
      await jobRef.update({
        status: "REJECTED",
        rejectionReason: reason || "",
        rejectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * REPROCESSA E SINCRONIZA PEDIDOS DA LOJA VIRTUAL (VOUCHERS E FINANCEIRO)
 */
export const syncStoreOrders = onCall(async (request: any) => {
  const { organizationId, clientId, jobId, forceMarkPaid } = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não logado.");
  }
  
  const db = admin.firestore();
  let jobsToSync: any[] = [];
  
  try {
    if (jobId && organizationId) {
      const docRef = db.collection("organizations").doc(organizationId).collection("jobs").doc(jobId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        jobsToSync = [docSnap];
      }
    } else if (jobId) {
      const orgsSnap = await db.collection("organizations").get();
      for (const orgDoc of orgsSnap.docs) {
        const docRef = db.collection("organizations").doc(orgDoc.id).collection("jobs").doc(jobId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          jobsToSync = [docSnap];
          break;
        }
      }
    } else if (organizationId) {
      const jobsSnap = await db.collection("organizations")
        .doc(organizationId)
        .collection("jobs")
        .where("origin", "in", ["ONLINE_ORDER", "ONLINE_REQUISITION"])
        .get();
      jobsToSync = jobsSnap.docs;
    } else if (clientId) {
      const orgsSnap = await db.collection("organizations").get();
      const jobsPromises = orgsSnap.docs.map(async (orgDoc) => {
        const snap = await db.collection("organizations")
          .doc(orgDoc.id)
          .collection("jobs")
          .where("dentistUserId", "==", clientId)
          .get();
        return snap.docs;
      });
      const jobsSnaps = await Promise.all(jobsPromises);
      const flatDocs = jobsSnaps.flat();
      jobsToSync = flatDocs.filter((doc: any) => {
        const d = doc.data();
        return d.origin === "ONLINE_ORDER" || d.origin === "ONLINE_REQUISITION";
      });
    }

    let updatedCount = 0;
    let vouchersGeneratedCount = 0;
    
    let asaasConfig: any = null;
    try {
      asaasConfig = await getAsaasConfig();
    } catch (e) {
      logger.warn("Asaas config error during sync (using key settings if any):", e);
    }

    for (const jobDoc of jobsToSync) {
      const jobData = jobDoc.data();
      let paymentStatus = jobData.paymentStatus || "PENDING";

      // Force mark as paid if requested (e.g. by laboratory manager)
      if (forceMarkPaid && jobId && paymentStatus !== "PAID") {
        paymentStatus = "PAID";
        await jobDoc.ref.update({ paymentStatus: "PAID" });
        updatedCount++;
      }

      // Check with Asaas if pending and has Asaas payment ID
      if (paymentStatus !== "PAID" && jobData.asaasPaymentId && asaasConfig) {
        try {
          const checkRes = await axios.get(`${asaasConfig.url}/payments/${jobData.asaasPaymentId}`, {
            headers: { access_token: asaasConfig.key }
          });
          const asaasStatus = checkRes.data.status;
          if (asaasStatus === "CONFIRMED" || asaasStatus === "RECEIVED" || asaasStatus === "RECEIVED_IN_CASH") {
            paymentStatus = "PAID";
            await jobDoc.ref.update({ paymentStatus: "PAID" });
            updatedCount++;
          }
        } catch (err: any) {
          logger.error(`Error checking Asaas payment ${jobData.asaasPaymentId}:`, err.message);
        }
      }

      // Generate vouchers if paymentStatus is PAID and vouchers have not been generated
      if (paymentStatus === "PAID" && !jobData.vouchersGenerated) {
        const hasPromoItems = jobData.items?.some((item: any) => !!item.isPromo || !!item.isVoucherCombo || !!item.originalJobTypeId);
        if (jobData.isComboPurchase || hasPromoItems) {
          const writeBatch = db.batch();
          let generatedAny = false;
          let idx = 0;
          
          for (const item of jobData.items || []) {
            const shouldGenerate = !!item.isPromo || !!item.isVoucherCombo || !!item.originalJobTypeId || !!jobData.isComboPurchase;
            if (shouldGenerate) {
              generatedAny = true;
              const voucherId = `voucher_${Date.now()}_${idx}`;
              const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
              
              const voucherRef = db.collection("organizations")
                .doc(jobData.organizationId)
                .collection("vouchers")
                .doc(voucherId);
                
              let isVoucherCombo = item.isVoucherCombo === true;
              let promoQuantity = 1;
              let applyToAllVariations = true;
              let promoVariationOptionId = '';
              let promoVariationOptionIds = [];
              let promoVariationOptionName = '';
              let promoVariationGroupName = '';

              if (item.promotionQuantity !== undefined && item.promotionQuantity !== null) {
                promoQuantity = Number(item.promotionQuantity);
                applyToAllVariations = item.applyToAllVariations !== false;
                promoVariationOptionId = item.promoVariationOptionId || '';
                promoVariationOptionIds = item.promoVariationOptionIds || [];
                promoVariationOptionName = item.promoVariationOptionName || '';
                promoVariationGroupName = item.promoVariationGroupName || '';
              } else {
                try {
                  const jtDoc = await db.collection("organizations")
                    .doc(jobData.organizationId)
                    .collection("jobTypes")
                    .doc(item.jobTypeId)
                    .get();
                  if (jtDoc.exists) {
                    const jtData = jtDoc.data();
                    isVoucherCombo = jtData?.isVoucherCombo === true;
                    promoQuantity = Number(jtData?.promotionQuantity || 1);
                    applyToAllVariations = jtData?.applyToAllVariations !== false;
                    promoVariationOptionId = jtData?.promoVariationOptionId || '';
                    promoVariationOptionIds = jtData?.promoVariationOptionIds || [];
                    promoVariationOptionName = jtData?.promoVariationOptionName || '';
                    promoVariationGroupName = jtData?.promoVariationGroupName || '';
                  }
                } catch (err: any) {
                  logger.error(`Error fetching jobType ${item.jobTypeId} during sync voucher generation:`, err.message);
                }
              }

              const finalQty = isVoucherCombo ? (item.quantity * promoQuantity) : item.quantity;
                
              writeBatch.set(voucherRef, {
                id: voucherId,
                code,
                organizationId: jobData.organizationId,
                clientId: jobData.dentistUserId || jobData.dentistId || "",
                clientName: jobData.dentistName || "Dentista",
                jobTypeId: item.originalJobTypeId || item.jobTypeId,
                jobTypeName: item.name,
                promotionName: item.name,
                initialQuantity: finalQty,
                remainingQuantity: finalQty,
                status: 'ACTIVE',
                orderId: jobDoc.id,
                applyToAllVariations,
                promoVariationOptionId,
                promoVariationOptionIds,
                promoVariationOptionName,
                promoVariationGroupName,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
            idx++;
          }
          
          if (generatedAny) {
            writeBatch.update(jobDoc.ref, { vouchersGenerated: true });
            await writeBatch.commit();
            vouchersGeneratedCount++;
          }
        }
      }
    }

    return { 
      success: true, 
      jobsChecked: jobsToSync.length, 
      paymentsUpdated: updatedCount, 
      vouchersGenerated: vouchersGeneratedCount 
    };
  } catch (error: any) {
    logger.error("Error in syncStoreOrders:", error);
    throw new HttpsError("internal", error.message);
  }
});
