const fs = require('fs');

const path = 'src/i18n/locales/pt-BR/translation.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Inject missing requisitions keys
if (!data.requisitions) data.requisitions = {};
data.requisitions.fillRejectionReasonAlert = "Por favor, preencha o motivo da recusa.";
data.requisitions.requisitionRejectedSuccess = "Requisição recusada com sucesso.";
data.requisitions.updateError = "Erro ao atualizar requisição.";

// Inject missing orders.incoming keys
if (!data.orders) data.orders = {};
if (!data.orders.incoming) data.orders.incoming = {};
data.orders.incoming.syncSuccess = "Pedido sincronizado! Produção iniciada e recebimento registrado.";
data.orders.incoming.syncError = "Erro ao sincronizar pedido: {{error}}";
data.orders.incoming.fillRejectionReasonAlert = "Por favor, preencha o motivo da recusa.";
data.orders.incoming.orderRejectedSuccess = "Pedido rejeitado e estorno realizado.";
data.orders.incoming.refundError = "Erro ao realizar estorno: {{error}}";
data.orders.incoming.zipError = "Erro ao criar arquivo ZIP. Tente baixar os arquivos individualmente.";

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Updated translation.json");
