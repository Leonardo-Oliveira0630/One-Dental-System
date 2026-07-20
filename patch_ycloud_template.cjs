const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /const response = await axios\.post\(ycloudUrl, \{\n\s*to: \`\+\$\{cleanTo\}\`,\n\s*from: \`\+\$\{cleanFrom\}\`,\n\s*type: "text",\n\s*text: \{\n\s*body: body\n\s*\}\n\s*\},/m;

const replacement = `
    const payload: any = {
      to: \`+\${cleanTo}\`,
      from: \`+\${cleanFrom}\`
    };

    if (request.data.template) {
      payload.type = "template";
      payload.template = request.data.template;
    } else {
      payload.type = "text";
      payload.text = { body: body };
    }

    const response = await axios.post(ycloudUrl, payload,`;

code = code.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', code);
console.log('Patched sendYcloudWhatsApp with template support');
