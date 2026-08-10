const fs = require('fs');
let content = fs.readFileSync('pages/Reports.tsx', 'utf8');

content = content.replace(
`  const generatePDF = () => {
    const doc = new jsPDF();
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    doc.text(\`Relatório de Produção - \${orgName}\`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(\`Gerado em: \${new Date().toLocaleString('pt-BR')}\`, 14, 30);
    doc.text(\`Filtros: \${filteredJobs.length} trabalhos encontrados\`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

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

      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(\`relatorio-producao-\${new Date().getTime()}.pdf\`);
  };`,
`  const generatePDF = () => {
    const doc = new jsPDF(reportType === 'DETAILED_ORDERS' ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    doc.text(reportType === 'DETAILED_ORDERS' ? \`Relatório Detalhado de Pedidos - \${orgName}\` : \`Relatório de Produção - \${orgName}\`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(\`Gerado em: \${new Date().toLocaleString('pt-BR')}\`, 14, 30);
    doc.text(\`Filtros: \${filteredJobs.length} trabalhos encontrados\`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      if (reportType === 'DETAILED_ORDERS') {
        const tableData: any[] = [];
        groupJobs.forEach(job => {
          let entryDate = new Date(job.createdAt).toLocaleDateString('pt-BR');
          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find(h => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
          
          let itemsText = job.items.map(item => {
            const jt = jobTypes.find(t => t.id === item.jobTypeId);
            return \`\${item.quantity}x \${jt ? jt.name : item.name}\`;
          }).join('\\n');
          
          let pricesText = job.items.map(item => {
            return \`R$ \${((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2)}\`;
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

      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > (reportType === 'DETAILED_ORDERS' ? 180 : 270)) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(reportType === 'DETAILED_ORDERS' ? \`relatorio-detalhado-\${new Date().getTime()}.pdf\` : \`relatorio-producao-\${new Date().getTime()}.pdf\`);
  };`
);

fs.writeFileSync('pages/Reports.tsx', content);
