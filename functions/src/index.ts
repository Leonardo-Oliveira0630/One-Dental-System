/* eslint-disable @typescript-eslint/no-explicit-any */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

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

  // Prioridade: Env Var > Config
  const apiKey = process.env.ASAAS_API_KEY ||
                 (functions as any).config().asaas?.key;

  if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
    functions.logger.error("ERRO: ASAAS_API_KEY não configurada.");
    throw new Error("Chave de API do Asaas não configurada no servidor.");
  }

  // Identifica ambiente pelo prefixo da chave ($a = Produção)
  const isProduction = apiKey.startsWith("$a");

  // URLs Oficiais do Asaas:
  // Sandbox: https://sandbox.asaas.com/api/v3
  // Produção: https://api.asaas.com/v3 (ou https://www.asaas.com/api/v3)
  const baseUrl = isProduction ?
    "https://api.asaas.com/v3" :
    "https://sandbox.asaas.com/api/v3";

  const envName = isProduction ? "PRODUÇÃO" : "SANDBOX";
  functions.logger.info(`Conectando ao Asaas em modo: ${envName}`);

  return {
    key: apiKey,
    url: baseUrl,
    splitPercent: settings?.platformCommission || 5,
  };
};

/**
 * REGISTRA UM NOVO USUÁRIO EM UMA ORGANIZAÇÃO
 */
export const registerUserInOrg = functions.https.onCall(async (request) => {
  const {email, pass, name, role, organizationId, sector} = request.data;
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não logado.");
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
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * EXCLUI UM USUÁRIO VIA ADMIN (AUTH E FIRESTORE)
 */
export const deleteUserAdmin = functions.https.onCall(async (request) => {
  const {targetUserId} = request.data;
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não logado.");
  }
  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerSnap.data();
  const isAdmin = callerData?.role === "ADMIN" ||
                  callerData?.role === "SUPER_ADMIN";

  if (!isAdmin) {
    throw new functions.https.HttpsError(
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
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * ATUALIZA PERFIL DE USUÁRIO VIA ADMIN
 */
export const updateUserAdmin = functions.https.onCall(async (request) => {
  const {targetUserId, updates} = request.data;
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não logado.");
  }
  const db = admin.firestore();
  try {
    await db.collection("users").doc(targetUserId).update(updates);
    return {success: true};
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * GERA BOLETO EM LOTE PARA TRABALHOS INTERNOS FINALIZADOS
 */
export const generateBatchBoleto = functions.https.onCall(async (request) => {
  const {orgId, dentistId, jobIds, dueDate} = request.data;
  const db = admin.firestore();

  functions.logger.info("Iniciando generateBatchBoleto", {orgId, dentistId});

  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Acesso negado.");
  }

  try {
    const {key, url, splitPercent} = await getAsaasConfig();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const walletId = orgSnap.data()?.financialSettings?.asaasWalletId;

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
    for (const id of jobIds) {
      const jSnap = await db.collection("organizations")
        .doc(orgId).collection("jobs").doc(id).get();
      if (jSnap.exists) {
        total += jSnap.data()?.totalValue || 0;
        patients.push(jSnap.data()?.patientName || "Paciente");
      }
    }

    // 3. Garantir Cliente no Asaas (Tenta buscar por CPF/CNPJ antes de criar)
    let customerId = "";
    const docNum = (dentist.cpfCnpj || dentist.cpf || "").replace(/\D/g, "");

    try {
      const searchRes = await axios.get(`${url}/customers?cpfCnpj=${docNum}`, {
        headers: {access_token: key},
      });
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const customerRes = await axios.post(`${url}/customers`, {
          name: dentist.name,
          cpfCnpj: docNum,
          email: dentist.email || "",
          notificationDisabled: true,
        }, {headers: {access_token: key}});
        customerId = customerRes.data.id;
      }
    } catch (err: any) {
      const apiErr = err.response?.data?.errors?.[0]?.description;
      const finalMsg = apiErr || err.message;
      functions.logger.error("Erro no cliente Asaas", err.response?.data);
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
      value: total,
      dueDate: cleanDueDate,
      externalReference: `${orgId}___${batchId}`,
      description: `Fatura ProTrack: ${patients.slice(0, 3).join(", ")}...`,
    };

    if (walletId && walletId.length > 10) {
      payload.split = [{walletId, percentualValue: 100 - splitPercent}];
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
    functions.logger.error("Falha no faturamento", {
      msg,
      d: error.response?.data,
    });
    throw new functions.https.HttpsError("internal", msg);
  }
});

/**
 * CRIA SUB-CONTA (WALLET) NO ASAAS PARA O LABORATÓRIO
 */
export const createLabSubAccount = functions.https.onCall(async (request) => {
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
        "financialSettings.asaasWalletId": res.data.apiKey,
        "financialSettings.asaasWalletStatus": "PENDING",
      });
    return {success: true};
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * SINCRONIZA STATUS DE ASSINATURA SAAS
 */
export const setSubscriptionStatus = functions.https.onCall(
  async (request) => {
    const {orgId, status} = request.data;
    const {key, url} = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
      const orgData = orgSnap.data();
      const subId = orgData?.subscriptionId;
      
      if (status === 'FREE' || status === 'TEST' || status === 'CANCELLED') {
         if (subId) {
             try {
                await axios.delete(`${url}/subscriptions/${subId}`, { headers: { access_token: key } });
             } catch (e: any) {
                console.log("Asaas subscription delete error (ignored):", e.message);
             }
         }
      }

      await admin.firestore().collection("organizations").doc(orgId).update({subscriptionStatus: status});
      return { success: true };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

export const checkSubscriptionStatus = functions.https.onCall(
  async (request) => {
    const {orgId} = request.data;
    const {key, url} = await getAsaasConfig();
    try {
      const orgSnap = await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .get();
      const currentStatus = orgSnap.data()?.subscriptionStatus;
      if (currentStatus === "FREE" || currentStatus === "TEST") {
        return {status: currentStatus};
      }
      const subId = orgSnap.data()?.subscriptionId;
      if (!subId) return {status: "NONE"};
      const res = await axios.get(`${url}/subscriptions/${subId}`, {
        headers: {access_token: key},
      });
      const status = res.data.status === "ACTIVE" ? "ACTIVE" : "PENDING";
      await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .update({subscriptionStatus: status});
      return {status};
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

/**
 * WEBHOOK PARA ATUALIZAÇÃO AUTOMÁTICA DE PAGAMENTOS
 */
/**
 * CRIA ASSINATURA SAAS
 */
export const createSaaSSubscription = functions.https.onCall(async (request) => {
  const { orgId, planId, email, name, cpfCnpj, couponCode } = request.data;
  const { key, url } = await getAsaasConfig();
  
  try {
    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
    
    // Buscar ou Criar Customer
    let customerId = "";
    try {
      const existing = await axios.get(`${url}/customers?cpfCnpj=${cleanCpfCnpj}`, { headers: { access_token: key } });
      if (existing.data.data.length > 0) {
        customerId = existing.data.data[0].id;
      } else {
        const custRes = await axios.post(`${url}/customers`, { name, email, cpfCnpj: cleanCpfCnpj }, { headers: { access_token: key } });
        customerId = custRes.data.id;
      }
    } catch (e: any) { throw new Error("Erro cliente Asaas: " + e.message); }

    // Valor
    let value = 99.00;
    const planSnap = await admin.firestore().collection("globalSettings").doc("plans").collection("list").doc(planId).get();
    if (planSnap.exists && planSnap.data()?.price) {
       value = planSnap.data()?.price;
    }

    if (couponCode) {
       // logic for coupon could go here, for now limit it.
    }

    const nextDue = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    
    // billingType UNDEFINED allows the user to pay with any method (Pix, cc, boleto)
    const subRes = await axios.post(`${url}/subscriptions`, {
      customer: customerId,
      billingType: "UNDEFINED",
      value: value,
      nextDueDate: nextDue,
      cycle: "MONTHLY",
      description: `Assinatura Plano ${planId}`,
    }, { headers: { access_token: key } });

    await admin.firestore().collection("organizations").doc(orgId).update({
      asaasCustomerId: customerId,
      subscriptionId: subRes.data.id,
      subscriptionStatus: "PENDING",
      planId: planId,
    });
    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * BUSCA FATURAS (BOLETOS/PAGAMENTOS) DO SAAS NO ASAAS
 */
export const getSaaSInvoices = functions.https.onCall(async (request) => {
  const { orgId } = request.data;
  const { key, url } = await getAsaasConfig();
  
  try {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    const customerId = orgSnap.data()?.asaasCustomerId;
    if (!customerId) return [];

    const res = await axios.get(`${url}/payments?customer=${customerId}&limit=50`, { headers: { access_token: key } });
    return res.data.data;
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const asaasWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    const event = req.body;
    const db = admin.firestore();
    try {
      const isPaid = event.event === "PAYMENT_RECEIVED" ||
                     event.event === "PAYMENT_CONFIRMED";
      if (isPaid) {
        const customerId = event.payment?.customer;
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
           const orgsSnapshot = await db.collection("organizations").where("asaasCustomerId", "==", customerId).get();
           if (!orgsSnapshot.empty) {
               const orgDoc = orgsSnapshot.docs[0];
               await orgDoc.ref.update({ subscriptionStatus: "ACTIVE" });
           }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Erro");
    }
  }
);
