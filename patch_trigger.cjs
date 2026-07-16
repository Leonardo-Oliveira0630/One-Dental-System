const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  'const orgId = event.params.orgId;',
  `const orgId = event.params.orgId;
     logger.info(\`[triggerDeliveryRouteUpdated] Rota \${event.params.routeId} iniciada. orgId: \${orgId}\`);`
);

code = code.replace(
  'if (itemsSnap.empty) return;',
  `if (itemsSnap.empty) {
       logger.info(\`[triggerDeliveryRouteUpdated] Rota vazia (sem itens).\`);
       return;
     }
     logger.info(\`[triggerDeliveryRouteUpdated] Encontrados \${itemsSnap.size} itens na rota.\`);`
);

code = code.replace(
  'if (!phone) continue;',
  `if (!phone) {
         logger.info(\`[triggerDeliveryRouteUpdated] Dentista \${info.dentistName} (ID: \${dId}) sem telefone, ignorando.\`);
         continue;
       }
       logger.info(\`[triggerDeliveryRouteUpdated] Preparando envio para \${info.dentistName} (telefone: \${phone}).\`);`
);

fs.writeFileSync('functions/src/index.ts', code);
