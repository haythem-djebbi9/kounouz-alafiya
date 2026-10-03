/**
 * Articles de départ du blog de la vitrine, en arabe, français et anglais.
 *
 * Ils sont chargés par le seed sur une base neuve, et par la migration
 * `20260930120000_blog_posts` sur une base déjà en service (même contenu,
 * régénéré avec `npx tsx prisma/generer-sql-blog.ts`). L'administrateur peut
 * ensuite les modifier, les dépublier ou les supprimer depuis la console.
 *
 * Mise en forme du contenu : paragraphes séparés par une ligne vide,
 * « ## » pour un intertitre, « - » pour une liste, « > » pour un encadré,
 * **gras** dans le texte.
 */
import type { BlogCategory, LocalizedText } from '../src/blog/blog-text.js';

export interface BlogArticleSeed {
  slug: string;
  category: BlogCategory;
  coverImage: string;
  featured: boolean;
  publishedAt: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
}

export const BLOG_ARTICLES: BlogArticleSeed[] = [
  {
    slug: 'reconnaitre-un-miel-authentique',
    category: 'CONSEILS',
    coverImage: '/images/scan.webp',
    featured: true,
    publishedAt: '2026-09-27T09:00:00.000Z',
    title: {
      ar: 'عسل أصلي أم مغشوش؟ ما لا تخبرك به «الاختبارات المنزلية»',
      fr: 'Miel authentique ou frelaté : ce que les « tests maison » ne disent pas',
      en: 'Genuine or adulterated honey? What “home tests” won’t tell you',
    },
    excerpt: {
      ar: 'كوب الماء، اللهب، ورق النشاف... هذه الحيل منتشرة في كل مكان، لكن لا واحدة منها تُثبت أن العسل نقي. إليك ما يهم فعلاً.',
      fr: 'Verre d’eau, flamme, papier buvard… Ces astuces circulent partout, mais aucune ne prouve qu’un miel est pur. Voici ce qui compte vraiment.',
      en: 'Glass of water, flame, blotting paper… These tricks are everywhere, but none of them proves honey is pure. Here is what really matters.',
    },
    content: {
      ar: `تنتشر على مواقع التواصل الاجتماعي حيل كثيرة «لكشف» العسل المغشوش: إسقاطه في كوب ماء، أو تقريب لهب منه، أو سكبه على ورقة، أو مراقبة تبلّوره. هي سهلة التجربة، وهنا بالضبط تكمن المشكلة: فهي تمنح إحساساً باليقين لا تستحقه.

## لماذا تخدعك الاختبارات المنزلية؟

- **كوب الماء**: العسل الكثيف يستقر في القاع، وكذلك شراب السكر المكثّف.
- **اللهب**: يقيس أساساً نسبة الرطوبة، لا مصدر السكر.
- **التبلور**: يتعلق بنوع الأزهار التي زارها النحل. بعض الأعسال تتبلور في أيام، وأخرى لا تكاد تتبلور، وكلاهما قد يكون نقياً تماماً.

## ما يُعتدّ به: التحليل المخبري

يقيس المخبر ما لا تراه العين: نسبة الرطوبة، ومادة HMF (مؤشر على التسخين أو التقادم)، وأنواع السكريات، وحبوب اللقاح التي تكشف المصدر النباتي والجغرافي. بهذه النتائج يمكن الجزم بأن العسل مطابق لما هو مكتوب على عبوته.

> في كنوز العافية، تُؤخذ عينة كل دفعة من عند النحّال، وتُختم، ثم تُحلَّل قبل عرضها للبيع.

## تحقّق في ثلاث ثوانٍ

تحمل كل عبوة رمز QR فريداً. بمسحه ترى المنحل والجهة ورقم الدفعة ونتائج التحليل. وإن كان الرمز منسوخاً أو سُحبت الدفعة من السوق، تخبرك الصفحة بذلك.

إذن، التصرف الصحيح ليس اختبار العسل في المطبخ، بل المطالبة بالدليل.`,
      fr: `On trouve sur les réseaux sociaux une foule d’astuces pour « démasquer » un faux miel : le laisser tomber dans un verre d’eau, en approcher une flamme, le verser sur du papier, observer s’il cristallise. Elles sont faciles à essayer, et c’est bien leur problème : elles donnent une impression de certitude qu’elles ne méritent pas.

## Pourquoi les tests maison trompent

- **Le verre d’eau** : un miel épais tombe au fond, un sirop de sucre épaissi aussi.
- **La flamme** : elle mesure surtout l’humidité, pas l’origine du sucre.
- **La cristallisation** : elle dépend des fleurs butinées. Certains miels cristallisent en quelques jours, d’autres presque jamais. Les deux peuvent être parfaitement purs.

## Ce qui fait foi : l’analyse en laboratoire

Un laboratoire mesure ce que l’œil ne voit pas : la teneur en eau, l’HMF (un indicateur de chauffage ou de vieillissement), les sucres présents, les pollens qui révèlent l’origine florale et géographique. Ces résultats permettent de dire si un miel correspond à ce qu’annonce son étiquette.

> Chez Kounouz Alafiya, chaque lot est prélevé chez l’apiculteur, scellé, puis analysé avant d’être mis en vente.

## Vérifier en trois secondes

Chaque pot porte un code QR unique. En le scannant, vous voyez le rucher, la région, le numéro de lot et les résultats d’analyse. Si le code a été copié ou si le lot a été retiré, la page vous le dit.

Le bon réflexe n’est donc pas de tester votre miel dans la cuisine, mais de demander la preuve.`,
      en: `Social media is full of tricks to “expose” fake honey: drop it in a glass of water, hold a flame to it, pour it on paper, watch whether it crystallises. They are easy to try, and that is exactly the problem: they give a feeling of certainty they don’t deserve.

## Why home tests mislead

- **The glass of water**: thick honey sinks to the bottom, and so does thickened sugar syrup.
- **The flame**: it mostly measures moisture, not where the sugar comes from.
- **Crystallisation**: it depends on the flowers the bees visited. Some honeys crystallise within days, others hardly ever. Both can be perfectly pure.

## What counts: laboratory analysis

A laboratory measures what the eye cannot see: moisture content, HMF (an indicator of heating or ageing), the sugars present, and the pollen that reveals floral and geographical origin. These results show whether a honey matches what its label claims.

> At Kounouz Alafiya, every batch is sampled at the beekeeper’s, sealed, then analysed before it goes on sale.

## Check in three seconds

Every jar carries a unique QR code. Scan it to see the apiary, the region, the batch number and the lab results. If the code has been copied or the batch withdrawn, the page tells you.

So the right reflex is not to test your honey in the kitchen, but to ask for proof.`,
    },
  },
  {
    slug: 'miel-de-sedra-tresor-des-montagnes',
    category: 'TERROIR',
    coverImage: '/images/sedre.webp',
    featured: false,
    publishedAt: '2026-09-21T09:00:00.000Z',
    title: {
      ar: 'عسل السدر، كنز الجبال التونسية',
      fr: 'Le miel de sedra, trésor des montagnes tunisiennes',
      en: 'Sedra honey, treasure of the Tunisian mountains',
    },
    excerpt: {
      ar: 'يُجنى من السدر البري في المناطق الجافة، وهو من أكثر الأعسال طلباً في البلاد. من أين يأتي وكيف تتعرّف عليه؟',
      fr: 'Récolté sur le jujubier sauvage des régions arides, le miel de sedra est l’un des plus recherchés du pays. D’où vient-il et comment le reconnaître ?',
      en: 'Harvested from wild jujube in arid regions, sedra honey is one of the most sought-after honeys in the country. Where does it come from, and how can you recognise it?',
    },
    content: {
      ar: `ينمو السدر، أو النبق البري (Ziziphus lotus)، في الأراضي الجافة والحجرية بالوسط والجنوب التونسي. تتفتح أزهاره الصغيرة في عزّ الصيف، حين يكون كل شيء تقريباً قد جفّ، فتصبح للنحل مورداً نادراً وثميناً.

## عسل ذو شخصية

عسل السدر كهرماني اللون، كثيف القوام، بطعم دافئ فيه لمسة خشبية ونهاية طويلة. إنتاجه محدود، لأنه مرتبط بموسم إزهار قصير وبأمطار السنة. هذا ما يفسّر ثمنه، ويفسّر أيضاً كثرة تقليده.

## من أين يأتي؟

ينقل النحّالون خلاياهم صيفاً إلى أقرب نقطة من أشجار السدر، خاصة في جهات القيروان وسيدي بوزيد وقفصة والكاف. ويتبع النحّال الإزهار أحياناً على مسافة مئات الكيلومترات.

## كيف تتأكد مما تشتريه؟

- احذر الأسعار المنخفضة بشكل غير طبيعي: إنتاج عسل السدر الحقيقي مكلف.
- اسأل عن المصدر بدقة: الجهة والمنحل وتاريخ الجني.
- اطلب تحليل حبوب اللقاح: فهو يؤكد غلبة لقاح السدر.

> على كل عبوة عسل سدر من كنوز العافية، يتيح رمز QR الاطلاع على المنحل الأصلي ونتائج المخبر.`,
      fr: `Le sedra — le jujubier sauvage, Ziziphus lotus — pousse sur les terres sèches et caillouteuses du centre et du sud tunisien. Ses petites fleurs s’ouvrent au cœur de l’été, quand presque tout le reste a séché : pour les abeilles, c’est une ressource rare et précieuse.

## Un miel de caractère

Le miel de sedra est ambré, épais, avec un goût chaud, légèrement boisé, et une longue finale. Sa production est limitée : elle dépend d’une floraison courte et des pluies de l’année. C’est ce qui explique son prix, et aussi pourquoi il est si souvent imité.

## D’où vient-il ?

Les apiculteurs transhumants installent l’été leurs ruches au plus près des jujubiers, notamment dans les régions de Kairouan, Sidi Bouzid, Gafsa et du Kef. L’apiculteur suit la floraison, parfois sur plusieurs centaines de kilomètres.

## Comment être sûr de ce que l’on achète ?

- Méfiez-vous des prix anormalement bas : un vrai miel de sedra coûte cher à produire.
- Demandez l’origine précise : région, rucher, date de récolte.
- Exigez une analyse pollinique : elle confirme la présence dominante du pollen de jujubier.

> Sur chaque pot de miel de sedra Kounouz, le code QR donne accès au rucher d’origine et aux résultats du laboratoire.`,
      en: `Sedra — the wild jujube, Ziziphus lotus — grows on the dry, stony land of central and southern Tunisia. Its small flowers open in the heart of summer, when almost everything else has dried up: for bees, a rare and precious resource.

## A honey with character

Sedra honey is amber and thick, with a warm, slightly woody taste and a long finish. Production is limited: it depends on a short flowering season and on the year’s rainfall. That explains its price, and also why it is so often imitated.

## Where does it come from?

Migratory beekeepers move their hives in summer as close as possible to jujube stands, notably around Kairouan, Sidi Bouzid, Gafsa and Le Kef. The beekeeper follows the bloom, sometimes over hundreds of kilometres.

## How can you be sure of what you buy?

- Be wary of unusually low prices: real sedra honey is costly to produce.
- Ask for the precise origin: region, apiary, harvest date.
- Ask for a pollen analysis: it confirms that jujube pollen dominates.

> On every jar of Kounouz sedra honey, the QR code leads to the apiary of origin and the laboratory results.`,
    },
  },
  {
    slug: 'de-la-ruche-au-pot',
    category: 'TRACABILITE',
    coverImage: '/images/beekeeper.webp',
    featured: false,
    publishedAt: '2026-09-15T09:00:00.000Z',
    title: {
      ar: 'من الخلية إلى العبوة: ست مراحل لعسل موثّق',
      fr: 'De la ruche au pot : les six étapes d’un miel vérifié',
      en: 'From hive to jar: the six steps of a verified honey',
    },
    excerpt: {
      ar: 'طلب النحّال، عينة مختومة، مخبر، قرار، ثم الملصق: هذا كل ما يحدث قبل أن تصل العبوة إلى بيتك.',
      fr: 'Demande de l’apiculteur, prélèvement scellé, laboratoire, décision, étiquetage : voici tout ce qui se passe avant qu’un pot n’arrive chez vous.',
      en: 'Beekeeper’s request, sealed sample, laboratory, decision, labelling: here is everything that happens before a jar reaches you.',
    },
    content: {
      ar: `لا يكتفي عسل كنوز العافية بوعد مكتوب على ملصق. فقبل عرضه للبيع، يمرّ بست مراحل، كل واحدة منها مسجّلة ومؤرّخة وموقّعة.

## 1. طلب النحّال

يصرّح المنتج بدفعته: المصدر النباتي، والمنحل، والكمية، وتاريخ الجني. وتُراجَع وثائقه قبل أي خطوة أخرى.

## 2. أخذ العينة في المنحل

يتنقّل عون ميداني إلى المنحل ويأخذ العينة بنفسه. لا يرسلها المنتج، وهذا ما يمنع أي استبدال.

## 3. الختم

تُغلق العينة بختم مرقّم وتُصوَّر. ويُتتبّع كل انتقال لها من يد إلى يد حتى المخبر.

## 4. التحليل المخبري

يقيس مخبر معتمد خاصة الرطوبة ومادة HMF والسكريات وحبوب اللقاح. ويُحتفظ بجزء من العينة كمرجع لتحليل مضاد عند الحاجة.

## 5. القرار

يقارن فريق الجودة النتائج بالمتطلبات. فإما أن تُوثَّق الدفعة، وإما أن تُرفض مع ذكر السبب.

## 6. العبوة ورمزها

تُعبّأ الدفعة المقبولة وتحصل كل عبوة على رمز فريد. بمسحه تجد هذه القصة كاملة.

> إن ظهر شك بعد البيع، يمكن لكنوز العافية تعليق الدفعة، فتُظهر صفحة التحقق ذلك فوراً.`,
      fr: `Un miel Kounouz ne se contente pas d’une promesse sur une étiquette. Avant d’être mis en vente, il franchit six étapes, chacune enregistrée, datée et signée.

## 1. La demande de l’apiculteur

Le producteur déclare son lot : origine florale, rucher, quantité, date de récolte. Ses documents sont contrôlés avant toute suite.

## 2. Le prélèvement sur place

Un agent de terrain se rend au rucher et prélève lui-même l’échantillon. Le producteur ne l’envoie pas : c’est ce qui rend toute substitution impossible.

## 3. Le scellé

L’échantillon est fermé par un scellé numéroté et photographié. Chaque passage de main en main est tracé jusqu’au laboratoire.

## 4. L’analyse en laboratoire

Un laboratoire agréé mesure notamment l’humidité, l’HMF, les sucres et les pollens. Une part de l’échantillon est conservée comme référence pour une éventuelle contre-analyse.

## 5. La décision

L’équipe qualité compare les résultats aux exigences. Le lot est vérifié… ou refusé, avec un motif.

## 6. Le pot et son code QR

Le lot approuvé est conditionné et chaque pot reçoit un code unique. En le scannant, vous retrouvez toute cette histoire.

> Si un doute apparaît après la vente, Kounouz peut suspendre un lot : la page de vérification l’affiche immédiatement.`,
      en: `A Kounouz honey does not settle for a promise on a label. Before it goes on sale, it passes six steps, each one recorded, dated and signed.

## 1. The beekeeper’s request

The producer declares the batch: floral source, apiary, quantity, harvest date. Their documents are checked before anything else happens.

## 2. Sampling on site

A field agent travels to the apiary and takes the sample personally. The producer does not send it: that is what rules out substitution.

## 3. The seal

The sample is closed with a numbered seal and photographed. Every hand-over is traced all the way to the laboratory.

## 4. Laboratory analysis

An accredited laboratory measures moisture, HMF, sugars and pollen, among others. Part of the sample is kept as a reference for a possible counter-analysis.

## 5. The decision

The quality team compares the results with the requirements. The batch is verified… or rejected, with a reason.

## 6. The jar and its QR code

The approved batch is packed and each jar receives a unique code. Scan it and you will find this whole story.

> If a doubt arises after the sale, Kounouz can suspend a batch: the verification page shows it immediately.`,
    },
  },
  {
    slug: 'bien-conserver-son-miel',
    category: 'CONSEILS',
    coverImage: '/images/3sal.webp',
    featured: false,
    publishedAt: '2026-09-08T09:00:00.000Z',
    title: {
      ar: 'كيف تحفظ عسلك: التبلور والحرارة والأفكار الخاطئة',
      fr: 'Bien conserver son miel : cristallisation, chaleur et idées reçues',
      en: 'Storing honey well: crystallisation, heat and common myths',
    },
    excerpt: {
      ar: 'تجمّد عسلك؟ هذه علامة جيدة في الغالب. نصائحنا لحفظه طويلاً وإعادته سائلاً دون إفساده.',
      fr: 'Votre miel a durci ? C’est plutôt bon signe. Nos conseils pour le garder longtemps et le rendre à nouveau fluide sans l’abîmer.',
      en: 'Has your honey hardened? That is usually a good sign. Our tips to keep it for a long time and make it runny again without damaging it.',
    },
    content: {
      ar: `العسل من الأغذية القليلة التي تُحفظ مدة طويلة جداً، بشرط تجنّب بعض الأخطاء التي تفسده.

## التبلور ليس عيباً

كل الأعسال تتبلور في النهاية، بسرعة تختلف حسب الأزهار التي جُني منها. إنها ظاهرة طبيعية لا تغيّر جودة العسل ولا خصائصه. كما أن العسل الذي يبقى سائلاً سنوات ليس مشبوهاً بالضرورة، فبعض الأنواع أبطأ تبلوراً فحسب.

## لإعادته سائلاً دون إفساده

- ضع العبوة في حمّام مائي دافئ لا تتجاوز حرارته 40 درجة.
- حرّكه بلطف، ثم اتركه يبرد في حرارة الغرفة.
- تجنّب الميكروويف والماء المغلي: فالحرارة تُتلف الإنزيمات وترفع نسبة HMF.

## عادات يومية سليمة

- أغلق العبوة جيداً: العسل يمتص رطوبة الهواء وقد يتخمّر.
- احفظه بعيداً عن الضوء، بين 15 و25 درجة، وبعيداً عن مواقد الطبخ.
- استعمل ملعقة نظيفة وجافة.
- لا حاجة إلى الثلاجة: فهي تسرّع التبلور.

> لا تُعطِ العسل أبداً لطفل دون السنة من عمره، ويوصي بعض الأطباء بالانتظار حتى سنتين. استشر طبيب الأطفال.`,
      fr: `Le miel est l’un des rares aliments qui se conservent très longtemps. Encore faut-il éviter les quelques erreurs qui l’altèrent.

## La cristallisation n’est pas un défaut

Tous les miels finissent par cristalliser, plus ou moins vite selon les fleurs d’origine. C’est un phénomène naturel, qui ne change ni la qualité ni les propriétés du miel. Un miel qui reste liquide pendant des années n’est pas pour autant suspect : certaines variétés sont simplement plus lentes.

## Le rendre fluide sans l’abîmer

- Placez le pot au bain-marie, dans une eau tiède qui ne dépasse pas 40 °C.
- Remuez doucement, puis laissez refroidir à température ambiante.
- Évitez le micro-ondes et l’eau bouillante : la chaleur dégrade les enzymes et fait monter l’HMF.

## Les bons gestes au quotidien

- Refermez bien le pot : le miel absorbe l’humidité de l’air et peut fermenter.
- Conservez-le à l’abri de la lumière, entre 15 et 25 °C, loin des plaques de cuisson.
- Utilisez une cuillère propre et sèche.
- Le réfrigérateur est inutile : il accélère la cristallisation.

> Ne donnez jamais de miel à un enfant de moins d’un an ; certains médecins conseillent même d’attendre ses deux ans. Demandez l’avis de votre pédiatre.`,
      en: `Honey is one of the few foods that keeps for a very long time — provided you avoid the few mistakes that spoil it.

## Crystallisation is not a flaw

All honeys eventually crystallise, more or less quickly depending on their flowers of origin. It is a natural process that changes neither the quality nor the properties of the honey. And a honey that stays liquid for years is not necessarily suspect: some varieties are simply slower.

## Making it runny without damaging it

- Place the jar in a warm water bath that stays below 40 °C.
- Stir gently, then let it cool at room temperature.
- Avoid the microwave and boiling water: heat destroys enzymes and raises HMF.

## Good everyday habits

- Close the jar tightly: honey absorbs moisture from the air and can ferment.
- Keep it away from light, between 15 and 25 °C, and away from the hob.
- Use a clean, dry spoon.
- The fridge is unnecessary: it speeds up crystallisation.

> Never give honey to a child under one year old; some doctors even advise waiting until age two. Ask your paediatrician.`,
    },
  },
  {
    slug: 'gelee-royale-et-propolis',
    category: 'SANTE',
    coverImage: '/images/royal-jelly.webp',
    featured: false,
    publishedAt: '2026-09-02T09:00:00.000Z',
    title: {
      ar: 'غذاء الملكات والبروبوليس: كنزان من الخلية لا يجب الخلط بينهما',
      fr: 'Gelée royale et propolis : deux trésors de la ruche à ne pas confondre',
      en: 'Royal jelly and propolis: two hive treasures not to confuse',
    },
    excerpt: {
      ar: 'كلاهما يأتي من الخلية، لكنهما يختلفان في المصدر وفي الاستعمال. دليل مختصر للتمييز بينهما.',
      fr: 'Toutes deux viennent de la ruche, mais elles n’ont ni la même origine ni le même usage. Petit guide pour s’y retrouver.',
      en: 'Both come from the hive, but they differ in origin and in use. A short guide to tell them apart.',
    },
    content: {
      ar: `كثيراً ما نجدهما جنباً إلى جنب في المتاجر. ومع ذلك، لا يكاد يجمع بين غذاء الملكات والبروبوليس شيء سوى أن النحل هو من ينتجهما.

## غذاء الملكات

تفرزه الشغالات الصغيرة لتغذية كل اليرقات في أيامها الأولى، وتتغذى به الملكة طوال حياتها. مادة بيضاء مائلة إلى الصفرة، حامضة الطعم وسريعة التلف: تُحفظ في الثلاجة وتُستهلك بكميات صغيرة.

## البروبوليس (العكبر)

يصنعه النحل من راتنجات يجمعها من براعم الأشجار ولحائها، ويستعمله لسدّ شقوق الخلية وتعقيمها. لونه بني وقوامه لزج، ويُعرض عادة في شكل مستخلص أو صبغة.

## ما يجب تذكّره

- ليسا دواءً: هما مكمّلان لتغذية متوازنة ولا يعالجان مرضاً.
- قد تسبب منتجات الخلية الحساسية. استشر مختصاً في الصحة عند الشك أو الحمل أو وجود حساسية معروفة.
- كما في العسل، المصدر مهم: اختر المنتجات المعروفة والمراقبة المصدر.

> في كنوز العافية، يرتبط كل منتج معروض للبيع بمنتج معروف وبدفعة يمكن تتبّعها.`,
      fr: `On les trouve souvent côte à côte en boutique. Pourtant, la gelée royale et la propolis n’ont presque rien en commun, sinon d’être produites par les abeilles.

## La gelée royale

Sécrétée par les jeunes ouvrières, elle nourrit toutes les larves pendant leurs premiers jours, et la reine pendant toute sa vie. C’est une substance blanchâtre au goût acidulé, très fragile : elle se conserve au réfrigérateur et se consomme en petites quantités.

## La propolis

Les abeilles la fabriquent à partir de résines récoltées sur les bourgeons et l’écorce des arbres, et s’en servent pour colmater et assainir la ruche. Brune et collante, elle est généralement proposée en extrait ou en teinture.

## Ce qu’il faut garder en tête

- Ce ne sont pas des médicaments : ils complètent une alimentation équilibrée, ils ne soignent pas une maladie.
- Les produits de la ruche peuvent provoquer des allergies. Demandez conseil à un professionnel de santé en cas de doute, de grossesse ou d’allergie connue.
- Comme pour le miel, l’origine compte : préférez les produits dont la provenance est connue et contrôlée.

> Chez Kounouz Alafiya, chaque produit mis en vente est rattaché à un producteur identifié et à un lot tracé.`,
      en: `They often sit side by side in shops. Yet royal jelly and propolis have almost nothing in common, except that bees make them.

## Royal jelly

Secreted by young worker bees, it feeds all larvae during their first days, and the queen throughout her life. It is a whitish substance with a tangy taste, and very fragile: keep it in the fridge and take it in small amounts.

## Propolis

Bees make it from resins collected on tree buds and bark, and use it to seal and sanitise the hive. Brown and sticky, it is usually sold as an extract or tincture.

## What to keep in mind

- They are not medicines: they complement a balanced diet, they do not cure disease.
- Hive products can cause allergies. Ask a health professional if in doubt, if pregnant or if you have a known allergy.
- As with honey, origin matters: choose products whose provenance is known and checked.

> At Kounouz Alafiya, every product on sale is linked to an identified producer and a traceable batch.`,
    },
  },
];
