const fs = require('fs');
let code = fs.readFileSync('pages/Reports.tsx', 'utf-8');

const newPdf = `  const generatePDF = () => {
    const isLandscape = reportType === 'DETAILED_ORDERS' || reportType === 'CLIENTS';
    const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    let title = \`Relatório de Produção - \${orgName}\`;
    if (reportType === 'DETAILED_ORDERS') title = \`Relatório Detalhado de Pedidos - \${orgName}\`;
    if (reportType === 'CLIENTS') title = \`Relatório de Clientes - \${orgName}\`;
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(\`Gerado em: \${new Date().toLocaleString('pt-BR')}\`, 14, 30);
    
    if (reportType === 'CLIENTS') {
        let clientsToReport = manualDentists;
        if (startDate) {
            const start = new Date(startDate);
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
            start.setHours(0, 0, 0, 0);
            clientsToReport = clientsToReport.filter(c => new Date(c.createdAt) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
            end.setHours(23, 59, 59, 999);
            clientsToReport = clientsToReport.filter(c => new Date(c.createdAt) <= end);
        }

        doc.text(\`Total de clientes: \${clientsToReport.length}\`, 14, 36);
        
        const tableData = clientsToReport.map(client => {
            const addressParts = [
                client.address,
                client.number || 'S/N',
                client.complement ? \` - \${client.complement}\` : '',
                client.neighborhood,
                client.city ? \`\${client.city} - \${client.state || ''}\` : '',
                client.cep,
                client.country
            ].filter(Boolean).join(', ').replace(/,  - /g, ' - ');
            
            return [
                client.name || '-',
                client.cpfCnpj || '-',
                client.email || '-',
                client.cro || '-',
                addressParts || '-'
            ];
        });

        autoTable(doc, {
          startY: 45,
          head: [['Nome', 'CPF/CNPJ', 'E-mail', 'CRO', 'Endereço Completo']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 35 },
            2: { cellWidth: 45 },
            3: { cellWidth: 25 },
            4: { cellWidth: 'auto' },
          },
        });
        
        doc.save(\`relatorio-clientes-\${new Date().getTime()}.pdf\`);
        return;
    }

    doc.text(\`Filtros: \${filteredJobs.length} trabalhos encontrados\`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      if (reportType === 'DETAILED_ORDERS') {
        const tableData = [];
        groupJobs.forEach(job => {
          let entryDate = new Date(job.createdAt).toLocaleDateString('pt-BR');
          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
          
          let itemsText = job.items.map(item => {
            const jt = jobTypes.find(t => t.id === item.jobTypeId);
            return \`\${item.quantity}x \${jt ? jt.name : item.name}\`;
          }).join('\\n');
          
          let pricesText = job.items.map(item => {
            return \`R$ \$(((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2))\`;
          }).join('\\n');

          tableData.push([
            job.osNumber || '-',
            job.boxNumber || '-',
            job.dentistName,
            job.patientName,
            itemsText,
            pricesText,
            \`R$ \${job.totalValue.toFixed(2)}\`,
            entryDate,
            finishDate
          ]);
        });

        autoTable(doc, {
          startY: yPos,
          head: [['OS', 'Caixa', 'Dentista', 'Paciente', 'Serviços', 'Valor Serviço', 'Valor Total', 'Entrada', 'Finalização']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // Amber 500
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            4: { cellWidth: 40 }, // Serviços
            5: { cellWidth: 20 }, // Valor Serviço
          },
          margin: { top: 10 },
        });
      } else {
        const tableData = groupJobs.map(job => [
          job.osNumber || '-',
          job.patientName,
          job.dentistName,
          new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR'),
          job.currentSector || 'Recepção',
          job.status
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['OS', 'Paciente', 'Dentista', dateType === 'CREATED' ? 'Entrada' : 'Entrega', 'Setor', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 },
          margin: { top: 10 },
        });
      }

      yPos = doc.lastAutoTable.finalY + 15;
      
      if (yPos > (reportType === 'DETAILED_ORDERS' ? 180 : 270)) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(reportType === 'DETAILED_ORDERS' ? \`relatorio-detalhado-\${new Date().getTime()}.pdf\` : \`relatorio-producao-\${new Date().getTime()}.pdf\`);
  };`;

const regex = /  const generatePDF = \(\) => \{[\s\S]*?doc\.save\(reportType === 'DETAILED_ORDERS' \? `relatorio-detalhado-\$\{new Date\(\)\.getTime\(\)\}\.pdf` : `relatorio-producao-\$\{new Date\(\)\.getTime\(\)\}\.pdf`\);\n  \};/;

if (regex.test(code)) {
    code = code.replace(regex, newPdf);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced generatePDF');
} else {
    console.log('Could not find generatePDF block');
}
