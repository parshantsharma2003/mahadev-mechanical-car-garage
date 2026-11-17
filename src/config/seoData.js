/**
 * Centralized SEO & Schema Configuration for Mahadev Mechanical Car Garage
 * Gohana, Haryana, India
 * 
 * Compliant with Google Search Central, Schema.org, and Local SEO Best Practices.
 */

export const BASE_URL = "https://mahadev-mechanical-car-garage.vercel.app";

export const BUSINESS_NAP = {
  name: "Mahadev Mechanical Car Garage",
  legalName: "Mahadev Mechanical Car Garage",
  alternateName: "Mahadev Garage Gohana",
  description: "Mahadev Mechanical Car Garage in Gohana, Haryana is a multi-brand car workshop specializing in dealer-standard mechanical servicing, Japanese-tech engine carbon cleaning, car detailing, automated AC repair, and computerized OBD-II diagnostics.",
  telephone: "+918295669463",
  telephoneDisplay: "+91 82956 69463",
  whatsapp: "918295669463",
  whatsappDisplay: "+91 82956 69463",
  email: "mahadevgaragegohana@gmail.com",
  url: BASE_URL,
  logo: `${BASE_URL}/images/logo.png`,
  image: `${BASE_URL}/images/scorpio-n-hero.webp`,
  priceRange: "₹₹",
  establishedYear: "2018",
  address: {
    streetAddress: "Near JK Garden, Gohana–Panipat Road",
    addressLocality: "Gohana",
    addressRegion: "Haryana",
    postalCode: "131301",
    addressCountry: "IN"
  },
  geo: {
    latitude: 29.1471882,
    longitude: 76.716434
  },
  openingHoursSpecification: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:30"
    },
    {
      dayOfWeek: "Sunday",
      opens: "10:00",
      closes: "16:00"
    }
  ],
  sameAs: [
    "https://youtube.com/@mahadevgaragegohana?si=kZuT5kpBOgSfW0TX",
    "https://www.instagram.com/mahadevmechanical.gohana?obrf=MTVhNjQwNjVzbnE4cA==",
    "https://www.facebook.com/share/1G2yEuMHh9/"
  ],
  areaServed: [
    {
      "@type": "City",
      "name": "Gohana"
    },
    {
      "@type": "AdministrativeArea",
      "name": "Sonipat District"
    },
    {
      "@type": "State",
      "name": "Haryana"
    }
  ]
};

export const COMMON_FAQS = [
  {
    question: "Where can I get my car serviced in Gohana?",
    answer: "You can get multi-brand car servicing at Mahadev Mechanical Car Garage, located near JK Garden on the Gohana–Panipat Road in Gohana, Haryana. The garage handles all Indian and imported passenger cars with certified synthetic engine oil, OEM filters, and computerized diagnostic tools."
  },
  {
    question: "Where is Mahadev Mechanical Car Garage located?",
    answer: "Mahadev Mechanical Car Garage is situated on the Gohana–Panipat Road near JK Garden, Gohana, Haryana 131301. It is easily reachable from Rohtak Gate, Panipat Chungi, and central Gohana with ample parking and modern repair bays."
  },
  {
    question: "What car washing services are available?",
    answer: "The garage offers thorough exterior snow foam washing, high-temperature interior steam sanitization, underchassis pressure washing, engine bay cleaning, and scratch-free microfiber drying."
  },
  {
    question: "What is the starting price of car washing?",
    answer: "Professional car washing packages at Mahadev Mechanical Car Garage start at ₹150 for basic washing, with complete snow foam wash, underbody rinse, and interior vacuum packages available."
  },
  {
    question: "Do you provide car AC servicing in Gohana?",
    answer: "Yes, automated car AC servicing is available starting at ₹999. The garage utilizes computerized AC recovery and recharge stations for deep vacuum leak testing, compressor oil top-ups, and precise R134a refrigerant charging."
  },
  {
    question: "What is included in car detailing?",
    answer: "Car detailing includes multi-stage machine compounding and swirl removal, paint restoration, high-temperature interior upholstery steam cleaning, leather conditioning, dashboard UV dressing, and windshield treatment."
  },
  {
    question: "Do you offer interior car cleaning?",
    answer: "Yes, interior car cleaning includes high-power vacuum extraction, stain removal from seats and carpets, dashboard and door panel scrubbing, and antibacterial steam sanitization to eliminate bad odors and allergens."
  },
  {
    question: "What is engine carbon cleaning with Japanese technology?",
    answer: "Engine carbon cleaning is an in-chassis decarbonization procedure using specialized Japanese-tech machinery. It dissolves stubborn carbon build-up from intake valves, combustion chambers, and catalytic converters without disassembling the engine, restoring lost mileage, smoother idle, and responsive pickup."
  },
  {
    question: "How can I book a car service appointment?",
    answer: "You can book an appointment directly through this website by clicking the 'Book Service' button, contacting us via WhatsApp at +91 82956 69463, or calling our workshop directly at +91 82956 69463."
  },
  {
    question: "What are the garage opening hours?",
    answer: "Mahadev Mechanical Car Garage is open Monday through Saturday from 9:00 AM to 7:30 PM. On Sundays, the workshop is open from 10:00 AM to 4:00 PM for scheduled appointments."
  }
];

export const DEDICATED_SERVICES = {
  "car-service-gohana": {
    slug: "car-service-gohana",
    path: "/car-service-gohana",
    title: "Car Service in Gohana | Multi-Brand Periodic Maintenance | Mahadev Garage",
    metaTitle: "Car Service in Gohana | Periodic Maintenance | Mahadev Garage",
    metaDescription: "Looking for reliable car service in Gohana? Mahadev Mechanical Car Garage offers multi-brand periodic maintenance, synthetic engine oil, OEM filters, and 40-point inspection starting at ₹3,499.",
    h1: "Multi-Brand Car Service in Gohana",
    subheading: "Dealer-grade periodic car maintenance, 100% genuine OEM filters, certified synthetic oils & 40-point bumper-to-bumper vehicle safety inspection.",
    startingPrice: "₹3,499",
    heroImage: "/images/periodic-service.webp",
    serviceType: "Periodic Maintenance & Mechanical Repair",
    includes: [
      "Certified synthetic engine oil replacement matching manufacturer viscosity",
      "Genuine OEM/OES oil filter & air filter replacement",
      "Spark plugs inspection and cleaning / fuel filter check",
      "Coolant, brake fluid, and power steering fluid top-up",
      "Brake pad wear inspection, disc truing check, and caliper service",
      "Suspension bush, tie rod, and steering link check",
      "Full 40-point bumper-to-bumper vehicle safety checkup"
    ],
    whenNeeded: [
      "Every 10,000 km or 12 months (whichever comes earlier)",
      "Before long highway trips or outstation journeys across Haryana",
      "Engine oil looks dark, gritty, or levels are dropping",
      "Engine feels sluggish, noisy, or fuel consumption has increased",
      "Unusual vibrations or hesitation during acceleration"
    ],
    process: [
      { step: "1", title: "Diagnostic Inspection", desc: "Initial vehicle drive, computerized OBD-II scan, and comprehensive 40-point physical check." },
      { step: "2", title: "Fluids & Filters Replacement", desc: "Engine oil drained hot, fresh synthetic oil filled, and new OEM air/oil filters installed." },
      { step: "3", title: "Brake & Underbody Overhaul", desc: "Wheels removed, brake pads cleaned and adjusted, calipers lubricated, suspension inspected." },
      { step: "4", title: "Final Quality Check & Wash", desc: "Road test verification, complimentary exterior foam rinse, and transparent digital job card delivery." }
    ],
    equipmentUsed: "Hydraulic 2-post car lift, digital OBD-II diagnostic computer, torque-spec wrenches, battery load tester, and calibrated fluid dispensers.",
    faqs: [
      {
        question: "How long does a general car service take at your Gohana garage?",
        answer: "A standard periodic car service typically takes between 2.5 to 4 hours. You can drop off your vehicle in the morning and receive it fully serviced by afternoon."
      },
      {
        question: "Do you use genuine spare parts for car service?",
        answer: "Yes, we exclusively utilize 100% genuine OEM (Original Equipment Manufacturer) and OES parts sourced from certified distributors for Maruti, Hyundai, Tata, Mahindra, Toyota, and other brands."
      },
      {
        question: "What is the starting price for a full car service package in Gohana?",
        answer: "Our full car service packages start at ₹3,499, depending on your vehicle segment (hatchback, sedan, or SUV) and engine oil specifications."
      }
    ]
  },

  "car-washing-gohana": {
    slug: "car-washing-gohana",
    path: "/car-washing-gohana",
    title: "Car Washing in Gohana | Snow Foam & Steam Wash | Mahadev Garage",
    metaTitle: "Car Washing in Gohana | Snow Foam & Steam Wash | Mahadev Garage",
    metaDescription: "Best car washing in Gohana starting at ₹150. Professional high-pressure snow foam wash, underbody flush, interior vacuuming & steam sanitization at Mahadev Garage.",
    h1: "Professional Car Washing in Gohana",
    subheading: "pH-neutral snow foam bath, high-pressure underbody mud removal, scratch-free microfiber drying, and interior vacuuming starting at just ₹150.",
    startingPrice: "₹150",
    heroImage: "/images/foam-wash.webp",
    serviceType: "Automotive Washing & Cleaning",
    includes: [
      "Thick pH-neutral snow foam soak to loosen road dirt and traffic film",
      "High-pressure underchassis wash to eliminate corrosive mud, salt, and grime",
      "Two-bucket scratch-free hand wash with plush microfiber mitts",
      "Wheel arches, alloy rims, and tire sidewall deep scrubbing",
      "Streak-free glass cleaning and streakless microfiber drying",
      "Deep interior cabin vacuuming (seats, carpets, boot area)",
      "Tyre dressing and dashboard anti-static polish"
    ],
    whenNeeded: [
      "Weekly or fortnightly routine car cleanliness maintenance",
      "After driving on dusty rural Haryana roads or during monsoon rains",
      "When mud, bird droppings, or tree sap adhere to vehicle clear coat",
      "Before festivals, family weddings, or important road journeys"
    ],
    process: [
      { step: "1", title: "Pre-Rinse & Underbody Flush", desc: "High-pressure water rinse to knock off loose mud, stones, and underbody road debris." },
      { step: "2", title: "Snow Foam Soak", desc: "Vehicle covered in dense pH-neutral snow foam to encapsulate and lift grit safely." },
      { step: "3", title: "Two-Bucket Wash", desc: "Gentle agitation with dedicated microfiber wash mitts to prevent swirl marks." },
      { step: "4", title: "Drying & Detailing Dressing", desc: "Plush drying towels, air-blower crevices water removal, tire dressing, and dashboard wipe." }
    ],
    equipmentUsed: "Commercial high-pressure washers (150+ bar), pneumatic snow foam cannons, dual-filter pure water supply, and high-pile microfiber towels.",
    faqs: [
      {
        question: "What is the starting price of car washing in Gohana?",
        answer: "Basic car exterior washing starts at just ₹150. Comprehensive packages including snow foam, underchassis flush, and interior vacuuming are available at very economical rates."
      },
      {
        question: "Does your car wash cause swirl marks or paint scratches?",
        answer: "No. We strictly practice a two-bucket washing method using pH-neutral automotive foam and premium microfiber wash mitts, ensuring your paint clear coat remains glossy and scratch-free."
      },
      {
        question: "Do you wash the car underbody?",
        answer: "Yes, our high-pressure underbody jet eliminates caked mud, dust, and corrosive salts from underchassis suspension components and chassis rails."
      }
    ]
  },

  "car-detailing-gohana": {
    slug: "car-detailing-gohana",
    path: "/car-detailing-gohana",
    title: "Car Detailing in Gohana | Paint Correction & Compounding | Mahadev Garage",
    metaTitle: "Car Detailing in Gohana | Paint Correction | Mahadev Garage",
    metaDescription: "Professional car detailing in Gohana. Multi-stage machine compounding, swirl & scratch removal, interior steam extraction, and deep shine restoration at Mahadev Garage.",
    h1: "Car Detailing & Paint Correction in Gohana",
    subheading: "Showroom-mirror finish restoration with dual-action machine compounding, swirl mark removal, paint sealant protection, and intensive cabin steam sanitization.",
    startingPrice: "On Inspection / Economical",
    heroImage: "/images/car-detailing.webp",
    serviceType: "Vehicle Detailing & Aesthetics",
    includes: [
      "Decontamination wash & clay bar treatment to remove bonded surface fallout",
      "Multi-stage machine compounding to eliminate swirl marks, light scratches, and oxidation",
      "Finishing polish for deep optical gloss, clarity, and wet-look paint reflection",
      "Protective hydrophobic paint sealant application for UV defense",
      "Deep fabric upholstery steam extraction and stain lifting",
      "Leather seats gentle cleaning and conditioning to prevent cracks",
      "Dashboard, door trims, and console UV rejuvenation"
    ],
    whenNeeded: [
      "Car paint has circular swirl marks, dullness, or spider-webbing under sunlight",
      "Car interior smells musty, has beverage spills, or accumulated ground-in dirt",
      "Preparing a vehicle for festival occasions or before selling for maximum resale value",
      "Restoring pre-owned or older cars to showroom cosmetic appearance"
    ],
    process: [
      { step: "1", title: "Decontamination & Masking", desc: "Iron fallout wash, clay bar paint smoothing, and protective masking of rubber trim and badges." },
      { step: "2", title: "Dual-Action Machine Compounding", desc: "Precision cutting compound to gently level micro-imperfections in the clear coat." },
      { step: "3", title: "Jeweling Polish & Sealant", desc: "Ultra-fine polishing pad application to bring out vibrant paint color and hydrophobic seal." },
      { step: "4", title: "Deep Interior Extraction", desc: "High-temperature steam dislodges bacteria, dust mites, and stains from cabin fabrics." }
    ],
    equipmentUsed: "Dual-action orbital polishers, imported foam and microfiber cutting pads, high-temperature steam extraction units, and digital paint depth gauges.",
    faqs: [
      {
        question: "How is detailing different from normal car washing?",
        answer: "A car wash removes surface dirt, while detailing is a restorative process involving machine compounding to remove swirl marks, restore clear coat gloss, and deeply sanitize interior fabrics using steam extraction."
      },
      {
        question: "Can detailing remove deep scratches from my car?",
        answer: "Detailing and compounding remove clear-coat surface scratches, swirl marks, bird droppings etching, and oxidation. Scratches that have penetrated through to the base metal or primer require panel denting and painting."
      }
    ]
  },

  "car-ac-service-gohana": {
    slug: "car-ac-service-gohana",
    path: "/car-ac-service-gohana",
    title: "Car AC Service & Repair in Gohana | Automated Gas Recharge | Mahadev Garage",
    metaTitle: "Car AC Service in Gohana | AC Repair & Gas Recharge | Mahadev Garage",
    metaDescription: "Beat Haryana summers with automated car AC service in Gohana starting at ₹999. Deep vacuum leak test, compressor oil, R134a gas recharge & cooling coil cleaning.",
    h1: "Automated Car AC Service & Repair in Gohana",
    subheading: "Computerized automotive AC station for refrigerant recovery, vacuum moisture dehydration, leak detection, and precision R134a gas recharge starting at ₹999.",
    startingPrice: "₹999",
    heroImage: "/images/ac-service.webp",
    serviceType: "Automotive Air Conditioning Repair",
    includes: [
      "Automated refrigerant evacuation and recovery without gas wastage",
      "Deep vacuum leak testing under negative pressure to detect micro-punctures",
      "Polyolester / PAG compressor oil top-up for smooth compressor operation",
      "Precise gram-weight R134a refrigerant recharge matching OEM specs",
      "Cabin AC filter (pollen filter) inspection, cleaning, or replacement",
      "AC condenser coil pressure cleaning for optimal heat exchange",
      "Vent temperature drop test and blower motor airflow verification"
    ],
    whenNeeded: [
      "Car AC is blowing warm or lukewarm air even at maximum cooling setting",
      "AC takes too long to cool the cabin during intense Haryana summer heat",
      "Foul, musty, or vinegar smell emerges when turning on the AC blower",
      "Unusual squeaking, grinding, or hissing sounds when the AC compressor engages",
      "Water leaking into the front passenger footwell area"
    ],
    process: [
      { step: "1", title: "Thermal & Pressure Diagnosis", desc: "Digital thermometer vent check and manifold pressure test to evaluate compressor health." },
      { step: "2", title: "Automated Gas Recovery & Vacuum", desc: "Machine recovers old refrigerant and pulls deep 20-minute vacuum to boil off moisture." },
      { step: "3", title: "Leak Check & Compressor Oil", desc: "Vacuum decay monitoring to confirm system airtightness, followed by fresh PAG oil injection." },
      { step: "4", title: "Gram-Precise Refrigerant Recharge", desc: "Automated injection of exact manufacturer-specified R134a weight for ice-cold cooling." }
    ],
    equipmentUsed: "Fully automated computerized automotive AC station, digital electronic refrigerant scales, infrared leak detection, and digital airflow thermometers.",
    faqs: [
      {
        question: "What is the cost of car AC service in Gohana?",
        answer: "Our automated car AC servicing packages start at ₹999. Final costs depend on whether your system requires minor gas top-up, full evacuation and recharge, or cabin filter replacement."
      },
      {
        question: "Why is automated AC recharge better than manual cylinder gas filling?",
        answer: "Manual roadside cylinder filling cannot measure exact gas weight or remove internal moisture. Our automated station weighs refrigerant to the exact gram and pulls deep vacuum to prevent compressor failure and ensure maximum cooling."
      },
      {
        question: "How often should I service my car's AC?",
        answer: "In Haryana's extreme climate with summer temperatures exceeding 42°C, an annual pre-summer AC check and cabin filter cleaning are strongly recommended."
      }
    ]
  },

  "car-interior-cleaning-gohana": {
    slug: "car-interior-cleaning-gohana",
    path: "/car-interior-cleaning-gohana",
    title: "Interior Car Cleaning in Gohana | Deep Steam Sanitization | Mahadev Garage",
    metaTitle: "Interior Car Cleaning in Gohana | Steam Sanitization | Mahadev Garage",
    metaDescription: "Deep interior car cleaning in Gohana. High-power vacuuming, fabric upholstery stain extraction, dashboard UV dressing & antibacterial steam cleaning at Mahadev Garage.",
    h1: "Deep Interior Car Cleaning & Steam Sanitization in Gohana",
    subheading: "Restore a clean, germ-free, and fresh-smelling cabin with professional vacuum extraction, fabric stain lifting, leather care, and high-temperature steam sanitization.",
    startingPrice: "Economical / Service Bay",
    heroImage: "/images/steam-wash.webp",
    serviceType: "Cabin Sanitization & Upholstery Care",
    includes: [
      "Thorough high-suction vacuum extraction of seats, carpet flooring, crevices, and boot",
      "High-temperature steam sanitization to eliminate bacteria, mold, and odor-causing germs",
      "Fabric upholstery active foam scrubbing to lift embedded beverage and food stains",
      "Leather seats pH-balanced gentle scrub and moisture conditioning",
      "Roof headliner gentle dry-cleaning without sagging risk",
      "Dashboard, center console, door panels, and cup holders deep detailing",
      "AC duct antibacterial steam fumigation to kill mold inside air vents"
    ],
    whenNeeded: [
      "Spilled tea, coffee, milk, or food has left persistent stains or bad odors",
      "Dust and sand have accumulated deep inside seat cushion fabrics",
      "Smokers or pets have traveled in the car, leaving lingering smells",
      "Pre-monsoon or seasonal deep hygiene maintenance for family health"
    ],
    process: [
      { step: "1", title: "Dry Extraction", desc: "High-suction vacuuming to pull out loose sand, hair, and dust from seats and carpets." },
      { step: "2", title: "Stain Spot Treatment", desc: "Specialized automotive fabric cleaners applied to spots, followed by gentle agitation." },
      { step: "3", title: "Thermal Steam Sanitization", desc: "140°C dry steam directed into upholstery fibers and AC vents to sanitize and neutralize odors." },
      { step: "4", title: "UV Dressing & Drying", desc: "Non-greasy matte UV dressing applied to plastics and high-velocity blower drying." }
    ],
    equipmentUsed: "Commercial automotive wet/dry vacuum cleaners, high-pressure steam boilers, soft horsehair interior brushes, and microfiber extraction pads.",
    faqs: [
      {
        question: "Will interior cleaning make my car seats wet for days?",
        answer: "No. We utilize low-moisture steam extraction and high-velocity dryers, ensuring your vehicle cabin is dry, fresh, and ready to drive within a couple of hours."
      },
      {
        question: "Can steam cleaning eliminate bad smells from car AC ducts?",
        answer: "Yes, our high-temperature steam penetrates deep inside the HVAC blower vents, killing bacteria and mildew that cause stale, musty odors."
      }
    ]
  }
};

/**
 * Route Metadata mapping for all indexable pages
 */
export const ROUTES_METADATA = {
  "/": {
    path: "/",
    title: "Mahadev Mechanical Car Garage | Complete Car Care in Gohana, Haryana",
    metaTitle: "Mahadev Mechanical Car Garage | Car Service & Repair | Gohana",
    metaDescription: "Mahadev Mechanical Car Garage in Gohana, Haryana. Complete car care under one roof: multi-brand servicing, Japanese-tech engine carbon cleaning, car detailing, AC service & foam wash.",
    canonical: `${BASE_URL}/`,
    breadcrumbName: "Home"
  },
  "/services": {
    path: "/services",
    title: "Car Services in Gohana | Periodic Maintenance, AC Repair & Detailing | Mahadev Garage",
    metaTitle: "Car Services in Gohana | Maintenance & Repair | Mahadev Garage",
    metaDescription: "Explore complete car repair and maintenance services in Gohana at Mahadev Garage: periodic service, Japanese carbon cleaning, automated AC service, detailing & foam washing.",
    canonical: `${BASE_URL}/services`,
    breadcrumbName: "Services"
  },
  "/about": {
    path: "/about",
    title: "About Mahadev Mechanical Car Garage | Trusted Workshop in Gohana Since 2018",
    metaTitle: "About Us | Mahadev Mechanical Car Garage Gohana",
    metaDescription: "Learn about Mahadev Mechanical Car Garage in Gohana, Haryana. Established in 2018 with modern diagnostic machines, genuine OEM spare parts, and skilled multi-brand mechanics.",
    canonical: `${BASE_URL}/about`,
    breadcrumbName: "About Us"
  },
  "/contact": {
    path: "/contact",
    title: "Contact Mahadev Mechanical Car Garage | Gohana, Haryana | Phone & Location",
    metaTitle: "Contact Us | Mahadev Mechanical Car Garage Gohana",
    metaDescription: "Visit Mahadev Mechanical Car Garage near JK Garden, Gohana–Panipat Road, Gohana. Call +91 82956 69463 or message on WhatsApp for appointments and road directions.",
    canonical: `${BASE_URL}/contact`,
    breadcrumbName: "Contact & Location"
  },
  "/gallery": {
    path: "/gallery",
    title: "Workshop Gallery | Real Customer Vehicle Transformations | Mahadev Garage Gohana",
    metaTitle: "Workshop Gallery | Mahadev Mechanical Car Garage Gohana",
    metaDescription: "Browse genuine photos of customer vehicles serviced at Mahadev Mechanical Car Garage in Gohana: car detailing, Japanese engine carbon cleaning, automated AC service & foam wash.",
    canonical: `${BASE_URL}/gallery`,
    breadcrumbName: "Gallery"
  },
  "/reviews": {
    path: "/reviews",
    title: "Customer Reviews & Ratings | Mahadev Mechanical Car Garage Gohana",
    metaTitle: "Customer Reviews | Mahadev Mechanical Car Garage Gohana",
    metaDescription: "Read genuine customer reviews and experiences for Mahadev Mechanical Car Garage in Gohana. Transparent pricing, skilled mechanics, and trusted multi-brand car servicing.",
    canonical: `${BASE_URL}/reviews`,
    breadcrumbName: "Customer Reviews"
  },
  "/happy-customers": {
    path: "/happy-customers",
    title: "Happy Customers | Mahadev Mechanical Car Garage Gohana",
    metaTitle: "Happy Customers | Mahadev Mechanical Car Garage Gohana",
    metaDescription: "See our satisfied customer reviews and multi-brand car repair experiences at Mahadev Mechanical Car Garage in Gohana, Haryana.",
    canonical: `${BASE_URL}/happy-customers`,
    breadcrumbName: "Happy Customers"
  },
  "/book-appointment": {
    path: "/book-appointment",
    title: "Book Car Service Appointment | Mahadev Mechanical Car Garage Gohana",
    metaTitle: "Book Car Service Appointment | Mahadev Garage Gohana",
    metaDescription: "Book your car service, AC repair, detailing, or washing appointment online at Mahadev Mechanical Car Garage in Gohana. Choose your preferred service and date.",
    canonical: `${BASE_URL}/book-appointment`,
    breadcrumbName: "Book Appointment"
  },
  "/car-service-gohana": {
    path: "/car-service-gohana",
    title: DEDICATED_SERVICES["car-service-gohana"].title,
    metaTitle: DEDICATED_SERVICES["car-service-gohana"].metaTitle,
    metaDescription: DEDICATED_SERVICES["car-service-gohana"].metaDescription,
    canonical: `${BASE_URL}/car-service-gohana`,
    breadcrumbName: "Car Service in Gohana"
  },
  "/car-washing-gohana": {
    path: "/car-washing-gohana",
    title: DEDICATED_SERVICES["car-washing-gohana"].title,
    metaTitle: DEDICATED_SERVICES["car-washing-gohana"].metaTitle,
    metaDescription: DEDICATED_SERVICES["car-washing-gohana"].metaDescription,
    canonical: `${BASE_URL}/car-washing-gohana`,
    breadcrumbName: "Car Washing in Gohana"
  },
  "/car-detailing-gohana": {
    path: "/car-detailing-gohana",
    title: DEDICATED_SERVICES["car-detailing-gohana"].title,
    metaTitle: DEDICATED_SERVICES["car-detailing-gohana"].metaTitle,
    metaDescription: DEDICATED_SERVICES["car-detailing-gohana"].metaDescription,
    canonical: `${BASE_URL}/car-detailing-gohana`,
    breadcrumbName: "Car Detailing in Gohana"
  },
  "/car-ac-service-gohana": {
    path: "/car-ac-service-gohana",
    title: DEDICATED_SERVICES["car-ac-service-gohana"].title,
    metaTitle: DEDICATED_SERVICES["car-ac-service-gohana"].metaTitle,
    metaDescription: DEDICATED_SERVICES["car-ac-service-gohana"].metaDescription,
    canonical: `${BASE_URL}/car-ac-service-gohana`,
    breadcrumbName: "Car AC Service in Gohana"
  },
  "/car-interior-cleaning-gohana": {
    path: "/car-interior-cleaning-gohana",
    title: DEDICATED_SERVICES["car-interior-cleaning-gohana"].title,
    metaTitle: DEDICATED_SERVICES["car-interior-cleaning-gohana"].metaTitle,
    metaDescription: DEDICATED_SERVICES["car-interior-cleaning-gohana"].metaDescription,
    canonical: `${BASE_URL}/car-interior-cleaning-gohana`,
    breadcrumbName: "Interior Cleaning in Gohana"
  }
};

/**
 * Builds standard AutoRepair + Organization Schema
 */
export function buildAutoRepairSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${BASE_URL}/#autorepair`,
    "name": BUSINESS_NAP.name,
    "legalName": BUSINESS_NAP.legalName,
    "alternateName": BUSINESS_NAP.alternateName,
    "description": BUSINESS_NAP.description,
    "url": BASE_URL,
    "telephone": BUSINESS_NAP.telephone,
    "priceRange": BUSINESS_NAP.priceRange,
    "image": [
      `${BASE_URL}/images/scorpio-n-hero.webp`,
      `${BASE_URL}/images/periodic-service.webp`,
      `${BASE_URL}/images/foam-wash.webp`,
      `${BASE_URL}/images/ac-service.webp`,
      `${BASE_URL}/images/carbon-cleaning.webp`
    ],
    "logo": BUSINESS_NAP.logo,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": BUSINESS_NAP.address.streetAddress,
      "addressLocality": BUSINESS_NAP.address.addressLocality,
      "addressRegion": BUSINESS_NAP.address.addressRegion,
      "postalCode": BUSINESS_NAP.address.postalCode,
      "addressCountry": BUSINESS_NAP.address.addressCountry
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": BUSINESS_NAP.geo.latitude,
      "longitude": BUSINESS_NAP.geo.longitude
    },
    "openingHoursSpecification": BUSINESS_NAP.openingHoursSpecification.map((spec) => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": spec.dayOfWeek,
      "opens": spec.opens,
      "closes": spec.closes
    })),
    "sameAs": BUSINESS_NAP.sameAs,
    "areaServed": BUSINESS_NAP.areaServed,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Mahadev Mechanical Car Garage Automotive Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "name": "Car Washing Service",
          "description": "Exterior pH-neutral snow foam bath, high-pressure underbody mud wash, and microfiber dry.",
          "price": "150",
          "priceCurrency": "INR",
          "url": `${BASE_URL}/car-washing-gohana`
        },
        {
          "@type": "Offer",
          "name": "Automated Car AC Servicing",
          "description": "Automated refrigerant recovery, deep vacuum leak testing, compressor oil top-up, and R134a precision gas recharge.",
          "price": "999",
          "priceCurrency": "INR",
          "url": `${BASE_URL}/car-ac-service-gohana`
        },
        {
          "@type": "Offer",
          "name": "Full Periodic Car Service Package",
          "description": "Synthetic engine oil replacement, OEM oil/air filters, fluid top-up, and comprehensive 40-point safety inspection.",
          "price": "3499",
          "priceCurrency": "INR",
          "url": `${BASE_URL}/car-service-gohana`
        },
        {
          "@type": "Offer",
          "name": "Japanese-Tech Engine Carbon Cleaning",
          "description": "In-chassis hydrogen decarbonization for intake valves, combustion chamber, and catalytic converter.",
          "priceCurrency": "INR",
          "url": `${BASE_URL}/services`
        },
        {
          "@type": "Offer",
          "name": "Car Detailing & Paint Compounding",
          "description": "Multi-stage machine compounding, swirl removal, interior high-temperature steam sanitization, and protective sealant.",
          "priceCurrency": "INR",
          "url": `${BASE_URL}/car-detailing-gohana`
        }
      ]
    }
  };
}

/**
 * Builds WebSite Schema
 */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    "url": BASE_URL,
    "name": BUSINESS_NAP.name,
    "description": BUSINESS_NAP.description,
    "publisher": {
      "@id": `${BASE_URL}/#autorepair`
    },
    "inLanguage": "en-IN"
  };
}

/**
 * Builds BreadcrumbList Schema for any route
 */
export function buildBreadcrumbSchema(routePath, breadcrumbName) {
  const isHome = routePath === "/";
  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": `${BASE_URL}/`
    }
  ];

  if (!isHome) {
    items.push({
      "@type": "ListItem",
      "position": 2,
      "name": breadcrumbName || "Page",
      "item": `${BASE_URL}${routePath}`
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

/**
 * Builds FAQPage Schema from an array of FAQ items
 */
export function buildFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Builds Service Schema for a specific service page
 */
export function buildServiceSchema(service) {
  if (!service) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BASE_URL}${service.path}#service`,
    "name": service.h1,
    "serviceType": service.serviceType,
    "description": service.metaDescription,
    "provider": {
      "@id": `${BASE_URL}/#autorepair`
    },
    "areaServed": BUSINESS_NAP.areaServed,
    "offers": service.startingPrice && service.startingPrice.includes("₹") ? {
      "@type": "Offer",
      "price": service.startingPrice.replace(/[^\d]/g, ""),
      "priceCurrency": "INR",
      "url": `${BASE_URL}${service.path}`
    } : undefined
  };
}
