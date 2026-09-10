import React from 'react';
import { Layers, Sparkles, Folder } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  imageUrl?: string;
}

interface StoreCategoryNavProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  totalProductsCount: number;
  categoryCountMap?: Record<string, number>;
}

export const StoreCategoryNav: React.FC<StoreCategoryNavProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProductsCount,
  categoryCountMap = {}
}) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
      <div className="flex items-center gap-2 min-w-max py-1">
        {/* All Products Pill */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            selectedCategoryId === null
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200/90'
          }`}
        >
          <Layers size={14} className={selectedCategoryId === null ? 'text-zinc-300' : 'text-zinc-500'} />
          <span>Todos os Produtos</span>
          <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
            selectedCategoryId === null ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {totalProductsCount}
          </span>
        </button>

        {/* Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = categoryCountMap[cat.id];

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200/90'
              }`}
            >
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-4 h-4 rounded-md object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Folder size={14} className={isSelected ? 'text-zinc-300' : 'text-zinc-500'} />
              )}
              <span>{cat.name}</span>
              {typeof count === 'number' && count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                  isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
