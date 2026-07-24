const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `  const dentistFullAddress = dentist 
    ? \`\${dentist.address || ''}, \${dentist.number || ''} \${dentist.complement || ''} - \${dentist.neighborhood || ''} - \${dentist.city || ''}/\${dentist.state || ''} - CEP: \${dentist.cep || ''}\`
    : onlineDentist?.address || '';`;

const replacement = `  const formatAddress = (d: any) => {
    if (!d) return '';
    const parts = [];
    if (d.address) parts.push(d.address);
    if (d.number) parts.push(d.number);
    let str = parts.join(', ');
    if (d.complement) str += \` \${d.complement}\`;
    if (d.neighborhood) str += \` - \${d.neighborhood}\`;
    if (d.city || d.state) str += \` - \${d.city || ''}/\${d.state || ''}\`;
    if (d.cep) str += \` - CEP: \${d.cep}\`;
    return str;
  };
  
  const dentistFullAddress = dentist ? formatAddress(dentist) : onlineDentist ? formatAddress(onlineDentist) : '';`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched full address");
} else {
    console.log("Could not find target");
}
