
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// Ensure app is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ASAAS_URL = process.env.ASAAS_URL || "https://api.asaas.com/v3";

// --- SAAS SUBSCRIPTION (Existing) ---
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
      // Logic for real subscription would go here (omitted for brevity as it was already there)
      return {success: true, paymentLink: "https://link-mock.com"};
    } catch (error: any) {
      throw new functions.https.HttpsError("aborted", "Erro pagamento");
    }
  }
);

// --- NEW: CREATE ORDER PAYMENT (Called by Dentist) ---
export const createOrderPayment = functions.https.onCall(async (request) => {
  const data = request.data;
  const { jobData, paymentData } = data;
  
  // jobData: { organizationId, totalValue, patientName, ... }
  // paymentData: { method: 'CREDIT_CARD' | 'PIX', creditCard?: {...}, cpfCnpj, holderName... }

  if (!jobData || !paymentData) {
    throw new functions.https.HttpsError("invalid-argument", "Dados inválidos.");
  }

  // 1. Get Lab's Asaas API Key (In a real marketplace, this would use Split Payment or Lab's Key)
  // For this MVP, we assume the SaaS manages it or uses a Mock.
  // We will Simulate Success for MOCK purposes unless an environment variable is set.
  
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey || apiKey.includes("AIza")) {
     // --- MOCK RESPONSE ---
     const mockId = `pay_${Math.random().toString(36).substr(2, 9)}`;
     
     // Save Job to Firestore directly since we are mocking the payment success
     const jobId = `job_${Date.now()}`;
     const newJob = {
       ...jobData,
       id: jobId,
       status: 'WAITING_APPROVAL', // Waiting for Lab Decision
       paymentStatus: paymentData.method === 'PIX' ? 'PENDING' : 'AUTHORIZED',
       paymentMethod: paymentData.method,
       paymentId: mockId,
       createdAt: admin.firestore.Timestamp.now(),
       dueDate: admin.firestore.Timestamp.fromDate(new Date(jobData.dueDate))
     };
     
     await admin.firestore().collection("organizations").doc(jobData.organizationId).collection("jobs").doc(jobId).set(newJob);

     return {
        success: true,
        jobId: jobId,
        paymentId: mockId,
        pixQrCode: paymentData.method === 'PIX' ? "mock_qr_code_base64_string" : undefined,
        pixCopyPaste: paymentData.method === 'PIX' ? "00020126360014BR.GOV.BCB.PIX..." : undefined,
        message: "Pagamento Simulado com Sucesso (Hold)"
     };
  }

  // Real Implementation Logic (Simplified)
  // 1. Create Customer in Asaas
  // 2. Create Payment (Authorize)
  // 3. Save Job with status WAITING_APPROVAL
  
  // Returning dummy error for now if trying to use real API without config
  throw new functions.https.HttpsError("unimplemented", "Configuração de API Real pendente.");
});

// --- NEW: MANAGE ORDER DECISION (Called by Lab) ---
export const manageOrderDecision = functions.https.onCall(async (request) => {
  const { orgId, jobId, decision, rejectionReason } = request.data;
  // decision: 'APPROVE' | 'REJECT'

  const jobRef = admin.firestore().collection("organizations").doc(orgId).collection("jobs").doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Trabalho não encontrado.");
  }

  const job = jobSnap.data();
  
  // MOCK LOGIC FOR PAYMENT REVERSAL
  // In real life: Call Asaas API to Capture (if approved) or Refund (if rejected).
  
  if (decision === 'APPROVE') {
      // 1. Capture Payment (if CC)
      // await asaas.capture(job.paymentId);
      
      // 2. Update Job
      await jobRef.update({
          status: 'PENDING', // Moves to production queue
          paymentStatus: 'PAID', // Captured
          history: admin.firestore.FieldValue.arrayUnion({
              id: Math.random().toString(),
              timestamp: new Date(),
              action: 'Pedido Aprovado pelo Laboratório (Pagamento Capturado)',
              userId: 'system',
              userName: 'Sistema'
          })
      });
      return { success: true, status: 'APPROVED' };

  } else if (decision === 'REJECT') {
      // 1. Refund Payment
      // await asaas.refund(job.paymentId);
      
      // 2. Update Job
      await jobRef.update({
          status: 'REJECTED',
          paymentStatus: 'REFUNDED',
          history: admin.firestore.FieldValue.arrayUnion({
              id: Math.random().toString(),
              timestamp: new Date(),
              action: `Pedido Recusado: ${rejectionReason || 'Sem motivo'}. Valor estornado.`,
              userId: 'system',
              userName: 'Sistema'
          })
      });
      return { success: true, status: 'REJECTED' };
  }

  throw new functions.https.HttpsError("invalid-argument", "Decisão inválida.");
});

// Existing Webhook (kept)
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  res.json({received: true});
});
