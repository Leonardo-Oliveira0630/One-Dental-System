const fs = require('fs');
let content = fs.readFileSync('pages/Reports.tsx', 'utf8');

content = content.replace(
`  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE'>('DATE');`,
`  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE'>('DATE');
  const [reportType, setReportType] = useState<'PRODUCTION' | 'DETAILED_ORDERS'>('PRODUCTION');`
);

content = content.replace(
`          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por</label>`,
`          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Relatório</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as any)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="PRODUCTION">Produção Básica</option>
              <option value="DETAILED_ORDERS">Pedidos Detalhado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por (Prod. Básica)</label>`
);

fs.writeFileSync('pages/Reports.tsx', content);
