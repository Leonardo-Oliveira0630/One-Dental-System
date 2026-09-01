import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';
import { Job, DentistPayment, Organization, JobStatus } from '../types';

export interface BrevoSender {
  name: string;
  email: string;
}

export interface BrevoRecipient {
  name: string;
  email: string;
}

export interface BrevoAttachment {
  name: string;
  content: string; // Base64 string without data prefix
}

export interface SendBrevoEmailParams {
  apiKey?: string;
  sender: BrevoSender;
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  attachment?: BrevoAttachment[];
  orgId?: string;
}

export interface ClientDebtItem {
  id: string;
  name: string;
  clinicName?: string;
  phone?: string;
  email?: string;
  cpfCnpj?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  dentistObj?: any;
  totalDebitsUpTo: number;
  totalCreditsUpTo: number;
  balanceUpToEndDate: number;
  periodDebits: number;
  periodCredits: number;
  pendingJobs: Job[];
  allJobsCount: number;
  pendingJobsCount: number;
}

/**
 * Envia um e-mail transacional com anexo através do backend seguro no Google Cloud (Cloud Functions)
 * A chave de API do Brevo é protegida no servidor e nunca exposta ao frontend.
 */
export async function sendBrevoEmail(params: SendBrevoEmailParams): Promise<{ messageId?: string; success: boolean }> {
  const { sender, to, subject, htmlContent, attachment, orgId } = params;

  if (!to || to.length === 0 || !to[0].email) {
    throw new Error('Destinatário não possui e-mail válido.');
  }

  if (!functions) {
    throw new Error('Serviço de Cloud Functions não inicializado.');
  }

  const sendFn = httpsCallable(functions, 'sendBrevoEmail');
  const result = await sendFn({
    sender,
    to,
    subject,
    htmlContent,
    attachment,
    orgId
  });

  const data = result.data as any;
  return { success: true, messageId: data?.messageId };
}

/**
 * Valida a conexão com a API do Brevo através do backend no Google Cloud
 */
export async function testBrevoConnection(orgId?: string): Promise<{ valid: boolean; configured: boolean; message?: string; email?: string; companyName?: string }> {
  if (!functions) {
    return { valid: false, configured: false, message: 'Cloud Functions não inicializado.' };
  }

  try {
    const testFn = httpsCallable(functions, 'testBrevoConnection');
    const result = await testFn({ orgId });
    const data = result.data as any;
    return {
      valid: !!data?.valid,
      configured: !!data?.configured,
      message: data?.error || data?.message,
      email: data?.email,
      companyName: data?.companyName
    };
  } catch (error: any) {
    return {
      valid: false,
      configured: false,
      message: error.message || 'Erro ao conectar ao serviço do Brevo.'
    };
  }
}

/**
 * Calcula o histórico cronológico de débitos e créditos de um cliente específico no período
 */
export function calculateClientChronoHistory(params: {
  client: any;
  jobs: Job[];
  dentistPayments: DentistPayment[];
  startDateStr?: string;
  endDateStr?: string;
}) {
  const { client, jobs, dentistPayments, startDateStr, endDateStr } = params;
  if (!client) return { history: [], previousBalance: 0, totalServices: 0, totalPayments: 0, currentBalance: 0 };

  const clientId = client.id;
  const safeJobs = jobs || [];
  const safePayments = dentistPayments || [];
  const clientJobs = safeJobs.filter(j => j && j.dentistId === clientId && (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED));
  const clientPayments = safePayments.filter(p => p && p.dentistId === clientId);

  const translatePayment = (method?: string) => {
    switch (method) {
      case 'PIX': return 'PIX';
      case 'BOLETO': return 'Boleto';
      case 'CREDIT_CARD': return 'Cartão de Crédito';
      case 'DEBIT_CARD': return 'Cartão de Débito';
      case 'BANK_TRANSFER': return 'Transferência';
      case 'CASH': return 'Dinheiro';
      case 'CHECK': return 'Cheque';
      case 'CLIENT_CREDIT': return 'Saldo em Conta (Crédito)';
      default: return method || 'Outro';
    }
  };

  const history = [
    ...clientJobs.map(j => ({
      id: j.id,
      date: j.createdAt,
      type: 'DEBIT' as const,
      description: `OS #${j.osNumber || j.id.substring(0, 6)} - Paciente: ${j.patientName || '---'}`,
      amount: Number(j.totalValue || 0),
      job: j,
      payment: undefined
    })),
    ...clientPayments.map(p => ({
      id: p.id,
      date: p.paymentDate,
      type: (p.type === 'DISCOUNT' || p.type === 'MANUAL_CREDIT' ? 'CREDIT' : p.type === 'MANUAL_DEBIT' ? 'DEBIT' : 'PAYMENT') as 'CREDIT' | 'PAYMENT' | 'DEBIT',
      description: p.type === 'DISCOUNT' ? `Desconto: ${p.notes || ''}` : 
                   p.type === 'MANUAL_DEBIT' ? `Débito Manual${p.notes ? ': ' + p.notes : ''}` : 
                   p.type === 'MANUAL_CREDIT' ? `Crédito Manual${p.notes ? ': ' + p.notes : ''}` : 
                   `Pagamento: ${translatePayment(p.paymentMethod)} ${p.notes ? `- ${p.notes}` : ''}`,
      amount: p.type === 'DISCOUNT' ? Number(p.amount || 0) : 
              (p.type === 'MANUAL_DEBIT' || p.type === 'MANUAL_CREDIT') ? Number(p.amount || 0) : 
              (Number(p.amount || 0) + Number(p.discount || 0)),
      job: undefined,
      payment: p
    }))
  ];

  const sorted = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const sDate = startDateStr ? new Date(`${startDateStr}T00:00:00`) : new Date(0);
  const eDate = endDateStr ? new Date(`${endDateStr}T23:59:59`) : new Date(8640000000000000);

  let runningBalance = 0;
  let previousBalance = 0;

  const historyWithBalance = sorted.map(item => {
    if (item.type === 'DEBIT') {
      runningBalance -= item.amount;
    } else if (item.payment?.paymentMethod !== 'CLIENT_CREDIT') {
      runningBalance += item.amount;
    }

    const isBefore = new Date(item.date) < sDate;
    if (isBefore) {
      previousBalance = runningBalance;
    }

    return { ...item, balanceAfter: runningBalance };
  });

  const filteredHistory = historyWithBalance.filter(item => {
    const d = new Date(item.date);
    return d >= sDate && d <= eDate;
  });

  const totalServices = filteredHistory.filter(i => i.type === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPayments = filteredHistory.filter(i => i.type !== 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
  const currentBalance = filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1].balanceAfter : previousBalance;

  return {
    history: filteredHistory,
    previousBalance,
    totalServices,
    totalPayments,
    currentBalance
  };
}

/**
 * Gera o documento PDF do Extrato do Cliente e retorna a instância jsPDF e o Base64
 */
export async function generateClientStatementPDF(params: {
  client: any;
  currentOrg: Organization;
  jobs: Job[];
  dentistPayments: DentistPayment[];
  startDateStr?: string;
  endDateStr?: string;
}): Promise<{
  doc: jsPDF;
  base64: string;
  filename: string;
  totals: {
    previousBalance: number;
    totalServices: number;
    totalPayments: number;
    currentBalance: number;
  };
}> {
  const { client, currentOrg, jobs, dentistPayments, startDateStr, endDateStr } = params;
  const safeClient = client || {};
  const safeOrg = currentOrg || {};

  const doc = new jsPDF();
  const sDate = startDateStr ? new Date(`${startDateStr}T00:00:00`) : new Date();
  const eDate = endDateStr ? new Date(`${endDateStr}T23:59:59`) : new Date();

  const startFormatted = sDate.toLocaleDateString('pt-BR');
  const endFormatted = eDate.toLocaleDateString('pt-BR');

  // Header Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 35, 'F');

  // Logo da Organização / Laboratório
  if (safeOrg?.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = safeOrg.logoUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      if (img.width > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          const imgRatio = img.height / img.width;
          let finalWidth = 40;
          let finalHeight = 40 * imgRatio;
          if (finalHeight > 25) {
            finalHeight = 25;
            finalWidth = 25 / imgRatio;
          }
          doc.addImage(dataURL, 'PNG', 14, 5, finalWidth, finalHeight);
        }
      }
    } catch (e) {
      console.warn("Não foi possível renderizar a logo no PDF:", e);
    }
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(safeOrg.name || 'Labprox', 14, 18);
  }

  // Título Extrato à direita
  doc.setFontSize(22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Extrato", 195, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${startFormatted} - ${endFormatted}`, 195, 26, { align: 'right' });

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 35, 195, 35);

  // Informações do Cliente
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text((safeClient.name || 'CLIENTE').toUpperCase(), 30, 45);

  doc.setFont("helvetica", "bold");
  doc.text("Documento:", 14, 52);
  doc.setFont("helvetica", "normal");
  doc.text(safeClient.cpfCnpj || safeClient.cro || '-', 36, 52);

  doc.setFont("helvetica", "bold");
  doc.text("Período:", 14, 59);
  doc.setFont("helvetica", "normal");
  doc.text(`${startFormatted} - ${endFormatted}`, 30, 59);

  // Endereço / Clínica à Direita
  doc.setFont("helvetica", "bold");
  doc.text("Endereço:", 120, 45);
  doc.setFont("helvetica", "normal");

  let addressStr = '';
  if (safeClient.address) {
    addressStr = `${safeClient.address}${safeClient.number ? `, ${safeClient.number}` : ''}`;
    if (safeClient.neighborhood) addressStr += `, ${safeClient.neighborhood}`;
    const secondLine = [];
    if (safeClient.cep) secondLine.push(safeClient.cep);
    if (safeClient.city) secondLine.push(`${safeClient.city}${safeClient.state ? `, ${safeClient.state}` : ''}`);
    if (secondLine.length > 0) addressStr += `\n${secondLine.join(', ')}`;
  } else {
    addressStr = safeClient.clinicName || 'Não informado';
  }

  const splitAddr = doc.splitTextToSize(addressStr, 60);
  doc.text(splitAddr, 140, 45);

  doc.line(14, 65, 195, 65);

  // Calcular Histórico
  const chrono = calculateClientChronoHistory({
    client,
    jobs,
    dentistPayments,
    startDateStr,
    endDateStr
  });

  const tableBody: any[] = [];
  tableBody.push([
    { content: '', styles: { lineWidth: { bottom: 0.1 } as any, lineColor: [220, 220, 220] } },
    { content: 'Saldo anterior', styles: { fontStyle: 'normal', lineWidth: { bottom: 0.1 } as any, lineColor: [220, 220, 220] } },
    { content: '', styles: { lineWidth: { bottom: 0.1 } as any, lineColor: [220, 220, 220] } },
    { content: `R$ ${chrono.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { halign: 'left', fontStyle: 'normal', lineWidth: { bottom: 0.1 } as any, lineColor: [220, 220, 220] } }
  ]);

  chrono.history.forEach((item) => {
    const isDebit = item.type === 'DEBIT';
    const amountStr = isDebit ? `R$ -${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const textColor = isDebit ? [239, 68, 68] : [34, 197, 94];

    const hasItems = 'job' in item && item.job && item.job.items && item.job.items.length > 0;
    const hasProducts = 'job' in item && item.job && item.job.products && item.job.products.length > 0;
    const hasSubDetails = hasItems || hasProducts;

    let description = '';
    if ('job' in item && item.job) {
      const dentistFirst = (client.name && client.name.split(' ')[0]) || 'Dr.';
      description = `${item.job?.osNumber || '-'} - Dr(a): ${dentistFirst.toUpperCase()} - Paciente: ${(item.job?.patientName || '').toUpperCase()}`;
    } else {
      description = item.description;
    }

    tableBody.push([
      { content: new Date(item.date).toLocaleDateString('pt-BR'), styles: { lineWidth: { bottom: hasSubDetails ? 0 : 0.1 } as any, lineColor: [220, 220, 220] } },
      { content: description, styles: { lineWidth: { bottom: hasSubDetails ? 0 : 0.1 } as any, lineColor: [220, 220, 220] } },
      { content: amountStr, styles: { textColor: textColor, lineWidth: { bottom: hasSubDetails ? 0 : 0.1 } as any, lineColor: [220, 220, 220] } },
      { content: `R$ ${item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { halign: 'left', lineWidth: { bottom: hasSubDetails ? 0 : 0.1 } as any, lineColor: [220, 220, 220] } }
    ]);

    const totalSubCount = (hasItems && item.job?.items ? item.job.items.length : 0) + (hasProducts && item.job?.products ? item.job.products.length : 0);
    let currentIndex = 0;

    if (hasItems && item.job && item.job.items) {
      item.job.items.forEach((subItem: any) => {
        currentIndex++;
        const isLast = currentIndex === totalSubCount;
        tableBody.push([
          { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: `${subItem.quantity || 1}      ${(subItem.name || '').toUpperCase()}`, styles: { textColor: [100, 100, 100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: `R$ ${((subItem.price || 0) * (subItem.quantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { textColor: [100, 100, 100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } }
        ]);
      });
    }

    if (hasProducts && item.job && item.job.products) {
      item.job.products.forEach((prod: any) => {
        currentIndex++;
        const isLast = currentIndex === totalSubCount;
        tableBody.push([
          { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: `${prod.quantity || 1}      [IMPLANTE/PRODUTO] ${(prod.name || '').toUpperCase()}`, styles: { textColor: [180, 83, 9], fontSize: 8, fontStyle: 'bold', lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: `R$ ${((prod.unitPrice || 0) * (prod.quantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { textColor: [180, 83, 9], fontSize: 8, fontStyle: 'bold', lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } },
          { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220, 220, 220] } }
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: 70,
    head: [['Data', 'Descrição', 'Valor', 'Saldo']],
    body: tableBody,
    theme: 'plain',
    headStyles: { fontStyle: 'bold', fontSize: 9, fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { bottom: 0.1 } as any, lineColor: [220, 220, 220] },
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 } },
    columnStyles: { 0: { cellWidth: 25 }, 2: { halign: 'left', cellWidth: 35 }, 3: { halign: 'left', cellWidth: 35 } }
  });

  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : 180;
  const summaryX = 80;
  const valX = 195;
  let cY = finalY;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.text("Saldo anterior", summaryX, cY);
  doc.setTextColor(239, 68, 68);
  doc.text(`R$ ${chrono.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

  cY += 8;
  doc.setDrawColor(230, 230, 230);
  doc.line(summaryX, cY - 4, valX, cY - 4);

  doc.setTextColor(0, 0, 0);
  doc.text("Total de serviços", summaryX, cY);
  doc.setTextColor(239, 68, 68);
  doc.text(`R$ -${chrono.totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

  cY += 8;
  doc.line(summaryX, cY - 4, valX, cY - 4);

  doc.setTextColor(0, 0, 0);
  doc.text("Total de pagamentos", summaryX, cY);
  doc.setTextColor(34, 197, 94);
  doc.text(`R$ ${chrono.totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

  cY += 15;
  doc.line(summaryX, cY - 10, valX, cY - 10);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("Saldo atual no período", summaryX, cY);
  const balanceColor = chrono.currentBalance < 0 ? [239, 68, 68] : [34, 197, 94];
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2] as number);
  doc.text(`R$ ${chrono.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

  const clientCleanName = (client.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Extrato_${clientCleanName}_${startFormatted.replace(/\//g, '-')}_a_${endFormatted.replace(/\//g, '-')}.pdf`;

  // Converter para Base64
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';

  return {
    doc,
    base64,
    filename,
    totals: {
      previousBalance: chrono.previousBalance,
      totalServices: chrono.totalServices,
      totalPayments: chrono.totalPayments,
      currentBalance: chrono.currentBalance
    }
  };
}

/**
 * Cria o HTML elegante e profissional do e-mail com a identidade do laboratório
 */
export function buildStatementEmailHtml(params: {
  clientName: string;
  clinicName?: string;
  labName: string;
  labEmail?: string;
  labPhone?: string;
  pixKey?: string;
  startDateStr: string;
  endDateStr: string;
  previousBalance: number;
  totalServices: number;
  totalPayments: number;
  currentBalance: number;
  customMessage?: string;
}): string {
  const {
    clientName,
    clinicName,
    labName,
    labEmail,
    labPhone,
    pixKey,
    startDateStr,
    endDateStr,
    previousBalance,
    totalServices,
    totalPayments,
    currentBalance,
    customMessage
  } = params;

  const isOutstanding = currentBalance < 0;
  const absBalance = Math.abs(currentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const statusColor = isOutstanding ? '#e11d48' : '#16a34a';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extrato Financeiro - ${labName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .card-summary { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; }
    .card-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .row-label { color: #64748b; }
    .row-val { font-weight: 700; color: #0f172a; }
    .row-total { margin-top: 14px; padding-top: 12px; border-top: 2px dashed #cbd5e1; font-size: 15px; }
    .badge-debit { color: #e11d48; font-weight: 800; }
    .badge-credit { color: #16a34a; font-weight: 800; }
    .pix-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .pix-title { font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 4px; }
    .pix-key { font-family: monospace; font-size: 14px; font-weight: 700; color: #15803d; word-break: break-all; }
    .notice { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #1e40af; margin: 20px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${labName}</h1>
      <p>Extrato Financeiro do Período</p>
    </div>
    <div class="body">
      <div class="greeting">Olá, Dr(a). ${clientName}${clinicName ? ` (${clinicName})` : ''},</div>
      <p class="text">
        Esperamos que esteja bem! Encaminhamos em anexo o <strong>Extrato Financeiro</strong> consolidado das ordens de serviço e movimentações referentes ao período de <strong>${startDateStr}</strong> a <strong>${endDateStr}</strong>.
      </p>

      ${customMessage ? `<p class="text" style="background: #fffbeb; border: 1px solid #fef3c7; padding: 12px 16px; border-radius: 8px; color: #92400e; font-size: 13px;">${customMessage.replace(/\n/g, '<br>')}</p>` : ''}

      <div class="card-summary">
        <div class="card-title">Resumo Financeiro (${startDateStr} a ${endDateStr})</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Saldo Anterior:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;">R$ ${previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Total de Serviços (Débitos):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #e11d48;">R$ ${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Total de Pagamentos Realizados:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #16a34a;">R$ ${totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 10px 0 0 0; font-size: 14px; font-weight: 800; color: #0f172a;">Saldo Atual no Período:</td>
            <td style="padding: 10px 0 0 0; text-align: right; font-size: 15px; font-weight: 800; color: ${statusColor};">
              R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              ${isOutstanding ? '<span style="display:block; font-size: 10px; font-weight: 700; color: #e11d48;">(SALDO DEVEDOR)</span>' : ''}
            </td>
          </tr>
        </table>
      </div>

      ${pixKey && isOutstanding ? `
      <div class="pix-box">
        <div class="pix-title">🔑 Chave PIX para Pagamento:</div>
        <div class="pix-key">${pixKey}</div>
        <div style="font-size: 11px; color: #166534; margin-top: 4px;">Favor enviar o comprovante para confirmação da baixa.</div>
      </div>
      ` : ''}

      <div class="notice">
        📎 <strong>O arquivo PDF detalhado com o demonstrativo de cada OS executada está anexado a este e-mail.</strong>
      </div>

      <p class="text" style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Em caso de dúvidas ou necessidade de conciliação de faturas, fique à vontade para responder a este e-mail ou entrar em contato através dos nossos canais de atendimento.
      </p>
    </div>
    <div class="footer">
      <strong>${labName}</strong><br>
      ${labPhone ? `Telefone/WhatsApp: ${labPhone} | ` : ''} ${labEmail ? `E-mail: ${labEmail}` : ''}
      <p style="margin: 8px 0 0 0; font-size: 10px; color: #94a3b8;">
        Mensagem gerada automaticamente pelo sistema Labprox.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
