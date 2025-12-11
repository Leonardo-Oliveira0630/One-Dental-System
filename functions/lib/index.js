"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasWebhook = exports.createSaaSSubscription = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");

// Ensure app is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const ASAAS_URL = process.env.ASAAS_URL || "https://api.asaas.com/v3";

exports.createSaaSSubscription = functions.https.onCall(async (request) => {
    const data = request.data;
    functions.logger.info("createSaaSSubscription invoked", { data });
    
    const { orgId, planId, email, name, cpfCnpj } = data;
    
    if (!orgId || !planId || !cpfCnpj) {
        throw new functions.https.HttpsError("invalid-argument", "Dados incompletos (orgId, planId, cpfCnpj).");
    }
    
    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
    const apiKey = process.env.ASAAS_API_KEY;
    
    if (!apiKey) {
        throw new functions.https.HttpsError("failed-precondition", "Erro de config: Chave API Asaas ausente.");
    }
    
    try {
        // 3. Create/Get Customer
        const customerRes = await axios_1.default.post(`${ASAAS_URL}/customers`, { name, email, cpfCnpj: cleanCpfCnpj }, { headers: { access_token: apiKey } });
        const customerId = customerRes.data.id;
        
        // 4. Define Value
        let value = 99.00;
        if (planId === "pro") value = 199.00;
        if (planId === "enterprise") value = 499.00;
        
        // 5. Create Subscription
        const nextDue = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        
        const subRes = await axios_1.default.post(`${ASAAS_URL}/subscriptions`, {
            customer: customerId,
            billingType: "BOLETO",
            value: value,
            nextDueDate: nextDue,
            cycle: "MONTHLY",
            description: `Assinatura One Dental - Plano ${planId}`,
        }, { headers: { access_token: apiKey } });
        
        // 6. Update Firestore
        await admin.firestore().collection("organizations").doc(orgId).update({
            asaasCustomerId: customerId,
            subscriptionId: subRes.data.id,
            subscriptionStatus: "PENDING",
            planId: planId,
        });
        
        return { success: true, paymentLink: subRes.data.invoiceUrl };
    }
    catch (error) {
        functions.logger.error("Asaas API Failure", error);
        const apiMessage = error.response?.data?.errors?.[0]?.description ||
            error.message ||
            "Erro ao processar pagamento";
        throw new functions.https.HttpsError("aborted", `Falha no pagamento: ${apiMessage}`);
    }
});

exports.asaasWebhook = functions.https.onRequest(async (req, res) => {
    const event = req.body;
    
    if (event && (event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED")) {
        const payment = event.payment;
        const asaasId = payment?.subscription;
        
        if (asaasId) {
            const db = admin.firestore();
            const orgs = await db.collection("organizations")
                .where("subscriptionId", "==", asaasId)
                .get();
            
            const batch = db.batch();
            orgs.forEach((doc) => {
                batch.update(doc.ref, { subscriptionStatus: "ACTIVE" });
            });
            await batch.commit();
        }
    }
    res.json({ received: true });
});