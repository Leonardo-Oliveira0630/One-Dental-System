/* eslint-disable @typescript-eslint/no-explicit-any */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * CONFIGURAÇÕES TÉCNICAS
 */
const getAsaasConfig = async () => {
  const cfg = (functions as any).config?.();
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings")
    .doc("global").get();
  const settings = settingsSnap.data();

  return {
    key: cfg?.asaas?.key,
    url: cfg?.asaas?.url || "https://sandbox.asaas.com/api/v3",
    splitPercent: settings?.platformCommission || 5,
  };
};

/**
 * WEBHOOK OTIMIZADO PARA BAIXO CUSTO
 */
export const asaasWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    const event = req.body;
    const db = admin.firestore();
    const {event: eventType} = event;

    try {
      const payment = event.payment;
      // Extrair ID da Org e do Job (ex: org123___job456)
      const ref = payment?.externalReference || "";
      const [orgId, jobId] = ref.includes("___") ?
        ref.split("___") : ["", ""];

      if (eventType === "PAYMENT_RECEIVED" ||
          eventType === "PAYMENT_CONFIRMED") {
        // 1. Pagamento de Assinatura (SaaS Master)
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

        // 2. Pagamento de Pedido - ACESSO DIRETO
        if (orgId && jobId) {
          const jobRef = db.collection("organizations")
            .doc(orgId).collection("jobs").doc(jobId);
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

      if (eventType === "PAYMENT_REFUNDED" && orgId && jobId) {
        await db.collection("organizations").doc(orgId)
          .collection("jobs").doc(jobId).update({
            paymentStatus: "REFUNDED",
            status: "REJECTED",
          });
      }

      if (eventType === "SUBSCRIPTION_DELETED") {
        const subId = event.subscription.id;
        const orgs = await db.collection("organizations")
          .where("subscriptionId", "==", subId).limit(1).get();
        if (!orgs.empty) {
          await orgs.docs[0].ref.update({
            subscriptionStatus: "CANCELLED",
          });
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Erro");
    }
  }
);

/**
 * CREATE ORDER PAYMENT
 */
export const createOrderPayment = functions.https.onCall(
  async (request) => {
    const {jobData, paymentData} = request.data;
    const {key, url, splitPercent} = await getAsaasConfig();
    const db = admin.firestore();

    try {
      const orgId = jobData.organizationId;
      const orgSnap = await db.collection("organizations")
        .doc(orgId).get();
      const orgData = orgSnap.data();
      const walletId = orgData?.financialSettings?.asaasWalletId;

      const customerRes = await axios.post(`${url}/customers`, {
        name: jobData.dentistName,
        cpfCnpj: paymentData.cpfCnpj,
      }, {headers: {access_token: key}});

      const jobId = `job_${Date.now()}`;
      const externalRef = `${orgId}___${jobId}`;

      const paymentPayload: any = {
        customer: customerRes.data.id,
        billingType: paymentData.method,
        value: jobData.totalValue,
        dueDate: new Date().toISOString().split("T")[0],
        externalReference: externalRef,
        description: `Pedido One Dental: ${jobData.patientName}`,
      };

      if (walletId) {
        paymentPayload.split = [{
          walletId: walletId,
          percentualValue: 100 - splitPercent,
        }];
      }

      if (paymentData.method === "CREDIT_CARD") {
        paymentPayload.creditCard = paymentData.creditCard;
        paymentPayload.creditCardHolderInfo = {
          name: jobData.dentistName,
          email: orgData?.email || "contato@onedental.com",
          cpfCnpj: paymentData.cpfCnpj,
          postalCode: "00000000",
          addressNumber: "0",
          phone: "0000000000",
        };
        paymentPayload.authorizeOnly = true;
      }

      const payRes = await axios.post(`${url}/payments`,
        paymentPayload, {headers: {access_token: key}});

      const expiration = new Date(jobData.dueDate);
      await db.collection("organizations").doc(orgId)
        .collection("jobs").doc(jobId).set({
          ...jobData,
          id: jobId,
          asaasPaymentId: payRes.data.id,
          paymentStatus: "PENDING",
          status: "WAITING_APPROVAL",
          createdAt: admin.firestore.Timestamp.now(),
          dueDate: admin.firestore.Timestamp.fromDate(expiration),
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
  }
);

/**
 * MANAGE ORDER DECISION
 */
export const manageOrderDecision = functions.https.onCall(
  async (request) => {
    const {orgId, jobId, decision} = request.data;
    const {key, url} = await getAsaasConfig();
    const db = admin.firestore();

    try {
      const jobRef = db.collection("organizations").doc(orgId)
        .collection("jobs").doc(jobId);
      const jobSnap = await jobRef.get();
      const job = jobSnap.data();

      if (!job?.asaasPaymentId) {
        throw new Error("ID de pagamento ausente");
      }

      if (decision === "APPROVE") {
        const cUrl = `${url}/payments/${job.asaasPaymentId}/capture`;
        await axios.post(cUrl, {}, {headers: {access_token: key}});
        await jobRef.update({status: "PENDING", paymentStatus: "PAID"});
      } else {
        const rUrl = `${url}/payments/${job.asaasPaymentId}/refund`;
        await axios.post(rUrl, {}, {headers: {access_token: key}});
        await jobRef.update({
          status: "REJECTED",
          paymentStatus: "REFUNDED",
        });
      }
      return {success: true};
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

/**
 * CREATE SAAS SUBSCRIPTION
 */
export const createSaaSSubscription = functions.https.onCall(
  async (request) => {
    const {orgId, planId, email, name, cpfCnpj} = request.data;
    const {key, url} = await getAsaasConfig();
    const db = admin.firestore();
    try {
      const custRes = await axios.post(`${url}/customers`,
        {name, email, cpfCnpj}, {headers: {access_token: key}});
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
      return {
        success: true,
        paymentLink: subRes.data.invoiceUrl,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);
