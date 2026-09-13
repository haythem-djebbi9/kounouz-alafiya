/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageView, Product, VerificationBatch, CartItem, Article } from './types';
import { PRODUCTS, VERIFICATION_BATCHES } from './data/mockData';

// Layout Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Home Page Components
import { HeroSection } from './components/HeroSection';
import { FeaturesBar } from './components/FeaturesBar';
import { DiscoverTreasures } from './components/DiscoverTreasures';
import { NatureToTable } from './components/NatureToTable';
import { VerificationSection } from './components/VerificationSection';
import { StorySection } from './components/StorySection';
import { QualityProcess } from './components/QualityProcess';
import { FromWorldSection } from './components/FromWorldSection';

// Page Views
import { ProductsPage } from './components/ProductsPage';
import { StoryPage } from './components/StoryPage';
import { VerificationPage } from './components/VerificationPage';
import { ContactPage } from './components/ContactModal';

// Modals & Drawers
import { ProductDetailModal } from './components/ProductDetailModal';
import { VerificationModal } from './components/VerificationModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AccountModal } from './components/AccountModal';
import { ArticleModal } from './components/ArticleModal';
import { InteractiveBee } from './components/InteractiveBee';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  
  // Initialize with 2 items in cart as depicted in the original mockup badges (badge count: 2)
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: PRODUCTS[1], // عسل طبيعي فاخر 500g
      quantity: 1,
      selectedWeight: '500g',
    },
    {
      product: PRODUCTS[0], // أعواد العافية
      quantity: 1,
      selectedWeight: '30 عود (10g)',
    },
  ]);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<VerificationBatch | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Scroll to top on navigation
  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: Product, quantity = 1, weight = '500g') => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedWeight === weight
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedWeight === weight
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedWeight: weight }];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckoutSuccess = () => {
    setCartItems([]);
  };

  const handleOpenVerifyWithBatch = (batch: VerificationBatch) => {
    setSelectedBatch(batch);
    setIsVerifyModalOpen(true);
  };

  const handleOpenVerifyDefault = () => {
    setSelectedBatch(VERIFICATION_BATCHES['KZ-LUX-500']);
    setIsVerifyModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#0C261B] selection:bg-[#D49B37] selection:text-white" dir="rtl">
      
      {/* Top Main Navigation Header */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenVerify={() => handleNavigate('verify')}
        onOpenAccount={() => setIsAccountOpen(true)}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      />

      {/* Main Content Area Based on Page Selection */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              {/* 1. Hero Section (Image 1, 2, 3, 4) */}
              <HeroSection
                onDiscover={() => handleNavigate('products')}
                onVerify={() => handleNavigate('verify')}
              />

              {/* 2. Green Features Bar (100% طبيعي, قابل للتتبع, تم التحقق, جودة ممتازة) */}
              <FeaturesBar />

              {/* 3. Discover Our Treasures (اكتشف كنوزنا) */}
              <DiscoverTreasures
                products={PRODUCTS}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={(p) => handleAddToCart(p, 1, p.weight)}
              />

              {/* 4. From Nature to Your Table (من الطبيعة إلى مائدتك) */}
              <NatureToTable
                onDiscoverStory={() => handleNavigate('story')}
              />

              {/* 5. Verification Interactive Section (لا تكتفِ بالثقة. تحقق.) */}
              <VerificationSection
                onShowBatchDetails={handleOpenVerifyWithBatch}
                onOpenScanner={() => setIsVerifyModalOpen(true)}
              />

              {/* 6. Story Preview Section on Home (قصتنا) */}
              <StorySection
                onReadMore={() => handleNavigate('story')}
              />

              {/* 7. Quality Process Ribbon (الجودة ليست وعداً. إنها عملية.) */}
              <QualityProcess />

              {/* 8. From Kunooz Al Afiya World (من عالم كنوز العافية) */}
              <FromWorldSection
                onOpenArticle={(art) => setSelectedArticle(art)}
              />
            </motion.div>
          )}

          {currentPage === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <ProductsPage
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={(p) => handleAddToCart(p, 1, p.weight)}
                onOpenArticle={(art) => setSelectedArticle(art)}
                onVerifyProduct={() => handleNavigate('verify')}
              />
            </motion.div>
          )}

          {currentPage === 'story' && (
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <StoryPage
                onDiscoverProducts={() => handleNavigate('products')}
              />
            </motion.div>
          )}

          {currentPage === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <VerificationPage
                onShowBatchDetails={handleOpenVerifyWithBatch}
                onNavigateContact={() => handleNavigate('contact')}
              />
            </motion.div>
          )}

          {currentPage === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <ContactPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Main Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenVerify={() => handleNavigate('verify')}
      />

      {/* Modals and Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onVerifyBatch={(code) => {
          const batch = VERIFICATION_BATCHES[code] || VERIFICATION_BATCHES['KZ-LUX-500'];
          setSelectedProduct(null);
          handleOpenVerifyWithBatch(batch);
        }}
      />

      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        initialBatch={selectedBatch}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />

      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

      {/* Playful Interactive Honey Bee Companion */}
      <InteractiveBee />

    </div>
  );
}
