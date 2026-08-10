const fs = require('fs');
let content = fs.readFileSync('pages/lab/Finance.tsx', 'utf8');

content = content.replace(
`<option value="BOLETO">Boleto (Pago)</option>
                                          <option value="DISCOUNT">Desconto/Cortesia</option>`,
`<option value="BOLETO">Boleto (Pago)</option>
                                          <option value="DISCOUNT">Desconto/Cortesia</option>
                                          <option value="CLIENT_CREDIT">Saldo de Crédito</option>`
);

fs.writeFileSync('pages/lab/Finance.tsx', content);
