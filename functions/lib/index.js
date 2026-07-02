"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasWebhook = exports.getSaaSInvoices = exports.createSaaSSubscription = exports.checkSubscriptionStatus = exports.setSubscriptionStatus = exports.createPatientPayment = exports.createOrderPayment = exports.createLabSubAccount = exports.generateBatchBoleto = exports.updateUserAdmin = exports.deleteUserAdmin = exports.validateCro = exports.registerUserInOrg = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any, max-len, no-trailing-spaces, comma-dangle, quotes, object-curly-spacing, indent */
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const asaasApiKeySecret = (0, params_1.defineSecret)("ASAAS_API_KEY");
const asaasWebhookTokenSecret = (0, params_1.defineSecret)("ASAAS_WEBHOOK_TOKEN");
(0, v2_1.setGlobalOptions)({
    maxInstances: 10,
    secrets: [asaasApiKeySecret, asaasWebhookTokenSecret]
});
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
// Triggers sync 2
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * CONFIGURAÇÕES E HELPERS
 */
const getAsaasConfig = async () => {
    const db = admin.firestore();
    const settingsSnap = await db.collection("settings").doc("global").get();
    const settings = settingsSnap.data();
    // Prioridade: Secret Manager -> Env Var
    let apiKey = "";
    try {
        apiKey = asaasApiKeySecret.value();
    }
    catch (e) {
        logger.warn("Secret ASAAS_API_KEY não disponível via Secret Manager.");
    }
    if (!apiKey) {
        apiKey = process.env.ASAAS_API_KEY || process.env.asaas_api_key || process.env.asaa_api_key || process.env.ASAA_API_KEY || "";
    }
    if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
        logger.error("ERRO: ASAAS_API_KEY não configurada.");
        throw new Error("Chave de API do Asaas não configurada no servidor. Configure a chave no menu Admin > Configurações ou garanta que a variável ASAAS_API_KEY exista.");
    }
    // Identifica ambiente
    const isProduction = true; // Forcing production as requested
    // URLs Oficiais do Asaas:
    // Produção: https://api.asaas.com/v3 (ou https://www.asaas.com/api/v3)
    const baseUrl = "https://api.asaas.com/v3";
    const envName = isProduction ? "PRODUÇÃO" : "SANDBOX";
    logger.info(`Conectando ao Asaas em modo: ${envName}`);
    return {
        key: apiKey,
        url: baseUrl,
        splitPercent: (settings === null || settings === void 0 ? void 0 : settings.platformCommission) || 5,
    };
};
/**
 * REGISTRA UM NOVO USUÁRIO EM UMA ORGANIZAÇÃO
 */
exports.registerUserInOrg = (0, https_1.onCall)(async (request) => {
    const { email, pass, name, role, organizationId, sector } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    try {
        const userRecord = await admin.auth().createUser({
            email,
            password: pass,
            displayName: name,
        });
        const userData = {
            id: userRecord.uid,
            name,
            email,
            role,
            organizationId,
            sector: sector || "Geral",
            createdAt: admin.firestore.Timestamp.now(),
        };
        await admin.firestore()
            .collection("users")
            .doc(userRecord.uid)
            .set(userData);
        return { success: true, uid: userRecord.uid };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * VALIDA O REGISTRO DO CRO DE UM DENTISTA USANDO A API CONSULTAR.IO
 */
exports.validateCro = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { uf, numero, categoria } = request.data;
    if (!uf || !numero || !categoria) {
        throw new https_1.HttpsError("invalid-argument", "UF, número de registro e categoria são obrigatórios.");
    }
    const apiKey = process.env.CONSULTARIO_API_KEY;
    if (!apiKey || apiKey === "SUA_CHAVE_AQUI" || apiKey === "") {
        logger.warn("Chave CONSULTARIO_API_KEY não configurada. " +
            "Simulando retorno válido.");
        return {
            success: true,
            valido: true,
            name: "DENTISTA TESTE INTEGRACAO",
            situacao: "ATIVO",
            message: "Modo Desenvolvimento (Chave de API não configurada).",
        };
    }
    try {
        logger.info("Consultando CRO na consultar.io... " +
            `UF: ${uf}, Numero: ${numero}, Categoria: ${categoria}`);
        const response = await axios_1.default.post("https://consultar.io/api/v1/cro/consultar", {
            uf,
            numero,
            categoria,
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout: 10000,
        });
        const data = response.data;
        logger.info("Resposta consultar.io CRO:", data);
        const rawSituacao = (data === null || data === void 0 ? void 0 : data.situacao) ||
            (data === null || data === void 0 ? void 0 : data.status) ||
            (data === null || data === void 0 ? void 0 : data.situacao_inscricao) ||
            (data === null || data === void 0 ? void 0 : data.situacao_cadastral) ||
            "";
        const situacao = rawSituacao.toString().toUpperCase();
        const nomeProfissional = (data === null || data === void 0 ? void 0 : data.nome) || (data === null || data === void 0 ? void 0 : data.nome_profissional) || "";
        const isValido = (situacao.includes("ATIVO") ||
            situacao.includes("REGULAR") ||
            situacao.includes("CONSTA") ||
            situacao === "" ||
            (data === null || data === void 0 ? void 0 : data.valido) === true ||
            (data === null || data === void 0 ? void 0 : data.valid) === true);
        return {
            success: true,
            valido: isValido,
            name: nomeProfissional,
            situacao: situacao || "NÃO INFORMADA",
        };
    }
    catch (error) {
        logger.error("Erro ao validar CRO na consultar.io:", ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || (error === null || error === void 0 ? void 0 : error.message));
        const apiMsg = ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) ||
            ((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) ||
            error.message;
        throw new https_1.HttpsError("internal", `Falha na integração com consultar.io: ${apiMsg}`);
    }
});
/**
 * EXCLUI UM USUÁRIO VIA ADMIN (AUTH E FIRESTORE)
 */
exports.deleteUserAdmin = (0, https_1.onCall)(async (request) => {
    const { targetUserId } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    const callerData = callerSnap.data();
    const isAdmin = (callerData === null || callerData === void 0 ? void 0 : callerData.role) === "ADMIN" ||
        (callerData === null || callerData === void 0 ? void 0 : callerData.role) === "SUPER_ADMIN";
    if (!isAdmin) {
        throw new https_1.HttpsError("permission-denied", "Apenas administradores podem excluir usuários.");
    }
    try {
        // 1. Excluir do Firebase Auth
        await admin.auth().deleteUser(targetUserId);
        // 2. Excluir do Firestore
        await db.collection("users").doc(targetUserId).delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * ATUALIZA PERFIL DE USUÁRIO VIA ADMIN
 */
exports.updateUserAdmin = (0, https_1.onCall)(async (request) => {
    const { targetUserId, updates } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    try {
        await db.collection("users").doc(targetUserId).update(updates);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * GERA BOLETO EM LOTE PARA TRABALHOS INTERNOS FINALIZADOS
 */
exports.generateBatchBoleto = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    const { orgId, dentistId, jobIds, dueDate, customAmount } = request.data;
    const db = admin.firestore();
    logger.info("Iniciando generateBatchBoleto", { orgId, dentistId });
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Acesso negado.");
    }
    try {
        const { key, url, splitPercent } = await getAsaasConfig();
        const orgSnap = await db.collection("organizations").doc(orgId).get();
        const walletId = (_b = (_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.financialSettings) === null || _b === void 0 ? void 0 : _b.asaasWalletId;
        let finalSplitPercent = splitPercent;
        const customSplit = (_d = (_c = orgSnap.data()) === null || _c === void 0 ? void 0 : _c.financialSettings) === null || _d === void 0 ? void 0 : _d.customSplitPercent;
        if (customSplit !== undefined && customSplit !== null) {
            finalSplitPercent = Number(customSplit);
        }
        else {
            const planId = (_e = orgSnap.data()) === null || _e === void 0 ? void 0 : _e.planId;
            if (planId) {
                const planSnap = await db.collection("subscriptionPlans")
                    .doc(planId).get();
                if (planSnap.exists) {
                    const planSplit = (_g = (_f = planSnap.data()) === null || _f === void 0 ? void 0 : _f.features) === null || _g === void 0 ? void 0 : _g.splitPercent;
                    if (planSplit !== undefined && planSplit !== null) {
                        finalSplitPercent = Number(planSplit);
                    }
                }
            }
        }
        // 1. Buscar dados do Dentista
        let dentist = null;
        const manualSnap = await db.collection("organizations")
            .doc(orgId).collection("manualDentists").doc(dentistId).get();
        if (manualSnap.exists) {
            dentist = manualSnap.data();
        }
        else {
            const userSnap = await db.collection("users").doc(dentistId).get();
            if (userSnap.exists)
                dentist = userSnap.data();
        }
        if (!dentist)
            throw new Error("Dentista não encontrado.");
        // 2. Somar valores
        let total = 0;
        const patients = [];
        if (customAmount !== undefined && customAmount !== null && Number(customAmount) > 0) {
            total = Number(customAmount);
            patients.push("Fatura Personalizada");
        }
        else {
            for (const id of jobIds) {
                const jSnap = await db.collection("organizations")
                    .doc(orgId).collection("jobs").doc(id).get();
                if (jSnap.exists) {
                    const val = (_h = jSnap.data()) === null || _h === void 0 ? void 0 : _h.totalValue;
                    total += (val ? Number(val) : 0);
                    patients.push(((_j = jSnap.data()) === null || _j === void 0 ? void 0 : _j.patientName) || "Paciente");
                }
            }
        }
        if (isNaN(total) || total <= 0) {
            throw new Error("O valor da cobrança deve ser maior que 0 e válido.");
        }
        // 3. Garantir Cliente no Asaas (Tenta buscar por CPF/CNPJ antes de criar)
        let customerId = "";
        const docNum = (dentist.cpfCnpj || dentist.cpf || "").replace(/\D/g, "");
        try {
            const searchRes = await axios_1.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
                headers: { access_token: key },
            });
            if (searchRes.data.data && searchRes.data.data.length > 0) {
                customerId = searchRes.data.data[0].id;
            }
            else {
                const customerRes = await axios_1.default.post(`${url}/customers`, {
                    name: dentist.name,
                    cpfCnpj: docNum,
                    email: dentist.email || "",
                    notificationDisabled: true,
                }, { headers: { access_token: key } });
                customerId = customerRes.data.id;
            }
        }
        catch (err) {
            const apiErr = (_o = (_m = (_l = (_k = err.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.errors) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.description;
            const finalMsg = apiErr || err.message;
            logger.error("Erro no cliente Asaas", (_p = err.response) === null || _p === void 0 ? void 0 : _p.data);
            throw new Error(`Asaas (Cliente): ${finalMsg}`);
        }
        // 4. Criar Cobrança
        const batchId = `batch_${Date.now()}`;
        const cleanDueDate = typeof dueDate === "string" ?
            dueDate.split("T")[0] :
            new Date(dueDate).toISOString().split("T")[0];
        const payload = {
            customer: customerId,
            billingType: "BOLETO",
            value: Number(Number(total).toFixed(2)),
            dueDate: cleanDueDate,
            externalReference: `${orgId}___${batchId}`,
            description: `Fatura ProTrack: ${patients.slice(0, 3).join(", ")}...`,
        };
        if (walletId && walletId.length > 10) {
            payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
        }
        const payRes = await axios_1.default.post(`${url}/payments`, payload, {
            headers: { access_token: key },
        });
        // 5. Salvar Lote
        const dtParsed = new Date(cleanDueDate + "T12:00:00");
        const finalDueDate = admin.firestore.Timestamp.fromDate(dtParsed);
        const batchDoc = {
            id: batchId,
            organizationId: orgId,
            dentistId,
            dentistName: dentist.name,
            jobIds,
            totalAmount: total,
            status: "PENDING",
            dueDate: finalDueDate,
            invoiceUrl: payRes.data.bankSlipUrl || payRes.data.invoiceUrl,
            asaasPaymentId: payRes.data.id,
            createdAt: admin.firestore.Timestamp.now(),
        };
        await db.collection("organizations")
            .doc(orgId).collection("billingBatches").doc(batchId).set(batchDoc);
        const dbBatch = db.batch();
        jobIds.forEach((id) => {
            const ref = db.collection("organizations")
                .doc(orgId).collection("jobs").doc(id);
            dbBatch.update(ref, {
                batchId,
                paymentStatus: "AUTHORIZED",
                asaasPaymentId: payRes.data.id,
            });
        });
        await dbBatch.commit();
        return { success: true, batchId, invoiceUrl: batchDoc.invoiceUrl };
    }
    catch (error) {
        const asaasMsg = (_t = (_s = (_r = (_q = error.response) === null || _q === void 0 ? void 0 : _q.data) === null || _r === void 0 ? void 0 : _r.errors) === null || _s === void 0 ? void 0 : _s[0]) === null || _t === void 0 ? void 0 : _t.description;
        const msg = asaasMsg || error.message || "Erro interno no servidor";
        logger.error("Falha no faturamento", {
            msg,
            d: (_u = error.response) === null || _u === void 0 ? void 0 : _u.data,
        });
        throw new https_1.HttpsError("internal", msg);
    }
});
/**
 * CRIA SUB-CONTA (WALLET) NO ASAAS PARA O LABORATÓRIO
 */
exports.createLabSubAccount = (0, https_1.onCall)(async (request) => {
    const { orgId, accountData } = request.data;
    const { key, url } = await getAsaasConfig();
    try {
        const res = await axios_1.default.post(`${url}/accounts`, accountData, {
            headers: { access_token: key },
        });
        await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .update({
            "financialSettings.asaasWalletId": res.data.walletId || res.data.id || res.data.apiKey,
            "financialSettings.asaasApiKey": res.data.apiKey,
            "financialSettings.asaasWalletStatus": "PENDING",
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * CRIA PAGAMENTO PARA PEDIDO DA LOJA VIRTUAL (CARTÃO/PIX)
 */
exports.createOrderPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const { jobData, paymentData } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    try {
        const { key, url, splitPercent } = await getAsaasConfig();
        const orgSnap = await db.collection("organizations").doc(jobData.organizationId).get();
        const walletId = (_b = (_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.financialSettings) === null || _b === void 0 ? void 0 : _b.asaasWalletId;
        let finalSplitPercent = splitPercent;
        const customSplit = (_d = (_c = orgSnap.data()) === null || _c === void 0 ? void 0 : _c.financialSettings) === null || _d === void 0 ? void 0 : _d.customSplitPercent;
        if (customSplit !== undefined && customSplit !== null) {
            finalSplitPercent = Number(customSplit);
        }
        else {
            const planId = (_e = orgSnap.data()) === null || _e === void 0 ? void 0 : _e.planId;
            if (planId) {
                const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
                if (planSnap.exists) {
                    const planSplit = (_g = (_f = planSnap.data()) === null || _f === void 0 ? void 0 : _f.features) === null || _g === void 0 ? void 0 : _g.splitPercent;
                    if (planSplit !== undefined && planSplit !== null) {
                        finalSplitPercent = Number(planSplit);
                    }
                }
            }
        }
        // Criar/buscar cliente
        let customerId = "";
        try {
            const docNum = paymentData.cpfCnpj;
            const searchRes = await axios_1.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
                headers: { access_token: key },
            });
            if (searchRes.data.data && searchRes.data.data.length > 0) {
                customerId = searchRes.data.data[0].id;
            }
            else {
                const customerRes = await axios_1.default.post(`${url}/customers`, {
                    name: jobData.dentistName || "Cliente Loja",
                    cpfCnpj: docNum,
                    notificationDisabled: true,
                }, { headers: { access_token: key } });
                customerId = customerRes.data.id;
            }
        }
        catch (err) {
            throw new Error("Erro cliente Asaas: " + (((_l = (_k = (_j = (_h = err.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.errors) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.description) || err.message));
        }
        const payload = {
            customer: customerId,
            billingType: paymentData.method,
            value: jobData.totalValue,
            dueDate: new Date().toISOString().split("T")[0],
            description: `Pedido Loja - ${jobData.organizationId}`,
        };
        if (paymentData.method === "CREDIT_CARD" && paymentData.creditCard) {
            payload.creditCard = {
                holderName: paymentData.creditCard.holderName,
                number: paymentData.creditCard.number,
                expiryMonth: paymentData.creditCard.expiry.split("/")[0],
                expiryYear: "20" + paymentData.creditCard.expiry.split("/")[1],
                ccv: paymentData.creditCard.cvv
            };
            payload.creditCardHolderInfo = {
                name: paymentData.creditCard.holderName,
                email: "email@cliente.com",
                cpfCnpj: paymentData.cpfCnpj,
                postalCode: "01001-000",
                addressNumber: "123",
                phone: "11999999999"
            };
        }
        if (walletId && walletId.length > 10) {
            payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
        }
        const payRes = await axios_1.default.post(`${url}/payments`, payload, {
            headers: { access_token: key },
        });
        const newJobId = `web_${Date.now()}`;
        const newJobData = Object.assign(Object.assign({}, jobData), { id: newJobId, asaasPaymentId: payRes.data.id, paymentStatus: payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED' ? 'PAID' : 'PENDING' });
        await db.collection("organizations")
            .doc(jobData.organizationId)
            .collection("jobs")
            .doc(newJobId)
            .set(newJobData);
        return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, pixQrCode: payRes.data.pixQrCode || null };
    }
    catch (error) {
        const msg = ((_q = (_p = (_o = (_m = error.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.errors) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.description) || error.message;
        throw new https_1.HttpsError("internal", msg);
    }
});
/**
 * CRIA COBRANÇA PARA PACIENTE DA CLÍNICA
 */
exports.createPatientPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const { orgId, patientId, totalAmount, dueDate, title } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    try {
        const { key, url, splitPercent } = await getAsaasConfig();
        const orgSnap = await db.collection("organizations").doc(orgId).get();
        const walletId = (_b = (_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.financialSettings) === null || _b === void 0 ? void 0 : _b.asaasWalletId;
        let finalSplitPercent = splitPercent;
        const customSplit = (_d = (_c = orgSnap.data()) === null || _c === void 0 ? void 0 : _c.financialSettings) === null || _d === void 0 ? void 0 : _d.customSplitPercent;
        if (customSplit !== undefined && customSplit !== null) {
            finalSplitPercent = Number(customSplit);
        }
        else {
            const planId = (_e = orgSnap.data()) === null || _e === void 0 ? void 0 : _e.planId;
            if (planId) {
                const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
                if (planSnap.exists) {
                    const planSplit = (_g = (_f = planSnap.data()) === null || _f === void 0 ? void 0 : _f.features) === null || _g === void 0 ? void 0 : _g.splitPercent;
                    if (planSplit !== undefined && planSplit !== null) {
                        finalSplitPercent = Number(planSplit);
                    }
                }
            }
        }
        const patientSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(patientId).get();
        const patientData = patientSnap.data() || { name: "Paciente " + patientId, document: "00000000000" };
        let customerId = "";
        try {
            const docNum = (patientData.document || "00000000000").replace(/\D/g, "");
            const searchRes = await axios_1.default.get(`${url}/customers?cpfCnpj=${docNum}`, {
                headers: { access_token: key },
            });
            if (searchRes.data.data && searchRes.data.data.length > 0) {
                customerId = searchRes.data.data[0].id;
            }
            else {
                const customerRes = await axios_1.default.post(`${url}/customers`, {
                    name: patientData.name,
                    cpfCnpj: docNum,
                    notificationDisabled: true,
                }, { headers: { access_token: key } });
                customerId = customerRes.data.id;
            }
        }
        catch (err) {
            throw new Error("Erro cliente Asaas (Paciente): " + (((_l = (_k = (_j = (_h = err.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.errors) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.description) || err.message));
        }
        const payload = {
            customer: customerId,
            billingType: "BOLETO", // Pode ser configurado pelo dentista
            value: totalAmount,
            dueDate: dueDate.split("T")[0],
            description: title || "Fatura Clínica",
        };
        if (walletId && walletId.length > 10) {
            payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
        }
        const payRes = await axios_1.default.post(`${url}/payments`, payload, {
            headers: { access_token: key },
        });
        return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl };
    }
    catch (error) {
        const msg = ((_q = (_p = (_o = (_m = error.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.errors) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.description) || error.message;
        throw new https_1.HttpsError("internal", msg);
    }
});
/**
 * SINCRONIZA STATUS DE ASSINATURA SAAS
 */
exports.setSubscriptionStatus = (0, https_1.onCall)(async (request) => {
    var _a;
    // Verificar se o usuário é admin/superadmin
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const { orgId, status } = request.data;
    if (!orgId || !status) {
        throw new https_1.HttpsError("invalid-argument", "Parâmetros orgId e status são obrigatórios.");
    }
    const { key, url } = await getAsaasConfig();
    try {
        const orgSnap = await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .get();
        if (!orgSnap.exists) {
            throw new https_1.HttpsError("not-found", "Organização não encontrada.");
        }
        const orgData = orgSnap.data();
        const subId = orgData === null || orgData === void 0 ? void 0 : orgData.subscriptionId;
        if (status === "FREE" || status === "TEST" || status === "CANCELLED") {
            if (subId) {
                try {
                    logger.info(`Cancelando Asaas ${subId} para org ${orgId} devido a ${status}`);
                    await axios_1.default.delete(`${url}/subscriptions/${subId}`, {
                        headers: { access_token: key },
                    });
                }
                catch (e) {
                    logger.warn("Erro ao deletar assinatura no Asaas:", ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
                }
            }
        }
        await admin.firestore().collection("organizations").doc(orgId).update({
            subscriptionStatus: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, status };
    }
    catch (error) {
        logger.error("Erro em setSubscriptionStatus:", error);
        throw new https_1.HttpsError("internal", error.message);
    }
});
exports.checkSubscriptionStatus = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { orgId } = request.data;
    if (!orgId) {
        throw new https_1.HttpsError("invalid-argument", "orgId é obrigatório.");
    }
    const { key, url } = await getAsaasConfig();
    try {
        const orgSnap = await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .get();
        if (!orgSnap.exists) {
            throw new https_1.HttpsError("not-found", "Organização não encontrada.");
        }
        const currentStatus = (_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.subscriptionStatus;
        if (currentStatus === "FREE" || currentStatus === "TEST") {
            return { status: currentStatus };
        }
        const subId = (_b = orgSnap.data()) === null || _b === void 0 ? void 0 : _b.subscriptionId;
        if (!subId)
            return { status: "NONE" };
        const res = await axios_1.default.get(`${url}/subscriptions/${subId}`, {
            headers: { access_token: key },
        });
        const asaasStatus = res.data.status;
        let status = "PENDING";
        if (asaasStatus === "ACTIVE") {
            status = "ACTIVE";
        }
        else if (asaasStatus === "EXPIRED" || asaasStatus === "OVERDUE") {
            status = "OVERDUE";
        }
        else if (asaasStatus === "DELETED") {
            status = "CANCELLED";
        }
        await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .update({ subscriptionStatus: status });
        return { status };
    }
    catch (error) {
        logger.error("Erro em checkSubscriptionStatus:", error);
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * WEBHOOK PARA ATUALIZAÇÃO AUTOMÁTICA DE PAGAMENTOS
 */
/**
 * CRIA ASSINATURA SAAS
 */
exports.createSaaSSubscription = (0, https_1.onCall)(async (req) => {
    var _a, _b;
    const { orgId, planId, email, name, cpfCnpj } = req.data;
    const { key, url } = await getAsaasConfig();
    try {
        const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
        // Buscar Informações da Organização para pegar dados de Endereço e Telefone
        const orgSnap = await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .get();
        let orgData = {};
        if (orgSnap.exists) {
            orgData = orgSnap.data() || {};
        }
        const phone = orgData.phone || "";
        const cep = orgData.cep || "";
        const address = orgData.address || "";
        const number = orgData.number || "";
        const complement = orgData.complement || "";
        const neighborhood = orgData.neighborhood || "";
        // Buscar ou Criar Customer
        let customerId = "";
        try {
            const existing = await axios_1.default.get(`${url}/customers?cpfCnpj=${cleanCpfCnpj}`, { headers: { access_token: key } });
            if (existing.data.data.length > 0) {
                customerId = existing.data.data[0].id;
                // Opcional: Atualizar dados para faturamento correto
            }
            else {
                const custRes = await axios_1.default.post(`${url}/customers`, {
                    name,
                    email,
                    cpfCnpj: cleanCpfCnpj,
                    phone: phone,
                    mobilePhone: phone,
                    postalCode: cep,
                    address: address,
                    addressNumber: number,
                    complement: complement,
                    province: neighborhood,
                    externalReference: orgId,
                }, { headers: { access_token: key } });
                customerId = custRes.data.id;
            }
        }
        catch (e) {
            throw new Error("Erro cliente Asaas: " + e.message);
        }
        // Valor do Plano
        let value = 99.00;
        const planSnap = await admin.firestore()
            .collection("subscriptionPlans")
            .doc(planId)
            .get();
        if (planSnap.exists && ((_a = planSnap.data()) === null || _a === void 0 ? void 0 : _a.price) !== undefined) {
            value = (_b = planSnap.data()) === null || _b === void 0 ? void 0 : _b.price;
        }
        // Calcular data de vencimento da fatura com base no trial
        const delay = 86400000 * 2;
        let nextDue = new Date(Date.now() + delay).toISOString().split("T")[0];
        if (orgSnap.exists) {
            const trialEndsAt = orgData.trialEndsAt;
            if (trialEndsAt) {
                let trialDate;
                const isObj = typeof trialEndsAt === "object" &&
                    "seconds" in trialEndsAt;
                if (isObj) {
                    trialDate = new Date(trialEndsAt.seconds * 1000);
                }
                else {
                    trialDate = new Date(trialEndsAt);
                }
                // Garante que a data está no futuro (pelo menos hoje + 1 dia)
                if (trialDate.getTime() > Date.now() + 86400000) {
                    nextDue = trialDate.toISOString().split("T")[0];
                }
            }
        }
        // Criar Assinatura no Asaas
        const subRes = await axios_1.default.post(`${url}/subscriptions`, {
            customer: customerId,
            billingType: "UNDEFINED",
            value: value,
            nextDueDate: nextDue,
            cycle: "MONTHLY",
            description: `Assinatura Plano ${planId}`,
        }, { headers: { access_token: key } });
        // Buscar a primeira fatura gerada para obter o link do checkout
        let paymentLink = "";
        try {
            const paymentsRes = await axios_1.default.get(`${url}/payments?subscription=${subRes.data.id}&limit=1`, { headers: { access_token: key } });
            if (paymentsRes.data.data && paymentsRes.data.data.length > 0) {
                paymentLink = paymentsRes.data.data[0].invoiceUrl;
            }
        }
        catch (payErr) {
            logger.warn("Erro ao buscar a fatura inicial da assinatura no Asaas:", payErr.message);
        }
        await admin.firestore().collection("organizations").doc(orgId).update({
            asaasCustomerId: customerId,
            subscriptionId: subRes.data.id,
            subscriptionStatus: "PENDING",
            planId: planId,
        });
        return { success: true, paymentLink: paymentLink || subRes.data.id };
    }
    catch (error) {
        logger.error("Erro em createSaaSSubscription:", error);
        throw new https_1.HttpsError("internal", error.message);
    }
});
/**
 * BUSCA FATURAS (BOLETOS/PAGAMENTOS) DO SAAS NO ASAAS
 */
exports.getSaaSInvoices = (0, https_1.onCall)(async (request) => {
    var _a;
    const { orgId } = request.data;
    const { key, url } = await getAsaasConfig();
    try {
        const orgSnap = await admin.firestore()
            .collection("organizations")
            .doc(orgId)
            .get();
        const customerId = (_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.asaasCustomerId;
        if (!customerId)
            return [];
        const res = await axios_1.default.get(`${url}/payments?customer=${customerId}&limit=50`, { headers: { access_token: key } });
        return res.data.data;
    }
    catch (error) {
        logger.error("Erro em getSaaSInvoices:", error);
        throw new https_1.HttpsError("internal", error.message);
    }
});
exports.asaasWebhook = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const db = admin.firestore();
    try {
        // Validar Asaas-Access-Token do Webhook
        let webhookToken = "";
        try {
            webhookToken = asaasWebhookTokenSecret.value();
        }
        catch (e) {
            logger.warn("Secret ASAAS_WEBHOOK_TOKEN não disponível via Secret Manager.");
        }
        if (!webhookToken) {
            webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || "";
        }
        if (webhookToken) {
            const authHeader = req.headers["asaas-access-token"] ||
                req.headers["Asaas-Access-Token"];
            if (authHeader !== webhookToken) {
                logger.warn("Webhook token inválido", { received: authHeader });
                res.status(401).send("Unauthorized");
                return;
            }
        }
        const event = req.body;
        const isPaid = event.event === "PAYMENT_RECEIVED" ||
            event.event === "PAYMENT_CONFIRMED";
        const isOverdue = event.event === "PAYMENT_OVERDUE";
        const isCancelled = event.event === "PAYMENT_DELETED" ||
            event.event === "PAYMENT_REFUNDED";
        const customerId = (_a = event.payment) === null || _a === void 0 ? void 0 : _a.customer;
        if (isPaid) {
            const ref = ((_b = event.payment) === null || _b === void 0 ? void 0 : _b.externalReference) || "";
            if (ref.includes("___")) {
                const [orgId, id] = ref.split("___");
                if (id.startsWith("batch_")) {
                    await db.collection("organizations")
                        .doc(orgId).collection("billingBatches").doc(id)
                        .update({ status: "PAID" });
                    const batchSnap = await db.collection("organizations")
                        .doc(orgId).collection("billingBatches").doc(id).get();
                    const jobIds = ((_c = batchSnap.data()) === null || _c === void 0 ? void 0 : _c.jobIds) || [];
                    const writeBatch = db.batch();
                    jobIds.forEach((jid) => {
                        const jRef = db.collection("organizations")
                            .doc(orgId).collection("jobs").doc(jid);
                        writeBatch.update(jRef, { paymentStatus: "PAID" });
                    });
                    await writeBatch.commit();
                }
            }
            else if (customerId && ((_d = event.payment) === null || _d === void 0 ? void 0 : _d.subscription)) {
                // SaaS Subscription payment
                const orgsSnapshot = await db.collection("organizations")
                    .where("asaasCustomerId", "==", customerId).get();
                if (!orgsSnapshot.empty) {
                    const orgDoc = orgsSnapshot.docs[0];
                    await orgDoc.ref.update({ subscriptionStatus: "ACTIVE" });
                }
            }
        }
        else if (isOverdue) {
            if (customerId && ((_e = event.payment) === null || _e === void 0 ? void 0 : _e.subscription)) {
                // SaaS Subscription overdue
                const orgsSnapshot = await db.collection("organizations")
                    .where("asaasCustomerId", "==", customerId).get();
                if (!orgsSnapshot.empty) {
                    const orgDoc = orgsSnapshot.docs[0];
                    await orgDoc.ref.update({ subscriptionStatus: "OVERDUE" });
                }
            }
        }
        else if (isCancelled) {
            if (customerId && ((_f = event.payment) === null || _f === void 0 ? void 0 : _f.subscription)) {
                // SaaS Subscription cancelled
                const orgsSnapshot = await db.collection("organizations")
                    .where("asaasCustomerId", "==", customerId).get();
                if (!orgsSnapshot.empty) {
                    const orgDoc = orgsSnapshot.docs[0];
                    await orgDoc.ref.update({ subscriptionStatus: "CANCELLED" });
                }
            }
        }
        res.status(200).send("OK");
    }
    catch (error) {
        logger.error("Erro no asaasWebhook:", error);
        res.status(500).send("Erro");
    }
});
//# sourceMappingURL=index.js.map