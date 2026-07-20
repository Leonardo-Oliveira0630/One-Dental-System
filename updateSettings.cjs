const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/supplier/Settings.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// We need to add a section for "Categorias da Loja" before the layout blocks
const layoutRegex = /\{\/\* Layout arrangements and blocks \*\/\}/;

const categorySection = `
              {/* Category Images for Store Explore */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-md flex items-center gap-2">
                  <ImageIcon className="text-indigo-400" />
                  Imagens das Categorias
                </h3>
                <p className="text-slate-500 text-xs">
                  Faça o upload de imagens para as suas categorias. Elas aparecerão na seção "Explorar nossas Categorias" da sua vitrine.
                </p>
                <div className="space-y-3 pt-2">
                  {inventoryCategories && inventoryCategories.length > 0 ? (
                    inventoryCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {cat.imageUrl ? (
                              <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">{cat.name}</p>
                            <p className="text-[10px] text-slate-500">{cat.type === 'SERVICE' ? 'Serviço' : 'Produto'}</p>
                          </div>
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            id={\`cat-image-\${cat.id}\`}
                            className="hidden"
                            onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (!file) return;
                               try {
                                 const { smartCompress } = await import('../../services/compressionService');
                                 const compressed = await smartCompress(file);
                                 const reader = new FileReader();
                                 reader.onload = async (evt) => {
                                   const base64 = evt.target?.result as string;
                                   await api.apiUpdateInventoryCategory(currentOrg?.id || '', cat.id, { imageUrl: base64 });
                                   alert('Imagem da categoria atualizada!');
                                 };
                                 reader.readAsDataURL(compressed);
                               } catch (err) {
                                 console.error(err);
                                 alert('Erro ao atualizar imagem da categoria.');
                               }
                            }}
                          />
                          <label
                            htmlFor={\`cat-image-\${cat.id}\`}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 cursor-pointer hover:bg-slate-50 transition-colors inline-block"
                          >
                            Alterar Imagem
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 py-4 text-center">Nenhuma categoria encontrada.</div>
                  )}
                </div>
              </div>

              {/* Layout arrangements and blocks */}`;

content = content.replace(layoutRegex, categorySection);

// Fix the categories extraction:
// const { currentOrg, currentPlan, allPlans, updateOrganization, inventoryItems, getSaaSInvoices } = useApp();
// we need to include inventoryCategories
content = content.replace('inventoryItems, getSaaSInvoices', 'inventoryItems, getSaaSInvoices, inventoryCategories');

fs.writeFileSync(filePath, content);
console.log("Updated Settings.tsx");
