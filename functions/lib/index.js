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
exports.cancelAsaasSubscriptionOnDelete = exports.sendDeleteCodeEmail = exports.communication = exports.triggerJobUpdated = exports.ycloudWebhook = exports.triggerSupplierOrderUpdated = exports.triggerDeliveryRouteUpdated = exports.triggerAppointmentCreated = exports.sendYcloudWhatsApp = exports.optimizeAndUploadImage = exports.syncStoreOrders = exports.manageOrderDecision = exports.calculateFrenetShipping = exports.createSupplierPayment = exports.asaasWebhook = exports.getSaaSInvoices = exports.toggleWhatsappModule = exports.createSaaSSubscription = exports.checkSubscriptionStatus = exports.setSubscriptionStatus = exports.createPatientPayment = exports.createOrderPayment = exports.createLabSubAccount = exports.generateBatchBoleto = exports.updateUserAdmin = exports.deleteUserAdmin = exports.validateCro = exports.registerUserInOrg = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({
    maxInstances: 10,
    region: "us-central1"
});
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
// Triggers sync 2
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const CommunicationService_1 = require("./communication/services/CommunicationService");
const communicationService = new CommunicationService_1.CommunicationService();
/**
 * CONFIGURAÇÕES E HELPERS
 */
const getAsaasConfig = async () => {
    const db = admin.firestore();
    const settingsSnap = await db.collection("settings").doc("global").get();
    const settings = settingsSnap.data();
    let apiKey = process.env.ASAAS_API_KEY || process.env.asaas_api_key || process.env.asaa_api_key || process.env.ASAA_API_KEY || "";
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
const getYcloudConfig = async () => {
    let apiKey = process.env.YCLOUD_API_KEY || process.env.ycloud_api_key || "";
    let fromNumber = process.env.YCLOUD_PHONE_NUMBER || process.env.ycloud_phone_number || "";
    try {
        const db = admin.firestore();
        const globalSettingsDoc = await db.collection("settings").doc("global").get();
        if (globalSettingsDoc.exists) {
            const data = globalSettingsDoc.data();
            if (data === null || data === void 0 ? void 0 : data.ycloudApiKey)
                apiKey = data.ycloudApiKey;
            if (data === null || data === void 0 ? void 0 : data.ycloudPhoneNumber)
                fromNumber = data.ycloudPhoneNumber;
        }
    }
    catch (e) {
        logger.error("Failed to fetch Ycloud config from DB", e);
    }
    return { apiKey, fromNumber };
};
async function getOrCreateAsaasCustomer(url, key, name, cpfCnpj, externalReference, email = "") {
    if (externalReference) {
        const searchByRef = await axios_1.default.get(`${url}/customers?externalReference=${externalReference}`, {
            headers: { access_token: key },
        });
        if (searchByRef.data.data && searchByRef.data.data.length > 0) {
            return searchByRef.data.data[0].id;
        }
    }
    const cleanCpfCnpj = (cpfCnpj || "").replace(/\D/g, "");
    if (cleanCpfCnpj) {
        const searchRes = await axios_1.default.get(`${url}/customers?cpfCnpj=${cleanCpfCnpj}`, {
            headers: { access_token: key },
        });
        if (searchRes.data.data && searchRes.data.data.length > 0) {
            let foundCustomer = searchRes.data.data.find((c) => c.name.toLowerCase().trim() === name.toLowerCase().trim());
            if (foundCustomer) {
                if (!foundCustomer.externalReference && externalReference) {
                    await axios_1.default.post(`${url}/customers/${foundCustomer.id}`, { externalReference }, { headers: { access_token: key } });
                }
                return foundCustomer.id;
            }
            else {
                try {
                    const customerRes = await axios_1.default.post(`${url}/customers`, {
                        name,
                        cpfCnpj: cleanCpfCnpj,
                        email,
                        externalReference,
                        notificationDisabled: true,
                    }, { headers: { access_token: key } });
                    return customerRes.data.id;
                }
                catch (createErr) {
                    foundCustomer = searchRes.data.data[0];
                    await axios_1.default.post(`${url}/customers/${foundCustomer.id}`, {
                        name,
                        externalReference
                    }, { headers: { access_token: key } });
                    return foundCustomer.id;
                }
            }
        }
    }
    const customerRes = await axios_1.default.post(`${url}/customers`, {
        name,
        cpfCnpj: cleanCpfCnpj,
        email,
        externalReference,
        notificationDisabled: true,
    }, { headers: { access_token: key } });
    return customerRes.data.id;
}
/**
 * REGISTRA UM NOVO USUÁRIO EM UMA ORGANIZAÇÃO
 */
exports.registerUserInOrg = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    logger.info("registerUserInOrg triggered", { data: request.data });
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const { email, pass, name, role, organizationId, sector } = request.data || {};
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanName = (name || "").trim();
    if (!cleanEmail || !cleanName || !pass) {
        throw new https_1.HttpsError("invalid-argument", "Nome, e-mail e senha são obrigatórios.");
    }
    if (pass.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "A senha deve ter no mínimo 6 caracteres.");
    }
    let targetOrgId = organizationId;
    if (!targetOrgId) {
        const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        targetOrgId = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.organizationId;
    }
    if (!targetOrgId) {
        throw new https_1.HttpsError("failed-precondition", "Organização não informada e não identificada.");
    }
    try {
        let userUid = "";
        const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU";
        try {
            const userRecord = await admin.auth().createUser({
                email: cleanEmail,
                password: pass,
                displayName: cleanName,
            });
            userUid = userRecord.uid;
        }
        catch (authErr) {
            logger.warn("auth.createUser warning/error, attempting REST API fallback:", { code: authErr === null || authErr === void 0 ? void 0 : authErr.code, message: authErr === null || authErr === void 0 ? void 0 : authErr.message });
            const errCode = (authErr === null || authErr === void 0 ? void 0 : authErr.code) || "";
            let authCreated = false;
            try {
                const signupRes = await axios_1.default.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
                    email: cleanEmail,
                    password: pass,
                    returnSecureToken: true
                });
                if (signupRes.data && signupRes.data.localId) {
                    userUid = signupRes.data.localId;
                    authCreated = true;
                }
            }
            catch (restErr) {
                const restMsg = ((_d = (_c = (_b = restErr === null || restErr === void 0 ? void 0 : restErr.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || (restErr === null || restErr === void 0 ? void 0 : restErr.message) || "";
                logger.warn("REST signup error:", restMsg);
                if (restMsg.includes("EMAIL_EXISTS") || restMsg.includes("email already in use") || errCode === "auth/email-already-in-use") {
                    try {
                        const signinRes = await axios_1.default.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
                            email: cleanEmail,
                            password: pass,
                            returnSecureToken: true
                        });
                        if (signinRes.data && signinRes.data.localId) {
                            userUid = signinRes.data.localId;
                            authCreated = true;
                        }
                    }
                    catch (signinErr) {
                        // lookup in Firestore
                    }
                }
            }
            if (!authCreated) {
                const userQuery = await admin.firestore().collection("users").where("email", "==", cleanEmail).limit(1).get();
                if (!userQuery.empty) {
                    userUid = userQuery.docs[0].id;
                }
                else {
                    userUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                }
            }
        }
        const userData = {
            id: userUid,
            name: cleanName,
            email: cleanEmail,
            role: role || "COLLABORATOR",
            organizationId: targetOrgId,
            sector: sector || "Geral",
            createdAt: admin.firestore.Timestamp.now(),
        };
        await admin.firestore()
            .collection("users")
            .doc(userUid)
            .set(userData, { merge: true });
        return { success: true, uid: userUid, message: "Colaborador cadastrado com sucesso!" };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        logger.error("Erro em registerUserInOrg:", error);
        throw new https_1.HttpsError("invalid-argument", error.message || "Erro ao registrar colaborador.");
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
        throw new https_1.HttpsError("aborted", error.message);
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
        throw new https_1.HttpsError("aborted", error.message);
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
        const docNum = (dentist.cpfCnpj || dentist.cpf || "").replace(/\D/g, "");
        let customerId = "";
        try {
            customerId = await getOrCreateAsaasCustomer(url, key, dentist.name, docNum, dentistId, dentist.email || "");
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
        throw new https_1.HttpsError("aborted", msg);
    }
});
/**
 * CRIA SUB-CONTA (WALLET) NO ASAAS PARA O LABORATÓRIO
 */
exports.createLabSubAccount = (0, https_1.onCall)(async (request) => {
    try {
        const { orgId, accountData } = request.data;
        const { key, url } = await getAsaasConfig();
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
        throw new https_1.HttpsError("aborted", error.message);
    }
});
/**
 * GERA VOUCHERS PARA UM PEDIDO CONFIRMADO (SOMENTE SE FOR COMBO PROMOCIONAL)
 */
async function generateVouchersForJob(db, jobData, jobId) {
    var _a;
    if (jobData.vouchersGenerated)
        return;
    const hasComboItems = (_a = jobData.items) === null || _a === void 0 ? void 0 : _a.some((item) => item.isVoucherCombo === true);
    if (!hasComboItems)
        return;
    const writeBatch = db.batch();
    let generatedAny = false;
    let idx = 0;
    for (const item of jobData.items || []) {
        const shouldGenerate = item.isVoucherCombo === true;
        if (shouldGenerate) {
            generatedAny = true;
            const voucherId = `voucher_${Date.now()}_${idx}`;
            const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const voucherRef = db.collection("organizations")
                .doc(jobData.organizationId)
                .collection("vouchers")
                .doc(voucherId);
            let isVoucherCombo = true;
            let promoQuantity = 1;
            let applyToAllVariations = true;
            let promoVariationOptionId = '';
            let promoVariationOptionIds = [];
            let promoVariationOptionName = '';
            let promoVariationGroupName = '';
            if (item.promotionQuantity !== undefined && item.promotionQuantity !== null && item.applyToAllVariations !== undefined) {
                promoQuantity = Number(item.promotionQuantity);
                applyToAllVariations = item.applyToAllVariations !== false;
                promoVariationOptionId = item.promoVariationOptionId || '';
                promoVariationOptionIds = item.promoVariationOptionIds || [];
                promoVariationOptionName = item.promoVariationOptionName || '';
                promoVariationGroupName = item.promoVariationGroupName || '';
            }
            else {
                try {
                    const jtDoc = await db.collection("organizations")
                        .doc(jobData.organizationId)
                        .collection("jobTypes")
                        .doc(item.jobTypeId)
                        .get();
                    if (jtDoc.exists) {
                        const jtData = jtDoc.data();
                        isVoucherCombo = (jtData === null || jtData === void 0 ? void 0 : jtData.isVoucherCombo) === true;
                        promoQuantity = Number((jtData === null || jtData === void 0 ? void 0 : jtData.promotionQuantity) || 1);
                        applyToAllVariations = (jtData === null || jtData === void 0 ? void 0 : jtData.applyToAllVariations) !== false;
                        promoVariationOptionId = (jtData === null || jtData === void 0 ? void 0 : jtData.promoVariationOptionId) || '';
                        promoVariationOptionIds = (jtData === null || jtData === void 0 ? void 0 : jtData.promoVariationOptionIds) || [];
                        promoVariationOptionName = (jtData === null || jtData === void 0 ? void 0 : jtData.promoVariationOptionName) || '';
                        promoVariationGroupName = (jtData === null || jtData === void 0 ? void 0 : jtData.promoVariationGroupName) || '';
                    }
                }
                catch (err) {
                    logger.error(`Error fetching jobType ${item.jobTypeId} during voucher helper generation:`, err.message);
                }
            }
            const finalQty = isVoucherCombo ? (item.quantity * promoQuantity) : item.quantity;
            writeBatch.set(voucherRef, {
                id: voucherId,
                code,
                organizationId: jobData.organizationId,
                clientId: jobData.dentistUserId || jobData.dentistId || "",
                clientName: jobData.dentistName || "Dentista",
                jobTypeId: item.originalJobTypeId || item.jobTypeId,
                jobTypeName: item.name,
                promotionName: item.name,
                initialQuantity: finalQty,
                remainingQuantity: finalQty,
                status: 'ACTIVE',
                orderId: jobId,
                applyToAllVariations,
                promoVariationOptionId,
                promoVariationOptionIds,
                promoVariationOptionName,
                promoVariationGroupName,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        idx++;
    }
    if (generatedAny) {
        const jobRef = db.collection("organizations")
            .doc(jobData.organizationId)
            .collection("jobs")
            .doc(jobId);
        writeBatch.update(jobRef, { vouchersGenerated: true });
        await writeBatch.commit();
        jobData.vouchersGenerated = true;
    }
}
/**
 * CRIA PAGAMENTO PARA PEDIDO DA LOJA VIRTUAL (CARTÃO/PIX)
 */
exports.createOrderPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
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
            customerId = await getOrCreateAsaasCustomer(url, key, jobData.dentistName || "Cliente Loja", docNum, jobData.dentistId || "", "");
        }
        catch (err) {
            throw new Error("Erro cliente Asaas: " + (((_l = (_k = (_j = (_h = err.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.errors) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.description) || err.message));
        }
        // Process Vouchers (if any)
        if (jobData.vouchersUsed && jobData.vouchersUsed.length > 0) {
            // Simplistic deduction: we just mark the voucher as used.
            // A full implementation would calculate how much of the voucher was consumed.
            // We will deduct the consumed amount based on the cart quantities.
            const vQties = {};
            const vRefs = {};
            for (const vId of jobData.vouchersUsed) {
                const vRef = db.collection("organizations").doc(jobData.organizationId).collection("vouchers").doc(vId);
                const snap = await vRef.get();
                if (snap.exists) {
                    vQties[vId] = ((_m = snap.data()) === null || _m === void 0 ? void 0 : _m.remainingQuantity) || 0;
                    vRefs[vId] = vRef;
                }
            }
            const writeBatch = db.batch();
            for (const item of jobData.items) {
                const itemTypeIds = [item.jobTypeId, item.originalJobTypeId];
                let qtyToCover = item.quantity;
                for (const vId of jobData.vouchersUsed) {
                    const snap = await vRefs[vId].get();
                    if (snap.exists) {
                        const vData = snap.data();
                        let variationMatches = true;
                        if (vData.applyToAllVariations === false) {
                            if (vData.promoVariationOptionIds && vData.promoVariationOptionIds.length > 0) {
                                variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.some((id) => vData.promoVariationOptionIds.includes(id)));
                            }
                            else if (vData.promoVariationOptionId) {
                                variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.includes(vData.promoVariationOptionId));
                            }
                            else {
                                variationMatches = false;
                            }
                        }
                        if (itemTypeIds.includes(vData.jobTypeId) && variationMatches && vQties[vId] > 0 && qtyToCover > 0) {
                            const coveredQty = Math.min(vQties[vId], qtyToCover);
                            vQties[vId] -= coveredQty;
                            qtyToCover -= coveredQty;
                        }
                    }
                }
            }
            for (const vId of jobData.vouchersUsed) {
                if (vRefs[vId]) {
                    writeBatch.update(vRefs[vId], {
                        remainingQuantity: vQties[vId],
                        status: vQties[vId] <= 0 ? 'EXHAUSTED' : 'ACTIVE',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            await writeBatch.commit();
        }
        // Pre-generate the jobId to include in externalReference
        const newJobId = `web_${Date.now()}`;
        // If totalValue is 0 (e.g. fully paid by vouchers or 100% discount)
        if (jobData.totalValue === 0) {
            const newJobData = Object.assign(Object.assign({}, jobData), { id: newJobId, paymentStatus: (jobData.vouchersUsed && jobData.vouchersUsed.length > 0) ? 'VOUCHER' : 'PAID' });
            await db.collection("organizations")
                .doc(jobData.organizationId)
                .collection("jobs")
                .doc(newJobId)
                .set(newJobData);
            await generateVouchersForJob(db, newJobData, newJobId);
            return { success: true, paymentId: 'voucher_paid', invoiceUrl: '', pixQrCode: null, pixCopyPaste: null };
        }
        const payload = {
            customer: customerId,
            billingType: paymentData.method,
            value: jobData.totalValue,
            dueDate: new Date().toISOString().split("T")[0],
            description: `Pedido Loja - ${jobData.organizationId}`,
            externalReference: `${jobData.organizationId}___order___${newJobId}`,
        };
        if (paymentData.successUrl) {
            payload.callback = {
                successUrl: paymentData.successUrl,
                autoRedirect: true
            };
        }
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
        let pixQrCode = null;
        let pixCopyPaste = null;
        if (paymentData.method === "PIX") {
            try {
                const pixRes = await axios_1.default.get(`${url}/payments/${payRes.data.id}/pixQrCode`, {
                    headers: { access_token: key },
                });
                pixQrCode = pixRes.data.encodedImage;
                pixCopyPaste = pixRes.data.payload;
            }
            catch (err) {
                console.error("Erro ao buscar QR Code do PIX:", err.message);
            }
        }
        const isPaidImmediately = payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED';
        const newJobData = Object.assign(Object.assign({}, jobData), { id: newJobId, asaasPaymentId: payRes.data.id, paymentStatus: isPaidImmediately ? 'PAID' : 'PENDING' });
        await db.collection("organizations")
            .doc(jobData.organizationId)
            .collection("jobs")
            .doc(newJobId)
            .set(newJobData);
        if (isPaidImmediately) {
            await generateVouchersForJob(db, newJobData, newJobId);
        }
        return { success: true, paymentId: payRes.data.id, invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, pixQrCode, pixCopyPaste };
    }
    catch (error) {
        const msg = ((_r = (_q = (_p = (_o = error.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.errors) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.description) || error.message;
        throw new https_1.HttpsError("aborted", msg);
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
            customerId = await getOrCreateAsaasCustomer(url, key, patientData.name, docNum, patientId, "");
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
        throw new https_1.HttpsError("aborted", msg);
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
        throw new https_1.HttpsError("aborted", error.message);
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
            try {
                const paymentsRes = await axios_1.default.get(`${url}/payments?subscription=${subId}&limit=10`, { headers: { access_token: key } });
                const payments = paymentsRes.data.data || [];
                const hasOverdue = payments.some((p) => p.status === "OVERDUE");
                const hasReceived = payments.some((p) => p.status === "RECEIVED" || p.status === "CONFIRMED");
                const hasPending = payments.some((p) => p.status === "PENDING");
                if (hasOverdue) {
                    status = "OVERDUE";
                }
                else if (hasPending && !hasReceived) {
                    // Subscription created, but first payment still pending
                    status = "PENDING";
                }
                else {
                    status = "ACTIVE";
                }
            }
            catch (err) {
                logger.warn("Erro ao buscar faturas na verificação:", err.message);
                status = "ACTIVE"; // fallback if api fails
            }
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
        throw new https_1.HttpsError("aborted", error.message);
    }
});
/**
 * WEBHOOK PARA ATUALIZAÇÃO AUTOMÁTICA DE PAGAMENTOS
 */
/**
 * CRIA ASSINATURA SAAS
 */
exports.createSaaSSubscription = (0, https_1.onCall)(async (req) => {
    var _a;
    try {
        const { orgId, planId, email, name, cpfCnpj } = req.data;
        const { key, url } = await getAsaasConfig();
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
        const phone = orgData.phone || orgData.whatsapp || "";
        const cep = orgData.cep || "";
        const address = orgData.address || "";
        const number = orgData.number || "";
        const complement = orgData.complement || "";
        const neighborhood = orgData.neighborhood || "";
        // Buscar ou Criar Customer
        let customerId = "";
        try {
            customerId = await getOrCreateAsaasCustomer(url, key, name, cleanCpfCnpj, orgId, email);
            // Optional: Update with address/phone
            await axios_1.default.post(`${url}/customers/${customerId}`, {
                phone, mobilePhone: phone, postalCode: cep, address, addressNumber: number, complement, province: neighborhood
            }, { headers: { access_token: key } });
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
            const planData = planSnap.data() || {};
            value = planData.price;
            if (orgData.hasWhatsappModule) {
                let wppPrice = planData.whatsappModulePrice !== undefined ? planData.whatsappModulePrice : 90.00;
                value += wppPrice;
            }
        }
        // Calcular data de vencimento da fatura com base no trial
        let nextDue = new Date().toISOString().split("T")[0];
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
        throw new https_1.HttpsError("aborted", error.message);
    }
});
/**
 * ATIVA OU DESATIVA MÓDULO WHATSAPP
 * Atualiza o valor da assinatura no Asaas se existir
 */
exports.toggleWhatsappModule = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    try {
        const { orgId, activate } = request.data;
        const { key, url } = await getAsaasConfig();
        const db = admin.firestore();
        const orgRef = db.collection("organizations").doc(orgId);
        const orgSnap = await orgRef.get();
        if (!orgSnap.exists) {
            throw new Error("Organização não encontrada");
        }
        const orgData = orgSnap.data() || {};
        const subId = orgData.subscriptionId;
        const planId = orgData.planId;
        if (subId && planId) {
            // Obter valor do plano
            const planSnap = await db.collection("subscriptionPlans").doc(planId).get();
            const planData = planSnap.data() || {};
            let basePrice = Number(planData.price || 99.00);
            let wppPrice = Number(planData.whatsappModulePrice !== undefined ? planData.whatsappModulePrice : 90.00);
            let newValue = basePrice;
            if (activate) {
                newValue += wppPrice;
            }
            // Update asaas subscription
            try {
                await axios_1.default.post(`${url}/subscriptions/${subId}`, {
                    value: newValue,
                    updatePendingPayments: true
                }, {
                    headers: { access_token: key }
                });
            }
            catch (asaasErr) {
                logger.error("Erro Asaas (toggleWhatsappModule):", ((_a = asaasErr.response) === null || _a === void 0 ? void 0 : _a.data) || asaasErr.message);
                throw new Error("Erro na API do Asaas: " + (((_e = (_d = (_c = (_b = asaasErr.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || asaasErr.message));
            }
        }
        await orgRef.update({
            hasWhatsappModule: activate
        });
        return { success: true };
    }
    catch (err) {
        logger.error("Erro em toggleWhatsappModule:", err);
        throw new https_1.HttpsError("aborted", err.message);
    }
});
/**
 * BUSCA FATURAS (BOLETOS/PAGAMENTOS) DO SAAS NO ASAAS
 */
exports.getSaaSInvoices = (0, https_1.onCall)(async (request) => {
    var _a;
    try {
        const { orgId } = request.data;
        const { key, url } = await getAsaasConfig();
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
        throw new https_1.HttpsError("aborted", error.message);
    }
});
exports.asaasWebhook = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const db = admin.firestore();
    try {
        let webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || "";
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
                const parts = ref.split("___");
                if (parts.length === 3 && parts[1] === "order") {
                    const orgId = parts[0];
                    const jobId = parts[2];
                    const jobRef = db.collection("organizations")
                        .doc(orgId)
                        .collection("jobs")
                        .doc(jobId);
                    const jobSnap = await jobRef.get();
                    if (jobSnap.exists) {
                        const jobData = jobSnap.data() || {};
                        if (jobData.paymentStatus !== "PAID") {
                            await jobRef.update({ paymentStatus: "PAID" });
                        }
                        await generateVouchersForJob(db, Object.assign(Object.assign({}, jobData), { paymentStatus: "PAID" }), jobId);
                    }
                }
                else {
                    const [orgId, id] = parts;
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
            // CHECK IF IT IS A STORE JOB (ONLINE ORDER)
            if ((_e = event.payment) === null || _e === void 0 ? void 0 : _e.id) {
                const jobsSnap = await db.collectionGroup("jobs").where("asaasPaymentId", "==", event.payment.id).get();
                if (!jobsSnap.empty) {
                    const jobDoc = jobsSnap.docs[0];
                    const jobData = jobDoc.data();
                    if (jobData.paymentStatus !== "PAID") {
                        await jobDoc.ref.update({ paymentStatus: "PAID" });
                    }
                    // GENERATE VOUCHERS IF COMBO OR PROMO ITEMS
                    await generateVouchersForJob(db, Object.assign(Object.assign({}, jobData), { paymentStatus: "PAID" }), jobDoc.id);
                }
            }
        }
        else if (isOverdue) {
            if (customerId && ((_f = event.payment) === null || _f === void 0 ? void 0 : _f.subscription)) {
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
            if (customerId && ((_g = event.payment) === null || _g === void 0 ? void 0 : _g.subscription)) {
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
/**
 * CRIA PAGAMENTO PARA PEDIDO NA LOJA DE FORNECEDORES (CARTÃO/PIX)
 */
exports.createSupplierPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const { orderData, paymentData } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    try {
        const { key, url, splitPercent } = await getAsaasConfig();
        const supplierSnap = await db.collection("organizations").doc(orderData.supplierId).get();
        const walletId = (_b = (_a = supplierSnap.data()) === null || _a === void 0 ? void 0 : _a.financialSettings) === null || _b === void 0 ? void 0 : _b.asaasWalletId;
        let finalSplitPercent = splitPercent; // comissão da plataforma
        const customSplit = (_d = (_c = supplierSnap.data()) === null || _c === void 0 ? void 0 : _c.financialSettings) === null || _d === void 0 ? void 0 : _d.customSplitPercent;
        if (customSplit !== undefined && customSplit !== null) {
            finalSplitPercent = Number(customSplit);
        }
        // Criar/buscar cliente
        let customerId = "";
        try {
            const docNum = paymentData.cpfCnpj;
            customerId = await getOrCreateAsaasCustomer(url, key, orderData.buyerOrgName || "Cliente", docNum, orderData.buyerOrgId, "");
        }
        catch (err) {
            throw new Error("Erro cliente Asaas: " + (((_h = (_g = (_f = (_e = err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.errors) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.description) || err.message));
        }
        const payload = {
            customer: customerId,
            billingType: "UNDEFINED",
            value: orderData.totalValue,
            dueDate: new Date().toISOString().split("T")[0],
            description: `Pedido Loja Fornecedor - ${orderData.buyerOrgId}`,
        };
        if (walletId && walletId.length > 10) {
            payload.split = [{ walletId, percentualValue: 100 - finalSplitPercent }];
        }
        const payRes = await axios_1.default.post(`${url}/payments`, payload, {
            headers: { access_token: key },
        });
        const newOrderData = Object.assign(Object.assign({}, orderData), { asaasPaymentId: payRes.data.id, asaasInvoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl, paymentStatus: payRes.data.status === 'CONFIRMED' || payRes.data.status === 'RECEIVED' ? 'PAID' : 'PENDING' });
        await db.collection("supplierOrders").doc(orderData.id).set(newOrderData);
        return {
            success: true,
            paymentId: payRes.data.id,
            invoiceUrl: payRes.data.invoiceUrl || payRes.data.bankSlipUrl
        };
    }
    catch (error) {
        const msg = ((_m = (_l = (_k = (_j = error.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.errors) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.description) || error.message;
        throw new https_1.HttpsError("aborted", msg);
    }
});
exports.calculateFrenetShipping = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a;
    const { originCep, destinationCep, items, frenetToken } = req.data;
    if (!originCep || !destinationCep || !frenetToken) {
        return { error: 'Missing CEP or Frenet Token.' };
    }
    // Calculate total weight and dimensions (approximate)
    let totalWeight = 0;
    let totalValue = 0;
    items.forEach((item) => {
        totalWeight += (item.weight || 0.5) * item.quantity;
        totalValue += (item.price * item.quantity);
    });
    const payload = {
        SellerCEP: originCep.replace(/\D/g, ''),
        RecipientCEP: destinationCep.replace(/\D/g, ''),
        ShipmentInvoiceValue: totalValue,
        ShippingItemArray: items.map((item) => ({
            Height: item.height || 10,
            Length: item.length || 20,
            Quantity: item.quantity,
            Weight: item.weight || 0.5,
            Width: item.width || 15,
            SKU: item.id,
            Category: "Produtos Odontológicos"
        })),
        RecipientCountry: "BR"
    };
    try {
        const response = await axios_1.default.post('https://api.frenet.com.br/shipping/quote', payload, {
            headers: {
                'token': frenetToken,
                'Content-Type': 'application/json'
            }
        });
        if (response.data && response.data.ShippingSevicesArray) {
            return { services: response.data.ShippingSevicesArray };
        }
        else {
            return { services: [] };
        }
    }
    catch (error) {
        logger.error("Erro Frenet:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw new https_1.HttpsError('internal', 'Erro ao calcular frete na Frenet.');
    }
});
/**
 * GERENCIA DECISÃO DE PEDIDO WEB (APROVAR OU REJEITAR)
 */
exports.manageOrderDecision = (0, https_1.onCall)(async (request) => {
    const { orgId, jobId, decision, reason } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    try {
        const jobRef = db.collection("organizations").doc(orgId).collection("jobs").doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            throw new https_1.HttpsError("not-found", "Pedido não encontrado.");
        }
        if (decision === 'APPROVE') {
            await jobRef.update({
                status: "APPROVED",
                approvedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        else if (decision === 'REJECT') {
            await jobRef.update({
                status: "REJECTED",
                rejectionReason: reason || "",
                rejectedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("aborted", error.message);
    }
});
/**
 * REPROCESSA E SINCRONIZA PEDIDOS DA LOJA VIRTUAL (VOUCHERS E FINANCEIRO)
 */
exports.syncStoreOrders = (0, https_1.onCall)(async (request) => {
    var _a;
    const { organizationId, clientId, jobId, forceMarkPaid } = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Não logado.");
    }
    const db = admin.firestore();
    let jobsToSync = [];
    try {
        if (jobId && organizationId) {
            const docRef = db.collection("organizations").doc(organizationId).collection("jobs").doc(jobId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                jobsToSync = [docSnap];
            }
        }
        else if (jobId) {
            const orgsSnap = await db.collection("organizations").get();
            for (const orgDoc of orgsSnap.docs) {
                const docRef = db.collection("organizations").doc(orgDoc.id).collection("jobs").doc(jobId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    jobsToSync = [docSnap];
                    break;
                }
            }
        }
        else if (organizationId) {
            const jobsSnap = await db.collection("organizations")
                .doc(organizationId)
                .collection("jobs")
                .where("origin", "in", ["ONLINE_ORDER", "ONLINE_REQUISITION"])
                .get();
            jobsToSync = jobsSnap.docs;
        }
        else if (clientId) {
            const orgsSnap = await db.collection("organizations").get();
            const jobsPromises = orgsSnap.docs.map(async (orgDoc) => {
                const snap1 = await db.collection("organizations")
                    .doc(orgDoc.id)
                    .collection("jobs")
                    .where("dentistId", "==", clientId)
                    .get();
                const snap2 = await db.collection("organizations")
                    .doc(orgDoc.id)
                    .collection("jobs")
                    .where("dentistUserId", "==", clientId)
                    .get();
                const combined = [...snap1.docs];
                snap2.docs.forEach((doc) => {
                    if (!combined.some((d) => d.id === doc.id)) {
                        combined.push(doc);
                    }
                });
                return combined;
            });
            const jobsSnaps = await Promise.all(jobsPromises);
            const flatDocs = jobsSnaps.flat();
            jobsToSync = flatDocs.filter((doc) => {
                const d = doc.data();
                return d.origin === "ONLINE_ORDER" || d.origin === "ONLINE_REQUISITION";
            });
        }
        let updatedCount = 0;
        let vouchersGeneratedCount = 0;
        let asaasConfig = null;
        try {
            asaasConfig = await getAsaasConfig();
        }
        catch (e) {
            logger.warn("Asaas config error during sync (using key settings if any):", e);
        }
        for (const jobDoc of jobsToSync) {
            const jobData = jobDoc.data();
            let paymentStatus = jobData.paymentStatus || "PENDING";
            // Force mark as paid if requested (e.g. by laboratory manager)
            if (forceMarkPaid && jobId && paymentStatus !== "PAID") {
                paymentStatus = "PAID";
                await jobDoc.ref.update({ paymentStatus: "PAID" });
                updatedCount++;
            }
            // Check with Asaas if pending and has Asaas payment ID
            if (paymentStatus !== "PAID" && jobData.asaasPaymentId && asaasConfig) {
                try {
                    const checkRes = await axios_1.default.get(`${asaasConfig.url}/payments/${jobData.asaasPaymentId}`, {
                        headers: { access_token: asaasConfig.key }
                    });
                    const asaasStatus = checkRes.data.status;
                    if (asaasStatus === "CONFIRMED" || asaasStatus === "RECEIVED" || asaasStatus === "RECEIVED_IN_CASH") {
                        paymentStatus = "PAID";
                        await jobDoc.ref.update({ paymentStatus: "PAID" });
                        updatedCount++;
                    }
                }
                catch (err) {
                    logger.error(`Error checking Asaas payment ${jobData.asaasPaymentId}:`, err.message);
                }
            }
            // Generate vouchers if paymentStatus is PAID and vouchers have not been generated
            if (paymentStatus === "PAID" && !jobData.vouchersGenerated) {
                const hasVoucherCombos = (_a = jobData.items) === null || _a === void 0 ? void 0 : _a.some((item) => item.isVoucherCombo === true);
                await generateVouchersForJob(db, Object.assign(Object.assign({}, jobData), { paymentStatus: "PAID" }), jobDoc.id);
                if (hasVoucherCombos) {
                    vouchersGeneratedCount++;
                }
            }
        }
        return {
            success: true,
            jobsChecked: jobsToSync.length,
            paymentsUpdated: updatedCount,
            vouchersGenerated: vouchersGeneratedCount
        };
    }
    catch (error) {
        logger.error("Error in syncStoreOrders:", error);
        throw new https_1.HttpsError("aborted", error.message);
    }
});
exports.optimizeAndUploadImage = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    try {
        const { base64, fileName, mimeType } = request.data;
        if (!base64 || !fileName || !mimeType) {
            throw new https_1.HttpsError("invalid-argument", "Missing base64, fileName or mimeType.");
        }
        const bucket = admin.storage().bucket();
        const db = admin.firestore();
        let sharp;
        try {
            sharp = require("sharp");
        }
        catch (err) {
            logger.error("Erro ao carregar o modulo sharp. Certifique-se de que ele esta instalado no ambiente.", err);
            throw new https_1.HttpsError("aborted", "Biblioteca de processamento de imagem nao disponivel no servidor.");
        }
        const buffer = Buffer.from(base64, "base64");
        // Retrieve metadata using sharp
        const originalMetadata = await sharp(buffer).metadata();
        const widthOriginal = originalMetadata.width || 0;
        const heightOriginal = originalMetadata.height || 0;
        const sizeOriginal = buffer.length;
        let sharpInstance = sharp(buffer);
        // Auto-rotate based on EXIF
        sharpInstance = sharpInstance.rotate();
        // Resize only if wider or taller than 4096px
        if (widthOriginal > 4096 || heightOriginal > 4096) {
            sharpInstance = sharpInstance.resize({
                width: 4096,
                height: 4096,
                fit: "inside",
                withoutEnlargement: true,
            });
        }
        // Convert to WebP, effort 4 (balanced), high quality (92), keeping transparency
        const webpBuffer = await sharpInstance
            .webp({ quality: 92, effort: 4 })
            .toBuffer();
        const sizeWebp = webpBuffer.length;
        const timestamp = Date.now();
        const cleanFileName = fileName.replace(/\s+/g, "_");
        const fileNameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.')) || cleanFileName;
        const originalPath = `original/${timestamp}_${cleanFileName}`;
        const webpPath = `webp/${timestamp}_${fileNameWithoutExt}.webp`;
        const originalFile = bucket.file(originalPath);
        await originalFile.save(buffer, {
            metadata: {
                contentType: mimeType,
                cacheControl: "public, max-age=31536000",
            },
        });
        const webpFile = bucket.file(webpPath);
        await webpFile.save(webpBuffer, {
            metadata: {
                contentType: "image/webp",
                cacheControl: "public, max-age=31536000",
            },
        });
        let originalUrl = "";
        let webpUrl = "";
        try {
            const { getDownloadURL } = require("firebase-admin/storage");
            originalUrl = await getDownloadURL(originalFile);
            webpUrl = await getDownloadURL(webpFile);
        }
        catch (e) {
            originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(originalPath)}?alt=media`;
            webpUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(webpPath)}?alt=media`;
        }
        const metadata = {
            originalUrl,
            webpUrl,
            mimeTypeOriginal: mimeType,
            mimeTypeWebp: "image/webp",
            width: widthOriginal,
            height: heightOriginal,
            sizeOriginal,
            sizeWebp,
            createdAt: admin.firestore.Timestamp.now(),
        };
        const docId = `${timestamp}_${fileNameWithoutExt}`;
        await db.collection("imageMetadata").doc(docId).set(metadata);
        return metadata;
    }
    catch (error) {
        logger.error("Error in optimizeAndUploadImage:", error);
        throw new https_1.HttpsError("aborted", error.message);
    }
});
/**
 * ENVIA NOTIFICAÇÃO DE WHATSAPP VIA API DO YCLOUD (SERVER-SIDE PROXY)
 */
exports.sendYcloudWhatsApp = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { to, body, orgId } = request.data;
    if (!to || !body) {
        throw new https_1.HttpsError("invalid-argument", "Número de destino e corpo da mensagem são obrigatórios.");
    }
    const globalConfig = await getYcloudConfig();
    let apiKey = globalConfig.apiKey;
    let fromNumber = globalConfig.fromNumber;
    if (orgId) {
        const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
        if (orgSnap.exists) {
            const org = orgSnap.data();
            if (org.ycloudPhoneNumber) {
                fromNumber = org.ycloudPhoneNumber;
            }
        }
        const channelSnap = await admin.firestore().collection("communication_channels")
            .where("orgId", "==", orgId)
            .where("status", "==", "ACTIVE")
            .limit(1)
            .get();
        if (!channelSnap.empty) {
            const channelData = channelSnap.docs[0].data();
            if (channelData.phoneNumber)
                fromNumber = channelData.phoneNumber;
            if (channelData.apiKey)
                apiKey = channelData.apiKey;
        }
    }
    if (!apiKey || apiKey === "your_ycloud_api_key_here") {
        logger.info(`[Ycloud Simulation] Credenciais não configuradas. Simulação de envio para ${to}: ${body}`);
        return {
            success: true,
            sid: "SM_simulated_" + Math.random().toString(36).substring(2, 12),
            simulated: true,
            message: `WhatsApp enviado via simulador: ${body}`
        };
    }
    try {
        const ycloudUrl = `https://api.ycloud.com/v2/whatsapp/messages`;
        let cleanTo = to.replace(/\D/g, "");
        if (cleanTo.length === 10 || cleanTo.length === 11) {
            cleanTo = "55" + cleanTo;
        }
        let cleanFrom = fromNumber ? fromNumber.replace(/\D/g, "") : "";
        if (cleanFrom === cleanTo) {
            cleanFrom = ""; // Don't use recipient phone number as sender
        }
        logger.info(`Enviando mensagem WhatsApp Ycloud real para ${cleanTo}...`);
        const payload = {
            to: `+${cleanTo}`
        };
        if (cleanFrom) {
            payload.from = `+${cleanFrom}`;
        }
        if (request.data.template) {
            payload.type = "template";
            payload.template = request.data.template;
        }
        else {
            payload.type = "text";
            payload.text = { body: body };
        }
        const response = await axios_1.default.post(ycloudUrl, payload, {
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });
        logger.info(`Mensagem real enviada com sucesso! ID: ${response.data.id}`);
        // Log in Firestore
        await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: cleanTo,
            message: body,
            status: "SENT",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            sid: response.data.id,
            simulated: false
        };
    }
    catch (error) {
        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        const apiErr = ((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || ((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || error.message;
        let friendlyMessage = `Erro no Ycloud: ${apiErr}`;
        if (status === 409) {
            friendlyMessage = `Erro no Ycloud (409): O número de remetente informou que o número +${to} ou remetente não está registrado no Ycloud WABA. Verifique a chave de API e o número remetente oficial cadastrado no Ycloud.`;
        }
        else if (status === 403) {
            friendlyMessage = `Erro no Ycloud (403): Envio de mensagem direta bloqueado pela Meta/Ycloud. Crie e aprove um Modelo/Template de mensagem no painel do Ycloud/Meta.`;
        }
        logger.error(`Erro ao enviar mensagem via Ycloud real (${status}): ${apiErr}`, (_g = error.response) === null || _g === void 0 ? void 0 : _g.data);
        await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: to,
            message: `Erro: ${friendlyMessage}`,
            status: "FAILED",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new https_1.HttpsError("aborted", friendlyMessage);
    }
});
/**
 * TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS (WHATSAPP)
 */
exports.triggerAppointmentCreated = (0, firestore_1.onDocumentCreated)("organizations/{orgId}/appointments/{appointmentId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const appointment = snap.data();
    const orgId = event.params.orgId;
    logger.info(`[triggerDeliveryRouteUpdated] Rota ${event.params.routeId} iniciada. orgId: ${orgId}`);
    const db = admin.firestore();
    const patientSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(appointment.patientId).get();
    if (!patientSnap.exists)
        return;
    const patient = patientSnap.data();
    const phone = patient.phone || patient.whatsapp;
    if (!phone)
        return;
    const dateStr = new Date(appointment.date).toLocaleDateString("pt-BR");
    const timeStr = appointment.startTime;
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
    }
    await db.collection("ycloudSessions").doc(cleanPhone).set({
        appointmentId: event.params.appointmentId,
        orgId: orgId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    try {
        await communicationService.sendTemplateMessage(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", {
            patient_name: patient.name,
            date: dateStr,
            time: timeStr
        });
    }
    catch (err) {
        logger.warn(`[triggerAppointmentCreated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
    }
});
exports.triggerDeliveryRouteUpdated = (0, firestore_1.onDocumentUpdated)("organizations/{orgId}/routes/{routeId}", async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const justInTransit = before.status !== "IN_TRANSIT" && after.status === "IN_TRANSIT";
    const justCompleted = before.status !== "COMPLETED" && after.status === "COMPLETED";
    if (justInTransit || justCompleted) {
        const orgId = event.params.orgId;
        const db = admin.firestore();
        // Obter items da rota
        const itemsSnap = await db.collection("organizations").doc(orgId).collection("routes").doc(event.params.routeId).collection("items").get();
        if (itemsSnap.empty) {
            logger.info(`[triggerDeliveryRouteUpdated] Rota vazia (sem itens).`);
            return;
        }
        const items = itemsSnap.docs.map((doc) => doc.data());
        // Agrupar por dentista
        const jobsByDentist = {};
        for (const item of items) {
            const dId = item.dentistId;
            if (!jobsByDentist[dId]) {
                jobsByDentist[dId] = {
                    dentistName: item.dentistName,
                    dentistId: dId,
                    jobs: [],
                    isAppUser: !!item.clinicName
                };
            }
            const action = item.type === "DELIVERY" ? "Entrega" : "Coleta";
            jobsByDentist[dId].jobs.push(`- [${action}] ${item.patientName || "Paciente"} (OS: ${item.jobId || "Sem número"})`);
            // Automatically mark jobs as delivered if route completed
            if (justCompleted && item.type === "DELIVERY" && item.jobId) {
                try {
                    await db.collection("organizations").doc(orgId).collection("jobs").doc(item.jobId).update({
                        status: 'DELIVERED',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                catch (e) {
                    logger.warn("Could not update job to DELIVERED", e);
                }
            }
        }
        for (const dId of Object.keys(jobsByDentist)) {
            const info = jobsByDentist[dId];
            let phone = "";
            // Try users first
            let userSnap = await db.collection("users").doc(dId).get();
            if (userSnap.exists) {
                const data = userSnap.data();
                phone = (data === null || data === void 0 ? void 0 : data.phone) || (data === null || data === void 0 ? void 0 : data.whatsapp) || "";
            }
            else {
                let manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
                if (manualSnap.exists) {
                    const data = manualSnap.data();
                    phone = (data === null || data === void 0 ? void 0 : data.phone) || (data === null || data === void 0 ? void 0 : data.whatsapp) || "";
                }
            }
            if (!phone) {
                continue;
            }
            const jobsListStr = info.jobs.join("\n");
            const templateType = justCompleted ? "LAB_DELIVERED" : "LAB_DISPATCH";
            try {
                await communicationService.sendTemplateMessage(orgId, phone, "LAB", templateType, {
                    dentist_name: info.dentistName,
                    jobs_list: jobsListStr
                });
            }
            catch (err) {
                logger.warn(`[triggerDeliveryRouteUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
            }
        }
    }
});
exports.triggerSupplierOrderUpdated = (0, firestore_1.onDocumentUpdated)("supplierOrders/{orderId}", async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.deliveryStatus !== after.deliveryStatus) {
        const db = admin.firestore();
        const orgSnap = await db.collection("organizations").doc(after.buyerOrgId).get();
        if (!orgSnap.exists)
            return;
        const org = orgSnap.data();
        const phone = org.phone || org.whatsapp || "";
        if (!phone)
            return;
        const statusMap = {
            "PENDING": "Pendente",
            "PROCESSING": "Em processamento",
            "SHIPPED": "Enviado",
            "DELIVERED": "Entregue"
        };
        const readableStatus = statusMap[after.deliveryStatus] || after.deliveryStatus;
        try {
            await communicationService.sendTemplateMessage(after.supplierId, phone, "SUPPLIER", "SUPPLIER_UPDATE", {
                order_id: event.params.orderId,
                status: readableStatus
            });
        }
        catch (err) {
            logger.warn(`[triggerSupplierOrderUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
        }
    }
});
exports.ycloudWebhook = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const db = admin.firestore();
    try {
        const event = req.body;
        let from = "";
        let msg = "";
        if (event.type === "whatsappInboundMessage") {
            from = ((_a = event.whatsappInboundMessage) === null || _a === void 0 ? void 0 : _a.from) || "";
            msg = ((_c = (_b = event.whatsappInboundMessage) === null || _b === void 0 ? void 0 : _b.text) === null || _c === void 0 ? void 0 : _c.body) || "";
        }
        else {
            // Fallback para outros formatos ou testes
            from = event.from || event.From || ((_d = event.whatsappInboundMessage) === null || _d === void 0 ? void 0 : _d.from) || "";
            msg = (((_e = event.text) === null || _e === void 0 ? void 0 : _e.body) || event.Body || ((_g = (_f = event.whatsappInboundMessage) === null || _f === void 0 ? void 0 : _f.text) === null || _g === void 0 ? void 0 : _g.body) || "").trim();
        }
        logger.info("Recebido webhook do Ycloud", { from, msg });
        if (!from || !msg) {
            res.status(200).send("OK");
            return;
        }
        const cleanPhone = from.replace(/\D/g, "");
        const sessionSnap = await db.collection("ycloudSessions").doc(cleanPhone).get();
        if (!sessionSnap.exists) {
            // Fallback check twilioSessions for transition period
            const oldSessionSnap = await db.collection("twilioSessions").doc(cleanPhone).get();
            if (!oldSessionSnap.exists) {
                res.status(200).send("OK");
                return;
            }
        }
        const session = sessionSnap.exists ? sessionSnap.data() : (await db.collection("twilioSessions").doc(cleanPhone).get()).data();
        const orgId = session.orgId;
        const appointmentId = session.appointmentId;
        let newStatus = "";
        if (msg === "1" || msg.toLowerCase() === "sim" || msg.toLowerCase() === "confirmar") {
            newStatus = "CONFIRMED";
        }
        else if (msg === "2" || msg.toLowerCase() === "não" || msg.toLowerCase() === "nao" || msg.toLowerCase() === "cancelar") {
            newStatus = "CANCELED";
        }
        if (newStatus) {
            await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).update({
                status: newStatus
            });
            let responseMsg = newStatus === "CONFIRMED" ? "Sua consulta foi confirmada com sucesso. Obrigado!" : "Sua consulta foi cancelada.";
            const orgSnap = await db.collection("organizations").doc(orgId).get();
            const org = orgSnap.data();
            const type = newStatus === "CONFIRMED" ? "CLINIC_APPOINTMENT_CONFIRMED" : "CLINIC_APPOINTMENT_CANCELED";
            let template = null;
            try {
                const globalSettingsSnap = await db.collection("settings").doc("global").get();
                if (globalSettingsSnap.exists) {
                    const globalSettings = globalSettingsSnap.data();
                    if (globalSettings && globalSettings.globalWhatsappTemplates) {
                        template = globalSettings.globalWhatsappTemplates.find((t) => t.action === type && t.active);
                    }
                }
            }
            catch (err) {
                logger.error("Erro ao carregar modelo global de WhatsApp no webhook:", err);
            }
            if (!template && (org === null || org === void 0 ? void 0 : org.hasWhatsappModule) && (org === null || org === void 0 ? void 0 : org.whatsappTemplates)) {
                template = org.whatsappTemplates.find((t) => t.type === type && t.active);
            }
            if (template) {
                let patientName = "Paciente";
                let dateStr = "";
                let timeStr = "";
                try {
                    const apptSnap = await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).get();
                    if (apptSnap.exists) {
                        const appt = apptSnap.data();
                        dateStr = new Date(appt.date).toLocaleDateString("pt-BR");
                        timeStr = appt.startTime || "";
                        const patSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(appt.patientId).get();
                        if (patSnap.exists) {
                            patientName = patSnap.data().name;
                        }
                    }
                }
                catch (e) {
                    logger.error("Erro ao buscar dados para template no webhook", e);
                }
                let body = template.body;
                body = body.replace(/\{\{patient_name\}\}/g, patientName);
                body = body.replace(/\{\{date\}\}/g, dateStr);
                body = body.replace(/\{\{time\}\}/g, timeStr);
                responseMsg = body;
            }
            const globalConfig = await getYcloudConfig();
            let apiKey = globalConfig.apiKey;
            let fromNumber = globalConfig.fromNumber;
            if (apiKey && apiKey !== "your_ycloud_api_key_here") {
                const ycloudUrl = `https://api.ycloud.com/v2/whatsapp/messages`;
                await axios_1.default.post(ycloudUrl, {
                    to: `+${cleanPhone}`,
                    from: `+${fromNumber.replace(/\D/g, "")}`,
                    type: "text",
                    text: {
                        body: responseMsg
                    }
                }, {
                    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }
                });
            }
            await db.collection("ycloudSessions").doc(cleanPhone).delete();
            await db.collection("twilioSessions").doc(cleanPhone).delete();
        }
        res.status(200).send("OK");
    }
    catch (error) {
        logger.error("Erro no ycloudWebhook", error);
        res.status(200).send("Erro");
    }
});
exports.triggerJobUpdated = (0, firestore_1.onDocumentUpdated)("organizations/{orgId}/jobs/{jobId}", async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status !== "DELIVERED" && after.status === "DELIVERED") {
        const orgId = event.params.orgId;
        const db = admin.firestore();
        let phone = "";
        // Try users first
        const dId = after.dentistId;
        let userSnap = await db.collection("users").doc(dId).get();
        if (userSnap.exists) {
            const data = userSnap.data();
            phone = (data === null || data === void 0 ? void 0 : data.phone) || (data === null || data === void 0 ? void 0 : data.whatsapp) || "";
        }
        else {
            // Manual
            const manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
            if (manualSnap.exists) {
                const data = manualSnap.data();
                phone = (data === null || data === void 0 ? void 0 : data.phone) || (data === null || data === void 0 ? void 0 : data.whatsapp) || "";
            }
        }
        if (phone) {
            const osNumber = after.osNumber || ((_c = after.id) === null || _c === void 0 ? void 0 : _c.substring(after.id.length - 6).toUpperCase()) || event.params.jobId.substring(event.params.jobId.length - 6).toUpperCase();
            try {
                await communicationService.sendTemplateMessage(orgId, phone, "LAB", "LAB_DELIVERED", {
                    dentist_name: after.dentistName || "Dentista",
                    jobs_list: `- ${after.patientName} (OS: ${osNumber})`
                });
            }
            catch (err) {
                logger.warn(`[triggerJobUpdated] Erro ao enviar WhatsApp via Ycloud para ${phone}: ${err.message}`);
            }
        }
    }
});
const webhook_1 = require("./communication/webhook");
exports.communication = {
    webhook: webhook_1.communicationWebhook
};
/**
 * ENVIA CÓDIGO DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTA POR E-MAIL
 */
exports.sendDeleteCodeEmail = (0, https_1.onCall)(async (request) => {
    const { email, code } = request.data;
    if (!email || !code) {
        throw new https_1.HttpsError("invalid-argument", "Email e código são obrigatórios.");
    }
    logger.info(`[DeleteAccount] Código de confirmação de exclusão enviado para ${email}: ${code}`);
    return { success: true };
});
/**
 * CANCELA ASSINATURA E COBRANÇAS PENDENTES DO ASAAS AO DELETAR ORGANIZAÇÃO/SISTEMA
 */
exports.cancelAsaasSubscriptionOnDelete = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const { orgId } = request.data || {};
    if (!orgId) {
        throw new https_1.HttpsError("invalid-argument", "ID da organização não fornecido.");
    }
    const { key, url } = await getAsaasConfig();
    try {
        const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
        if (orgSnap.exists) {
            const orgData = orgSnap.data();
            const subId = orgData === null || orgData === void 0 ? void 0 : orgData.subscriptionId;
            const customerId = orgData === null || orgData === void 0 ? void 0 : orgData.asaasCustomerId;
            // 1. Cancelar a assinatura recorrente no Asaas (DELETE /subscriptions/{id})
            if (subId) {
                try {
                    logger.info(`[CancelAsaas] Cancelando assinatura Asaas ${subId} para org ${orgId}`);
                    await axios_1.default.delete(`${url}/subscriptions/${subId}`, {
                        headers: { access_token: key },
                    });
                }
                catch (e) {
                    logger.warn(`[CancelAsaas] Aviso ao deletar assinatura ${subId}:`, ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
                }
            }
            // 2. Cancelar faturas/boletos pendentes no Asaas para evitar novas cobranças ao cliente
            try {
                const queryParam = subId ? `subscription=${subId}` : (customerId ? `customer=${customerId}` : "");
                if (queryParam) {
                    const pendingRes = await axios_1.default.get(`${url}/payments?${queryParam}&status=PENDING`, {
                        headers: { access_token: key },
                    });
                    const pendingPayments = ((_b = pendingRes.data) === null || _b === void 0 ? void 0 : _b.data) || [];
                    for (const payment of pendingPayments) {
                        try {
                            logger.info(`[CancelAsaas] Cancelando cobrança pendente Asaas ${payment.id}`);
                            await axios_1.default.delete(`${url}/payments/${payment.id}`, {
                                headers: { access_token: key },
                            });
                        }
                        catch (pErr) {
                            logger.warn(`[CancelAsaas] Erro ao cancelar cobrança ${payment.id}:`, ((_c = pErr.response) === null || _c === void 0 ? void 0 : _c.data) || pErr.message);
                        }
                    }
                }
            }
            catch (pListErr) {
                logger.warn("[CancelAsaas] Erro ao listar cobranças pendentes no Asaas:", ((_d = pListErr.response) === null || _d === void 0 ? void 0 : _d.data) || pListErr.message);
            }
        }
        return { success: true };
    }
    catch (error) {
        logger.error("[CancelAsaas] Erro crítico ao cancelar no Asaas:", error);
        return { success: false, error: error.message };
    }
});
//# sourceMappingURL=index.js.map