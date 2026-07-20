const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the hardcoded Single Supplier view.
// We want to rewrite the content of the `selectedSupplierId !== 'ALL' && activeSupplierOrg` block (lines 897 to 948 in the current file approx, let's use regex).
// Actually, let's use regex to replace from `<div className="max-w-7xl mx-auto p-6 space-y-12">` to `</div>\n        </div>\n      ) : (`
// This is exactly the content of the supplier page.

const startRegex = /<div className="max-w-7xl mx-auto p-6 space-y-12">/;
const endRegex = /<\/div>\s*<\/div>\s*\) : \(\s*<>\s*\{\/\* Banner configuration from Super Admin \*\/\}/;

const matchStart = content.match(startRegex);
const matchEnd = content.match(endRegex);

if (matchStart && matchEnd) {
  const startIndex = matchStart.index;
  const endIndex = matchEnd.index + matchEnd[0].length;
  
  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex);

  const newUI = \`<div className="max-w-7xl mx-auto p-6 space-y-12">
            {selectedInternalCategory && (
              <button 
                onClick={() => setSelectedInternalCategory(null)}
                className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl w-fit transition-colors"
              >
                <ChevronLeft size={20} />
                Voltar para Página Inicial da Loja
              </button>
            )}

            {!selectedInternalCategory ? (
              <>
                {/* Featured Products */}
                <section>
                  <h2 className="text-2xl font-bold mb-6">Produtos em Destaque</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).slice(0, 4).map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItemForDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300 m-auto h-full" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : \`R$ \${p.sellPrice.toFixed(2)}\`}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Categories */}
                {supplierCategories && supplierCategories.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Explore nossas Categorias</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {supplierCategories.map(cat => (
                        <div 
                          key={cat.id} 
                          onClick={() => setSelectedInternalCategory(cat.id)}
                          className="relative h-64 rounded-2xl flex items-end p-6 cursor-pointer overflow-hidden group shadow-sm hover:shadow-md transition-all"
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 bg-slate-200 w-full h-full"></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <h3 className="relative text-white text-2xl font-bold z-10">{cat.name}</h3>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Most Popular */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Todos os Produtos</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItemForDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300 m-auto h-full" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : \`R$ \${p.sellPrice.toFixed(2)}\`}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Category Filtered View */}
                <section>
                  <h2 className="text-3xl font-bold mb-8">
                    {supplierCategories.find(c => c.id === selectedInternalCategory)?.name || 'Categoria'}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {rankedProducts.map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItemForDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : \`R$ \${p.sellPrice.toFixed(2)}\`}</p>
                      </div>
                    ))}
                    {rankedProducts.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        Nenhum produto encontrado nesta categoria.
                      </div>
                    )}
                  </div>
                </section>

                <div className="h-px bg-slate-200 my-12"></div>

                {/* Random Products from this store */}
                <section>
                  <h2 className="text-2xl font-bold mb-6 text-slate-800">Mais produtos dessa loja</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(() => {
                      const otherProducts = (allSupplierProducts || [])
                        .filter(p => p.organizationId === selectedSupplierId && p.categoryId !== selectedInternalCategory)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4);
                      
                      return otherProducts.map(p => (
                        <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItemForDetail(p)}>
                          <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300" />}
                          </div>
                          <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                          <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : \`R$ \${p.sellPrice.toFixed(2)}\`}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Banner configuration from Super Admin */}\`

  content = before + newUI + matchEnd[0].replace(/<\/div>\s*<\/div>\s*\) : \(\s*<>\s*\{\/\* Banner configuration from Super Admin \*\/\}/, '') + after;
  fs.writeFileSync(filePath, content);
  console.log("UI Patched successfully.");
} else {
  console.log("Could not match the section in SupplierStore.tsx");
}
