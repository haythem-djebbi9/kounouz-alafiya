import React, { useState } from 'react';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { Search, X, ArrowLeft, Droplets, Tag } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const results = query.trim()
    ? PRODUCTS.filter(
        (p) =>
          p.name.includes(query) ||
          p.subtitle.includes(query) ||
          p.description.includes(query) ||
          p.categoryLabel.includes(query)
      )
    : PRODUCTS.slice(0, 4);

  const quickTags = ['عسل سدر', 'غذاء ملكات', 'أعواد عسل', 'عسل طبيعي فاخر', 'بروبوليس'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="search-modal"
        className="w-full max-w-xl bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[80vh] text-right"
      >
        {/* Search Bar Input */}
        <div className="p-4 bg-white border-b border-[#EAE1D2] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#C68A28] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن عسل، نوع، فائدة، أو رمز دفعة..."
            className="flex-grow text-sm sm:text-base text-[#0C261B] placeholder:text-[#9AA8A2] bg-transparent focus:outline-none font-medium"
            dir="rtl"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8C7A60] hover:text-[#0C261B] hover:bg-[#FAF6EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Tags */}
        <div className="px-4 py-2.5 bg-[#F5EFE1] border-b border-[#EAE1D2] flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[#8C7A60] font-semibold flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#D49B37]" /> كلمات شائعة:
          </span>
          {quickTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-2 py-0.5 rounded bg-white hover:bg-[#D49B37] hover:text-white text-[#0C261B] text-[11px] font-medium transition-colors border border-[#EAE1D2] cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-2.5">
          <span className="text-xs font-bold text-[#8C7A60] block mb-1">
            {query ? `نتائج البحث (${results.length})` : 'المنتجات المميزة'}
          </span>

          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C7A60]">
              لم يتم العثور على منتجات مطابقة لـ "{query}".
            </div>
          ) : (
            results.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  onSelectProduct(product);
                  onClose();
                }}
                className="p-3 bg-white hover:bg-[#FAF0DC] rounded-xl border border-[#EAE1D2] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover border border-[#EAE1D2] shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#0C261B] group-hover:text-[#C68A28]">
                      {product.name}
                    </h4>
                    <span className="text-[11px] text-[#6F827B]">
                      {product.subtitle} • {product.price} ر.س
                    </span>
                  </div>
                </div>

                <ArrowLeft className="w-4 h-4 text-[#8C7A60] group-hover:text-[#C68A28] group-hover:-translate-x-1 transition-transform" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
