import * as firestorePkg from 'firebase/firestore';
import * as functionsPkg from 'firebase/functions';
import { db, functions } from './firebaseConfig';
import { Appointment, ClinicPatient, Job, SupplierOrder } from '../types';

const { doc, setDoc, updateDoc, getDoc } = firestorePkg as any;
const { httpsCallable } = functionsPkg as any;

export interface WhatsappMessage {
  id: string;
  organizationId: string;
  to: string;
  recipientName: string;
  body: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'REPLIED';
  type: 'APPOINTMENT' | 'LOGISTICS' | 'SUPPLIER';
  relatedId: string;
  createdAt: any;
  updatedAt?: any;
  ycloudSid?: string | null;
  error?: string;
  replyText?: string;
  repliedAt?: any;
}

/**
 * Busca a configuração de modelo (Meta Template) no Firestore (settings/global)
 */
async function getMetaTemplateConfig(action: string) {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      const globalData = snap.data() as any;
      const tpl = globalData?.globalWhatsappTemplates?.find((t: any) => t.action === action && t.active);
      if (tpl && tpl.metaTemplateName) {
        return {
          name: tpl.metaTemplateName.trim(),
          language: tpl.language || 'pt_BR'
        };
      }
    }
  } catch (err) {
    console.warn("[YcloudService] Could not fetch global template config:", err);
  }
  return null;
}

/**
 * Envia uma notificação de WhatsApp via API do Ycloud (usando Cloud Function)
 * e registra o log no Firestore.
 */
export async function sendWhatsappNotification(params: {
  orgId: string;
  to: string;
  recipientName: string;
  body: string;
  template?: any;
  type: 'APPOINTMENT' | 'LOGISTICS' | 'SUPPLIER';
  relatedId: string;
}) {
  const { orgId, to, recipientName, body, template, type, relatedId } = params;
  if (!orgId || !to) {
    console.warn("[YcloudService] orgId ou telefone de destino inválido:", { orgId, to });
    return;
  }

  const msgId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
  }
  const formattedTo = `+${cleanPhone}`;

  // 1. Registrar no Firestore
  const msgDoc: WhatsappMessage = {
    id: msgId,
    organizationId: orgId,
    to: formattedTo,
    recipientName,
    body,
    status: 'SENT',
    type,
    relatedId,
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, `organizations/${orgId}/whatsapp_messages`, msgId), msgDoc);
  } catch (err) {
    console.warn("[YcloudService] Erro ao salvar mensagem no Firestore:", err);
  }

  // 2. Chamar Cloud Function real para envio via Ycloud
  try {
    const sendYcloudFn = httpsCallable(functions, 'sendYcloudWhatsApp');
    const result: any = await sendYcloudFn({
      to: formattedTo,
      body: msgDoc.body,
      template: template || undefined,
      orgId
    });

    console.log("[YcloudService] WhatsApp enviado com sucesso:", result?.data);

    // Atualiza status do log para entregue
    try {
      await updateDoc(doc(db, `organizations/${orgId}/whatsapp_messages`, msgId), {
        status: 'DELIVERED',
        ycloudSid: result?.data?.sid || null,
        updatedAt: new Date()
      });
    } catch (updateErr) {
      console.warn(updateErr);
    }

    return result?.data;
  } catch (error: any) {
    console.error("[YcloudService] Erro no envio via Ycloud:", error);

    // Atualiza status do log com o erro ocorrido
    try {
      await updateDoc(doc(db, `organizations/${orgId}/whatsapp_messages`, msgId), {
        status: 'FAILED',
        error: error.message || 'Erro ao enviar WhatsApp',
        updatedAt: new Date()
      });
    } catch (e) {
      console.warn(e);
    }

    throw error;
  }
}

/**
 * Envia notificação de Confirmação de Consulta para o Paciente (Dentista/Clínica)
 */
export async function notifyAppointmentCreated(appointment: Appointment, patient: ClinicPatient, dentistName: string) {
  const dateStr = new Date(appointment.date).toLocaleDateString('pt-BR');
  const timeStr = new Date(appointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const cleanPatientName = patient.name || 'Paciente';

  const customConfig = await getMetaTemplateConfig('CLINIC_APPOINTMENT');
  const templateName = customConfig?.name || 'clinica_lembrete_consulta';
  const languageCode = customConfig?.language || 'pt_BR';

  const templatePayload = {
    name: templateName,
    language: { code: languageCode },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: cleanPatientName },
          { type: 'text', text: dateStr },
          { type: 'text', text: timeStr }
        ]
      }
    ]
  };

  const body = `Olá, *${cleanPatientName}*! Confirmamos sua consulta na clínica com o(a) Dr(a). *${dentistName}* para o dia *${dateStr}* às *${timeStr}*.

Por favor, responda a esta mensagem com a opção correspondente:
👉 Digite *CONFIRMAR* para confirmar sua presença.
👉 Digite *REAGENDAR* se precisar alterar a data.`;

  return sendWhatsappNotification({
    orgId: appointment.organizationId,
    to: patient.phone || (patient as any).whatsapp || '',
    recipientName: cleanPatientName,
    body,
    template: templatePayload,
    type: 'APPOINTMENT',
    relatedId: appointment.id
  });
}

/**
 * Envia notificação de Logística de Casos para o Dentista (Laboratório)
 */
export async function notifyJobLogistics(job: Job, action: 'SHIPPED' | 'DELIVERED', phone: string, dentistName: string) {
  const osNumber = job.osNumber || job.id.substring(job.id.length - 6).toUpperCase();
  const actionType = action === 'SHIPPED' ? 'LAB_DISPATCH' : 'LAB_DELIVERED';
  const customConfig = await getMetaTemplateConfig(actionType);

  const templateName = customConfig?.name || (action === 'SHIPPED' ? 'lab_trabalho_em_rota' : 'lab_trabalho_entregue');
  const languageCode = customConfig?.language || 'pt_BR';
  const cleanDentistName = dentistName?.trim() || 'Doutor(a)';
  const jobSummary = `- ${job.patientName || 'Paciente'} (OS #${osNumber})`;

  const templatePayload = {
    name: templateName,
    language: { code: languageCode },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: cleanDentistName },
          { type: 'text', text: jobSummary }
        ]
      }
    ]
  };

  let body = '';
  if (action === 'SHIPPED') {
    body = `Olá Dr(a) ${cleanDentistName}, os seguintes trabalhos acabaram de sair para entrega com o entregador:\n\n${jobSummary}`;
  } else {
    body = `Olá Dr(a) ${cleanDentistName}, confirmamos que os seguintes trabalhos foram entregues com sucesso:\n\n${jobSummary}\n\nQualquer dúvida estamos à disposição!`;
  }

  return sendWhatsappNotification({
    orgId: job.organizationId,
    to: phone,
    recipientName: cleanDentistName,
    body,
    template: templatePayload,
    type: 'LOGISTICS',
    relatedId: job.id
  });
}

/**
 * Envia notificação de Etapas de Entrega para o Comprador (Fornecedores)
 */
export async function notifySupplierOrder(order: SupplierOrder, action: 'CONFIRMED' | 'SHIPPED' | 'DELIVERED', phone: string) {
  const orderIdShort = order.id.substring(order.id.length - 6).toUpperCase();
  const statusLabel = action === 'CONFIRMED' ? 'Confirmado' : action === 'SHIPPED' ? 'Enviado' : 'Entregue';

  const customConfig = await getMetaTemplateConfig('SUPPLIER_UPDATE');
  const templateName = customConfig?.name || 'fornecedor_status_pedido';
  const languageCode = customConfig?.language || 'pt_PT';

  const templatePayload = {
    name: templateName,
    language: { code: languageCode },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderIdShort },
          { type: 'text', text: statusLabel }
        ]
      }
    ]
  };

  let body = '';
  if (action === 'CONFIRMED') {
    body = `Olá, *${order.buyerName}*!\n\nSeu pedido *#${orderIdShort}* na loja *${order.supplierName}* foi confirmado e já está sendo preparado para envio!`;
  } else if (action === 'SHIPPED') {
    const tracking = order.trackingCode ? `\n📦 Código de rastreio: *${order.trackingCode}*` : '';
    body = `Olá, *${order.buyerName}*! 🚀\n\nBoas notícias! Seu pedido *#${orderIdShort}* na loja *${order.supplierName}* foi despachado e está em trânsito.${tracking}`;
  } else {
    body = `Olá, *${order.buyerName}*! ✅\n\nSeu pedido *#${orderIdShort}* na loja *${order.supplierName}* foi *entregue com sucesso*! Agradecemos a preferência.`;
  }

  return sendWhatsappNotification({
    orgId: order.supplierId,
    to: phone,
    recipientName: order.buyerName,
    body,
    template: templatePayload,
    type: 'SUPPLIER',
    relatedId: order.id
  });
}
