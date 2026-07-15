const fs = require('fs');

let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

// Replace the editForm structure to include the type select field
const typeSelectReplacement = `
                <select
                  value={editForm.type}
                  onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                >
                  <option value="CUSTOM">Personalizado (Envio Manual)</option>
                  {currentOrg.targetAudience === 'CLINIC' && (
                    <>
                      <option value="CLINIC_APPOINTMENT">Automático: Consulta Agendada / Confirmação</option>
                      <option value="CLINIC_APPOINTMENT_CANCELED">Automático: Consulta Cancelada</option>
                    </>
                  )}
                  {currentOrg.targetAudience === 'LAB' && (
                    <>
                      <option value="LAB_DISPATCH">Automático: Motoboy em Rota</option>
                      <option value="LAB_DELIVERED">Automático: Trabalho Entregue</option>
                    </>
                  )}
                  {currentOrg.targetAudience === 'SUPPLIER' && (
                    <option value="SUPPLIER_UPDATE">Automático: Atualização de Pedido</option>
                  )}
                </select>
`;

content = content.replace(
  /<input\s+type="text"\s+value=\{editForm\.name\}/g,
  typeSelectReplacement + '\n                <input\n                  type="text"\n                  value={editForm.name}'
);

fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
console.log('Fixed WhatsAppTemplatesEditor');
