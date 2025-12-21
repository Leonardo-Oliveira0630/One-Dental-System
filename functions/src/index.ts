import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// --- GENERATE BATCH BOLETO (Faturamento de múltiplas OS) ---
export const generateBatchBoleto = functions.https.onCall(async (request) => {
    const { orgId, dentistId, jobIds, dueDate } = request.data;

    const db = admin.firestore();
    const orgRef = db.collection("organizations").doc(orgId);
    
    // 1. Validar Jobs e Calcular Total
    let total = 0;
    const jobUpdates = [];
    const dentistDoc = await db.collection("users").doc(dentistId).get();
    const dentistData = dentistDoc.data();

    for (const jid of jobIds) {
        const jobRef = orgRef.collection("jobs").doc(jid);
        const snap = await jobRef.get();
        if (snap.exists) {
            total += snap.data()?.totalValue || 0;
            jobUpdates.push(jobRef);
        }
    }

    const batchId = `bill_${Date.now()}`;
    const apiKey = process.env.ASAAS_API_KEY;

    // --- MOCK MODE ---
    if (!apiKey || apiKey.includes("AIza")) {
        const newBatch = {
            id: batchId,
            organizationId: orgId,
            dentistId,
            dentistName: dentistData?.name || "Desconhecido",
            jobIds,
            totalAmount: total,
            status: "PENDING",
            dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
            createdAt: admin.firestore.Timestamp.now(),
            invoiceUrl: "https://www.asaas.com/mock-invoice-batch"
        };
        
        await orgRef.collection("billingBatches").doc(batchId).set(newBatch);
        
        // Marcar Jobs como "Cobrados em Lote"
        for (const jRef of jobUpdates) {
            await jRef.update({ 
                paymentStatus: "PENDING", // Fica pendente aguardando o boleto do lote
                batchId: batchId 
            });
        }

        return { success: true, batchId };
    }

    // Real Asaas logic would implement payment creation with split here
    return { success: false, message: "Funcionalidade real em desenvolvimento (Mock Ativo)" };
});

// --- ISSUE TAX RECEIPT (NF-e Simulator) ---
export const issueTaxReceipt = functions.https.onCall(async (request) => {
    const { orgId, batchId } = request.data;
    const db = admin.firestore();
    const batchRef = db.collection("organizations").doc(orgId).collection("billingBatches").doc(batchId);
    
    // Simulação de Emissão
    await batchRef.update({
        nfeUrl: "https://prefeitura.gov.br/nfe/mock-visualizer",
        nfeNumber: String(Math.floor(Math.random() * 99999)),
        updatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true };
});
