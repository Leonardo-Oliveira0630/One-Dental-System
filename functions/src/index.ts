import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// Ensure app is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ASAAS_URL = process.env.ASAAS_URL || "https://api.asaas.com/v3";

export const createSaaSSubscription = functions.https.onCall(
  async (request) => {
    const data = request.data;
    functions.logger.info("createSaaSSubscription invoked", {data});

    const {orgId, planId, email, name, cpfCnpj} = data;

    if (!orgId || !planId || !cpfCnpj) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dados incompletos (orgId, planId, cpfCnpj)."
      );
    }

    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
    const apiKey = process.env.ASAAS_API_KEY;

    // --- MOCK / SIMULATION MODE ---
    // Simula sucesso se não houver chave API ou for placeholder.
    if (
      !apiKey ||
      apiKey === "YOUR_ASAAS_KEY" ||
      apiKey.includes("AIza")
    ) {
      functions.logger.warn("ASAAS_API_KEY missing/invalid. MOCK MODE.");

      // Simula atualização no banco
      try {
        await admin.firestore().collection("organizations").doc(orgId).update({
          subscriptionStatus: "ACTIVE", // Ativa direto no mock
          planId: planId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        functions.logger.error("Mock DB Update Failed", e);
        // Ignora erro de DB no mock para não travar o front
      }

      return {
        success: true,
        paymentLink: "https://www.asaas.com/mock-payment-success",
        isMock: true,
      };
    }

    try {
      // 1. Fetch Dynamic Plan Price from Firestore
      const planRef = admin.firestore()
        .collection("subscriptionPlans")
        .doc(planId);
      const planSnap = await planRef.get();

      let value = 99.00;
      let planName = planId;

      if (planSnap.exists) {
        const planData = planSnap.data();
        value = planData?.price || 99.00;
        planName = planData?.name || planId;
      } else {
        functions.logger.warn(
          `Plan ${planId} not found in DB, using defaults.`
        );
        if (planId === "pro") value = 199.00;
        if (planId === "enterprise") value = 499.00;
      }

      // 3. Create/Get Customer
      const customerRes = await axios.post(
        `${ASAAS_URL}/customers`,
        {name, email, cpfCnpj: cleanCpfCnpj},
        {headers: {access_token: apiKey}}
      );

      const customerId = customerRes.data.id;

      // 5. Create Subscription
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
          description: `Assinatura One Dental - Plano ${planName}`,
        },
        {headers: {access_token: apiKey}}
      );

      // 6. Update Firestore
      await admin.firestore().collection("organizations").doc(orgId).update({
        asaasCustomerId: customerId,
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });

      return {success: true, paymentLink: subRes.data.invoiceUrl};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      functions.logger.error("Asaas API Failure", error);

      const apiMessage = error.response?.data?.errors?.[0]?.description ||
                         error.message ||
                         "Erro ao processar pagamento";

      // Retorna erro estruturado ao invés de throw para o front tratar melhor
      throw new functions.https.HttpsError(
        "aborted",
        `Falha no pagamento: ${apiMessage}`
      );
    }
  }
);

export const asaasWebhook = functions.https.onRequest(async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res: any
) => {
  const event = req.body;

  if (
    event &&
    (event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED")
  ) {
    const payment = event.payment;
    const asaasId = payment?.subscription;

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
