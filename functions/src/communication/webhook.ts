import { onRequest } from 'firebase-functions/v2/https';
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin';

export const communicationWebhook = onRequest(async (req, res) => {
    try {
        const providerName = (req.query.provider as string) || 'ycloud';
        const body = req.body || {};

        logger.info(`Received webhook from provider: ${providerName}`, { body });

        const db = admin.firestore();

        // 1. Process Message Status Updates (e.g. whatsapp.message.updated)
        if (body.type === 'whatsapp.message.updated' && body.whatsappMessage) {
            const msg = body.whatsappMessage;
            const ycloudId = msg.id;
            const wamid = msg.wamid;
            const status = (msg.status || '').toUpperCase(); // 'DELIVERED', 'READ', 'FAILED', 'SENT'
            const errorMsg = msg.error?.message || null;

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
                } else if (wamid) {
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
            const text = inbound.text?.body || inbound.body || body.text?.body || '';
            const cleanPhone = from.replace(/\D/g, '');

            if (cleanPhone) {
                logger.info(`Received inbound message from ${cleanPhone}: "${text}"`);
                
                // Check active confirmation sessions (appointments)
                const sessionSnap = await db.collection('ycloudSessions').doc(cleanPhone).get();
                if (sessionSnap.exists) {
                    const session = sessionSnap.data() as any;
                    const orgId = session.orgId;
                    const appointmentId = session.appointmentId;
                    const normalizedText = (text || '').trim().toLowerCase();

                    let newStatus = '';
                    if (normalizedText === '1' || normalizedText === 'sim' || normalizedText === 'confirmar') {
                        newStatus = 'CONFIRMED';
                    } else if (normalizedText === '2' || normalizedText === 'não' || normalizedText === 'nao' || normalizedText === 'cancelar') {
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
    } catch (error: any) {
        logger.error('Webhook error:', error);
        // Always return 200 to prevent provider retry floods
        res.status(200).json({ success: false, error: error.message });
    }
});
