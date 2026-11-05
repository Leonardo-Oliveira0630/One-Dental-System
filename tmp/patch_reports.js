const fs = require('fs');

const filePath = './pages/Reports.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update canExportCurrentReport
const canExportTarget = `  const canExportCurrentReport = useMemo(() => {
    switch (reportType) {
      case 'CLIENT_SUMMARY': return canExportClientSummary;
      case 'PRODUCTION': return canExportProduction;
      case 'DETAILED_ORDERS': return canExportDetailedOrders;
      case 'SERVICE_TYPES': return canExportServiceTypes;
      default: return false;
    }
  }, [reportType, canExportClientSummary, canExportProduction, canExportDetailedOrders, canExportServiceTypes]);`;

const canExportReplacement = `  const canExportCurrentReport = useMemo(() => {
    switch (reportType) {
      case 'CLIENT_SUMMARY': return canExportClientSummary;
      case 'PRODUCTION': return canExportProduction;
      case 'DETAILED_ORDERS': return canExportDetailedOrders;
      case 'SERVICE_TYPES': return canExportServiceTypes;
      case 'DEBTORS_CREDITORS': return canExportClientSummary;
      case 'RECEIPTS': return canExportClientSummary;
      default: return false;
    }
  }, [reportType, canExportClientSummary, canExportProduction, canExportDetailedOrders, canExportServiceTypes]);`;

if (content.includes(canExportTarget)) {
  content = content.replace(canExportTarget, canExportReplacement);
  console.log('1. Updated canExportCurrentReport');
} else {
  console.log('1. canExportCurrentReport target not found!');
}

// 2. Add receiptsData calculation after debtorsData
const debtorsDataEndTarget = `      debtorsCount: rowsWithIdx.filter(r => r.totalDebtorBalance > 0.001).length
    };
  }, [jobs, manualDentists, allUsers, dentistPayments, billingBatches, startDate, endDate, dateType, clientSearch, dentistId, selectedDentist]);`;

const receiptsDataCode = `      debtorsCount: rowsWithIdx.filter(r => r.totalDebtorBalance > 0.001).length
    };
  }, [jobs, manualDentists, allUsers, dentistPayments, billingBatches, startDate, endDate, dateType, clientSearch, dentistId, selectedDentist]);

  // Recebimentos (Receipts) Data
  const receiptsData = useMemo(() => {
    const rawPayments = (dentistPayments || []).filter(p => p.type !== 'MANUAL_DEBIT');

    const filtered = rawPayments.filter(p => {
      // Date filter based on paymentDate
      const payDateStr = p.paymentDate || (p as any).createdAt || (p as any).date;
      const payDate = new Date(payDateStr);
      payDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        if (payDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        if (payDate > end) return false;
      }

      // Dentist filter
      if (dentistId && p.dentistId !== dentistId && p.dentistName !== dentistId && (!selectedDentist || p.dentistName !== selectedDentist.name)) {
        return false;
      }

      // Client search text filter
      if (clientSearch.trim()) {
        const term = clientSearch.toLowerCase().trim();
        const matchName = (p.dentistName || '').toLowerCase().includes(term);
        const matchNotes = (p.notes || '').toLowerCase().includes(term);
        const matchMethod = translatePaymentMethod(p.paymentMethod).toLowerCase().includes(term);
        if (!matchName && !matchNotes && !matchMethod) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.paymentDate || (a as any).createdAt).getTime();
      const dateB = new Date(b.paymentDate || (b as any).createdAt).getTime();
      return dateB - dateA;
    });

    let totalAmountReceived = 0;
    let totalDiscountGiven = 0;
    const uniqueClientsSet = new Set<string>();
    const methodBreakdown: Record<string, { count: number; amount: number; discount: number }> = {};
    const clientGroupsMap = new Map<string, {
      clientId: string;
      clientName: string;
      totalAmount: number;
      totalDiscount: number;
      count: number;
      payments: typeof filtered;
    }>();

    filtered.forEach(p => {
      const amount = Number(p.amount || 0);
      const discount = Number(p.discount || 0);
      totalAmountReceived += amount;
      totalDiscountGiven += discount;

      const cName = p.dentistName || 'Cliente';
      const cId = p.dentistId || cName;
      uniqueClientsSet.add(cId);

      const methodKey = p.paymentMethod || 'OTHER';
      if (!methodBreakdown[methodKey]) {
        methodBreakdown[methodKey] = { count: 0, amount: 0, discount: 0 };
      }
      methodBreakdown[methodKey].count += 1;
      methodBreakdown[methodKey].amount += amount;
      methodBreakdown[methodKey].discount += discount;

      if (!clientGroupsMap.has(cId)) {
        clientGroupsMap.set(cId, {
          clientId: cId,
          clientName: cName,
          totalAmount: 0,
          totalDiscount: 0,
          count: 0,
          payments: []
        });
      }
      const grp = clientGroupsMap.get(cId)!;
      grp.totalAmount += amount;
      grp.totalDiscount += discount;
      grp.count += 1;
      grp.payments.push(p);
    });

    const clientGroups = Array.from(clientGroupsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const uniqueClientsCount = uniqueClientsSet.size;
    const transactionCount = filtered.length;
    const averagePerClient = uniqueClientsCount > 0 ? totalAmountReceived / uniqueClientsCount : 0;

    return {
      filteredPayments: filtered,
      totalAmountReceived,
      totalDiscountGiven,
      transactionCount,
      uniqueClientsCount,
      averagePerClient,
      methodBreakdown,
      clientGroups
    };
  }, [dentistPayments, startDate, endDate, dentistId, selectedDentist, clientSearch]);`;

if (content.includes(debtorsDataEndTarget)) {
  content = content.replace(debtorsDataEndTarget, receiptsDataCode);
  console.log('2. Added receiptsData calculation');
} else {
  console.log('2. debtorsDataEndTarget not found!');
}

// 3. Update generatePDF for RECEIPTS
const generatePdfTitleTarget = `    let title = t('reports.pdfReportTitleProduction', 'Relatório de Produção - {{org}}', { org: orgName });
    if (reportType === 'CLIENT_SUMMARY') title = t('reports.pdfReportTitleClientSummary', 'Relatório de Faturamento e Casos por Cliente - {{org}}', { org: orgName });
    if (reportType === 'DEBTORS_CREDITORS') title = \`Relatório de Devedores / Credores - \${orgName}\`;`;

const generatePdfTitleReplacement = `    let title = t('reports.pdfReportTitleProduction', 'Relatório de Produção - {{org}}', { org: orgName });
    if (reportType === 'CLIENT_SUMMARY') title = t('reports.pdfReportTitleClientSummary', 'Relatório de Faturamento e Casos por Cliente - {{org}}', { org: orgName });
    if (reportType === 'DEBTORS_CREDITORS') title = \`Relatório de Devedores / Credores - \${orgName}\`;
    if (reportType === 'RECEIPTS') title = \`Relatório de Recebimentos - \${orgName}\`;`;

if (content.includes(generatePdfTitleTarget)) {
  content = content.replace(generatePdfTitleTarget, generatePdfTitleReplacement);
  console.log('3a. Updated PDF title for RECEIPTS');
} else {
  console.log('3a. generatePdfTitleTarget not found!');
}

const generatePdfDebtorsTarget = `      doc.save(\`relatorio-devedores-credores-\${new Date().getTime()}.pdf\`);
      return;
    }`;

const generatePdfReceiptsCode = `      doc.save(\`relatorio-devedores-credores-\${new Date().getTime()}.pdf\`);
      return;
    }

    // --- PDF: RECEIPTS ---
    if (reportType === 'RECEIPTS') {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        \`Total Recebido: R$ \${receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Descontos: R$ \${receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Qtd Pagamentos: \${receiptsData.transactionCount}  |  Clientes: \${receiptsData.uniqueClientsCount}\`, 
        14, 34
      );

      const tableData = receiptsData.filteredPayments.map(p => [
        new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR'),
        p.dentistName || 'Cliente',
        translatePaymentMethod(p.paymentMethod),
        \`R$ \${Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`,
        \`R$ \${Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`,
        p.notes || '-'
      ]);

      tableData.push([
        'TOTAL GERAL',
        \`\${receiptsData.uniqueClientsCount} clientes\`,
        \`\${receiptsData.transactionCount} recebimentos\`,
        \`R$ \${receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`,
        \`R$ \${receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`,
        '-'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [[
          'Data',
          'Cliente / Dentista',
          'Forma de Pagamento',
          'Desconto (R$)',
          'Valor Recebido (R$)',
          'Observações'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // Emerald 600
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          1: { fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { fontStyle: 'bold', halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [4, 120, 87];
          }
        }
      });
      
      doc.save(\`relatorio-recebimentos-\${new Date().getTime()}.pdf\`);
      return;
    }`;

if (content.includes(generatePdfDebtorsTarget)) {
  content = content.replace(generatePdfDebtorsTarget, generatePdfReceiptsCode);
  console.log('3b. Added PDF export branch for RECEIPTS');
} else {
  console.log('3b. generatePdfDebtorsTarget not found!');
}

// 4. Update exportToExcel for RECEIPTS
const excelDebtorsTarget = `      XLSX.writeFile(wb, \`devedores_credores_\${currentOrg?.name || 'labprox'}_\${new Date().toISOString().split('T')[0]}.xlsx\`);
      return;
    }`;

const excelReceiptsCode = `      XLSX.writeFile(wb, \`devedores_credores_\${currentOrg?.name || 'labprox'}_\${new Date().toISOString().split('T')[0]}.xlsx\`);
      return;
    }
    if (reportType === 'RECEIPTS') {
      const rows = receiptsData.filteredPayments.map((p) => ({
        'Data Recebimento': new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR'),
        'Cliente / Dentista': p.dentistName || 'Cliente',
        'Forma de Pagamento': translatePaymentMethod(p.paymentMethod),
        'Valor Recebido (R$)': Number(Number(p.amount || 0).toFixed(2)),
        'Desconto Concedido (R$)': Number(Number(p.discount || 0).toFixed(2)),
        'Observações / Notas': p.notes || '-'
      }));

      rows.push({
        'Data Recebimento': 'TOTAL GERAL',
        'Cliente / Dentista': \`\${receiptsData.uniqueClientsCount} clientes com pagamentos\`,
        'Forma de Pagamento': \`\${receiptsData.transactionCount} transações\`,
        'Valor Recebido (R$)': Number(receiptsData.totalAmountReceived.toFixed(2)),
        'Desconto Concedido (R$)': Number(receiptsData.totalDiscountGiven.toFixed(2)),
        'Observações / Notas': '-'
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recebimentos');
      XLSX.writeFile(wb, \`relatorio_recebimentos_\${currentOrg?.name || 'labprox'}_\${new Date().toISOString().split('T')[0]}.xlsx\`);
      return;
    }`;

if (content.includes(excelDebtorsTarget)) {
  content = content.replace(excelDebtorsTarget, excelReceiptsCode);
  console.log('4. Added Excel export branch for RECEIPTS');
} else {
  console.log('4. excelDebtorsTarget not found!');
}

// 5. Add KPI cards for RECEIPTS
const kpiDebtorsStart = `      {/* KPI Cards when in DEBTORS_CREDITORS mode */}`;
const receiptsKpiCode = `      {/* KPI Cards when in RECEIPTS mode */}
      {reportType === 'RECEIPTS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Recebido</span>
              <p className="text-xl font-black text-emerald-700 truncate">
                R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Entradas no período</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Total Descontos</span>
              <p className="text-xl font-black text-amber-700 truncate">
                R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Descontos concedidos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Qtd Recebimentos</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {receiptsData.transactionCount} <span className="text-sm font-bold text-slate-400">pagamentos</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Transações efetuadas</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Clientes Atendidos</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {receiptsData.uniqueClientsCount} <span className="text-sm font-bold text-slate-400">clientes</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Com recebimento no período</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">Média por Cliente</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {receiptsData.averagePerClient.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Valor médio pago</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards when in DEBTORS_CREDITORS mode */}`;

if (content.includes(kpiDebtorsStart)) {
  content = content.replace(kpiDebtorsStart, receiptsKpiCode);
  console.log('5. Added KPI cards for RECEIPTS');
} else {
  console.log('5. kpiDebtorsStart not found!');
}

// 6. Add view block for RECEIPTS in main results container
const debtorsViewStart = `        {/* --- VIEW: DEBTORS_CREDITORS (Devedores / Credores) --- */}
        {reportType === 'DEBTORS_CREDITORS' ? (`;

const receiptsViewCode = `        {/* --- VIEW: RECEIPTS (Recebimentos) --- */}
        {reportType === 'RECEIPTS' ? (
          <div>
            {/* Header & Sub-view Switcher */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="text-emerald-600" size={20} />
                  Relatório de Recebimentos
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Extrato detalhado de todos os valores recebidos no período filtrado
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex bg-slate-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setReceiptsSubView('CLIENTS')}
                    className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                      receiptsSubView === 'CLIENTS' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }\`}
                  >
                    Por Cliente
                  </button>
                  <button
                    onClick={() => setReceiptsSubView('TRANSACTIONS')}
                    className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                      receiptsSubView === 'TRANSACTIONS' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }\`}
                  >
                    Lista de Recebimentos
                  </button>
                </div>

                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente, método ou nota..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Summary Chips */}
            {Object.keys(receiptsData.methodBreakdown).length > 0 && (
              <div className="p-4 sm:p-5 bg-emerald-50/30 border-b border-emerald-100/50 flex flex-wrap gap-2.5 items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mr-1 flex items-center gap-1">
                  <BarChart3 size={13} /> Por Forma de Pagamento:
                </span>
                {Object.entries(receiptsData.methodBreakdown).map(([method, stats]) => (
                  <div key={method} className="bg-white border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{translatePaymentMethod(method)}:</span>
                    <span className="text-xs font-black text-emerald-700">R$ {stats.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">({stats.count})</span>
                  </div>
                ))}
              </div>
            )}

            {receiptsData.filteredPayments.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-base text-slate-600">Nenhum recebimento encontrado no período selecionado.</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de data ou selecione outro cliente.</p>
              </div>
            ) : receiptsSubView === 'CLIENTS' ? (
              /* Grouped by Client View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6">Cliente / Dentista</th>
                      <th className="p-4 text-center">Qtd Recebimentos</th>
                      <th className="p-4 text-right">Desconto Total (R$)</th>
                      <th className="p-4 text-right">Total Recebido (R$)</th>
                      <th className="p-4 pr-6 text-center">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptsData.clientGroups.map((grp) => {
                      const isExpanded = expandedClientId === grp.clientId;
                      return (
                        <React.Fragment key={grp.clientId}>
                          <tr className={\`hover:bg-emerald-50/20 transition-colors \${isExpanded ? 'bg-emerald-50/30' : ''}\`}>
                            <td className="p-4 pl-6 font-bold text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0">
                                  {grp.clientName.charAt(0).toUpperCase()}
                                </div>
                                <span>{grp.clientName}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-600">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                {grp.count} {grp.count === 1 ? 'pagamento' : 'pagamentos'}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-amber-600">
                              R$ {grp.totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right font-black text-sm text-emerald-700">
                              R$ {grp.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 pr-6 text-center">
                              <button
                                onClick={() => setExpandedClientId(isExpanded ? null : grp.clientId)}
                                className="p-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span>{isExpanded ? 'Ocultar' : 'Ver Extrato'}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded payments for this client */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={5} className="p-4 sm:p-6 border-y border-emerald-100">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Wallet size={15} className="text-emerald-600" />
                                    Histórico de Recebimentos de {grp.clientName}
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                          <th className="py-2 px-3">Data</th>
                                          <th className="py-2 px-3">Forma de Pagamento</th>
                                          <th className="py-2 px-3 text-right">Desconto (R$)</th>
                                          <th className="py-2 px-3 text-right">Valor Recebido (R$)</th>
                                          <th className="py-2 px-3">Observações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {grp.payments.map((p, pIdx) => (
                                          <tr key={p.id || pIdx} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                              {new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">
                                              {translatePaymentMethod(p.paymentMethod)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                              R$ {Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                              R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 text-xs italic">
                                              {p.notes || '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-xs text-slate-900">
                      <td className="p-4 pl-6 font-bold text-emerald-900">TOTAL GERAL</td>
                      <td className="p-4 text-center text-emerald-900">{receiptsData.transactionCount} recebimentos</td>
                      <td className="p-4 text-right text-emerald-900">
                        R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm text-emerald-900 font-black">
                        R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 pr-6"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Flat Transactions List View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6 text-center">Data</th>
                      <th className="p-4">Cliente / Dentista</th>
                      <th className="p-4">Forma de Pagamento</th>
                      <th className="p-4 text-right">Desconto (R$)</th>
                      <th className="p-4 text-right">Valor Recebido (R$)</th>
                      <th className="p-4 pr-6">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptsData.filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-4 pl-6 text-center font-mono font-bold text-slate-600">
                          {new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {p.dentistName || 'Cliente'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-lg text-xs font-bold">
                            {translatePaymentMethod(p.paymentMethod)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-amber-600">
                          R$ {Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-black text-sm text-emerald-700">
                          R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 pr-6 text-slate-500 text-xs italic">
                          {p.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-xs text-slate-900">
                      <td className="p-4 pl-6 text-center font-bold text-emerald-900">TOTAL</td>
                      <td className="p-4 font-bold text-emerald-900">{receiptsData.uniqueClientsCount} clientes</td>
                      <td className="p-4 font-bold text-emerald-900">{receiptsData.transactionCount} recebimentos</td>
                      <td className="p-4 text-right text-emerald-900">
                        R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm text-emerald-900 font-black">
                        R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 pr-6"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : reportType === 'DEBTORS_CREDITORS' ? (`;

if (content.includes(debtorsViewStart)) {
  content = content.replace(debtorsViewStart, receiptsViewCode);
  console.log('6. Added receipts view in main results container');
} else {
  console.log('6. debtorsViewStart not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully written updated Reports.tsx');
