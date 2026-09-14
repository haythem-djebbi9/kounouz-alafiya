import { Testimonial, Article } from '../types';

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'محمد ع.',
    location: 'الرياض، المملكة العربية السعودية',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    quote: 'أحب عسل السدر. طعمه أصيل وفوائده كثيرة. أنصح الجميع بتجربته.',
    verifiedPurchase: true,
    productBought: 'عسل السدر الفاخر'
  },
  {
    id: 't-2',
    name: 'سارة ن.',
    location: 'جدة، المملكة العربية السعودية',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    quote: 'منتجات ممتازة وخدمة رائعة. التوصيل سريع والتغليف أنيق.',
    verifiedPurchase: true,
    productBought: 'باكج العافية للإهداء'
  },
  {
    id: 't-3',
    name: 'أحمد م.',
    location: 'الدمام، المملكة العربية السعودية',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    quote: 'عسل طبيعي 100% وطعمه رائع. أثق في كنوز العافية لجودة منتجاتها وإمكانية التحقق من كل دفعة.',
    verifiedPurchase: true,
    productBought: 'عسل طبيعي فاخر 500g'
  },
  {
    id: 't-4',
    name: 'سارة م.',
    location: 'تونس الخضراء',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    quote: 'منتجات طبيعية 100% وطعم رائع. الأهم يمكن التحقق منها بسهولة ومعرفة مصدر المنحل بالضبط.',
    verifiedPurchase: true,
    productBought: 'أعواد العافية + عسل السدر'
  }
];

export const ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'فوائد العسل الطبيعي للجسم والمناعة',
    date: '20 يوليو 2025',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    readTime: '4 دقائق قراءة',
    snippet: 'اكتشف كيف يمكن لملعقة واحدة من العسل الطبيعي يومياً أن تحدث فارقاً كبيراً في تعزيز مناعتك ومستويات طاقتك الحيوية.',
    category: 'صحة ومناعة'
  },
  {
    id: 'art-2',
    title: 'كيف نميز العسل الطبيعي من المغشوش؟',
    date: '12 يوليو 2025',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80',
    readTime: '6 دقائق قراءة',
    snippet: 'دليلك الشامل لمعرفة الطرق العلمية والمخبرية للكشف عن نقاء العسل والابتعاد عن الطرق الشائعة الخاطئة.',
    category: 'ثقافة الجودة'
  },
  {
    id: 'art-3',
    title: 'وصفات طبيعية لتعزيز نشاطك اليومي',
    date: '05 يوليو 2025',
    image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80',
    readTime: '3 دقائق قراءة',
    snippet: 'أفضل الخلطات الطبيعية بمزج العسل النقي مع الليمون والزنجبيل وحبوب اللقاح ليوم مفعم بالحيوية والتركيز.',
    category: 'وصفات صحية'
  },
  {
    id: 'art-4',
    title: 'ما الذي يجعل عسلنا مميزاً؟',
    date: '18 يونيو 2025',
    image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80',
    readTime: '5 دقائق قراءة',
    snippet: 'من اختيار مواقع المناحل في المحميات الطبيعية البعيدة عن التلوث إلى أحدث تقنيات الفحص المخبري الدقيق.',
    category: 'قصتنا'
  },
  {
    id: 'art-5',
    title: 'رحلتنا من الخلية إلى العبوة',
    date: '10 يونيو 2025',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    readTime: '4 دقائق قراءة',
    snippet: 'تعرف على الخطوات الدقيقة التي نتبعها في جني العسل وتعبئته بارداً بدون أي تعريض للحرارة لحفظ الإنزيمات.',
    category: 'الإنتاج'
  },
  {
    id: 'art-6',
    title: 'كيف نتحقق من جودة كل دفعة لدينا؟',
    date: '01 يونيو 2025',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    readTime: '5 دقائق قراءة',
    snippet: 'نظرة داخل مختبراتنا المعتمدة، وكيف نقوم بإصدار رمز QR خاص بكل عبوة يحتوي على شهادة الفحص الكاملة.',
    category: 'الشفافية'
  }
];
