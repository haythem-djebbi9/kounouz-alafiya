/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PageView, Product, CartItem, Article } from './types';
import { usePublicCategories, usePublicProducts } from './lib/marketplace-hooks';
import { toMockProduct } from './lib/product-adapter';
import { Layers, Tag } from 'lucide-react';
import type { CategoryFilter } from './components/ProductsPage';

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
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AccountModal } from './components/AccountModal';
import { ArticleModal } from './components/ArticleModal';
import { InteractiveBee } from './components/InteractiveBee';

export default function App() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageView>('home');

  const { data: apiCategories } = usePublicCategories();
  const { data: apiProducts } = usePublicProducts();
  const products = useMemo(() => (apiProducts ?? []).map(toMockProduct), [apiProducts]);

  const categories = useMemo<CategoryFilter[]>(() => {
    // Les produits sont rattachés à une catégorie "feuille" (ex: Miel de
    // Sedra), pas à sa catégorie racine (ex: Miels) — on aplatit donc l'arbre
    // pour que chaque onglet corresponde à une catégorie réellement utilisée.
    const flat = (apiCategories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);
    const real = flat.map((c) => ({ id: c.slug, label: c.nom, icon: Tag }));
    return [{ id: 'all', label: 'كل المنتجات', icon: Layers }, ...real];
  }, [apiCategories]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Scroll to top on navigation
  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: Product, quantity = 1, weight = product.weight) => {
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

  // Le formulaire de recherche reste dans la coquille de la vitrine (page
  // interne "verify") ; seul le RÉSULTAT (identifiant connu) quitte la SPA
  // pour la vraie page /verify/:identifier — voir PublicVerifyPage.
  const handleOpenVerify = () => handleNavigate('verify');
  const handleVerifyProduct = (product: Product) => {
    if (product.qrId) {
      navigate(`/verify/${product.qrId}`);
    } else {
      navigate('/verify');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#0C261B] selection:bg-[#D49B37] selection:text-white" dir="rtl">

      {/* Top Main Navigation Header */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenVerify={handleOpenVerify}
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
                onVerify={handleOpenVerify}
              />

              {/* 2. Green Features Bar (100% طبيعي, قابل للتتبع, تم التحقق, جودة ممتازة) */}
              <FeaturesBar />

              {/* 3. Discover Our Treasures (اكتشف كنوزنا) */}
              <DiscoverTreasures
                products={products}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={(p) => handleAddToCart(p, 1, p.weight)}
              />

              {/* 4. From Nature to Your Table (من الطبيعة إلى مائدتك) */}
              <NatureToTable
                onDiscoverStory={() => handleNavigate('story')}
              />

              {/* 5. Verification Interactive Section (لا تكتفِ بالثقة. تحقق.) */}
              <VerificationSection />

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
                products={products}
                categories={categories}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={(p) => handleAddToCart(p, 1, p.weight)}
                onOpenArticle={(art) => setSelectedArticle(art)}
                onVerifyProduct={handleOpenVerify}
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
              <VerificationPage />
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
        onOpenVerify={handleOpenVerify}
      />

      {/* Modals and Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onVerifyBatch={(product) => {
          setSelectedProduct(null);
          handleVerifyProduct(product);
        }}
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
        products={products}
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
