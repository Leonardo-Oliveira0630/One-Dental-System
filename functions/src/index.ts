import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// Ensure app is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Alterado para Produção como padrão para corrigir o erro de chave inválida.
// Para usar Sandbox, adicione a variável de ambiente ASAAS_URL com valor: https://sandbox.asaas.com/api/v3
const ASAAS_URL = process.env.ASAAS_URL || "https://api.asaas.com/v3";

export const createSaaSSubscription = functions.https.onCall(
  async (request) => {
    // In firebase-functions v2+, the argument is a CallableRequest
    const data = request.data;

    // 0. Logging for debugging
    functions.logger.info("createSaaSSubscription invoked", {data});

    const {orgId, planId, email, name, cpfCnpj} = data;

    // 1. Validation
    if (!orgId || !planId || !cpfCnpj) {
      functions.logger.warn("Missing arguments", {orgId, planId, cpfCnpj});
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dados incompletos (orgId, planId, cpfCnpj)."
      );
    }

    // 2. API Key Check
    // functions.config() is removed in v6+. Use process.env.
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      functions.logger.error("Configuration Error: Missing ASAAS_API_KEY");
      // Use 'failed-precondition' to ensure message reaches client
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Erro de config: Chave API Asaas ausente."
      );
    }

    try {
      // 3. Create/Get Customer
      functions.logger.info("Creating customer...", {email, cpfCnpj});
      const customerRes = await axios.post(
        `${ASAAS_URL}/customers`,
        {name, email, cpfCnpj},
        {headers: {access_token: apiKey}}
      );

      const customerId = customerRes.data.id;
      functions.logger.info("Customer ID retrieved", {customerId});

      // 4. Define Value
      let value = 99.00;
      if (planId === "pro") value = 199.00;
      if (planId === "enterprise") value = 499.00;

      // 5. Create Subscription
      // 86400000 ms = 1 day
      const nextDue = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];

      functions.logger.info("Creating subscription...", {value, nextDue});
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

      // 6. Update Firestore
      functions.logger.info("Updating Firestore Org...", {orgId});
      await admin.firestore().collection("organizations").doc(orgId).update({
        asaasCustomerId: customerId,
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });

      functions.logger.info("Success!");
      return {success: true, paymentLink: subRes.data.invoiceUrl};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Enhanced Error Logging
      const apiErrorMessage =
        error.response?.data?.errors?.[0]?.description ||
        error.response?.data?.errorMessage ||
        error.message;

      functions.logger.error("Asaas API Failure", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Throw HttpsError with detailed message for the client
      throw new functions.https.HttpsError(
        "aborted",
        `Falha no pagamento: ${apiErrorMessage}`
      );
    }
  }
);

export const asaasWebhook = functions.https.onRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: any, res: any) => {
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
  }
);
