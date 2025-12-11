import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const ASAAS_URL = "https://sandbox.asaas.com/api/v3";

export const createSaaSSubscription = functions.https.onCall(
  async (data, context) => {
    const {orgId, planId, email, name, cpfCnpj} = data;

    if (!orgId || !planId || !cpfCnpj) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dados incompletos (orgId, planId, cpfCnpj)."
      );
    }

    // Tenta pegar do .env ou das configurações do Firebase (Gen 1 fallback)
    const apiKey = process.env.ASAAS_API_KEY || functions.config().asaas?.key;

    if (!apiKey) {
      console.error("Missing ASAAS_API_KEY configuration");
      throw new functions.https.HttpsError(
        "internal",
        "Erro de configuração no servidor (API Key não encontrada)."
      );
    }

    try {
      // 1. Create/Get Customer
      const customerRes = await axios.post(
        `${ASAAS_URL}/customers`,
        {name, email, cpfCnpj},
        {headers: {access_token: apiKey}}
      );

      const customerId = customerRes.data.id;

      // 2. Define Value
      let value = 99.00;
      if (planId === "pro") value = 199.00;
      if (planId === "enterprise") value = 499.00;

      // 3. Create Subscription
      // 86400000 ms = 1 day
      const nextDue = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];

      const subRes = await axios.post(
        `${ASAAS_URL}/subscriptions`,
        {
          customer: customerId,
          billingType: "BOLETO",
          value: value,
          nextDueDate: nextDue,
          cycle: "MONTHLY",
          description: `Assinatura One Dental - Plano ${planId}`,
        },
        {headers: {access_token: apiKey}}
      );

      // 4. Update Firestore
      await admin.firestore().collection("organizations").doc(orgId).update({
        asaasCustomerId: customerId,
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });

      return {success: true, paymentLink: subRes.data.invoiceUrl};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Asaas API Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Erro ao processar pagamento com a operadora."
      );
    }
  }
);

export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;
  if (
    event.event === "PAYMENT_RECEIVED" ||
    event.event === "PAYMENT_CONFIRMED"
  ) {
    const asaasId = event.payment.subscription;
    if (asaasId) {
      const db = admin.firestore();
      const orgs = await db.collection("organizations")
        .where("subscriptionId", "==", asaasId)
        .get();

      const batch = db.batch();
      orgs.forEach((doc) => {
        batch.update(doc.ref, {subscriptionStatus: "ACTIVE"});
      });
      await batch.commit();
    }
  }
  res.json({received: true});
});
