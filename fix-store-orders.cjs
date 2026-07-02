const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

if (!store.includes('supplierOrders,')) {
  store = store.replace(/allSuppliers, allSupplierProducts, addSupplierOrder, currentUser, currentOrg, globalSettings/, `allSuppliers, allSupplierProducts, addSupplierOrder, supplierOrders, updateSupplierOrder, currentUser, currentOrg, globalSettings`);
}

const myOrdersComponent = `
      {/* MY ORDERS VIEW */}
      {activeTab === 'MY_ORDERS' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Meus Pedidos</h2>
          
          {supplierOrders.filter(o => o.buyerOrgId === currentOrg?.id).length === 0 ? (
            <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-slate-500 font-bold">Você ainda não fez nenhum pedido.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierOrders.filter(o => o.buyerOrgId === currentOrg?.id).map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800 text-lg">{order.supplierName}</h3>
                        <span className={\`px-2 py-0.5 rounded-full text-xs font-bold \${
                          order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }\`}>
                          {order.status === 'PENDING' ? 'Pendente' :
                           order.status === 'SHIPPED' ? 'Enviado' :
                           order.status === 'DELIVERED' ? 'Entregue' : 'Cancelado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Pedido #{order.id}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()} às {new Date(order.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800">R$ {order.totalValue.toFixed(2)}</p>
                      {order.paymentMethod === 'CREDIT_CARD' && <p className="text-xs text-slate-500">Cartão de Crédito</p>}
                      {order.paymentMethod === 'PIX' && <p className="text-xs text-slate-500">PIX</p>}
                      {order.paymentMethod === 'BOLETO' && <p className="text-xs text-slate-500">Boleto</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itens do Pedido</h4>
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="text-sm font-bold text-slate-700">{item.quantity}x {item.name}</span>
                            <span className="text-sm font-medium text-slate-600">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Endereço de Entrega</h4>
                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 font-medium leading-relaxed">
                          {order.buyerAddress?.street}, {order.buyerAddress?.number}
                          {order.buyerAddress?.complement && \` - \${order.buyerAddress.complement}\`}
                          <br />
                          {order.buyerAddress?.neighborhood} - {order.buyerAddress?.city}/{order.buyerAddress?.state}
                          <br />
                          CEP: {order.buyerAddress?.zipCode}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Logística</h4>
                        <div className="bg-indigo-50 p-3 rounded-lg flex items-center justify-between">
                          <div className="text-sm text-indigo-800 font-medium">
                            {order.shippingMethod === 'COMBINE' ? 'Frete Combinado' :
                             order.shippingMethod === 'PAC' ? 'PAC (Correios)' :
                             order.shippingMethod === 'SEDEX' ? 'SEDEX (Correios)' : 'Não informado'}
                          </div>
                          {order.trackingCode && (
                            <div className="text-sm font-bold text-indigo-900 bg-white px-2 py-1 rounded-md shadow-sm">
                              {order.trackingCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Chat UI */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mensagens (Chat)</h4>
                    <div className="bg-slate-50 rounded-xl p-4 h-48 overflow-y-auto mb-3 space-y-3 flex flex-col">
                      {(!order.chat || order.chat.length === 0) ? (
                        <p className="text-sm text-slate-400 m-auto">Nenhuma mensagem ainda. Envie algo para o vendedor.</p>
                      ) : (
                        order.chat.map((msg, i) => (
                          <div key={i} className={\`p-3 rounded-xl max-w-[80%] \${msg.senderId === currentUser?.id ? 'bg-indigo-600 text-white self-end rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 self-start rounded-bl-none'}\`}>
                            <p className="text-xs opacity-70 mb-1 font-bold">{msg.senderName}</p>
                            <p className="text-sm">{msg.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = (e.target as any).elements.chatInput;
                        const text = input.value.trim();
                        if (!text || !currentUser) return;
                        
                        const newChat = [...(order.chat || []), {
                          senderId: currentUser.id,
                          senderName: currentUser.name,
                          text,
                          timestamp: new Date()
                        }];
                        
                        updateSupplierOrder(order.id, { chat: newChat });
                        input.value = '';
                      }}
                      className="flex gap-2"
                    >
                      <input name="chatInput" type="text" placeholder="Escreva uma mensagem..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
                      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors">Enviar</button>
                    </form>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
`;

if (!store.includes('MY ORDERS VIEW')) {
  store = store.replace(/\{\/\* STORE VIEW \*\/\}/, `${myOrdersComponent}\n\n      {/* STORE VIEW */}`);
}

// In case the placeholder doesn't exist, I'll find where to put it.
if (!store.includes('MY ORDERS VIEW')) {
  store = store.replace(/(<div className="flex-1 w-full max-w-\[1400px\] mx-auto p-4 md:p-8 flex gap-8">)/, `${myOrdersComponent}\n\n      {activeTab === 'STORE' && (\n      $1`);
  // also need to close the tag
  store = store.replace(/(<\/div>\n      \n      \{\/\* RIGHT CART PANEL \*\/\})/, `      )}\n      $1`);
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
