const fs = require('fs');

let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

const regex = /<option value="CLINIC_APPOINTMENT">Automático: Consulta Agendada \/ Confirmação<\/option>/;
const replacement = `<option value="CLINIC_APPOINTMENT">Automático: Consulta Agendada (Convite)</option>
                      <option value="CLINIC_APPOINTMENT_CONFIRMED">Automático: Consulta Confirmada (Resposta)</option>`;

content = content.replace(regex, replacement);
fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
console.log('Fixed WhatsAppTemplatesEditor again');
