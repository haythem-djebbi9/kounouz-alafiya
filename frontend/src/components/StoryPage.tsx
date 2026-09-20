import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Leaf,
  Users,
  Box,
  Star,
  Quote,
  Send,
  Mail,
  Truck,
  ShieldCheck,
  Headphones,
  ArrowLeft,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface StoryPageProps {
  onDiscoverProducts: () => void;
}

export const StoryPage: React.FC<StoryPageProps> = ({ onDiscoverProducts }) => {
  const { t } = useTranslation('marketplace');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);

  const stats = [
    { value: '+10', label: t('marketplace:storyPage.stats.experience'), icon: Award },
    { value: '100%', label: t('marketplace:storyPage.stats.natural'), icon: Leaf },
    { value: '+5000', label: t('marketplace:storyPage.stats.happyClients'), icon: Users },
    { value: '+20', label: t('marketplace:storyPage.stats.naturalProducts'), icon: Box },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
        setSubscribed(false);
      }, 4000);
    }
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? 3 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev === 3 ? 0 : prev + 1));
  };

  return (
    <div id="story-page" className="bg-[#FAF6EE] min-h-screen text-[#0C261B] pb-16">
      
      {/* 1. Full-Width Edge-to-Edge Hero Banner with beekeeperZZZ.jpg at 100% opacity (Not boxed) */}
      <div
        className="relative w-full overflow-hidden shadow-lg"
        style={{
          backgroundImage: "url('/images/beekeeperZZZ.jpg')",
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 relative z-10 flex flex-col justify-between min-h-[460px] lg:min-h-[520px]">
          
          {/* Main Text Content moved further to the LEFT of the page in a centered pyramid hierarchy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
            {/* Empty space on the Right (over the Beekeeper) */}
            <div className="hidden lg:block lg:col-span-7 min-h-[100px] sm:min-h-[220px]" />

            {/* Pyramid formatted Text & CTA block on the Left side of the page */}
            <div className="lg:col-span-5 flex flex-col items-center text-center lg:items-center max-w-md mx-auto lg:mr-auto lg:ml-0">
              <span className="text-sm sm:text-base font-bold text-[#0C261B] mb-2 tracking-wide">
                {t('marketplace:nav.story')}
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0C261B] leading-tight mb-4 tracking-tight">
                {t('marketplace:storyPage.heroTitleLine1')}
                <br />
                {t('marketplace:storyPage.heroTitleLine2')}
              </h1>

              {/* Subtle Ornamental Accent */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D49B37]" />
                <div className="w-8 h-0.5 rounded-full bg-[#D49B37]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#D49B37]" />
              </div>

              <p className="text-xs sm:text-sm text-[#3A4F46] font-medium leading-relaxed mb-6 max-w-xs sm:max-w-sm">
                {t('marketplace:storyPage.heroDescription')}
              </p>

              <button
                id="story-discover-journey-btn"
                onClick={onDiscoverProducts}
                className="inline-flex items-center gap-3 bg-[#0C261B] hover:bg-[#15473A] text-white font-bold text-xs sm:text-sm px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <span>{t('marketplace:storyPage.discoverJourneyCta')}</span>
                <ArrowLeft className="w-4 h-4 text-[#D49B37] transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </div>

          {/* Stats Ribbon Bar moved back to where it was (under the beekeeper on the right) */}
          <div className="w-full lg:max-w-2xl lg:ml-auto mt-8 pt-4">
            <div className="bg-[#0C261B] rounded-2xl text-white p-4 sm:p-5 shadow-2xl border border-[#163D32]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#234A3F]">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-center gap-3 px-2 ${
                        idx > 1 ? 'pt-3 sm:pt-0' : ''
                      }`}
                    >
                      <div className="text-right">
                        <div className="text-xl sm:text-2xl font-black text-[#FAF6EE] font-mono leading-none">
                          {stat.value}
                        </div>
                        <div className="text-[11px] sm:text-xs text-[#A3B8B0] font-medium mt-1">
                          {stat.label}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl text-[#D49B37] shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 mt-12">

        {/* 2. Testimonials Section (ماذا يقول عملاؤنا) */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-2">
              {t('marketplace:storyPage.testimonialsTitle')}
            </h2>
            {/* Golden Ornamental Divider */}
            <div className="flex items-center justify-center gap-3 my-2">
              <div className="w-12 h-px bg-[#D49B37]" />
              <div className="w-2 h-2 rounded-full bg-[#D49B37]" />
              <div className="w-12 h-px bg-[#D49B37]" />
            </div>
          </div>

          {/* Testimonial Cards Carousel / Grid with Left & Right Arrow Buttons */}
          <div className="relative">
            {/* Left Carousel Arrow */}
            <button
              onClick={handlePrevSlide}
              aria-label={t('marketplace:storyPage.prevTestimonialsAria')}
              className="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-[#EAE1D2] shadow-md items-center justify-center text-[#0C261B] hover:bg-[#FAF6EE] hover:text-[#D49B37] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Right Carousel Arrow */}
            <button
              onClick={handleNextSlide}
              aria-label={t('marketplace:storyPage.nextTestimonialsAria')}
              className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-[#EAE1D2] shadow-md items-center justify-center text-[#0C261B] hover:bg-[#FAF6EE] hover:text-[#D49B37] transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: محمد ع. */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EAE1D2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-right relative">
                <span className="text-3xl font-serif text-[#C68A28] font-bold block text-right mb-2">”</span>
                
                <p className="text-sm sm:text-base text-[#0C261B] font-semibold leading-relaxed mb-6">
                  {t('marketplace:storyPage.testimonials.card1.quote')}
                </p>

                <div className="pt-4 border-t border-[#F2EAE0] flex items-center justify-between">
                  {/* Stars on left */}
                  <div className="flex items-center gap-0.5 text-[#D49B37]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#D49B37] text-[#D49B37]" />
                    ))}
                  </div>

                  {/* Author on right */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#0C261B]">
                      {t('marketplace:storyPage.testimonials.card1.author')}
                    </span>
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                      alt={t('marketplace:storyPage.testimonials.card1.author')}
                      className="w-10 h-10 rounded-full object-cover border border-[#EAE1D2]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: سارة ن. */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EAE1D2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-right relative">
                <span className="text-3xl font-serif text-[#C68A28] font-bold block text-right mb-2">”</span>
                
                <p className="text-sm sm:text-base text-[#0C261B] font-semibold leading-relaxed mb-6">
                  {t('marketplace:storyPage.testimonials.card2.quote')}
                </p>

                <div className="pt-4 border-t border-[#F2EAE0] flex items-center justify-between">
                  {/* Stars on left */}
                  <div className="flex items-center gap-0.5 text-[#D49B37]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#D49B37] text-[#D49B37]" />
                    ))}
                  </div>

                  {/* Author on right */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#0C261B]">
                      {t('marketplace:storyPage.testimonials.card2.author')}
                    </span>
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                      alt={t('marketplace:storyPage.testimonials.card2.author')}
                      className="w-10 h-10 rounded-full object-cover border border-[#EAE1D2]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: أحمد م. */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EAE1D2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-right relative">
                <span className="text-3xl font-serif text-[#C68A28] font-bold block text-right mb-2">”</span>
                
                <p className="text-sm sm:text-base text-[#0C261B] font-semibold leading-relaxed mb-6">
                  {t('marketplace:storyPage.testimonials.card3.quote')}
                </p>

                <div className="pt-4 border-t border-[#F2EAE0] flex items-center justify-between">
                  {/* Stars on left */}
                  <div className="flex items-center gap-0.5 text-[#D49B37]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#D49B37] text-[#D49B37]" />
                    ))}
                  </div>

                  {/* Author on right */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#0C261B]">
                      {t('marketplace:storyPage.testimonials.card3.author')}
                    </span>
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
                      alt={t('marketplace:storyPage.testimonials.card3.author')}
                      className="w-10 h-10 rounded-full object-cover border border-[#EAE1D2]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination dots (4 dots, 2nd active as in image) */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setActiveSlide(0)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${activeSlide === 0 ? 'bg-[#D49B37] w-3 h-3' : 'bg-[#D5C7B0]'}`}
              />
              <button
                onClick={() => setActiveSlide(1)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${activeSlide === 1 ? 'bg-[#D49B37] w-3 h-3' : 'bg-[#D5C7B0]'}`}
              />
              <button
                onClick={() => setActiveSlide(2)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${activeSlide === 2 ? 'bg-[#D49B37] w-3 h-3' : 'bg-[#D5C7B0]'}`}
              />
              <button
                onClick={() => setActiveSlide(3)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${activeSlide === 3 ? 'bg-[#D49B37] w-3 h-3' : 'bg-[#D5C7B0]'}`}
              />
            </div>
          </div>
        </div>

        {/* 3. Newsletter Banner (اشترك في نشرتنا البريدية) */}
        <div className="bg-[#0C261B] text-white rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden shadow-xl border border-[#234A3F]">
          <div className="absolute inset-0 bg-honeycomb-dark opacity-15 pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            
            {/* Right: Title & Description with Icon */}
            <div className="flex items-center gap-4 text-right w-full lg:w-auto">
              <div className="p-3 rounded-2xl bg-[#163D32] text-[#D49B37] border border-[#D49B37]/40 shrink-0">
                <Mail className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#FAF6EE]">
                  {t('marketplace:storyPage.newsletter.title')}
                </h3>
                <p className="text-xs sm:text-sm text-[#A3B8B0] font-normal mt-1">
                  {t('marketplace:storyPage.newsletter.subtitle')}
                </p>
              </div>
            </div>

            {/* Left: Input Form Pill with Integrated Button */}
            <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex items-center">
              <div className="relative w-full sm:w-96 flex items-center bg-white rounded-xl p-1 shadow-md">
                <div className="pr-3 pl-2 text-[#8C7A60] pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t('marketplace:storyPage.newsletter.placeholder')}
                  className="w-full py-2.5 px-2 bg-transparent text-[#0C261B] placeholder-[#8C7A60] text-sm focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-[#C68A28] hover:bg-[#B37A20] text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4 rotate-180" />
                  <span>{t('marketplace:storyPage.newsletter.subscribeCta')}</span>
                </button>
              </div>
            </form>

          </div>

          {subscribed && (
            <p className="text-xs font-bold text-[#E5AC44] text-center mt-4 animate-fadeIn">
              {t('marketplace:storyPage.newsletter.successMessage')}
            </p>
          )}
        </div>

        {/* 4. 4-Column Bottom Perks Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-[#EAE1D2] text-center divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#EAE1D2]">
          
          <div className="flex flex-col items-center pt-4 md:pt-0">
            <Truck className="w-8 h-8 text-[#C68A28] mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#0C261B]">{t('marketplace:storyPage.perks.delivery.title')}</h4>
            <p className="text-xs text-[#6F827B] mt-0.5">{t('marketplace:storyPage.perks.delivery.description')}</p>
          </div>

          <div className="flex flex-col items-center pt-4 md:pt-0">
            <ShieldCheck className="w-8 h-8 text-[#C68A28] mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#0C261B]">{t('marketplace:storyPage.perks.payment.title')}</h4>
            <p className="text-xs text-[#6F827B] mt-0.5">{t('marketplace:storyPage.perks.payment.description')}</p>
          </div>

          <div className="flex flex-col items-center pt-4 md:pt-0">
            <Box className="w-8 h-8 text-[#C68A28] mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#0C261B]">{t('marketplace:storyPage.perks.quality.title')}</h4>
            <p className="text-xs text-[#6F827B] mt-0.5">{t('marketplace:storyPage.perks.quality.description')}</p>
          </div>

          <div className="flex flex-col items-center pt-4 md:pt-0">
            <Award className="w-8 h-8 text-[#C68A28] mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#0C261B]">{t('marketplace:storyPage.perks.support.title')}</h4>
            <p className="text-xs text-[#6F827B] mt-0.5">{t('marketplace:storyPage.perks.support.description')}</p>
          </div>

        </div>

      </div>
    </div>
  );
};
