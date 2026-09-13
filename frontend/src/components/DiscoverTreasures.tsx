import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { ChevronRight, ChevronLeft, ArrowLeft, Eye, ShoppingCart } from 'lucide-react';

interface DiscoverTreasuresProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const DiscoverTreasures: React.FC<DiscoverTreasuresProps> = ({
  products,
  onSelectProduct,
  onAddToCart,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Focus on top 4 products as shown in mockups
  const displayProducts = products.slice(0, 4);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayProducts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length);
  };

  return (
    <section id="discover-treasures" className="py-16 sm:py-20 bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0C261B] mb-3">
            اكتشف كنوزنا
          </h2>

          {/* Golden Ornamental Divider */}
          <div className="flex items-center justify-center gap-3 my-2">
            <div className="w-12 h-px bg-[#D49B37]/60" />
            <div className="w-2.5 h-2.5 rounded-full border border-[#D49B37] bg-[#FAF6EE] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#D49B37]" />
            </div>
            <div className="w-12 h-px bg-[#D49B37]/60" />
          </div>

          <p className="text-sm sm:text-base text-[#576B64] font-medium mt-2 leading-relaxed">
            منتجات مختارة بعناية، تحمل في تفاصيلها وعداً بالجودة والثقة.
          </p>
        </motion.div>

        {/* Carousel / Grid Container with Navigation Arrows */}
        <div className="relative">
          
          {/* Navigation Controls (Arrows) */}
          <button
            onClick={handlePrev}
            aria-label="المنتج السابق"
            className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 shadow-md border border-[#EAE1D2] flex items-center justify-center text-[#0C261B] hover:text-[#C68A28] hover:bg-white transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            aria-label="المنتج التالي"
            className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 shadow-md border border-[#EAE1D2] flex items-center justify-center text-[#0C261B] hover:text-[#C68A28] hover:bg-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((product, idx) => {
              return (
                <motion.div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group flex flex-col bg-[#0C261B] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#1C4A3E]"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3.2] w-full overflow-hidden bg-[#163D32]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                    />
                    
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C261B] via-transparent to-transparent opacity-80" />

                    {/* Quick action buttons on hover */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        aria-label="معاينة سريعة"
                        className="p-2 bg-white/90 hover:bg-white text-[#0C261B] rounded-full shadow-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product);
                        }}
                        aria-label="إضافة إلى السلة"
                        className="p-2 bg-[#D49B37] hover:bg-[#B88020] text-white rounded-full shadow-md transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price Tag Pill */}
                    <div className="absolute bottom-2 left-2 bg-[#0C261B]/90 backdrop-blur-sm text-[#FAF6EE] text-xs font-bold px-2.5 py-1 rounded-md border border-[#D49B37]/40">
                      {product.price} ر.س
                    </div>
                  </div>

                  {/* Card Content (Dark Forest Green Background as shown in Mockups) */}
                  <div className="p-5 flex flex-col flex-grow text-center items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#FAF6EE] mb-1 group-hover:text-[#D49B37] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#A3B8B0] font-normal mb-3">
                        {product.subtitle}
                      </p>
                    </div>

                    {/* CTA Link with Arrow */}
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#D49B37] hover:text-[#E8C378] transition-colors pt-2 cursor-pointer group/btn"
                    >
                      <span>اكتشف المنتج</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-x-1" />
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
