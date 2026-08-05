const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `            const it = item as any;
            const jobItem = it.job;
            const hasSubItems = isDebit && jobItem && jobItem.items && jobItem.items.length > 0;
            
            let description = '';
            if (isDebit) {
                const dentistName = (statementClient.name && statementClient.name.split(' ')[0]) || 'Dr.';
                description = \`\${jobItem?.osNumber || '-'} - Dr(a): \${dentistName.toUpperCase()} - Paciente: \${(jobItem?.patientName || '').toUpperCase()}\`;
            } else {
                description = item.description;
            }
            
            tableBody.push([
                { content: new Date(item.date).toLocaleDateString('pt-BR'), styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: description, styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: amountStr, styles: { textColor: textColor, lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: \`R$ \${item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`, styles: { halign: 'left', lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } }
            ]);
            
            if (hasSubItems && jobItem) {
                jobItem.items.forEach((subItem: any, subIndex: number) => {
                    const isLast = subIndex === jobItem.items.length - 1;
                    tableBody.push([
                        { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: \`\${subItem.quantity}      \${subItem.name.toUpperCase()}\`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: \`R$ \${(subItem.price * subItem.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } }
                    ]);
                });
            }`;

const replaceStr = `            const it = item as any;
            const jobItem = it.job;
            const hasSubItems = isDebit && jobItem && jobItem.items && jobItem.items.length > 0;
            
            let description = '';
            if (isDebit) {
                const dentistName = (statementClient.name && statementClient.name.split(' ')[0]) || 'Dr.';
                description = \`\${jobItem?.osNumber || '-'} - Dr(a): \${dentistName.toUpperCase()} - Paciente: \${(jobItem?.patientName || '').toUpperCase()}\`;
            } else {
                description = item.description;
            }
            
            tableBody.push([
                { content: new Date(item.date).toLocaleDateString('pt-BR'), styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: description, styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: amountStr, styles: { textColor: textColor, lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
                { content: \`R$ \${item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`, styles: { halign: 'left', lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } }
            ]);
            
            if (hasSubItems && jobItem) {
                jobItem.items.forEach((subItem: any, subIndex: number) => {
                    const isLast = subIndex === jobItem.items.length - 1;
                    tableBody.push([
                        { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: \`\${subItem.quantity}      \${subItem.name.toUpperCase()}\`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: \`R$ \${(subItem.price * subItem.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                        { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } }
                    ]);
                });
            }`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx type error job pdf7');
