const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

const searchBarDiv = `<div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>
                {(activeTab === 'ITEMS' || activeTab === 'CATALOG') && canCreate && (
                    <button onClick={() => setIsBulkModalOpen(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Sparkles size={20} /> Importação Inteligente
                    </button>
                )}
                {activeTab === 'ITEMS' && canCreate && activeOwnerGroup === null && (
                    <button onClick={() => setShowCreateStockModal(true)} className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Layers size={20} /> Criar Estoque
                    </button>
                )}
                {activeTab === 'ITEMS' && canCreate && (
                    <button onClick={() => openItemModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Novo Produto no Estoque
                    </button>
                )}
                {activeTab === 'CATEGORIES' && canCreate && (
                    <button onClick={() => openCatModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Nova Categoria
                    </button>
                )}
                {activeTab === 'CATALOG' && canCreate && (
                    <button onClick={() => openCatalogModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Novo Produto Base
                    </button>
                )}
            </div>`;

const newSearchBarDiv = `<div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full xl:w-auto">
                    {(activeTab === 'ITEMS' || activeTab === 'CATALOG') && canCreate && (
                        <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-emerald-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                            <Sparkles size={20} /> Importação Inteligente
                        </button>
                    )}
                    {activeTab === 'ITEMS' && canCreate && activeOwnerGroup === null && (
                        <button onClick={() => setShowCreateStockModal(true)} className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-amber-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                            <Layers size={20} /> Criar Estoque
                        </button>
                    )}
                    {activeTab === 'ITEMS' && canCreate && (
                        <button onClick={() => openItemModal()} className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                            <Plus size={20} /> Novo Produto
                        </button>
                    )}
                    {activeTab === 'CATEGORIES' && canCreate && (
                        <button onClick={() => openCatModal()} className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                            <Plus size={20} /> Nova Categoria
                        </button>
                    )}
                    {activeTab === 'CATALOG' && canCreate && (
                        <button onClick={() => openCatalogModal()} className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                            <Plus size={20} /> Novo Produto Base
                        </button>
                    )}
                </div>
            </div>`;

if (content.includes(searchBarDiv)) {
    content = content.replace(searchBarDiv, newSearchBarDiv);
    fs.writeFileSync('pages/lab/Inventory.tsx', content);
    console.log("Updated search bar and buttons");
} else {
    console.log("Could not find search bar div");
}
