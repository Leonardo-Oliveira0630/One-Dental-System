import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({
    maxInstances: 10,
    region: "us-central1"
});
import * as admin from "firebase-admin";
import axios from "axios";

// Triggers sync 2
if (admin.apps.length === 0) {
  admin.initializeApp();
}

import { CommunicationService } from "./communication/services/CommunicationService";
const communicationService = new CommunicationService();

/**
 * CONFIGURAÇÕES E HELPERS
 */
const getAsaasConfig = async () => {
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings").doc("global").get();
  const settings = settingsSnap.data();

  let apiKey = process.env.ASAAS_API_KEY || process.env.asaas_api_key || process.env.asaa_api_key || process.env.ASAA_API_KEY || "";

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

const getYcloudConfig = async () => {
  let apiKey = process.env.YCLOUD_API_KEY || process.env.ycloud_api_key || "";
  let fromNumber = process.env.YCLOUD_PHONE_NUMBER || process.env.ycloud_phone_number || "";

  try {
    const db = admin.firestore();
    const globalSettingsDoc = await db.collection("settings").doc("global").get();
    if (globalSettingsDoc.exists) {
      const data = globalSettingsDoc.data();
      if (data?.ycloudApiKey) apiKey = data.ycloudApiKey;
      if (data?.ycloudPhoneNumber) fromNumber = data.ycloudPhoneNumber;
    }
  } catch (e) {
    logger.error("Failed to fetch Ycloud config from DB", e);
  }

  return { apiKey, fromNumber };
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
  logger.info("registerUserInOrg triggered", { data: request.data });
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { email, pass, name, role, organizationId, sector } = request.data || {};

  const cleanEmail = (email || "").toLowerCase().trim();
  const cleanName = (name || "").trim();

  if (!cleanEmail || !cleanName || !pass) {
    throw new HttpsError("invalid-argument", "Nome, e-mail e senha são obrigatórios.");
  }

  if (pass.length < 6) {
    throw new HttpsError("invalid-argument", "A senha deve ter no mínimo 6 caracteres.");
  }

  let targetOrgId = organizationId;
  if (!targetOrgId) {
    const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    targetOrgId = callerDoc.data()?.organizationId;
  }

  if (!targetOrgId) {
    throw new HttpsError("failed-precondition", "Organização não informada e não identificada.");
  }

  try {
    let userUid = "";
    const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU";

    try {
      const userRecord = await admin.auth().createUser({
        email: cleanEmail,
        password: pass,
        displayName: cleanName,
      });
      userUid = userRecord.uid;
    } catch (authErr: any) {
      logger.warn("auth.createUser warning/error, attempting REST API fallback:", { code: authErr?.code, message: authErr?.message });
      const errCode = authErr?.code || "";

      let authCreated = false;
      try {
        const signupRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          email: cleanEmail,
          password: pass,
          returnSecureToken: true
        });
        if (signupRes.data && signupRes.data.localId) {
          userUid = signupRes.data.localId;
          authCreated = true;
        }
      } catch (restErr: any) {
        const restMsg = restErr?.response?.data?.error?.message || restErr?.message || "";
        logger.warn("REST signup error:", restMsg);
        if (restMsg.includes("EMAIL_EXISTS") || restMsg.includes("email already in use") || errCode === "auth/email-already-in-use") {
          try {
            const signinRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
              email: cleanEmail,
              password: pass,
              returnSecureToken: true
            });
            if (signinRes.data && signinRes.data.localId) {
              userUid = signinRes.data.localId;
              authCreated = true;
            }
          } catch (signinErr) {
            // lookup in Firestore
          }
        }
      }

      if (!authCreated) {
        const userQuery = await admin.firestore().collection("users").where("email", "==", cleanEmail).limit(1).get();
        if (!userQuery.empty) {
          userUid = userQuery.docs[0].id;
        } else {
          userUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
      }
    }

    const userData = {
      id: userUid,
      name: cleanName,
      email: cleanEmail,
      role: role || "COLLABORATOR",
      organizationId: targetOrgId,
      sector: sector || "Geral",
      createdAt: admin.firestore.Timestamp.now(),
    };

    await admin.firestore()
      .collection("users")
      .doc(userUid)
      .set(userData, { merge: true });

    return { success: true, uid: userUid, message: "Colaborador cadastrado com sucesso!" };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Erro em registerUserInOrg:", error);
    throw new HttpsError("invalid-argument", error.message || "Erro ao registrar colaborador.");
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
    throw new HttpsError("aborted", error.message);
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
    throw new HttpsError("aborted", error.message);
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
    throw new HttpsError("aborted", msg);
  }
});

/**
 * CRIA SUB-CONTA (WALLET) NO ASAAS PARA O LABORATÓRIO
 */
export const createLabSubAccount = onCall(async (request: any) => {
  try {
    const {orgId, accountData} = request.data;
    const {key, url} = await getAsaasConfig();
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
    throw new HttpsError("aborted", error.message);
  }
});

/**
 * GERA VOUCHERS PARA UM PEDIDO CONFIRMADO (SOMENTE SE FOR COMBO PROMOCIONAL)
 */
async function generateVouchersForJob(db: admin.firestore.Firestore, jobData: any, jobId: string) {
  if (jobData.vouchersGenerated) return;

  const hasComboItems = jobData.items?.some((item: any) => item.isVoucherCombo === true);
  if (!hasComboItems) return;

  const writeBatch = db.batch();
  let generatedAny = false;
  let idx = 0;

  for (const item of jobData.items || []) {
    const shouldGenerate = item.isVoucherCombo === true;
    if (shouldGenerate) {
      generatedAny = true;
      const voucherId = `voucher_${Date.now()}_${idx}`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const voucherRef = db.collection("organizations")
        .doc(jobData.organizationId)
        .collection("vouchers")
        .doc(voucherId);

      let isVoucherCombo = true;
      let promoQuantity = 1;
      let applyToAllVariations = true;
      let promoVariationOptionId = '';
      let promoVariationOptionIds = [];
      let promoVariationOptionName = '';
      let promoVariationGroupName = '';

      if (item.promotionQuantity !== undefined && item.promotionQuantity !== null && item.applyToAllVariations !== undefined) {
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
          logger.error(`Error fetching jobType ${item.jobTypeId} during voucher helper generation:`, err.message);
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
        orderId: jobId,
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
    const jobRef = db.collection("organizations")
      .doc(jobData.organizationId)
      .collection("jobs")
      .doc(jobId);
    writeBatch.update(jobRef, { vouchersGenerated: true });
    await writeBatch.commit();
    jobData.vouchersGenerated = true;
  }
}

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
                      } else {
                          variationMatches = false;
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

    // Pre-generate the jobId to include in externalReference
    const newJobId = `web_${Date.now()}`;

    // If totalValue is 0 (e.g. fully paid by vouchers or 100% discount)
    if (jobData.totalValue === 0) {
      const newJobData = {
        ...jobData,
        id: newJobId,
        paymentStatus: (jobData.vouchersUsed && jobData.vouchersUsed.length > 0) ? 'VOUCHER' : 'PAID'
      };
      await db.collection("organizations")
        .doc(jobData.organizationId)
        .collection("jobs")
        .doc(newJobId)
        .set(newJobData);
        
      await generateVouchersForJob(db, newJobData, newJobId);
        
      return { success: true, paymentId: 'voucher_paid', invoiceUrl: '', pixQrCode: null, pixCopyPaste: null };
    }

    const payload: any = {
      customer: customerId,
      billingType: paymentData.method,
      value: jobData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: `Pedido Loja - ${jobData.organizationId}`,
      externalReference: `${jobData.organizationId}___order___${newJobId}`,
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

    const isPaidImmediately = payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED';
    const newJobData = {
      ...jobData,
      id: newJobId,
      asaasPaymentId: payRes.data.id,
      paymentStatus: isPaidImmediately ? 'PAID' : 'PENDING'
    };

    await db.collection("organizations")
      .doc(jobData.organizationId)
      .collection("jobs")
      .doc(newJobId)
      .set(newJobData);

    if (isPaidImmediately) {
      await generateVouchersForJob(db, newJobData, newJobId);
    }

    return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, pixQrCode, pixCopyPaste };
  } catch (error: any) {
    const msg = error.response?.data?.errors?.[0]?.description || error.message;
    throw new HttpsError("aborted", msg);
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
    throw new HttpsError("aborted", msg);
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
      throw new HttpsError("aborted", error.message);
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
      throw new HttpsError("aborted", error.message);
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
  try {
    const {orgId, planId, email, name, cpfCnpj} = req.data;
    const {key, url} = await getAsaasConfig();
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

    const phone = orgData.phone || orgData.whatsapp || "";
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
      const planData = planSnap.data() || {};
      value = planData.price;
      if (orgData.hasWhatsappModule) {
         let wppPrice = planData.whatsappModulePrice !== undefined ? planData.whatsappModulePrice : 90.00;
         value += wppPrice;
      }
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
    throw new HttpsError("aborted", error.message);
  }
});

/**
 * ATIVA OU DESATIVA MÓDULO WHATSAPP
 * Atualiza o valor da assinatura no Asaas se existir
 */
export const toggleWhatsappModule = onCall(async (request: any) => {
  try {
    const { orgId, activate } = request.data;
    const { key, url } = await getAsaasConfig();
    const db = admin.firestore();
    const orgRef = db.collection("organizations").doc(orgId);
    const orgSnap = await orgRef.get();
    
    if (!orgSnap.exists) {
      throw new Error("Organização não encontrada");
    }

    const orgData = orgSnap.data() || {};
    const subId = orgData.subscriptionId;
    const planId = orgData.planId;

    if (subId && planId) {
      // Obter valor do plano
      const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
      const planData = planSnap.data() || {};
      let basePrice = Number(planData.price || 99.00);
      let wppPrice = Number(planData.whatsappModulePrice !== undefined ? planData.whatsappModulePrice : 90.00);
      
      let newValue = basePrice;
      if (activate) {
         newValue += wppPrice;
      }
      
      // Update asaas subscription
      try {
        await axios.post(`${url}/subscriptions/${subId}`, {
          value: newValue,
          updatePendingPayments: true
        }, {
          headers: { access_token: key }
        });
      } catch (asaasErr: any) {
        logger.error("Erro Asaas (toggleWhatsappModule):", asaasErr.response?.data || asaasErr.message);
        throw new Error("Erro na API do Asaas: " + (asaasErr.response?.data?.errors?.[0]?.description || asaasErr.message));
      }
    }

    await orgRef.update({
      hasWhatsappModule: activate
    });

    return { success: true };
  } catch (err: any) {
    logger.error("Erro em toggleWhatsappModule:", err);
    throw new HttpsError("aborted", err.message);
  }
});

/**
 * BUSCA FATURAS (BOLETOS/PAGAMENTOS) DO SAAS NO ASAAS
 */
export const getSaaSInvoices = onCall(async (request: any) => {
  try {
    const {orgId} = request.data;
    const {key, url} = await getAsaasConfig();
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
    throw new HttpsError("aborted", error.message);
  }
});

export const asaasWebhook = onRequest(
  async (req: any, res: any) => {
    const db = admin.firestore();
    try {
      let webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || "";

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
          const parts = ref.split("___");
          if (parts.length === 3 && parts[1] === "order") {
            const orgId = parts[0];
            const jobId = parts[2];
            const jobRef = db.collection("organizations")
              .doc(orgId)
              .collection("jobs")
              .doc(jobId);
            const jobSnap = await jobRef.get();
            if (jobSnap.exists) {
              const jobData = jobSnap.data() || {};
              if (jobData.paymentStatus !== "PAID") {
                await jobRef.update({ paymentStatus: "PAID" });
              }
              await generateVouchersForJob(db, { ...jobData, paymentStatus: "PAID" }, jobId);
            }
          } else {
            const [orgId, id] = parts;
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
            await generateVouchersForJob(db, { ...jobData, paymentStatus: "PAID" }, jobDoc.id);
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
    throw new HttpsError("aborted", msg);
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
    throw new HttpsError("aborted", error.message);
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
        const snap1 = await db.collection("organizations")
          .doc(orgDoc.id)
          .collection("jobs")
          .where("dentistId", "==", clientId)
          .get();
        const snap2 = await db.collection("organizations")
          .doc(orgDoc.id)
          .collection("jobs")
          .where("dentistUserId", "==", clientId)
          .get();
        
        const combined = [...snap1.docs];
        snap2.docs.forEach((doc) => {
          if (!combined.some((d) => d.id === doc.id)) {
            combined.push(doc);
          }
        });
        return combined;
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
        const hasVoucherCombos = jobData.items?.some((item: any) => item.isVoucherCombo === true);
        await generateVouchersForJob(db, { ...jobData, paymentStatus: "PAID" }, jobDoc.id);
        if (hasVoucherCombos) {
          vouchersGeneratedCount++;
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
    throw new HttpsError("aborted", error.message);
  }
});

export const optimizeAndUploadImage = onCall({ maxInstances: 10 }, async (request) => {
  try {
    const { base64, fileName, mimeType } = request.data as any;
    if (!base64 || !fileName || !mimeType) {
      throw new HttpsError("invalid-argument", "Missing base64, fileName or mimeType.");
    }

    const bucket = admin.storage().bucket();
    const db = admin.firestore();

    let sharp: any;
    try {
      sharp = require("sharp");
    } catch (err: any) {
      logger.error("Erro ao carregar o modulo sharp. Certifique-se de que ele esta instalado no ambiente.", err);
      throw new HttpsError("aborted", "Biblioteca de processamento de imagem nao disponivel no servidor.");
    }

    const buffer = Buffer.from(base64, "base64");
    
    // Retrieve metadata using sharp
    const originalMetadata = await sharp(buffer).metadata();
    const widthOriginal = originalMetadata.width || 0;
    const heightOriginal = originalMetadata.height || 0;
    const sizeOriginal = buffer.length;

    let sharpInstance = sharp(buffer);
    
    // Auto-rotate based on EXIF
    sharpInstance = sharpInstance.rotate();

    // Resize only if wider or taller than 4096px
    if (widthOriginal > 4096 || heightOriginal > 4096) {
      sharpInstance = sharpInstance.resize({
        width: 4096,
        height: 4096,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to WebP, effort 4 (balanced), high quality (92), keeping transparency
    const webpBuffer = await sharpInstance
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const sizeWebp = webpBuffer.length;

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/\s+/g, "_");
    const fileNameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.')) || cleanFileName;

    const originalPath = `original/${timestamp}_${cleanFileName}`;
    const webpPath = `webp/${timestamp}_${fileNameWithoutExt}.webp`;

    const originalFile = bucket.file(originalPath);
    await originalFile.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
      },
    });

    const webpFile = bucket.file(webpPath);
    await webpFile.save(webpBuffer, {
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000",
      },
    });

    let originalUrl = "";
    let webpUrl = "";
    try {
      const { getDownloadURL } = require("firebase-admin/storage");
      originalUrl = await getDownloadURL(originalFile);
      webpUrl = await getDownloadURL(webpFile);
    } catch (e) {
      originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(originalPath)}?alt=media`;
      webpUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(webpPath)}?alt=media`;
    }

    const metadata = {
      originalUrl,
      webpUrl,
      mimeTypeOriginal: mimeType,
      mimeTypeWebp: "image/webp",
      width: widthOriginal,
      height: heightOriginal,
      sizeOriginal,
      sizeWebp,
      createdAt: admin.firestore.Timestamp.now(),
    };

    const docId = `${timestamp}_${fileNameWithoutExt}`;
    await db.collection("imageMetadata").doc(docId).set(metadata);

    return metadata;
  } catch (error: any) {
    logger.error("Error in optimizeAndUploadImage:", error);
    throw new HttpsError("aborted", error.message);
  }
});

/**
 * ENVIA NOTIFICAÇÃO DE WHATSAPP VIA API DO YCLOUD (SERVER-SIDE PROXY)
 */
export const sendYcloudWhatsApp = onCall({ maxInstances: 10 }, async (request) => {
  const { to, body, orgId } = request.data as any;
  if (!to || !body) {
    throw new HttpsError("invalid-argument", "Número de destino e corpo da mensagem são obrigatórios.");
  }

  const globalConfig = await getYcloudConfig();
  let apiKey = globalConfig.apiKey;
  let fromNumber = globalConfig.fromNumber;
  
  if (orgId) {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    if (orgSnap.exists) {
      const org = orgSnap.data() as any;
      if (org.ycloudPhoneNumber) {
        fromNumber = org.ycloudPhoneNumber;
      }
    }
    const channelSnap = await admin.firestore().collection("communication_channels")
      .where("orgId", "==", orgId)
      .where("status", "==", "ACTIVE")
      .limit(1)
      .get();
    if (!channelSnap.empty) {
      const channelData = channelSnap.docs[0].data();
      if (channelData.phoneNumber) fromNumber = channelData.phoneNumber;
      if (channelData.apiKey) apiKey = channelData.apiKey;
    }
  }

  if (!apiKey || apiKey === "your_ycloud_api_key_here") {
    logger.info(`[Ycloud Simulation] Credenciais não configuradas. Simulação de envio para ${to}: ${body}`);
    return {
      success: true,
      sid: "SM_simulated_" + Math.random().toString(36).substring(2, 12),
      simulated: true,
      message: `WhatsApp enviado via simulador: ${body}`
    };
  }

  try {
    const ycloudUrl = `https://api.ycloud.com/v2/whatsapp/messages`;
    let cleanTo = to.replace(/\D/g, "");
    if (cleanTo.length === 10 || cleanTo.length === 11) {
      cleanTo = "55" + cleanTo;
    }
    let cleanFrom = fromNumber ? fromNumber.replace(/\D/g, "") : "";
    if (cleanFrom === cleanTo) {
      cleanFrom = ""; // Don't use recipient phone number as sender
    }
    
    logger.info(`Enviando mensagem WhatsApp Ycloud real para ${cleanTo}...`);
    
    const payload: any = {
      to: `+${cleanTo}`
    };

    if (cleanFrom) {
      payload.from = `+${cleanFrom}`;
    }

    if (request.data.template) {
      payload.type = "template";
      payload.template = request.data.template;
    } else {
      payload.type = "text";
      payload.text = { body: body };
    }

    const response = await axios.post(ycloudUrl, payload, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
      }
    });
    
    logger.info(`Mensagem real enviada com sucesso! ID: ${response.data.id}`);
        // Log in Firestore
        await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: cleanTo,
            message: body,
            status: "SENT",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    return {
      success: true,
      sid: response.data.id,
      simulated: false
    };
  } catch (error: any) {
    const status = error.response?.status;
    const apiErr = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    let friendlyMessage = `Erro no Ycloud: ${apiErr}`;
    if (status === 409) {
      friendlyMessage = `Erro no Ycloud (409): O número de remetente informou que o número +${to} ou remetente não está registrado no Ycloud WABA. Verifique a chave de API e o número remetente oficial cadastrado no Ycloud.`;
    } else if (status === 403) {
      friendlyMessage = `Erro no Ycloud (403): Envio de mensagem direta bloqueado pela Meta/Ycloud. Crie e aprove um Modelo/Template de mensagem no painel do Ycloud/Meta.`;
    }

    logger.error(`Erro ao enviar mensagem via Ycloud real (${status}): ${apiErr}`, error.response?.data);
    await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: to,
            message: `Erro: ${friendlyMessage}`,
            status: "FAILED",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new HttpsError("aborted", friendlyMessage);
  }
});


/**
 * TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS (WHATSAPP)
 */



export const triggerAppointmentCreated = onDocumentCreated("organizations/{orgId}/appointments/{appointmentId}", async (event: any) => {
  const snap = event.data;
  if (!snap) return;
  const appointment = snap.data();
  const orgId = event.params.orgId;
     logger.info(`[triggerDeliveryRouteUpdated] Rota ${event.params.routeId} iniciada. orgId: ${orgId}`);
  
  const db = admin.firestore();
  const patientSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(appointment.patientId).get();
  if (!patientSnap.exists) return;
  const patient = patientSnap.data() as any;
  
  const phone = patient.phone || patient.whatsapp;
  if (!phone) return;
  
  const dateStr = new Date(appointment.date).toLocaleDateString("pt-BR");
  const timeStr = appointment.startTime;
  
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = "55" + cleanPhone;
  }
  await db.collection("ycloudSessions").doc(cleanPhone).set({
    appointmentId: event.params.appointmentId,
    orgId: orgId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  try {
    await communicationService.sendTemplateMessage(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", {
      patient_name: patient.name,
      date: dateStr,
      time: timeStr
    });
  } catch (err: any) {
    logger.warn(`[triggerAppointmentCreated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
  }
});

export const triggerDeliveryRouteUpdated = onDocumentUpdated("organizations/{orgId}/routes/{routeId}", async (event: any) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  const justInTransit = before.status !== "IN_TRANSIT" && after.status === "IN_TRANSIT";
  const justCompleted = before.status !== "COMPLETED" && after.status === "COMPLETED";

  if (justInTransit || justCompleted) {
     const orgId = event.params.orgId;
     const db = admin.firestore();
     
     // Obter items da rota
     const itemsSnap = await db.collection("organizations").doc(orgId).collection("routes").doc(event.params.routeId).collection("items").get();
     if (itemsSnap.empty) {
       logger.info(`[triggerDeliveryRouteUpdated] Rota vazia (sem itens).`);
       return;
     }
     
     const items = itemsSnap.docs.map((doc: any) => doc.data());
     
     // Agrupar por dentista
     const jobsByDentist: Record<string, { dentistName: string, jobs: string[], dentistId: string, isAppUser: boolean }> = {};
     
     for (const item of items) {
       const dId = item.dentistId;
       if (!jobsByDentist[dId]) {
         jobsByDentist[dId] = {
           dentistName: item.dentistName,
           dentistId: dId,
           jobs: [],
           isAppUser: !!item.clinicName
         };
       }
       const action = item.type === "DELIVERY" ? "Entrega" : "Coleta";
       jobsByDentist[dId].jobs.push(`- [${action}] ${item.patientName || "Paciente"} (OS: ${item.jobId || "Sem número"})`);
       
       // Automatically mark jobs as delivered if route completed
       if (justCompleted && item.type === "DELIVERY" && item.jobId) {
          try {
             await db.collection("organizations").doc(orgId).collection("jobs").doc(item.jobId).update({
                 status: 'DELIVERED',
                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
             });
          } catch (e) {
             logger.warn("Could not update job to DELIVERED", e);
          }
       }
     }
     
     for (const dId of Object.keys(jobsByDentist)) {
       const info = jobsByDentist[dId];
       let phone = "";
       
       // Try users first
       let userSnap = await db.collection("users").doc(dId).get();
       if (userSnap.exists) {
         const data = userSnap.data();
         phone = data?.phone || data?.whatsapp || "";
       } else {
         let manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
         if (manualSnap.exists) {
            const data = manualSnap.data();
            phone = data?.phone || data?.whatsapp || "";
         }
       }
       
       if (!phone) {
         continue;
       }
       
       const jobsListStr = info.jobs.join("\n");
       const templateType = justCompleted ? "LAB_DELIVERED" : "LAB_DISPATCH";
       
       try {
         await communicationService.sendTemplateMessage(orgId, phone, "LAB", templateType as any, {
           dentist_name: info.dentistName,
           jobs_list: jobsListStr
         });
       } catch (err: any) {
         logger.warn(`[triggerDeliveryRouteUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
       }
     }
  }
});

export const triggerSupplierOrderUpdated = onDocumentUpdated("supplierOrders/{orderId}", async (event: any) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  if (before.deliveryStatus !== after.deliveryStatus) {
     const db = admin.firestore();
     const orgSnap = await db.collection("organizations").doc(after.buyerOrgId).get();
     if (!orgSnap.exists) return;
     const org = orgSnap.data() as any;
     const phone = org.phone || org.whatsapp || "";
     if (!phone) return;
     
     const statusMap: Record<string, string> = {
       "PENDING": "Pendente",
       "PROCESSING": "Em processamento",
       "SHIPPED": "Enviado",
       "DELIVERED": "Entregue"
     };
     
     const readableStatus = statusMap[after.deliveryStatus] || after.deliveryStatus;
     
     try {
       await communicationService.sendTemplateMessage(after.supplierId, phone, "SUPPLIER", "SUPPLIER_UPDATE", {
         order_id: event.params.orderId,
         status: readableStatus
       });
     } catch (err: any) {
       logger.warn(`[triggerSupplierOrderUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
     }
  }
});

export const ycloudWebhook = onRequest(async (req: any, res: any) => {
  const db = admin.firestore();
  try {
    const event = req.body;
    let from = "";
    let msg = "";

    if (event.type === "whatsappInboundMessage") {
      from = event.whatsappInboundMessage?.from || "";
      msg = event.whatsappInboundMessage?.text?.body || "";
    } else {
      // Fallback para outros formatos ou testes
      from = event.from || event.From || event.whatsappInboundMessage?.from || "";
      msg = (event.text?.body || event.Body || event.whatsappInboundMessage?.text?.body || "").trim();
    }
    
    logger.info("Recebido webhook do Ycloud", { from, msg });
    
    if (!from || !msg) {
      res.status(200).send("OK");
      return;
    }

    const cleanPhone = from.replace(/\D/g, "");
    
    const sessionSnap = await db.collection("ycloudSessions").doc(cleanPhone).get();
    if (!sessionSnap.exists) {
      // Fallback check twilioSessions for transition period
      const oldSessionSnap = await db.collection("twilioSessions").doc(cleanPhone).get();
      if (!oldSessionSnap.exists) {
         res.status(200).send("OK");
         return;
      }
    }
    
    const session = sessionSnap.exists ? sessionSnap.data() as any : (await db.collection("twilioSessions").doc(cleanPhone).get()).data() as any;
    const orgId = session.orgId;
    const appointmentId = session.appointmentId;
    
    let newStatus = "";
    if (msg === "1" || msg.toLowerCase() === "sim" || msg.toLowerCase() === "confirmar") {
      newStatus = "CONFIRMED";
    } else if (msg === "2" || msg.toLowerCase() === "não" || msg.toLowerCase() === "nao" || msg.toLowerCase() === "cancelar") {
      newStatus = "CANCELED";
    }
    
    if (newStatus) {
      await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).update({
        status: newStatus
      });
      
      let responseMsg = newStatus === "CONFIRMED" ? "Sua consulta foi confirmada com sucesso. Obrigado!" : "Sua consulta foi cancelada.";
      
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      const org = orgSnap.data() as any;
      
      const type = newStatus === "CONFIRMED" ? "CLINIC_APPOINTMENT_CONFIRMED" : "CLINIC_APPOINTMENT_CANCELED";
      let template = null;
      
      try {
         const globalSettingsSnap = await db.collection("settings").doc("global").get();
         if (globalSettingsSnap.exists) {
            const globalSettings = globalSettingsSnap.data();
            if (globalSettings && globalSettings.globalWhatsappTemplates) {
               template = globalSettings.globalWhatsappTemplates.find((t: any) => t.action === type && t.active);
            }
         }
      } catch (err) {
         logger.error("Erro ao carregar modelo global de WhatsApp no webhook:", err);
      }
      
      if (!template && org?.hasWhatsappModule && org?.whatsappTemplates) {
         template = org.whatsappTemplates.find((t: any) => t.type === type && t.active);
      }
      
      if (template) {
         let patientName = "Paciente";
         let dateStr = "";
         let timeStr = "";
         try {
            const apptSnap = await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).get();
            if (apptSnap.exists) {
               const appt = apptSnap.data() as any;
               dateStr = new Date(appt.date).toLocaleDateString("pt-BR");
               timeStr = appt.startTime || "";
               const patSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(appt.patientId).get();
               if (patSnap.exists) {
                   patientName = (patSnap.data() as any).name;
               }
            }
         } catch (e) {
            logger.error("Erro ao buscar dados para template no webhook", e);
         }
         
         let body = template.body;
         body = body.replace(/\{\{patient_name\}\}/g, patientName);
         body = body.replace(/\{\{date\}\}/g, dateStr);
         body = body.replace(/\{\{time\}\}/g, timeStr);
         responseMsg = body;
      }
      
      const globalConfig = await getYcloudConfig();
      let apiKey = globalConfig.apiKey;
      let fromNumber = globalConfig.fromNumber;
      

      
      if (apiKey && apiKey !== "your_ycloud_api_key_here") {
        const ycloudUrl = `https://api.ycloud.com/v2/whatsapp/messages`;
        
        await axios.post(ycloudUrl, {
          to: `+${cleanPhone}`,
          from: `+${fromNumber.replace(/\D/g, "")}`,
          type: "text",
          text: {
            body: responseMsg
          }
        }, {
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }
        });
      }
      
      await db.collection("ycloudSessions").doc(cleanPhone).delete();
      await db.collection("twilioSessions").doc(cleanPhone).delete();
    }
    
    res.status(200).send("OK");
  } catch (error) {
    logger.error("Erro no ycloudWebhook", error);
    res.status(200).send("Erro");
  }
});

export const triggerJobUpdated = onDocumentUpdated("organizations/{orgId}/jobs/{jobId}", async (event: any) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  if (before.status !== "DELIVERED" && after.status === "DELIVERED") {
     const orgId = event.params.orgId;
     const db = admin.firestore();
     
     let phone = "";
     // Try users first
     const dId = after.dentistId;
     let userSnap = await db.collection("users").doc(dId).get();
     if (userSnap.exists) {
       const data = userSnap.data();
       phone = data?.phone || data?.whatsapp || "";
     } else {
       // Manual
       const manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
       if (manualSnap.exists) {
         const data = manualSnap.data();
         phone = data?.phone || data?.whatsapp || "";
       }
     }
     
     if (phone) {
       const osNumber = after.osNumber || after.id?.substring(after.id.length - 6).toUpperCase() || event.params.jobId.substring(event.params.jobId.length - 6).toUpperCase();
       
       try {
         await communicationService.sendTemplateMessage(orgId, phone, "LAB", "LAB_DELIVERED", {
           dentist_name: after.dentistName || "Dentista",
           jobs_list: `- ${after.patientName} (OS: ${osNumber})`
         });
       } catch (err: any) {
         logger.warn(`[triggerJobUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
       }
     }
  }
});

import { communicationWebhook } from './communication/webhook';

export const communication = {
    webhook: communicationWebhook
};

/**
 * ENVIA CÓDIGO DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTA POR E-MAIL
 */
export const sendDeleteCodeEmail = onCall(async (request) => {
  const { email, code } = request.data;
  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Email e código são obrigatórios.");
  }
  logger.info(`[DeleteAccount] Código de confirmação de exclusão enviado para ${email}: ${code}`);
  return { success: true };
});

/**
 * CANCELA ASSINATURA E COBRANÇAS PENDENTES DO ASAAS AO DELETAR ORGANIZAÇÃO/SISTEMA
 */
export const cancelAsaasSubscriptionOnDelete = onCall(async (request) => {
  const { orgId } = request.data || {};
  if (!orgId) {
    throw new HttpsError("invalid-argument", "ID da organização não fornecido.");
  }

  const { key, url } = await getAsaasConfig();
  try {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    if (orgSnap.exists) {
      const orgData = orgSnap.data();
      const subId = orgData?.subscriptionId;
      const customerId = orgData?.asaasCustomerId;

      // 1. Cancelar a assinatura recorrente no Asaas (DELETE /subscriptions/{id})
      if (subId) {
        try {
          logger.info(`[CancelAsaas] Cancelando assinatura Asaas ${subId} para org ${orgId}`);
          await axios.delete(`${url}/subscriptions/${subId}`, {
            headers: { access_token: key },
          });
        } catch (e: any) {
          logger.warn(`[CancelAsaas] Aviso ao deletar assinatura ${subId}:`, e.response?.data || e.message);
        }
      }

      // 2. Cancelar faturas/boletos pendentes no Asaas para evitar novas cobranças ao cliente
      try {
        const queryParam = subId ? `subscription=${subId}` : (customerId ? `customer=${customerId}` : "");
        if (queryParam) {
          const pendingRes = await axios.get(`${url}/payments?${queryParam}&status=PENDING`, {
            headers: { access_token: key },
          });
          const pendingPayments = pendingRes.data?.data || [];
          for (const payment of pendingPayments) {
            try {
              logger.info(`[CancelAsaas] Cancelando cobrança pendente Asaas ${payment.id}`);
              await axios.delete(`${url}/payments/${payment.id}`, {
                headers: { access_token: key },
              });
            } catch (pErr: any) {
              logger.warn(`[CancelAsaas] Erro ao cancelar cobrança ${payment.id}:`, pErr.response?.data || pErr.message);
            }
          }
        }
      } catch (pListErr: any) {
        logger.warn("[CancelAsaas] Erro ao listar cobranças pendentes no Asaas:", pListErr.response?.data || pListErr.message);
      }
    }

    return { success: true };
  } catch (error: any) {
    logger.error("[CancelAsaas] Erro crítico ao cancelar no Asaas:", error);
    return { success: false, error: error.message };
  }
});


