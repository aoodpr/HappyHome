/**
 * Construction stages. The timeline value t runs continuously from 0 to
 * STAGES.length; stage i occupies [i, i+1).
 */
export const STAGES = [
  {
    id: 'site', weeks: [1, 2],
    en: {
      name: 'Mobilisation & Survey',
      desc: 'The plot is cleared and fenced, the site office is set up and surveyors set out the structural grid (axes 1–10, A–L) on the ground.',
      tasks: ['Clear & level the plot', 'Erect site hoarding & office', 'Set out grid lines with total station', 'Mark footing positions'],
    },
    ar: {
      name: 'التجهيز والمساحة',
      desc: 'تنظيف الأرض وتسويرها وتجهيز مكتب الموقع، ويقوم المساحون بتوقيع محاور الشبكة الإنشائية (1–10، A–L) على الأرض.',
      tasks: ['تنظيف وتسوية الأرض', 'تركيب سور الموقع والمكتب', 'توقيع المحاور بجهاز المساحة', 'تحديد أماكن القواعد'],
    },
  },
  {
    id: 'excavation', weeks: [3, 5],
    en: {
      name: 'Excavation & Soil Improvement',
      desc: 'The excavator digs the foundation pit to about −1.55 m below road level. The base is compacted and replaced with class‑III fill where needed.',
      tasks: ['Excavate to foundation level', 'Dewater & trim pit sides', 'Compact sub-base', 'Anti-termite treatment'],
    },
    ar: {
      name: 'الحفر وتحسين التربة',
      desc: 'تقوم الحفارة بحفر منسوب الأساسات إلى حوالي −1.55 م تحت منسوب الطريق، ثم دمك القاع واستبدال التربة عند الحاجة.',
      tasks: ['الحفر حتى منسوب التأسيس', 'تسوية جوانب الحفر', 'دمك طبقة الأساس', 'المعالجة ضد النمل الأبيض'],
    },
  },
  {
    id: 'footings', weeks: [6, 9],
    en: {
      name: 'Blinding & Footings',
      desc: 'A 75 mm blinding layer is poured, then rebar cages and formwork for the isolated, combined and lift footings (F1–F7). Concrete is pumped in.',
      tasks: ['Pour 75 mm blinding concrete', 'Fix footing reinforcement', 'Install formwork', 'Pour & cure footings'],
    },
    ar: {
      name: 'النظافة والقواعد',
      desc: 'صب خرسانة نظافة بسماكة 75 مم، ثم تركيب حديد التسليح والشدات للقواعد المنفصلة والمشتركة وقاعدة المصعد (F1–F7) وصب الخرسانة.',
      tasks: ['صب خرسانة النظافة', 'تركيب حديد القواعد', 'تركيب الشدات الخشبية', 'صب ومعالجة القواعد'],
    },
  },
  {
    id: 'necks', weeks: [10, 13],
    en: {
      name: 'Neck Columns, Ground Beams & Backfill',
      desc: 'Neck columns rise from the footings and are tied together by ground beams GB1–GB3. Foundations are waterproofed and the pit is backfilled in layers.',
      tasks: ['Cast neck columns', 'Cast ground beams', 'Bitumen waterproofing', 'Backfill & compact in layers'],
    },
    ar: {
      name: 'الرقاب والميد والردم',
      desc: 'ترتفع رقاب الأعمدة من القواعد وتُربط بالميد الأرضية GB1–GB3، ثم عزل الأساسات بالبيتومين والردم على طبقات.',
      tasks: ['صب رقاب الأعمدة', 'صب الميد الأرضية', 'العزل بالبيتومين', 'الردم والدمك على طبقات'],
    },
  },
  {
    id: 'groundSlab', weeks: [14, 15],
    en: {
      name: 'Ground Slab',
      desc: 'Polythene sheet and BRC A142 mesh are laid, then the 150 mm grade slab is poured at +0.425 m.',
      tasks: ['Lay polythene membrane', 'Place BRC mesh', 'Pour 150 mm grade slab', 'Power-float the surface'],
    },
    ar: {
      name: 'البلاطة الأرضية',
      desc: 'فرش البولي إيثيلين وشبك BRC A142 ثم صب البلاطة الأرضية بسماكة 150 مم على منسوب ‎+0.425 م.',
      tasks: ['فرش النايلون العازل', 'تركيب شبك التسليح', 'صب بلاطة 150 مم', 'تسوية السطح آلياً'],
    },
  },
  {
    id: 'gfFrame', weeks: [16, 22],
    en: {
      name: 'Ground-Floor Columns & First-Floor Slab',
      desc: 'Columns C1–C7 and the lift-shaft walls are cast, then the post-tensioned first-floor slab (220 mm) is formed, reinforced and poured.',
      tasks: ['Cast ground-floor columns', 'Erect shoring & deck formwork', 'Place rebar & PT tendons', 'Pour the 220 mm PT slab'],
    },
    ar: {
      name: 'أعمدة الأرضي وسقف الأول',
      desc: 'صب الأعمدة C1–C7 وجدران بئر المصعد، ثم تنفيذ بلاطة الدور الأول مسبقة الإجهاد بسماكة 220 مم.',
      tasks: ['صب أعمدة الدور الأرضي', 'تركيب الدعامات والشدات', 'تركيب الحديد وكوابل الشد', 'صب بلاطة 220 مم'],
    },
  },
  {
    id: 'ffFrame', weeks: [23, 29],
    en: {
      name: 'First-Floor Columns & Roof Slab',
      desc: 'The structure rises: first-floor columns, the stair flights and the roof slab at +8.75 m are cast. Ground-floor shoring is stripped.',
      tasks: ['Cast first-floor columns', 'Cast stair flights', 'Form & pour roof slab', 'Strip lower shoring'],
    },
    ar: {
      name: 'أعمدة الأول وسقف السطح',
      desc: 'يرتفع الهيكل: صب أعمدة الدور الأول والدرج وبلاطة السطح على منسوب ‎+8.75 م، وفك دعامات الدور الأرضي.',
      tasks: ['صب أعمدة الدور الأول', 'صب الدرج', 'صب بلاطة السطح', 'فك الدعامات السفلية'],
    },
  },
  {
    id: 'roofRooms', weeks: [30, 33],
    en: {
      name: 'Stair & Lift Rooms, Upper Roof',
      desc: 'Stair and lift rooms are built on the roof, capped by the upper-roof slab at +12.95 m that carries two 2,500 L water tanks.',
      tasks: ['Cast roof-room columns', 'Pour upper-roof slab', 'Build parapets', 'Place water tanks'],
    },
    ar: {
      name: 'غرف الدرج والمصعد والسطح العلوي',
      desc: 'بناء غرفتي الدرج والمصعد على السطح وصب بلاطة السطح العلوي على منسوب ‎+12.95 م لحمل خزاني مياه سعة 2500 لتر.',
      tasks: ['صب أعمدة الغرف العلوية', 'صب بلاطة السطح العلوي', 'بناء الدروة', 'تركيب خزانات المياه'],
    },
  },
  {
    id: 'blockwork', weeks: [34, 40],
    en: {
      name: 'Blockwork',
      desc: 'Masons build 200 mm insulated external walls and lightweight internal partitions course by course, leaving openings for doors and windows.',
      tasks: ['Insulated external blockwork', 'Internal partitions', 'Lintels over openings', 'Parapet walls'],
    },
    ar: {
      name: 'أعمال الطابوق',
      desc: 'يبني البناؤون الجدران الخارجية المعزولة بسماكة 200 مم والقواطع الداخلية الخفيفة صفاً بصف مع ترك فتحات الأبواب والنوافذ.',
      tasks: ['الطابوق الخارجي المعزول', 'القواطع الداخلية', 'الأعتاب فوق الفتحات', 'جدران الدروة'],
    },
  },
  {
    id: 'mep', weeks: [41, 45],
    en: {
      name: 'MEP Rough-in',
      desc: 'Electrical conduits, water-supply manifolds, drainage pipes and the septic tank are installed before the walls are closed.',
      tasks: ['Electrical conduits & boxes', 'Water supply pipework', 'Drainage & septic tank', 'AC duct sleeves'],
    },
    ar: {
      name: 'التمديدات الكهروميكانيكية',
      desc: 'تمديد أنابيب الكهرباء ومشعبات المياه وأنابيب الصرف وخزان الصرف الصحي قبل إغلاق الجدران.',
      tasks: ['أنابيب وعلب الكهرباء', 'تمديدات المياه', 'الصرف وخزان التحليل', 'فتحات مجاري التكييف'],
    },
  },
  {
    id: 'plaster', weeks: [46, 51],
    en: {
      name: 'Plaster, Waterproofing & Insulation',
      desc: 'Walls are plastered inside and out. The roof receives screed, waterproofing membrane and a solar-reflective cool-roof coating.',
      tasks: ['Internal plaster', 'External render', 'Roof screed & membrane', 'Cool-roof coating'],
    },
    ar: {
      name: 'اللياسة والعزل',
      desc: 'لياسة الجدران من الداخل والخارج، ثم تنفيذ الميول وطبقة العزل المائي وطلاء السطح العاكس للحرارة.',
      tasks: ['اللياسة الداخلية', 'اللياسة الخارجية', 'ميول وعزل السطح', 'طلاء عاكس للحرارة'],
    },
  },
  {
    id: 'facade', weeks: [52, 58],
    en: {
      name: 'Façade, Windows & Doors',
      desc: '300×1200 mm stone tiles, 120 mm mouldings and texture paint finish the façade. Aluminium windows, the main door and the garage shutter are installed.',
      tasks: ['Stone cladding 300×1200', 'Mouldings & texture paint', 'Aluminium windows W1–W8', 'Main door & rolling shutter'],
    },
    ar: {
      name: 'الواجهات والنوافذ والأبواب',
      desc: 'تكسية الواجهة بالحجر 300×1200 مم والكرانيش 120 مم والدهان المحبب، وتركيب نوافذ الألمنيوم والباب الرئيسي وباب الكراج.',
      tasks: ['تكسية الحجر', 'الكرانيش والدهان', 'نوافذ الألمنيوم W1–W8', 'الباب الرئيسي وباب الكراج'],
    },
  },
  {
    id: 'interior', weeks: [59, 66],
    en: {
      name: 'Interior Finishes',
      desc: 'Marble and porcelain floors, gypsum false ceilings, paint, sanitary ware, the kitchen and wardrobes are installed. The house is furnished.',
      tasks: ['Floor tiling', 'Gypsum false ceilings', 'Painting', 'Kitchen, bathrooms & furniture'],
    },
    ar: {
      name: 'التشطيبات الداخلية',
      desc: 'تركيب أرضيات الرخام والبورسلان والأسقف الجبسية والدهانات والأدوات الصحية والمطبخ والخزائن، ثم تأثيث المنزل.',
      tasks: ['تبليط الأرضيات', 'الأسقف الجبسية', 'الدهانات', 'المطبخ والحمامات والأثاث'],
    },
  },
  {
    id: 'handover', weeks: [67, 70],
    en: {
      name: 'Landscaping & Handover',
      desc: 'Scaffolding comes down, the boundary wall and gate are finished, palms are planted and paving is laid. Welcome home!',
      tasks: ['Remove scaffolding & clean', 'Boundary wall & gates', 'Palms, planters & paving', 'Final inspection & handover'],
    },
    ar: {
      name: 'تنسيق الحدائق والتسليم',
      desc: 'فك السقالات وإنهاء السور والبوابات وزراعة النخيل وتبليط الممرات. أهلاً بك في بيتك!',
      tasks: ['فك السقالات والتنظيف', 'السور والبوابات', 'النخيل والأحواض والممرات', 'الاستلام النهائي'],
    },
  },
];

export const T_MAX = STAGES.length;
export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
