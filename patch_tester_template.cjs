const fs = require('fs');
let code = fs.readFileSync('components/YcloudTester.tsx', 'utf8');

const regex = /const res = await sendYcloudWhatsApp\(\{ to: phone, body: message \}\);/;
const replacement = `let payload: any = { to: phone, body: message };
      if (message.startsWith('{') && message.includes('"name"')) {
        try {
          const templateData = JSON.parse(message);
          payload.template = templateData;
        } catch (e) {
          console.warn('Mensagem parece JSON mas falhou no parse');
        }
      }
      const res = await sendYcloudWhatsApp(payload);`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/YcloudTester.tsx', code);
console.log('Patched YcloudTester to support raw template JSON');
