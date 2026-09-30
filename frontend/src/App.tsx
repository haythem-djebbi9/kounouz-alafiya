/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { PageView, Product, CartItem, cartLineKey } from './types';
import { usePublicCategories, usePublicProducts } from './lib/marketplace-hooks';
import { toMockProduct } from './lib/product-adapter';
import { useAuth } from './lib/auth-context';
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
import { HomeFaq } from './components/home/HomeFaq';

// Page Views
import { ProductsPage } from './components/ProductsPage';
import { StoryPage } from './components/StoryPage';
import { VerificationPage } from './components/VerificationPage';
import { BlogPage } from './components/BlogPage';
import { HelpSupportPanel } from './components/support/HelpSupportPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';

// Modals & Drawers
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AccountModal } from './components/AccountModal';
import { ArticleModal } from './components/ArticleModal';
import { InteractiveBee } from './components/InteractiveBee';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('marketplace');
  const { isAuthenticated } = useAuth();
  // Le blog a de vraies adresses (/blog, /blog/<article>) pour être partagé ;
  // les autres pages de la vitrine restent sur « / ».
  const blogMatch = location.pathname.match(/^\/blog(?:\/([^/]+))?\/?$/);
  const articleSlug = blogMatch?.[1] ? decodeURIComponent(blogMatch[1]) : null;
  const [currentPage, setCurrentPage] = useState<PageView>(() => (blogMatch ? 'blog' : 'home'));
  // Page d'où l'article a été ouvert, pour y revenir à la fermeture.
  const articleReturnPath = useRef<string | null>(null);

  const { data: apiCategories } = usePublicCategories();
  const { data: apiProducts, isLoading: productsLoading } = usePublicProducts();
  const products = useMemo(() => (apiProducts ?? []).map(toMockProduct), [apiProducts]);
  // Régions réelles des producteurs du catalogue, affichées sur l'accueil.
  const producerOrigins = useMemo(
    () => [...new Set(products.flatMap((p) => (p.producerLocation ? [p.producerLocation] : [])))],
    [products],
  );

  const categories = useMemo<CategoryFilter[]>(() => {
    // Les produits sont rattachés à une catégorie "feuille" (ex: Miel de
    // Sedra), pas à sa catégorie racine (ex: Miels) — on aplatit donc l'arbre
    // pour que chaque onglet corresponde à une catégorie réellement utilisée.
    const flat = (apiCategories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);
    const real = flat.map((c) => ({ id: c.slug, label: c.nom, icon: Tag }));
    return [{ id: 'all', label: t('marketplace:categories.all'), icon: Layers }, ...real];
  }, [apiCategories, t]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Scroll to top on navigation
  const handleNavigate = (page: PageView) => {
    // "Paramètres" exige un compte — sans connexion, on envoie vers la page
    // de connexion unique plutôt que d'afficher une page vide.
    if (page === 'settings' && !isAuthenticated) {
      navigate('/connexion');
      return;
    }
    setCurrentPage(page);
    const target = page === 'blog' ? '/blog' : '/';
    if (location.pathname !== target) navigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retour / avance du navigateur entre « / » et « /blog ».
  useEffect(() => {
    if (location.pathname === '/blog' || location.pathname === '/blog/') setCurrentPage('blog');
    else if (location.pathname === '/') setCurrentPage((page) => (page === 'blog' ? 'home' : page));
  }, [location.pathname]);

  const openArticle = useCallback(
    (slug: string) => {
      if (!articleSlug) articleReturnPath.current = location.pathname;
      navigate(`/blog/${encodeURIComponent(slug)}`);
    },
    [articleSlug, location.pathname, navigate],
  );

  const closeArticle = useCallback(() => {
    if (articleReturnPath.current !== null) {
      articleReturnPath.current = null;
      navigate(-1);
    } else {
      // Article ouvert directement par son lien : on reste sur le blog.
      navigate('/blog', { replace: true });
    }
  }, [navigate]);

  const handleAddToCart = (
    product: Product,
    quantity = 1,
    weight = product.weight,
    variantId?: string,
    unitPrice?: number,
  ) => {
    // Ajout rapide depuis une carte : format par défaut du produit.
    const variant =
      product.variants?.find((v) => v.id === variantId) ??
      product.variants?.find((v) => v.packageSize === weight);
    const line: CartItem = {
      product,
      quantity,
      selectedWeight: variant?.packageSize ?? weight,
      variantId: variant?.id ?? variantId,
      unitPrice: variant?.price ?? unitPrice ?? product.price,
    };
    const key = cartLineKey(line);
    setCartItems((prev) => {
      const existing = prev.find((item) => cartLineKey(item) === key);
      if (existing) {
        return prev.map((item) =>
          cartLineKey(item) === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, line];
    });
  };

  const handleUpdateQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(lineKey);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (cartLineKey(item) === lineKey ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (lineKey: string) => {
    setCartItems((prev) => prev.filter((item) => cartLineKey(item) !== lineKey));
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
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#0C261B] selection:bg-[#D49B37] selection:text-white">

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
              {/* Les animations décoratives respectent « réduire les animations ». */}
              <MotionConfig reducedMotion="user">
                {/* 1. Accueil : promesse + accès direct à la boutique et à la vérification */}
                <HeroSection
                  onDiscover={() => handleNavigate('products')}
                  onVerify={handleOpenVerify}
                  featured={products.find((p) => p.batchCode)}
                />

                {/* 2. Quatre garanties concrètes */}
                <FeaturesBar />

                {/* 3. Produits vérifiés, prix en dinars */}
                <DiscoverTreasures
                  products={products}
                  loading={productsLoading}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                  onAddToCart={(p) => handleAddToCart(p, 1, p.weight)}
                  onViewAll={() => handleNavigate('products')}
                />

                {/* 4. Parcours de confiance : du producteur au scan */}
                <QualityProcess />

                {/* 5. Vérifier un produit (QR / code) */}
                <VerificationSection />

                {/* 6. Terroir tunisien */}
                <NatureToTable
                  onDiscoverStory={() => handleNavigate('story')}
                  origins={producerOrigins}
                />

                {/* 7. Notre histoire + appel aux apiculteurs */}
                <StorySection onReadMore={() => handleNavigate('story')} />

                {/* 8. Articles */}
                <FromWorldSection
                  onOpenArticle={openArticle}
                  onShowAll={() => handleNavigate('blog')}
                />

                {/* 9. Questions fréquentes */}
                <HomeFaq onContact={() => handleNavigate('contact')} />
              </MotionConfig>
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
                onOpenArticle={openArticle}
                onShowBlog={() => handleNavigate('blog')}
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

          {currentPage === 'blog' && (
            <motion.div
              key="blog"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <BlogPage onOpenArticle={openArticle} />
            </motion.div>
          )}

          {currentPage === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="max-w-5xl mx-auto px-4 sm:px-6 py-10"
            >
              <HelpSupportPanel initialTab="contact" />
            </motion.div>
          )}

          {currentPage === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="max-w-5xl mx-auto px-4 sm:px-6 py-10"
            >
              <HelpSupportPanel initialTab="help" />
            </motion.div>
          )}

          {currentPage === 'settings' && isAuthenticated && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="max-w-5xl mx-auto px-4 sm:px-6 py-10"
            >
              <SettingsPanel />
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
        onNavigate={handleNavigate}
      />

      <ArticleModal
        slug={articleSlug}
        onClose={closeArticle}
        onVerify={() => {
          articleReturnPath.current = null;
          handleOpenVerify();
        }}
      />

      {/* Playful Interactive Honey Bee Companion */}
      <InteractiveBee />

    </div>
  );
}
