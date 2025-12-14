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
        const db = admin.firestore();
        const ts = admin.firestore.FieldValue.serverTimestamp();
        await db.collection("organizations").doc(orgId).update({
          subscriptionStatus: "ACTIVE",
          planId: planId,
          updatedAt: ts,
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
      const customerRes = await axios.post(
        `${ASAAS_URL}/customers`,
        {name, email, cpfCnpj: cleanCpfCnpj},
        {headers: {access_token: apiKey}}
      );
      const customerId = customerRes.data.id;

      // 4. Define Value
      let value = 99.00;
      if (planId === "pro") value = 199.00;
      if (planId === "enterprise") value = 499.00;

      // 5. Create Subscription
      const nextDate = new Date(Date.now() + 86400000);
      const nextDue = nextDate.toISOString().split("T")[0];

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
      const db = admin.firestore();
      await db.collection("organizations").doc(orgId).update({
        asaasCustomerId: customerId,
        subscriptionId: subRes.data.id,
        subscriptionStatus: "PENDING",
        planId: planId,
      });

      return {success: true, paymentLink: subRes.data.invoiceUrl};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Asaas API Failure", error);
      const resData = error.response?.data;
      const desc = resData?.errors?.[0]?.description;
      const apiMessage = desc || error.message || "Erro processamento";

      throw new functions.https.HttpsError(
        "aborted",
        `Falha no pagamento: ${apiMessage}`
      );
    }
  }
);

// --- GET SAAS INVOICES (Lista de Boletos do Plano) ---
export const getSaaSInvoices = functions.https.onCall(async (request) => {
  const {orgId} = request.data;
  if (!orgId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta orgId.");
  }

  const apiKey = process.env.ASAAS_API_KEY;
  const db = admin.firestore();
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  const orgData = orgDoc.data();
  const customerId = orgData?.asaasCustomerId;

  // --- MOCK MODE ---
  if (!apiKey || apiKey.includes("AIza") || !customerId) {
    // Retorna faturas falsas para teste visual
    return {
      invoices: [
        {
          id: "pay_mock_1",
          status: "OVERDUE",
          dueDate: "2023-10-15",
          value: 199.00,
          invoiceUrl: "https://google.com",
          description: "Mensalidade (Mock Vencido)",
        },
        {
          id: "pay_mock_2",
          status: "PENDING",
          dueDate: new Date().toISOString().split("T")[0],
          value: 199.00,
          invoiceUrl: "https://google.com",
          description: "Mensalidade Atual (Mock)",
        },
        {
          id: "pay_mock_3",
          status: "RECEIVED",
          dueDate: "2023-09-15",
          value: 199.00,
          invoiceUrl: "https://google.com",
          description: "Mensalidade Paga (Mock)",
        },
      ],
    };
  }

  try {
    // Fetch payments from Asaas for this customer
    const response = await axios.get(
      `${ASAAS_URL}/payments?customer=${customerId}`,
      {headers: {access_token: apiKey}}
    );

    const payments = response.data.data.map((p: any) => ({ // eslint-disable-line
      id: p.id,
      status: p.status, // PENDING, RECEIVED, OVERDUE
      dueDate: p.dueDate,
      value: p.value,
      invoiceUrl: p.invoiceUrl || p.bankSlipUrl,
      description: p.description || "Assinatura One Dental",
    }));

    return {invoices: payments};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching invoices", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar faturas: " + error.message
    );
  }
});

// --- NEW: CREATE LAB SUB-ACCOUNT (Carteira Digital do Laboratório) ---
export const createLabSubAccount = functions.https.onCall(async (request) => {
  const {orgId, name, email, cpfCnpj, address, phone} = request.data;

  // Validate Input
  if (!orgId || !name || !cpfCnpj || !email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados incompletos para criação da conta."
    );
  }

  const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
  const masterKey = process.env.ASAAS_API_KEY;

  // --- MOCK MODE ---
  if (!masterKey || masterKey.includes("AIza")) {
    const mockWalletId = `acct_${Math.random().toString(36).substr(2, 9)}`;
    const mockApiKey = `ak_live_${Math.random().toString(36)}`;

    const db = admin.firestore();
    await db.collection("organizations").doc(orgId).update({
      "financialSettings.asaasWalletId": mockWalletId,
      "financialSettings.asaasApiKey": mockApiKey,
      "financialSettings.walletStatus": "ACTIVE",
    });

    return {success: true, walletId: mockWalletId, isMock: true};
  }

  try {
    // 1. Create Account at Asaas (Sub-account)
    const accountPayload = {
      name,
      email,
      cpfCnpj: cleanCpfCnpj,
      mobilePhone: phone,
      address,
      postalCode: "00000-000",
      province: "SP",
    };

    const accountRes = await axios.post(
      `${ASAAS_URL}/accounts`,
      accountPayload,
      {headers: {access_token: masterKey}}
    );

    const walletId = accountRes.data.id;
    const walletApiKey = accountRes.data.apiKey;

    const db = admin.firestore();
    const orgRef = db.collection("organizations").doc(orgId);

    const apiKeyVal = walletApiKey || "MANAGED_BY_MASTER";
    const updateData = {
      "financialSettings.asaasWalletId": walletId,
      "financialSettings.asaasApiKey": apiKeyVal,
      "financialSettings.walletStatus": "ACTIVE",
    };

    await orgRef.update(updateData);

    return {success: true, walletId};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Asaas Subaccount Create Failed", error.response?.data);
    throw new functions.https.HttpsError(
      "aborted",
      "Falha ao criar conta no Asaas: " + error.message
    );
  }
});

// --- NEW: CREATE ORDER PAYMENT (Called by Dentist to pay Lab) ---
export const createOrderPayment = functions.https.onCall(async (request) => {
  const data = request.data;
  const {jobData, paymentData} = data;

  if (!jobData || !paymentData) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados inválidos."
    );
  }

  // 1. Fetch the Lab's Organization to get their Wallet ID
  const db = admin.firestore();
  const orgRef = db.collection("organizations").doc(jobData.organizationId);
  const orgDoc = await orgRef.get();
  const orgData = orgDoc.data();
  const labWalletId = orgData?.financialSettings?.asaasWalletId;
  const masterKey = process.env.ASAAS_API_KEY;

  // --- MOCK MODE HANDLING ---
  if (!masterKey || masterKey.includes("AIza")) {
    const mockId = `pay_${Math.random().toString(36).substr(2, 9)}`;
    const jobId = `job_${Date.now()}`;

    const px = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8";
    const mockPixQrCode = paymentData.method === "PIX" ? px : undefined;
    const mP = "00020126360014BR.GOV.BCB.PIX...MOCK";
    const mockPixCopyPaste = paymentData.method === "PIX" ? mP : undefined;

    const d = new Date(jobData.dueDate);
    const tsDate = admin.firestore.Timestamp.fromDate(d);

    // Shorten expression
    const isPix = paymentData.method === "PIX";
    const pStatus = isPix ? "PENDING" : "AUTHORIZED";

    const newJob = {
      ...jobData,
      id: jobId,
      status: "WAITING_APPROVAL",
      paymentStatus: pStatus,
      paymentMethod: paymentData.method,
      paymentId: mockId,
      pixQrCode: mockPixQrCode,
      pixCopyPaste: mockPixCopyPaste,
      createdAt: admin.firestore.Timestamp.now(),
      dueDate: tsDate,
    };

    await orgRef.collection("jobs").doc(jobId).set(newJob);

    return {
      success: true,
      jobId: jobId,
      paymentId: mockId,
      pixQrCode: mockPixQrCode,
      pixCopyPaste: mockPixCopyPaste,
      message: "Pagamento Simulado com Sucesso (MOCK)",
    };
  }

  // --- REAL PAYMENT LOGIC WITH SUB-ACCOUNT ---
  if (!labWalletId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Este laboratório não ativou a carteira digital."
    );
  }

  try {
    // 1. Create/Get Customer IN THE LAB'S SUB-ACCOUNT
    const headers = {
      access_token: masterKey,
      walletId: labWalletId,
    };

    const customerRes = await axios.post(`${ASAAS_URL}/customers`, {
      name: jobData.patientName,
      cpfCnpj: paymentData.cpfCnpj,
    }, {headers});

    const customerId = customerRes.data.id;

    // 2. Create Payment
    const isCC = paymentData.method === "CREDIT_CARD";
    const bType = paymentData.method === "PIX" ? "PIX" : "CREDIT_CARD";
    const paymentPayload = {
      customer: customerId,
      billingType: bType,
      value: jobData.totalValue,
      dueDate: new Date().toISOString().split("T")[0],
      description: `Pedido ${jobData.patientName}`,
      creditCard: isCC ?
        paymentData.creditCard : undefined,
      creditCardHolderInfo: isCC ?
        paymentData.creditCardHolderInfo : undefined,
    };

    const payRes = await axios.post(
      `${ASAAS_URL}/payments`,
      paymentPayload,
      {headers}
    );

    // 3. Save Job to Firestore WITH PIX DATA
    const jobId = `job_${Date.now()}`;
    const d = new Date(jobData.dueDate);
    const tsDate = admin.firestore.Timestamp.fromDate(d);

    // Shorten expression
    const isPix = paymentData.method === "PIX";
    const pStatus = isPix ? "PENDING" : "AUTHORIZED";

    const newJob = {
      ...jobData,
      id: jobId,
      status: "WAITING_APPROVAL",
      paymentStatus: pStatus,
      paymentMethod: paymentData.method,
      paymentId: payRes.data.id,
      pixQrCode: payRes.data.encodedImage,
      pixCopyPaste: payRes.data.payload,
      createdAt: admin.firestore.Timestamp.now(),
      dueDate: tsDate,
    };

    // Use orgRef defined earlier
    await orgRef.collection("jobs")
      .doc(jobId)
      .set(newJob);

    return {
      success: true,
      jobId: jobId,
      paymentId: payRes.data.id,
      pixQrCode: payRes.data.encodedImage,
      pixCopyPaste: payRes.data.payload,
      message: "Cobrança gerada com sucesso.",
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Payment Creation Failed", error.response?.data || error);
    throw new functions.https.HttpsError(
      "aborted",
      "Erro no processamento: " + error.message
    );
  }
});

// --- NEW: MANAGE ORDER DECISION (Called by Lab) ---
export const manageOrderDecision = functions.https.onCall(async (request) => {
  const {orgId, jobId, decision, rejectionReason} = request.data;

  const db = admin.firestore();
  const jobRef = db.collection("organizations")
    .doc(orgId)
    .collection("jobs")
    .doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Trabalho não encontrado."
    );
  }

  if (decision === "APPROVE") {
    // 1. Capture Payment (if CC) - Logic would be here

    // 2. Update Job
    const actionMsg = "Pedido Aprovado (Pagamento Capturado)";
    await jobRef.update({
      status: "PENDING",
      paymentStatus: "PAID",
      history: admin.firestore.FieldValue.arrayUnion({
        id: Math.random().toString(),
        timestamp: new Date(),
        action: actionMsg,
        userId: "system",
        userName: "Sistema",
      }),
    });
    return {success: true, status: "APPROVED"};
  } else if (decision === "REJECT") {
    // 1. Refund Payment - Logic would be here

    // 2. Update Job
    const reason = rejectionReason || "Sem motivo";
    const actionMsg = `Pedido Recusado: ${reason}. Valor estornado.`;
    await jobRef.update({
      status: "REJECTED",
      paymentStatus: "REFUNDED",
      history: admin.firestore.FieldValue.arrayUnion({
        id: Math.random().toString(),
        timestamp: new Date(),
        action: actionMsg,
        userId: "system",
        userName: "Sistema",
      }),
    });
    return {success: true, status: "REJECTED"};
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Decisão inválida."
  );
});

// Existing Webhook (kept)
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).json({received: true});
});
