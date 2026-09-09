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
Object.defineProperty(exports, "__esModule", { value: true });
exports.communicationWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
exports.communicationWebhook = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b, _c;
    try {
        const providerName = req.query.provider || 'ycloud';
        const body = req.body || {};
        logger.info(`Received webhook from provider: ${providerName}`, { body });
        const db = admin.firestore();
        // 1. Process Message Status Updates (e.g. whatsapp.message.updated)
        if (body.type === 'whatsapp.message.updated' && body.whatsappMessage) {
            const msg = body.whatsappMessage;
            const ycloudId = msg.id;
            const wamid = msg.wamid;
            const status = (msg.status || '').toUpperCase(); // 'DELIVERED', 'READ', 'FAILED', 'SENT'
            const errorMsg = ((_a = msg.error) === null || _a === void 0 ? void 0 : _a.message) || null;
            logger.info(`Updating message status for ID ${ycloudId} (wamid: ${wamid}) -> ${status}`);
            // Update in message_logs
            if (ycloudId) {
                const logsSnap = await db.collection('message_logs').where('sid', '==', ycloudId).get();
                if (!logsSnap.empty) {
                    for (const doc of logsSnap.docs) {
                        await doc.ref.update({
                            status: status || 'DELIVERED',
                            error: errorMsg || null,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            deliverTime: msg.deliverTime || null
                        });
                    }
                }
                else if (wamid) {
                    const wamidSnap = await db.collection('message_logs').where('wamid', '==', wamid).get();
                    for (const doc of wamidSnap.docs) {
                        await doc.ref.update({
                            status: status || 'DELIVERED',
                            error: errorMsg || null,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            deliverTime: msg.deliverTime || null
                        });
                    }
                }
            }
        }
        // 2. Process Inbound Messages (e.g. whatsapp.inbound_message)
        if (body.type === 'whatsapp.inbound_message' || body.type === 'whatsappInboundMessage' || body.whatsappInboundMessage) {
            const inbound = body.whatsappInboundMessage || body.whatsappMessage || body;
            const from = inbound.from || body.from || '';
            const text = ((_b = inbound.text) === null || _b === void 0 ? void 0 : _b.body) || inbound.body || ((_c = body.text) === null || _c === void 0 ? void 0 : _c.body) || '';
            const cleanPhone = from.replace(/\D/g, '');
            if (cleanPhone) {
                logger.info(`Received inbound message from ${cleanPhone}: "${text}"`);
                // Check active confirmation sessions (appointments)
                const sessionSnap = await db.collection('ycloudSessions').doc(cleanPhone).get();
                if (sessionSnap.exists) {
                    const session = sessionSnap.data();
                    const orgId = session.orgId;
                    const appointmentId = session.appointmentId;
                    const normalizedText = (text || '').trim().toLowerCase();
                    let newStatus = '';
                    if (normalizedText === '1' || normalizedText === 'sim' || normalizedText === 'confirmar') {
                        newStatus = 'CONFIRMED';
                    }
                    else if (normalizedText === '2' || normalizedText === 'não' || normalizedText === 'nao' || normalizedText === 'cancelar') {
                        newStatus = 'CANCELED';
                    }
                    if (newStatus && orgId && appointmentId) {
                        await db.collection('organizations').doc(orgId).collection('appointments').doc(appointmentId).update({
                            status: newStatus
                        });
                        await db.collection('ycloudSessions').doc(cleanPhone).delete();
                    }
                }
            }
        }
        res.status(200).json({ success: true, received: true });
    }
    catch (error) {
        logger.error('Webhook error:', error);
        // Always return 200 to prevent provider retry floods
        res.status(200).json({ success: false, error: error.message });
    }
});
//# sourceMappingURL=webhook.js.map