import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, Heart } from 'lucide-react';

const HONEY_FACTS = [
  '🐝 العسل الطبيعي هو الغذاء الوحيد في العالم الذي لا يفسد أبداً!',
  '🍯 تحتاج النحلة لزيارة 2 مليون زهرة لإنتاج نصف كيلو فقط من العسل النقي!',
  '🌸 تطير النحلة بسرعة 24 كم/ساعة وترفرف بأجنحتها 200 مرة بالثانية!',
  '✨ يحتوي العكبر (البروبوليس) على أكثر من 300 مركب طبيعي مضاد للبكتيريا!',
  '👑 غذاء الملكات يمنح ملكة النحل عمراً أطول بـ 40 ضعفاً مقارنة بالنحل العادي!',
  '🌼 حبوب لقاح النحل تحتوي على جميع الفيتامينات والبروتينات الحيوية للجسم!'
];

export const InteractiveBee: React.FC = () => {
  const [beePos, setBeePos] = useState({ x: 80, y: 150 });
  const [targetPos, setTargetPos] = useState({ x: 120, y: 180 });
  const [isHovered, setIsHovered] = useState(false);
  const [facingLeft, setFacingLeft] = useState(true);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);
  const [pollenCount, setPollenCount] = useState(0);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Gentle autonomous wandering near viewport
  useEffect(() => {
    const wanderInterval = setInterval(() => {
      if (isHovered) return;
      
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

      // Random gentle offset in bottom-left or floating around
      const newX = Math.max(30, Math.min(screenW - 100, Math.random() * (screenW * 0.4) + 20));
      const newY = Math.max(100, Math.min(screenH - 120, Math.random() * (screenH * 0.6) + 100));

      setTargetPos((prev) => {
        setFacingLeft(newX < prev.x);
        return { x: newX, y: newY };
      });
    }, 4500);

    return () => clearInterval(wanderInterval);
  }, [isHovered]);

  // Smooth interpolation
  useEffect(() => {
    const anim = requestAnimationFrame(() => {
      setBeePos((prev) => {
        const dx = targetPos.x - prev.x;
        const dy = targetPos.y - prev.y;
        return {
          x: prev.x + dx * 0.04,
          y: prev.y + dy * 0.04,
        };
      });
    });
    return () => cancelAnimationFrame(anim);
  }, [targetPos, beePos]);

  const handleBeeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Trigger golden honey confetti
    confetti({
      particleCount: 28,
      spread: 60,
      origin: {
        x: (beePos.x + 30) / window.innerWidth,
        y: (beePos.y + 30) / window.innerHeight,
      },
      colors: ['#D49B37', '#E8B958', '#F5DC9A', '#1E6B56', '#FAF6EE'],
      shapes: ['circle'],
      scalar: 0.9,
    });

    setPollenCount((prev) => prev + 1);
    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 1500);

    // Show fun educational fact or cute greeting
    const randomFact = HONEY_FACTS[Math.floor(Math.random() * HONEY_FACTS.length)];
    setSpeechBubble(randomFact);

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setSpeechBubble(null);
    }, 5000);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            style={{
              left: Math.min(window.innerWidth - 280, Math.max(20, beePos.x - 100)),
              top: Math.max(20, beePos.y - 80),
            }}
            className="absolute pointer-events-auto bg-white/95 backdrop-blur-md text-[#0C261B] text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-[#D49B37] max-w-xs text-right leading-relaxed z-50"
            dir="rtl"
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">✨</span>
              <p className="flex-1 text-[11px] sm:text-xs text-[#0C261B]">{speechBubble}</p>
              <button 
                onClick={() => setSpeechBubble(null)}
                className="text-[#8C9E97] hover:text-[#0C261B] text-xs p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Pointer arrow */}
            <div className="absolute -bottom-2 right-12 w-4 h-4 bg-white border-b border-r border-[#D49B37] transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bee Entity */}
      <motion.div
        style={{
          transform: `translate3d(${beePos.x}px, ${beePos.y}px, 0)`,
        }}
        className="absolute pointer-events-auto cursor-pointer select-none group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleBeeClick}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="relative flex items-center justify-center">
          
          {/* Subtle Golden Glow aura */}
          <div className="absolute w-14 h-14 bg-[#D49B37]/20 rounded-full blur-md animate-pulse pointer-events-none" />

          {/* Sparkles on click */}
          {showSparkles && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute -top-3 -right-3 text-[#D49B37] pointer-events-none"
            >
              <Sparkles className="w-6 h-6 fill-[#D49B37]" />
            </motion.div>
          )}

          {/* Bee SVG / Sprite with fluttering wings */}
          <div className={`relative transition-transform duration-300 ${facingLeft ? 'scale-x-100' : '-scale-x-100'}`}>
            
            {/* Fluttering Wings */}
            <div className="absolute -top-3 left-2 flex gap-1 z-0 pointer-events-none">
              <motion.div
                animate={{
                  rotate: [-15, 30, -15],
                  scaleY: [1, 0.7, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.12,
                  ease: 'easeInOut',
                }}
                className="w-3.5 h-4.5 bg-cyan-100/85 border border-cyan-300/80 rounded-full shadow-xs origin-bottom"
              />
              <motion.div
                animate={{
                  rotate: [20, -25, 20],
                  scaleY: [1, 0.7, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.14,
                  ease: 'easeInOut',
                }}
                className="w-3 h-4 bg-cyan-100/75 border border-cyan-300/70 rounded-full shadow-xs origin-bottom -ml-1"
              />
            </div>

            {/* Bee Body */}
            <div className="relative z-10 w-9 h-7 bg-gradient-to-r from-[#D49B37] via-[#F3C766] to-[#D49B37] rounded-full shadow-md border border-[#966718] flex items-center justify-between px-1.5 overflow-hidden">
              {/* Stripes */}
              <div className="w-1.5 h-full bg-[#0C261B]/90 mx-0.5 rounded-full" />
              <div className="w-1.5 h-full bg-[#0C261B]/90 mx-0.5 rounded-full" />
              
              {/* Bee Face */}
              <div className="relative flex flex-col items-center">
                <div className="w-1.5 h-1.5 bg-[#0C261B] rounded-full" />
                <div className="w-1 h-0.5 bg-rose-400 rounded-full mt-0.5" />
              </div>
            </div>

            {/* Cute Stinger */}
            <div className="absolute top-2.5 -left-1 w-2 h-2 bg-[#0C261B] transform rotate-45 rounded-xs" />

            {/* Antennae */}
            <div className="absolute -top-2 right-1 flex gap-1 pointer-events-none">
              <div className="w-0.5 h-2 bg-[#0C261B] transform rotate-12 rounded-full" />
              <div className="w-0.5 h-2 bg-[#0C261B] transform -rotate-12 rounded-full" />
            </div>

          </div>

          {/* Interactive Hint Tooltip on Hover */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-[#0C261B]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
            <span>انقر للمفاجأة!</span>
            <Heart className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          </div>

        </div>
      </motion.div>
    </div>
  );
};
