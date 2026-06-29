"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/src/index.ts
var src_exports = {};
__export(src_exports, {
  asaasWebhook: () => asaasWebhook,
  checkSubscriptionStatus: () => checkSubscriptionStatus,
  createLabSubAccount: () => createLabSubAccount,
  createOrderPayment: () => createOrderPayment,
  createPatientPayment: () => createPatientPayment,
  createSaaSSubscription: () => createSaaSSubscription,
  deleteUserAdmin: () => deleteUserAdmin,
  generateBatchBoleto: () => generateBatchBoleto,
  getSaaSInvoices: () => getSaaSInvoices,
  registerUserInOrg: () => registerUserInOrg,
  setSubscriptionStatus: () => setSubscriptionStatus,
  updateUserAdmin: () => updateUserAdmin,
  validateCro: () => validateCro
});
module.exports = __toCommonJS(src_exports);
var import_https = require("firebase-functions/v2/https");
var logger = __toESM(require("firebase-functions/logger"), 1);
var import_v2 = require("firebase-functions/v2");
var admin = __toESM(require("firebase-admin"), 1);
var import_axios = __toESM(require("axios"), 1);
(0, import_v2.setGlobalOptions)({ maxInstances: 10 });
if (admin.apps.length === 0) {
  admin.initializeApp();
}
var getAsaasConfig = async () => {
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings").doc("global").get();
  const settings = settingsSnap.data();
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
    logger.error("ERRO: ASAAS_API_KEY n\xE3o configurada.");
    throw new Error("Chave de API do Asaas n\xE3o configurada no servidor.");
  }
  const isProduction = true;
  const baseUrl = "https://api.asaas.com/v3";
  const envName = isProduction ? "PRODU\xC7\xC3O" : "SANDBOX";
  logger.info(`Conectando ao Asaas em modo: ${envName}`);
  return {
    key: apiKey,
    url: baseUrl,
    splitPercent: settings?.platformCommission || 5
  };
};
var registerUserInOrg = (0, import_https.onCall)(async (request) => {
  const { email, pass, name, role, organizationId, sector } = request.data;
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "N\xE3o logado.");
  }
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password: pass,
      displayName: name
    });
    const userData = {
      id: userRecord.uid,
      name,
      email,
      role,
      organizationId,
      sector: sector || "Geral",
      createdAt: admin.firestore.Timestamp.now()
    };
    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
    return { success: true, uid: userRecord.uid };
  } catch (error2) {
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var validateCro = (0, import_https.onCall)(async (request) => {
  const { uf, numero, categoria } = request.data;
  if (!uf || !numero || !categoria) {
    throw new import_https.HttpsError(
      "invalid-argument",
      "UF, n\xFAmero de registro e categoria s\xE3o obrigat\xF3rios."
    );
  }
  const apiKey = process.env.CONSULTARIO_API_KEY;
  if (!apiKey || apiKey === "SUA_CHAVE_AQUI" || apiKey === "") {
    logger.warn(
      "Chave CONSULTARIO_API_KEY n\xE3o configurada. Simulando retorno v\xE1lido."
    );
    return {
      success: true,
      valido: true,
      name: "DENTISTA TESTE INTEGRACAO",
      situacao: "ATIVO",
      message: "Modo Desenvolvimento (Chave de API n\xE3o configurada)."
    };
  }
  try {
    logger.info(
      `Consultando CRO na consultar.io... UF: ${uf}, Numero: ${numero}, Categoria: ${categoria}`
    );
    const response = await import_axios.default.post(
      "https://consultar.io/api/v1/cro/consultar",
      {
        uf,
        numero,
        categoria
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 1e4
      }
    );
    const data = response.data;
    logger.info("Resposta consultar.io CRO:", data);
    const rawSituacao = data?.situacao || data?.status || data?.situacao_inscricao || data?.situacao_cadastral || "";
    const situacao = rawSituacao.toString().toUpperCase();
    const nomeProfissional = data?.nome || data?.nome_profissional || "";
    const isValido = situacao.includes("ATIVO") || situacao.includes("REGULAR") || situacao.includes("CONSTA") || situacao === "" || data?.valido === true || data?.valid === true;
    return {
      success: true,
      valido: isValido,
      name: nomeProfissional,
      situacao: situacao || "N\xC3O INFORMADA"
    };
  } catch (error2) {
    logger.error(
      "Erro ao validar CRO na consultar.io:",
      error2?.response?.data || error2?.message
    );
    const apiMsg = error2.response?.data?.error || error2.response?.data?.message || error2.message;
    throw new import_https.HttpsError(
      "internal",
      `Falha na integra\xE7\xE3o com consultar.io: ${apiMsg}`
    );
  }
});
var deleteUserAdmin = (0, import_https.onCall)(async (request) => {
  const { targetUserId } = request.data;
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "N\xE3o logado.");
  }
  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerSnap.data();
  const isAdmin = callerData?.role === "ADMIN" || callerData?.role === "SUPER_ADMIN";
  if (!isAdmin) {
    throw new import_https.HttpsError(
      "permission-denied",
      "Apenas administradores podem excluir usu\xE1rios."
    );
  }
  try {
    await admin.auth().deleteUser(targetUserId);
    await db.collection("users").doc(targetUserId).delete();
    return { success: true };
  } catch (error2) {
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var updateUserAdmin = (0, import_https.onCall)(async (request) => {
  const { targetUserId, updates } = request.data;
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "N\xE3o logado.");
  }
  const db = admin.firestore();
  try {
    await db.collection("users").doc(targetUserId).update(updates);
    return { success: true };
  } catch (error2) {
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var generateBatchBoleto = (0, import_https.onCall)(async (request) => {
  const { orgId, dentistId, jobIds, dueDate } = request.data;
  const db = admin.firestore();
  logger.info("Iniciando generateBatchBoleto", { orgId, dentistId });
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "Acesso negado.");
  }
  try {
    const { key, url, splitPercent } = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;
    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== void 0 && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== void 0 && planSplit !== null) {
            finalSplitPercent = Number(planSplit);
          }
        }
      }
    }
    let dentist = null;
    const manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dentistId).get();
    if (manualSnap.exists) {
      dentist = manualSnap.data();
    } else {
      const userSnap = await db.collection("users").doc(dentistId).get();
      if (userSnap.exists) dentist = userSnap.data();
    }
    if (!dentist) throw new Error("Dentista n\xE3o encontrado.");
    let total = 0;
    const patients = [];
    for (const id of jobIds) {
      const jSnap = await db.collection("organizations").doc(orgId).collection("jobs").doc(id).get();
      if (jSnap.exists) {
        total += jSnap.data()?.totalValue || 0;
        patients.push(jSnap.data()?.patientName || "Paciente");
      }
    }
    let customerId = "";
    const docNum = (dentist.cpfCnpj || dentist.cpf || "").replace(/\D/g, "");
    try {
      const searchRes = await import_axios.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
        headers: { access_token: key }
      });
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const customerRes = await import_axios.default.post(`${url}/customers`, {
          name: dentist.name,
          cpfCnpj: docNum,
          email: dentist.email || "",
          notificationDisabled: true
        }, { headers: { access_token: key } });
        customerId = customerRes.data.id;
      }
    } catch (err) {
      const apiErr = err.response?.data?.errors?.[0]?.description;
      const finalMsg = apiErr || err.message;
      logger.error("Erro no cliente Asaas", err.response?.data);
      throw new Error(`Asaas (Cliente): ${finalMsg}`);
    }
    const batchId = `batch_${Date.now()}`;
    const cleanDueDate = typeof dueDate === "string" ? dueDate.split("T")[0] : new Date(dueDate).toISOString().split("T")[0];
    const payload = {
      customer: customerId,
      billingType: "BOLETO",
      value: total,
      dueDate: cleanDueDate,
      externalReference: `${orgId}___${batchId}`,
      description: `Fatura ProTrack: ${patients.slice(0, 3).join(", ")}...`
    };
    if (walletId && walletId.length > 10) {
      payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
    }
    const payRes = await import_axios.default.post(`${url}/payments`, payload, {
      headers: { access_token: key }
    });
    const dtParsed = /* @__PURE__ */ new Date(cleanDueDate + "T12:00:00");
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
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection("organizations").doc(orgId).collection("billingBatches").doc(batchId).set(batchDoc);
    const dbBatch = db.batch();
    jobIds.forEach((id) => {
      const ref = db.collection("organizations").doc(orgId).collection("jobs").doc(id);
      dbBatch.update(ref, {
        batchId,
        paymentStatus: "AUTHORIZED",
        asaasPaymentId: payRes.data.id
      });
    });
    await dbBatch.commit();
    return { success: true, batchId, invoiceUrl: batchDoc.invoiceUrl };
  } catch (error2) {
    const asaasMsg = error2.response?.data?.errors?.[0]?.description;
    const msg = asaasMsg || error2.message || "Erro interno no servidor";
    logger.error("Falha no faturamento", {
      msg,
      d: error2.response?.data
    });
    throw new import_https.HttpsError("internal", msg);
  }
});
var createLabSubAccount = (0, import_https.onCall)(async (request) => {
  const { orgId, accountData } = request.data;
  const { key, url } = await getAsaasConfig();
  try {
    const res = await import_axios.default.post(`${url}/accounts`, accountData, {
      headers: { access_token: key }
    });
    await admin.firestore().collection("organizations").doc(orgId).update({
      "financialSettings.asaasWalletId": res.data.walletId || res.data.id || res.data.apiKey,
      "financialSettings.asaasApiKey": res.data.apiKey,
      "financialSettings.asaasWalletStatus": "PENDING"
    });
    return { success: true };
  } catch (error2) {
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var createOrderPayment = (0, import_https.onCall)(async (request) => {
  const { jobData, paymentData } = request.data;
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "N\xE3o logado.");
  }
  const db = admin.firestore();
  try {
    const { key, url, splitPercent } = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(jobData.organizationId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;
    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== void 0 && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== void 0 && planSplit !== null) {
            finalSplitPercent = Number(planSplit);
          }
        }
      }
    }
    let customerId = "";
    try {
      const docNum = paymentData.cpfCnpj;
      const searchRes = await import_axios.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
        headers: { access_token: key }
      });
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const customerRes = await import_axios.default.post(`${url}/customers`, {
          name: jobData.dentistName || "Cliente Loja",
          cpfCnpj: docNum,
          notificationDisabled: true
        }, { headers: { access_token: key } });
        customerId = customerRes.data.id;
      }
    } catch (err) {
      throw new Error("Erro cliente Asaas: " + (err.response?.data?.errors?.[0]?.description || err.message));
    }
    const payload = {
      customer: customerId,
      billingType: paymentData.method,
      value: jobData.totalValue,
      dueDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      description: `Pedido Loja - ${jobData.organizationId}`
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
      payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
    }
    const payRes = await import_axios.default.post(`${url}/payments`, payload, {
      headers: { access_token: key }
    });
    const newJobId = `web_${Date.now()}`;
    const newJobData = {
      ...jobData,
      id: newJobId,
      asaasPaymentId: payRes.data.id,
      paymentStatus: payRes.data.status === "CONFIRMED" || payRes.data.status === "RECEIVED" ? "PAID" : "PENDING"
    };
    await db.collection("organizations").doc(jobData.organizationId).collection("jobs").doc(newJobId).set(newJobData);
    return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, pixQrCode: payRes.data.pixQrCode || null };
  } catch (error2) {
    const msg = error2.response?.data?.errors?.[0]?.description || error2.message;
    throw new import_https.HttpsError("internal", msg);
  }
});
var createPatientPayment = (0, import_https.onCall)(async (request) => {
  const { orgId, patientId, totalAmount, dueDate, title } = request.data;
  if (!request.auth) {
    throw new import_https.HttpsError("unauthenticated", "N\xE3o logado.");
  }
  const db = admin.firestore();
  try {
    const { key, url, splitPercent } = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;
    let finalSplitPercent = splitPercent;
    const customSplit = orgSnap.data()?.financialSettings?.customSplitPercent;
    if (customSplit !== void 0 && customSplit !== null) {
      finalSplitPercent = Number(customSplit);
    } else {
      const planId = orgSnap.data()?.planId;
      if (planId) {
        const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
        if (planSnap.exists) {
          const planSplit = planSnap.data()?.features?.splitPercent;
          if (planSplit !== void 0 && planSplit !== null) {
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
      const searchRes = await import_axios.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
        headers: { access_token: key }
      });
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const customerRes = await import_axios.default.post(`${url}/customers`, {
          name: patientData.name,
          cpfCnpj: docNum,
          notificationDisabled: true
        }, { headers: { access_token: key } });
        customerId = customerRes.data.id;
      }
    } catch (err) {
      throw new Error("Erro cliente Asaas (Paciente): " + (err.response?.data?.errors?.[0]?.description || err.message));
    }
    const payload = {
      customer: customerId,
      billingType: "BOLETO",
      // Pode ser configurado pelo dentista
      value: totalAmount,
      dueDate: dueDate.split("T")[0],
      description: title || "Fatura Cl\xEDnica"
    };
    if (walletId && walletId.length > 10) {
      payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
    }
    const payRes = await import_axios.default.post(`${url}/payments`, payload, {
      headers: { access_token: key }
    });
    return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl };
  } catch (error2) {
    const msg = error2.response?.data?.errors?.[0]?.description || error2.message;
    throw new import_https.HttpsError("internal", msg);
  }
});
var setSubscriptionStatus = (0, import_https.onCall)(
  async (request) => {
    if (!request.auth) {
      throw new import_https.HttpsError(
        "unauthenticated",
        "Usu\xE1rio n\xE3o autenticado."
      );
    }
    const { orgId, status } = request.data;
    if (!orgId || !status) {
      throw new import_https.HttpsError(
        "invalid-argument",
        "Par\xE2metros orgId e status s\xE3o obrigat\xF3rios."
      );
    }
    const { key, url } = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
      if (!orgSnap.exists) {
        throw new import_https.HttpsError(
          "not-found",
          "Organiza\xE7\xE3o n\xE3o encontrada."
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
            await import_axios.default.delete(`${url}/subscriptions/${subId}`, {
              headers: { access_token: key }
            });
          } catch (e) {
            logger.warn(
              "Erro ao deletar assinatura no Asaas:",
              e.response?.data || e.message
            );
          }
        }
      }
      await admin.firestore().collection("organizations").doc(orgId).update({
        subscriptionStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, status };
    } catch (error2) {
      logger.error("Erro em setSubscriptionStatus:", error2);
      throw new import_https.HttpsError("internal", error2.message);
    }
  }
);
var checkSubscriptionStatus = (0, import_https.onCall)(
  async (request) => {
    const { orgId } = request.data;
    if (!orgId) {
      throw new import_https.HttpsError(
        "invalid-argument",
        "orgId \xE9 obrigat\xF3rio."
      );
    }
    const { key, url } = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
      if (!orgSnap.exists) {
        throw new import_https.HttpsError(
          "not-found",
          "Organiza\xE7\xE3o n\xE3o encontrada."
        );
      }
      const currentStatus = orgSnap.data()?.subscriptionStatus;
      if (currentStatus === "FREE" || currentStatus === "TEST") {
        return { status: currentStatus };
      }
      const subId = orgSnap.data()?.subscriptionId;
      if (!subId) return { status: "NONE" };
      const res = await import_axios.default.get(`${url}/subscriptions/${subId}`, {
        headers: { access_token: key }
      });
      const asaasStatus = res.data.status;
      let status = "PENDING";
      if (asaasStatus === "ACTIVE") {
        status = "ACTIVE";
      } else if (asaasStatus === "EXPIRED" || asaasStatus === "OVERDUE") {
        status = "OVERDUE";
      } else if (asaasStatus === "DELETED") {
        status = "CANCELLED";
      }
      await admin.firestore().collection("organizations").doc(orgId).update({ subscriptionStatus: status });
      return { status };
    } catch (error2) {
      logger.error("Erro em checkSubscriptionStatus:", error2);
      throw new import_https.HttpsError("internal", error2.message);
    }
  }
);
var createSaaSSubscription = (0, import_https.onCall)(async (req) => {
  const { orgId, planId, email, name, cpfCnpj } = req.data;
  const { key, url } = await getAsaasConfig();
  try {
    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    let orgData = {};
    if (orgSnap.exists) {
      orgData = orgSnap.data() || {};
    }
    const phone = orgData.phone || "";
    const cep = orgData.cep || "";
    const address = orgData.address || "";
    const number = orgData.number || "";
    const complement = orgData.complement || "";
    const neighborhood = orgData.neighborhood || "";
    let customerId = "";
    try {
      const existing = await import_axios.default.get(
        `${url}/customers?cpfCnpj=${cleanCpfCnpj}`,
        { headers: { access_token: key } }
      );
      if (existing.data.data.length > 0) {
        customerId = existing.data.data[0].id;
      } else {
        const custRes = await import_axios.default.post(
          `${url}/customers`,
          {
            name,
            email,
            cpfCnpj: cleanCpfCnpj,
            phone,
            mobilePhone: phone,
            postalCode: cep,
            address,
            addressNumber: number,
            complement,
            province: neighborhood,
            externalReference: orgId
          },
          { headers: { access_token: key } }
        );
        customerId = custRes.data.id;
      }
    } catch (e) {
      throw new Error("Erro cliente Asaas: " + e.message);
    }
    let value = 99;
    const planSnap = await admin.firestore().collection("subscriptionPlans").doc(planId).get();
    if (planSnap.exists && planSnap.data()?.price !== void 0) {
      value = planSnap.data()?.price;
    }
    const delay = 864e5 * 2;
    let nextDue = new Date(Date.now() + delay).toISOString().split("T")[0];
    if (orgSnap.exists) {
      const trialEndsAt = orgData.trialEndsAt;
      if (trialEndsAt) {
        let trialDate;
        const isObj = typeof trialEndsAt === "object" && "seconds" in trialEndsAt;
        if (isObj) {
          trialDate = new Date(trialEndsAt.seconds * 1e3);
        } else {
          trialDate = new Date(trialEndsAt);
        }
        if (trialDate.getTime() > Date.now() + 864e5) {
          nextDue = trialDate.toISOString().split("T")[0];
        }
      }
    }
    const subRes = await import_axios.default.post(
      `${url}/subscriptions`,
      {
        customer: customerId,
        billingType: "UNDEFINED",
        value,
        nextDueDate: nextDue,
        cycle: "MONTHLY",
        description: `Assinatura Plano ${planId}`
      },
      { headers: { access_token: key } }
    );
    let paymentLink = "";
    try {
      const paymentsRes = await import_axios.default.get(
        `${url}/payments?subscription=${subRes.data.id}&limit=1`,
        { headers: { access_token: key } }
      );
      if (paymentsRes.data.data && paymentsRes.data.data.length > 0) {
        paymentLink = paymentsRes.data.data[0].invoiceUrl;
      }
    } catch (payErr) {
      logger.warn(
        "Erro ao buscar a fatura inicial da assinatura no Asaas:",
        payErr.message
      );
    }
    await admin.firestore().collection("organizations").doc(orgId).update({
      asaasCustomerId: customerId,
      subscriptionId: subRes.data.id,
      subscriptionStatus: "PENDING",
      planId
    });
    return { success: true, paymentLink: paymentLink || subRes.data.id };
  } catch (error2) {
    logger.error("Erro em createSaaSSubscription:", error2);
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var getSaaSInvoices = (0, import_https.onCall)(async (request) => {
  const { orgId } = request.data;
  const { key, url } = await getAsaasConfig();
  try {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    const customerId = orgSnap.data()?.asaasCustomerId;
    if (!customerId) return [];
    const res = await import_axios.default.get(
      `${url}/payments?customer=${customerId}&limit=50`,
      { headers: { access_token: key } }
    );
    return res.data.data;
  } catch (error2) {
    logger.error("Erro em getSaaSInvoices:", error2);
    throw new import_https.HttpsError("internal", error2.message);
  }
});
var asaasWebhook = (0, import_https.onRequest)(
  async (req, res) => {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken) {
      const authHeader = req.headers["asaas-access-token"] || req.headers["Asaas-Access-Token"];
      if (authHeader !== webhookToken) {
        logger.warn("Webhook token inv\xE1lido", { received: authHeader });
        res.status(401).send("Unauthorized");
        return;
      }
    }
    const event = req.body;
    const db = admin.firestore();
    try {
      const isPaid = event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED";
      const isOverdue = event.event === "PAYMENT_OVERDUE";
      const isCancelled = event.event === "PAYMENT_DELETED" || event.event === "PAYMENT_REFUNDED";
      const customerId = event.payment?.customer;
      if (isPaid) {
        const ref = event.payment?.externalReference || "";
        if (ref.includes("___")) {
          const [orgId, id] = ref.split("___");
          if (id.startsWith("batch_")) {
            await db.collection("organizations").doc(orgId).collection("billingBatches").doc(id).update({ status: "PAID" });
            const batchSnap = await db.collection("organizations").doc(orgId).collection("billingBatches").doc(id).get();
            const jobIds = batchSnap.data()?.jobIds || [];
            const writeBatch = db.batch();
            jobIds.forEach((jid) => {
              const jRef = db.collection("organizations").doc(orgId).collection("jobs").doc(jid);
              writeBatch.update(jRef, { paymentStatus: "PAID" });
            });
            await writeBatch.commit();
          }
        } else if (customerId && event.payment?.subscription) {
          const orgsSnapshot = await db.collection("organizations").where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({ subscriptionStatus: "ACTIVE" });
          }
        }
      } else if (isOverdue) {
        if (customerId && event.payment?.subscription) {
          const orgsSnapshot = await db.collection("organizations").where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({ subscriptionStatus: "OVERDUE" });
          }
        }
      } else if (isCancelled) {
        if (customerId && event.payment?.subscription) {
          const orgsSnapshot = await db.collection("organizations").where("asaasCustomerId", "==", customerId).get();
          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            await orgDoc.ref.update({ subscriptionStatus: "CANCELLED" });
          }
        }
      }
      res.status(200).send("OK");
    } catch (error2) {
      logger.error("Erro no asaasWebhook:", error2);
      res.status(500).send("Erro");
    }
  }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asaasWebhook,
  checkSubscriptionStatus,
  createLabSubAccount,
  createOrderPayment,
  createPatientPayment,
  createSaaSSubscription,
  deleteUserAdmin,
  generateBatchBoleto,
  getSaaSInvoices,
  registerUserInOrg,
  setSubscriptionStatus,
  updateUserAdmin,
  validateCro
});
