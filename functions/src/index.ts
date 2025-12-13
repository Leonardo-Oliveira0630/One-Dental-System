import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// Ensure app is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ASAAS_URL = process.env.ASAAS_URL || "https://api.asaas.com/v3";

// --- SAAS SUBSCRIPTION (Pagamento do Lab para o SaaS) ---
export const createSaaSSubscription = functions.https.onCall(
  async (request) => {
    const data = request.data;
    const {orgId, planId, email, name, cpfCnpj} = data;

    if (!orgId || !planId || !cpfCnpj) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dados incompletos (orgId, planId, cpfCnpj)."
      );
    }

    const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
    const apiKey = process.env.ASAAS_API_KEY;

    // --- MOCK MODE ---
    if (!apiKey || apiKey === "YOUR_ASAAS_KEY" || apiKey.includes("AIza")) {
      try {
        await admin.firestore().collection("organizations").doc(orgId).update({
          subscriptionStatus: "ACTIVE",
          planId: planId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        // Ignore DB error in mock
      }
      return {
        success: true,
        paymentLink: "https://www.asaas.com/mock-payment-success",
        isMock: true,
      };
    }

    try {
      // 3. Create/Get Customer
      const customerRes = await axios.post(`${ASAAS_URL}/customers`,
        {name, email, cpfCnpj: cleanCpfCnpj},
        {headers: {access_token: apiKey}}
      );
      const customerId = customerRes.data.id;

      // 4. Define Value
      let value = 99.00;
      if (planId === "pro") value = 199.00;
      if (planId === "enterprise") value = 499.00;

      // 5. Create Subscription
      const nextDue = new Date(Date.now() + 86400000)
        .toISOString().split("T")[0];

      const subRes = await axios.post(`${ASAAS_URL}/subscriptions`, {
        customer: customerId,
        billingType: "BOLETO",
        value: value,
        nextDueDate: nextDue,
        cycle: "MONTHLY",
        description: `Assinatura One Dental - Plano ${planId}`,
      }, {headers: {access_token: apiKey}});

      // 6. Update Firestore
      await admin.firestore().collection("organizations").doc(orgId).update({
        asaasCustomerId: customerId,
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });

      return {success: true, paymentLink: subRes.data.invoiceUrl};
    } catch (error: any) {
      console.error("Asaas API Failure", error);
      const apiMessage = error.response?.data?.errors?.[0]?.description ||
        error.message || "Erro ao processar pagamento";
      throw new functions.https.HttpsError(
        "aborted", `Falha no pagamento: ${apiMessage}`
      );
    }
  }
);

// --- NEW: CREATE LAB SUB-ACCOUNT (Carteira Digital do Laboratório) ---
export const createLabSubAccount = functions.https.onCall(async (request) => {
  const {orgId, name, email, cpfCnpj, address, phone} = request.data;

  // Validate Input
  if (!orgId || !name || !cpfCnpj || !email) {
    throw new functions.https.HttpsError(
      "invalid-argument", "Dados incompletos para criação da conta."
    );
  }

  const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
  const masterKey = process.env.ASAAS_API_KEY;

  // --- MOCK MODE ---
  if (!masterKey || masterKey.includes("AIza")) {
    const mockWalletId = `acct_${Math.random().toString(36).substr(2, 9)}`;
    const mockApiKey = `ak_live_${Math.random().toString(36)}`;
    
    await admin.firestore().collection("organizations").doc(orgId).update({
      "financialSettings.asaasWalletId": mockWalletId,
      "financialSettings.asaasApiKey": mockApiKey, // In PROD, store this securely or don't store at all (use OAuth)
      "financialSettings.walletStatus": "ACTIVE"
    });

    return { success: true, walletId: mockWalletId, isMock: true };
  }

  try {
    // 1. Create Account at Asaas (Sub-account)
    const accountPayload = {
      name,
      email,
      cpfCnpj: cleanCpfCnpj,
      mobilePhone: phone,
      address,
      postalCode: "00000-000", // Should come from frontend in real app
      province: "SP"
    };

    const accountRes = await axios.post(`${ASAAS_URL}/accounts`, accountPayload, {
      headers: { access_token: masterKey }
    });

    // 2. Get API Key for this new account
    // Note: In real Asaas White Label, you usually manage sub-accounts via the Master Key 
    // by sending the walletId in the header, or you generate a key for them.
    // For simplicity here, we assume we get an ID and will use it or generated key.
    
    // Asaas doesn't return the API key in creation. You usually operate "on behalf of".
    // Strategy: Store the walletId. All future calls will use the walletId.
    const walletId = accountRes.data.id;
    const walletApiKey = accountRes.data.apiKey; // Depending on Asaas version/config

    await admin.firestore().collection("organizations").doc(orgId).update({
      "financialSettings.asaasWalletId": walletId,
      "financialSettings.asaasApiKey": walletApiKey || "MANAGED_BY_MASTER",
      "financialSettings.walletStatus": "ACTIVE"
    });

    return { success: true, walletId };

  } catch (error: any) {
    console.error("Asaas Subaccount Create Failed", error.response?.data);
    throw new functions.https.HttpsError(
      "aborted", "Falha ao criar conta no Asaas: " + error.message
    );
  }
});

// --- NEW: CREATE ORDER PAYMENT (Called by Dentist to pay Lab) ---
export const createOrderPayment = functions.https.onCall(async (request) => {
  const data = request.data;
  const {jobData, paymentData} = data;

  if (!jobData || !paymentData) {
    throw new functions.https.HttpsError(
      "invalid-argument", "Dados inválidos."
    );
  }

  // 1. Fetch the Lab's Organization to get their Wallet ID
  const orgDoc = await admin.firestore().collection("organizations").doc(jobData.organizationId).get();
  const orgData = orgDoc.data();
  const labWalletId = orgData?.financialSettings?.asaasWalletId;
  const masterKey = process.env.ASAAS_API_KEY;

  // --- MOCK MODE HANDLING ---
  if (!masterKey || masterKey.includes("AIza")) {
    const mockId = `pay_${Math.random().toString(36).substr(2, 9)}`;
    const jobId = `job_${Date.now()}`;
    const newJob = {
      ...jobData,
      id: jobId,
      status: "WAITING_APPROVAL",
      paymentStatus: paymentData.method === "PIX" ? "PENDING" : "AUTHORIZED",
      paymentMethod: paymentData.method,
      paymentId: mockId,
      createdAt: admin.firestore.Timestamp.now(),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(jobData.dueDate)),
    };

    await admin.firestore()
      .collection("organizations")
      .doc(jobData.organizationId)
      .collection("jobs")
      .doc(jobId)
      .set(newJob);

    return {
      success: true,
      jobId: jobId,
      paymentId: mockId,
      pixQrCode: paymentData.method === "PIX" ?
        "mock_qr_code_base64_string" : undefined,
      pixCopyPaste: paymentData.method === "PIX" ?
        "00020126360014BR.GOV.BCB.PIX..." : undefined,
      message: "Pagamento Simulado com Sucesso (MOCK)",
    };
  }

  // --- REAL PAYMENT LOGIC WITH SUB-ACCOUNT ---
  if (!labWalletId) {
    throw new functions.https.HttpsError(
      "failed-precondition", 
      "Este laboratório ainda não ativou a carteira digital. Entre em contato com eles."
    );
  }

  try {
    // 1. Create/Get Customer IN THE LAB'S SUB-ACCOUNT
    // When using Asaas with sub-accounts, pass the 'walletId' in the header if using Master Key
    const headers = { 
        access_token: masterKey,
        walletId: labWalletId // This directs the operation to the Lab's account
    };

    const customerRes = await axios.post(`${ASAAS_URL}/customers`, {
        name: jobData.patientName, // Ideally should be Dentist Name
        cpfCnpj: paymentData.cpfCnpj
    }, { headers });
    
    const customerId = customerRes.data.id;

    // 2. Create Payment
    const paymentPayload = {
        customer: customerId,
        billingType: paymentData.method === "PIX" ? "PIX" : "CREDIT_CARD",
        value: jobData.totalValue,
        dueDate: new Date().toISOString().split("T")[0],
        description: `Pedido ${jobData.patientName}`,
        creditCard: paymentData.method === "CREDIT_CARD" ? paymentData.creditCard : undefined,
        creditCardHolderInfo: paymentData.method === "CREDIT_CARD" ? paymentData.creditCardHolderInfo : undefined
    };

    const payRes = await axios.post(`${ASAAS_URL}/payments`, paymentPayload, { headers });
    
    // 3. Save Job to Firestore
    const jobId = `job_${Date.now()}`;
    const newJob = {
      ...jobData,
      id: jobId,
      status: "WAITING_APPROVAL",
      paymentStatus: paymentData.method === "PIX" ? "PENDING" : "AUTHORIZED", // If CC, Asaas returns status
      paymentMethod: paymentData.method,
      paymentId: payRes.data.id,
      createdAt: admin.firestore.Timestamp.now(),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(jobData.dueDate)),
    };

    await admin.firestore()
      .collection("organizations")
      .doc(jobData.organizationId)
      .collection("jobs")
      .doc(jobId)
      .set(newJob);

    return {
        success: true,
        jobId: jobId,
        paymentId: payRes.data.id,
        pixQrCode: payRes.data.encodedImage, // Base64 QR for PIX
        pixCopyPaste: payRes.data.payload,
        message: "Cobrança gerada com sucesso."
    };

  } catch (error: any) {
      console.error("Payment Creation Failed", error.response?.data || error);
      throw new functions.https.HttpsError("aborted", "Erro no processamento: " + error.message);
  }
});

// --- NEW: MANAGE ORDER DECISION (Called by Lab) ---
export const manageOrderDecision = functions.https.onCall(async (request) => {
  const {orgId, jobId, decision, rejectionReason} = request.data;

  const jobRef = admin.firestore()
    .collection("organizations")
    .doc(orgId)
    .collection("jobs")
    .doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found", "Trabalho não encontrado."
    );
  }

  // --- Real Logic for Capture/Refund would use the Sub-account Header too ---
  // const jobData = jobSnap.data();
  // const labWalletId = ... fetch from org ...
  // headers = { access_token: masterKey, walletId: labWalletId }
  // axios.post(..., { headers })

  if (decision === "APPROVE") {
    // 1. Capture Payment (if CC)
    // await asaas.capture(job.paymentId);

    // 2. Update Job
    await jobRef.update({
      status: "PENDING", // Moves to production queue
      paymentStatus: "PAID", // Captured
      history: admin.firestore.FieldValue.arrayUnion({
        id: Math.random().toString(),
        timestamp: new Date(),
        action: "Pedido Aprovado pelo Laboratório (Pagamento Capturado)",
        userId: "system",
        userName: "Sistema",
      }),
    });
    return {success: true, status: "APPROVED"};
  } else if (decision === "REJECT") {
    // 1. Refund Payment
    // await asaas.refund(job.paymentId);

    // 2. Update Job
    await jobRef.update({
      status: "REJECTED",
      paymentStatus: "REFUNDED",
      history: admin.firestore.FieldValue.arrayUnion({
        id: Math.random().toString(),
        timestamp: new Date(),
        action: `Pedido Recusado: ${rejectionReason || "Sem motivo"}. ` +
          "Valor estornado.",
        userId: "system",
        userName: "Sistema",
      }),
    });
    return {success: true, status: "REJECTED"};
  }

  throw new functions.https.HttpsError("invalid-argument", "Decisão inválida.");
});

// Existing Webhook (kept)
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).json({received: true});
});
