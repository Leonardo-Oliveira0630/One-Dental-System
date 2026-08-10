const fs = require('fs');
let code = fs.readFileSync('pages/admin/FinancialTab.tsx', 'utf-8');

// First replacement
code = code.replace(
  'Acesse seu painel Asaas, vá em <strong>Configurações da Conta &gt; Integrações</strong> e gere uma nova Chave de API.',
  'Acesse seu painel Asaas, vá em <strong>Minha Conta</strong> ou <strong>Integrações</strong> e copie o seu <strong>Wallet ID (ID da Carteira)</strong>.'
);

// Second replacement
code = code.replace(
  '<label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sua API Key do Asaas (Wallet ID)</label>',
  '<label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Seu ID da Carteira Asaas (Wallet ID)</label>'
);

// Third replacement
code = code.replace(
  'placeholder="Ex: $a.as.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"',
  'placeholder="Ex: 5f83... (ID da Carteira)"'
);

// Fourth replacement
code = code.replace(
  '<p className="text-[10px] font-black text-slate-400 uppercase mb-1">API Key / ID da Carteira (Confidencial):</p>',
  '<p className="text-[10px] font-black text-slate-400 uppercase mb-1">ID da Carteira (Wallet ID):</p>'
);

fs.writeFileSync('pages/admin/FinancialTab.tsx', code);
console.log('Fixed FinancialTab.tsx');
