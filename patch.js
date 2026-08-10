const fs = require('fs');
let code = fs.readFileSync('pages/Reports.tsx', 'utf-8');

code = code.replace(
  "const [reportType, setReportType] = useState<'PRODUCTION' | 'DETAILED_ORDERS'>('PRODUCTION');",
  "const [reportType, setReportType] = useState<'PRODUCTION' | 'DETAILED_ORDERS' | 'CLIENTS'>('PRODUCTION');"
);

code = code.replace(
  '<option value="PRODUCTION">Produção Básica</option>\n              <option value="DETAILED_ORDERS">Pedidos Detalhado</option>',
  '<option value="PRODUCTION">Produção Básica</option>\n              <option value="DETAILED_ORDERS">Pedidos Detalhado</option>\n              <option value="CLIENTS">Clientes (Detalhado)</option>'
);

fs.writeFileSync('pages/Reports.tsx', code);
