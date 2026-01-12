/* eslint-disable @typescript-eslint/no-explicit-any */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * REGISTRA UM NOVO USUÁRIO EM UMA ORGANIZAÇÃO (USADO POR ADMINS)
 */
export const registerUserInOrg = functions.https.onCall(async (request) => {
  const {email, pass, name, role, organizationId} = request.data;

  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Apenas usuários logados podem convidar outros."
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: pass,
      displayName: name,
    });

    const userData = {
      id: userRecord.uid,
      name: name,
      email: email,
      role: role,
      organizationId: organizationId,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await admin.firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);

    return {success: true, uid: userRecord.uid};
  } catch (error: any) {
    console.error("Erro ao registrar usuário:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * ATUALIZA PERFIL DE USUÁRIO VIA ADMIN (CARGOS E PERMISSÕES)
 * Resolve erro de "Missing Permissions" no cliente.
 */
export const updateUserAdmin = functions.https.onCall(async (request) => {
  const {targetUserId, updates} = request.data;

  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não logado.");
  }

  const callerUid = request.auth.uid;
  const db = admin.firestore();

  try {
    // 1. Verificar se o solicitante é ADMIN da mesma organização
    const callerSnap = await db.collection("users").doc(callerUid).get();
    const callerData = callerSnap.data();

    if (!callerData || (callerData.role !== "ADMIN" && callerData.role !== "SUPER_ADMIN")) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Apenas administradores podem alterar permissões."
      );
    }

    const targetSnap = await db.collection("users").doc(targetUserId).get();
    const targetData = targetSnap.data();

    if (!targetData || targetData.organizationId !== callerData.organizationId) {
      if (callerData.role !== "SUPER_ADMIN") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Usuário não pertence à sua organização."
        );
      }
    }

    // 2. Aplicar atualizações (restringindo campos sensíveis se necessário)
    const allowedUpdates: any = {};
    if (updates.name) allowedUpdates.name = updates.name;
    if (updates.role) allowedUpdates.role = updates.role;
    if (updates.sector) allowedUpdates.sector = updates.sector;
    if (updates.permissions) allowedUpdates.permissions = updates.permissions;
    if (updates.commissionSettings) {
      allowedUpdates.commissionSettings = updates.commissionSettings;
    }

    await db.collection("users").doc(targetUserId).update(allowedUpdates);

    return {success: true};
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

const getAsaasConfig = async () => {
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings").doc("global").get();
  const settings = settingsSnap.data();

  return {
    key: process.env.ASAAS_API_KEY || "SUA_CHAVE_AQUI",
    url: "https://sandbox.asaas.com/api/v3",
    splitPercent: settings?.platformCommission || 5,
  };
};

export const asaasWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    const event = req.body;
    const db = admin.firestore();
    const {event: eventType} = event;

    try {
      const payment = event.payment;
      const ref = payment?.externalReference || "";
      const isSplit = ref.includes("___");
      const [orgId, jobId] = isSplit ? ref.split("___") : ["", ""];

      if (
        eventType === "PAYMENT_RECEIVED" ||
        eventType === "PAYMENT_CONFIRMED"
      ) {
        if (payment.subscription) {
          const orgs = await db.collection("organizations")
            .where("subscriptionId", "==", payment.subscription)
            .limit(1).get();
          if (!orgs.empty) {
            await orgs.docs[0].ref.update({
              subscriptionStatus: "ACTIVE",
              lastPaymentDate: admin.firestore.Timestamp.now(),
            });
          }
        }
        if (orgId && jobId) {
          const jobRef = db.collection("organizations").doc(orgId)
            .collection("jobs").doc(jobId);
          await jobRef.update({
            paymentStatus: "PAID",
            status: "PENDING",
            history: admin.firestore.FieldValue.arrayUnion({
              id: "h_" + Date.now(),
              timestamp: admin.firestore.Timestamp.now(),
              action: "Pagamento confirmado via Asaas.",
              userName: "Sistema Asaas",
            }),
          });
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Erro");
    }
  }
);

export const createOrderPayment = functions.https.onCall(async (request) => {
  const {jobData, paymentData} = request.data;
  const {key, url, splitPercent} = await getAsaasConfig();
  const db = admin.firestore();
  try {
    const orgId = jobData.organizationId;
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const orgData = orgSnap.data();
    const walletId = orgData?.financialSettings?.asaasWalletId;
    const customerRes = await axios.post(`${url}/customers`, {
      name: jobData.dentistName,
      cpfCnpj: paymentData.cpfCnpj,
    }, {headers: {access_token: key}});
    const jobId = `job_${Date.now()}`;
    const externalRef = `${orgId}___${jobId}`;
    const payload: any = {
      customer: customerRes.data.id,
      billingType: paymentData.method,
      value: jobData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      externalReference: externalRef,
      description: `Pedido One Dental: ${jobData.patientName}`,
    };
    if (walletId) {
      const split = {walletId: walletId, percentualValue: 100 - splitPercent};
      payload.split = [split];
    }
    const payRes = await axios.post(`${url}/payments`, payload, {
      headers: {access_token: key},
    });
    await db.collection("organizations").doc(orgId).collection("jobs")
      .doc(jobId).set({
        ...jobData,
        id: jobId,
        asaasPaymentId: payRes.data.id,
        paymentStatus: "PENDING",
        status: "WAITING_APPROVAL",
        createdAt: admin.firestore.Timestamp.now(),
      });
    return {
      success: true,
      jobId,
      pixQrCode: payRes.data.encodedImage,
      pixCopyPaste: payRes.data.payload,
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const manageOrderDecision = functions.https.onCall(async (request) => {
  const {orgId, jobId, decision} = request.data;
  const {key, url} = await getAsaasConfig();
  const db = admin.firestore();
  try {
    const jobRef = db.collection("organizations").doc(orgId)
      .collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    const job = jobSnap.data();
    if (!job?.asaasPaymentId) throw new Error("ID de pagamento ausente");
    if (decision === "APPROVE") {
      await axios.post(`${url}/payments/${job.asaasPaymentId}/capture`, {}, {
        headers: {access_token: key},
      });
      await jobRef.update({status: "PENDING", paymentStatus: "PAID"});
    } else {
      await axios.post(`${url}/payments/${job.asaasPaymentId}/refund`, {}, {
        headers: {access_token: key},
      });
      await jobRef.update({status: "REJECTED", paymentStatus: "REFUNDED"});
    }
    return {success: true};
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const createSaaSSubscription = functions.https.onCall(
  async (request) => {
    const {orgId, planId, email, name, cpfCnpj} = request.data;
    const {key, url} = await getAsaasConfig();
    const db = admin.firestore();
    try {
      const custRes = await axios.post(
        `${url}/customers`,
        {name, email, cpfCnpj},
        {headers: {access_token: key}}
      );
      const tomorrow = new Date(Date.now() + 86400000);
      const subRes = await axios.post(`${url}/subscriptions`, {
        customer: custRes.data.id,
        billingType: "BOLETO",
        value: 199.00,
        nextDueDate: tomorrow.toISOString().split("T")[0],
        cycle: "MONTHLY",
        description: `SaaS One Dental - ${planId}`,
      }, {headers: {access_token: key}});
      await db.collection("organizations").doc(orgId).update({
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });
      return {success: true, paymentLink: subRes.data.invoiceUrl};
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);
