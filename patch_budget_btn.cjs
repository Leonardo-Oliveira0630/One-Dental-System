const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const target = `              {canReopen && (
                  <>
                    <button onClick={() => setShowReturnModal(true)}`;

const repl = `              {job.isBudget && job.status === 'PENDING' && (
                  <button onClick={() => handleReturnAction('PROSSEGUIMENTO')} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-green-50 border border-green-100 text-green-600 rounded-lg hover:bg-green-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                      <CheckCircle2 size={12} /> APROVAR E GERAR OS
                  </button>
              )}
              {canReopen && !job.isBudget && (
                  <>
                    <button onClick={() => setShowReturnModal(true)}`;

content = content.replace(target, repl);
fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched budget button');
