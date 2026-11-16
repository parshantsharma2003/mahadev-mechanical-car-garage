import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Service,
  GalleryItem,
  BusinessSetting
} from '../models/index.js';

dotenv.config();

// Genuine garage services with verified local imagery
const initialServices = [
  {
    slug: 'general-car-service',
    title: 'General Car Service',
    shortDesc: 'Engine oil change, filters, complete checkup.',
    fullDesc: 'Complete bumper-to-bumper vehicle periodic service covering certified synthetic engine oil, oil filter, air filter, spark plugs / fuel filter inspection, fluid top-up, and a detailed 40-point safety check.',
    image: '/images/periodic-service.jpg',
    tag: 'Popular',
    icon: 'Wrench',
    priceDisplay: '₹1,999 Onwards',
    basePrice: 1999,
    category: 'Periodic Service',
    highlights: ['OEM Filters & Engine Oil', '40-Point Safety Check', 'Coolant & Fluid Top-Up', 'Brake Pad Inspection'],
    isPopular: true,
    isCoreService: true,
    sortOrder: 1
  },
  {
    slug: 'car-washing',
    title: 'Car Washing',
    shortDesc: 'Foam wash, steam wash, exterior cleaning.',
    fullDesc: 'Thorough exterior and underbody cleaning using pH-neutral automotive snow foam, high-pressure washers, delicate microfiber wash mitts, and underchassis flush to remove mud, road salt, and grime.',
    image: '/images/foam-wash.jpg',
    tag: 'Quick Service',
    icon: 'Droplets',
    priceDisplay: '₹499 Onwards',
    basePrice: 499,
    category: 'Cleaning',
    highlights: ['Thick Snow Foam Soak', 'High-Pressure Underbody Wash', 'Microfiber Scratch-Free Dry', 'Tyre Dressing & Polish'],
    isPopular: false,
    isCoreService: true,
    sortOrder: 2
  },
  {
    slug: 'car-detailing',
    title: 'Car Detailing',
    shortDesc: 'Rubbing, compound, interior wash, steam wash, vacuum.',
    fullDesc: 'Showroom-finish restoration with multi-stage machine compounding and swirl removal, deep interior vacuuming, fabric upholstery steam extraction, leather conditioning, and windshield treatment.',
    image: '/images/car-detailing.jpg',
    tag: 'Deep Clean',
    icon: 'Sparkles',
    priceDisplay: '₹3,499 Onwards',
    basePrice: 3499,
    category: 'Detailing',
    highlights: ['Dual-Action Machine Buffing', 'Interior High-Temp Steam Sanitize', 'Swirl & Oxidation Removal', 'UV Dashboard Protection'],
    isPopular: true,
    isCoreService: true,
    sortOrder: 3
  },
  {
    slug: 'engine-carbon-cleaning',
    title: 'Engine Carbon Cleaning',
    shortDesc: 'Japanese technology machine for better performance.',
    fullDesc: 'Advanced in-chassis decarbonization using Japanese-tech equipment. Dissolves stubborn carbon deposits from combustion chambers, intake valves, and catalytic converters without tearing down your engine.',
    image: '/images/carbon-cleaning.jpg',
    tag: 'Specialized Tech',
    icon: 'Zap',
    priceDisplay: '₹1,799 Onwards',
    basePrice: 1799,
    category: 'Engine Care',
    highlights: ['Japanese Tech Equipment', 'Zero Engine Dismantling', 'Smoother Idle & Pickup', 'Improves Fuel Efficiency'],
    isPopular: true,
    isCoreService: true,
    sortOrder: 4
  },
  {
    slug: 'ac-servicing',
    title: 'Automated AC Servicing',
    shortDesc: 'Cooling diagnostics, gas recharge & leak testing.',
    fullDesc: 'Computerized automotive AC station for recovery, deep vacuum dehydration, leak testing, compressor oil top-up, and precise weight refrigerant recharge (R134a).',
    image: '/images/ac-service.jpg',
    tag: 'Cooling Care',
    icon: 'Snowflake',
    priceDisplay: '₹1,299 Onwards',
    basePrice: 1299,
    category: 'AC Service',
    highlights: ['Automated Gas Recovery & Charge', 'Deep Vacuum Leak Test', 'Cabin Filter Replacement', 'Vent Antibacterial Steam'],
    isPopular: false,
    isCoreService: true,
    sortOrder: 5
  },
  {
    slug: 'diagnostics-repair',
    title: 'OBD-II Computer Diagnostics',
    shortDesc: 'Live sensor telemetry, check engine light & electrical.',
    fullDesc: 'Digital scan tool diagnostics to read ECU error codes, inspect live sensor data, test alternator and battery health, and resolve complex electrical/electronic issues.',
    image: '/images/periodic-service.jpg',
    tag: 'Precision Tech',
    icon: 'Cpu',
    priceDisplay: '₹799 Onwards',
    basePrice: 799,
    category: 'Diagnostics',
    highlights: ['Full ECU Computer Scan', 'Check Engine Light Diagnosis', 'Battery & Alternator Health', 'Sensor & Wiring Repairs'],
    isPopular: false,
    isCoreService: true,
    sortOrder: 6
  },
  {
    slug: 'brake-suspension',
    title: 'Brakes & Suspension Repair',
    shortDesc: 'Disc rotor truing, caliper overhaul, shock absorbers.',
    fullDesc: 'Complete hydraulic brake bleeding, genuine ceramic/semi-metallic brake pads, disc rotor truing, link rod, bush, and shock absorber overhaul.',
    image: '/images/steam-wash.jpg',
    tag: 'Safety Critical',
    icon: 'Disc',
    priceDisplay: '₹999 Onwards',
    basePrice: 999,
    category: 'Brakes & Suspension',
    highlights: ['OEM Brake Pads & Rotors', 'Hydraulic Fluid Bleed', 'Shock Absorber Check', 'Steering Rack Inspection'],
    isPopular: false,
    isCoreService: true,
    sortOrder: 7
  },
  {
    slug: 'denting-painting',
    title: 'Denting & Paint Correction',
    shortDesc: 'Panel repair, scratch removal & color match spray.',
    fullDesc: 'Precision panel beating, dent puller equipment, high-grade primer, computerized paint matching, and dust-free heated clear coat finish.',
    image: '/images/car-detailing.jpg',
    tag: 'Bodywork',
    icon: 'Paintbrush',
    priceDisplay: 'Custom Quote',
    basePrice: 0,
    category: 'Bodywork',
    highlights: ['Computerized Color Match', 'Dent Puller Technology', 'High-Gloss Clear Coat', 'Anti-Corrosion Primer'],
    isPopular: false,
    isCoreService: true,
    sortOrder: 8
  }
];

// Verified genuine local workshop media only (zero Unsplash stock entries)
const initialGallery = [
  {
    title: 'Multi-Stage Paint Correction & Gloss Finish',
    category: 'Detailing',
    image: '/images/car-detailing.jpg',
    description: 'Paint compounding & scratch removal on deep clear coat finish.',
    type: 'image',
    sortOrder: 1
  },
  {
    title: 'Japanese-Tech Engine Carbon Cleaning Setup',
    category: 'Carbon Cleaning',
    image: '/images/carbon-cleaning.jpg',
    description: 'In-chassis hydrogen decarbonization for intake valves & combustion chamber.',
    type: 'image',
    sortOrder: 2
  },
  {
    title: 'Automated AC Recovery & Gas Recharge',
    category: 'AC Service',
    image: '/images/ac-service.jpg',
    description: 'Deep vacuum moisture evacuation and automated R134a precision charging.',
    type: 'image',
    sortOrder: 3
  },
  {
    title: 'Interior High-Temp Steam Sanitization',
    category: 'Interior Wash',
    image: '/images/steam-wash.jpg',
    description: 'High-temperature steam dislodging grime, allergens, and odors from upholstery.',
    type: 'image',
    sortOrder: 4
  },
  {
    title: 'Thick Snow Foam Contactless Wash',
    category: 'Car Wash',
    image: '/images/foam-wash.jpg',
    description: 'pH-neutral snow foam dwelling before two-bucket wash and underbody rinse.',
    type: 'image',
    sortOrder: 5
  },
  {
    title: 'Periodic Engine Service & Oil Replacement',
    category: 'Periodic Service',
    image: '/images/periodic-service.jpg',
    description: 'Synthetic engine oil replacement with OEM filter and 40-point safety inspection.',
    type: 'image',
    sortOrder: 6
  }
];

export async function seedDatabase() {
  console.log('[Seed] Initializing database seeding check...');

  // 1. Identify target database before performing any operations
  const dbHost = mongoose.connection.host || 'unknown';
  const dbName = mongoose.connection.name || 'unknown';
  console.log(`[Seed Safety] Target Database Host: ${dbHost}`);
  console.log(`[Seed Safety] Target Database Name: ${dbName}`);

  const stats = {
    owner: 'skipped',
    services: { created: 0, skipped: 0 },
    gallery: { created: 0, skipped: 0 },
    businessSettings: 'skipped'
  };

  // 2. Provision initial OWNER account (strictly idempotent, requires strong custom password)
  const ownerEmail = process.env.OWNER_INIT_EMAIL ? process.env.OWNER_INIT_EMAIL.trim().toLowerCase() : null;
  const ownerPassword = process.env.OWNER_INIT_PASSWORD ? process.env.OWNER_INIT_PASSWORD.trim() : null;
  const ownerName = (process.env.OWNER_INIT_NAME || 'Mahadev Garage Owner').trim();
  const ownerPhone = (process.env.OWNER_INIT_PHONE || '8295669463').trim();

  const existingOwner = await User.findOne({
    $or: [{ role: 'OWNER' }, ...(ownerEmail ? [{ email: ownerEmail }] : [])]
  });

  if (!existingOwner) {
    if (!ownerEmail) {
      throw new Error('[Seed Error] Missing OWNER_INIT_EMAIL. An explicit owner email must be configured to provision initial owner.');
    }
    if (!ownerPassword) {
      throw new Error('[Seed Error] Missing OWNER_INIT_PASSWORD. A strong custom owner password is required. Never use hardcoded defaults.');
    }
    if (ownerPassword.length < 12) {
      throw new Error('[Seed Error] OWNER_INIT_PASSWORD must be at least 12 characters long for production security.');
    }
    if (ownerPassword === 'MahadevOwner#2026' || ownerPassword.toLowerCase().includes('password')) {
      throw new Error('[Seed Error] Insecure or sample owner password rejected. Please supply a strong custom secret.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(ownerPassword, saltRounds);

    await User.create({
      fullName: ownerName,
      email: ownerEmail,
      passwordHash,
      role: 'OWNER',
      phone: ownerPhone,
      isActive: true,
      tokenVersion: 0
    });

    console.log(`[Seed] Initial OWNER account provisioned successfully: ${ownerEmail}`);
    stats.owner = 'created';
  } else {
    console.log(`[Seed] OWNER account already exists (${existingOwner.email}). Skipping owner creation.`);
  }

  // 3. Seed Services (idempotent, never overwrite existing)
  for (const svc of initialServices) {
    const existing = await Service.findOne({ slug: svc.slug });
    if (!existing) {
      await Service.create({ ...svc, isActive: true });
      stats.services.created++;
    } else {
      stats.services.skipped++;
    }
  }
  console.log(`[Seed] Services: ${stats.services.created} created, ${stats.services.skipped} skipped.`);

  // 4. Seed Gallery Items (idempotent, never overwrite existing)
  for (const item of initialGallery) {
    const existing = await GalleryItem.findOne({ title: item.title });
    if (!existing) {
      await GalleryItem.create({ ...item, isActive: true });
      stats.gallery.created++;
    } else {
      stats.gallery.skipped++;
    }
  }
  console.log(`[Seed] Gallery Items: ${stats.gallery.created} created, ${stats.gallery.skipped} skipped.`);

  // Note: Unverified reviews are deliberately not seeded. Review collection is preserved for genuine customer submissions.

  // 5. Seed Business Setting Singleton (idempotent, never overwrite existing)
  const existingSettings = await BusinessSetting.findOne({ singletonKey: 'singleton' });
  if (!existingSettings) {
    await BusinessSetting.create({
      singletonKey: 'singleton',
      business: {
        name: 'Mahadev Mechanical Car Garage',
        shortName: 'Mahadev Garage',
        tagline: 'Complete Car Care Under One Roof',
        subTagline: 'Gohana’s trusted multi-brand car workshop. Expert mechanics, genuine parts & upfront pricing.',
        locationBadge: 'Gohana, Haryana • Near JK Garden',
        rating: '',
        ratingMax: '',
        reviewCount: '',
        happyCustomers: '',
        establishedYear: '2018'
      },
      contact: {
        phone: '8295669463',
        phoneDisplay: '+91 82956 69463',
        whatsapp: '918295669463',
        whatsappDisplay: '+91 82956 69463',
        email: 'mahadevgaragegohana@gmail.com',
        address: {
          landmark: 'Near JK Garden',
          road: 'Gohana–Panipat Road',
          city: 'Gohana',
          state: 'Haryana',
          pincode: '131301',
          full: 'Mahadev Mechanical Car Garage, Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301'
        },
        googleMapsDirectionsUrl:
          'https://www.google.com/maps/dir//Mahadev+Mechanical+Car+Garage,+Indian+Oil+Petrol+Pump,+Near,+Rohtak+-+Panipat+Rd,+Gohana,+Haryana+131301/@29.1471882,76.716434,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x390dedb9926e978d:0xba4bb7c45381f66d!2m2!1d76.716434!2d29.1471882',
        googleMapsEmbedUrl:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d888.244051151117!2d76.71606702116054!3d29.147288639684156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390dedb9926e978d%3A0xba4bb7c45381f66d!2sMahadev%20Mechanical%20Car%20Garage!5e1!3m2!1sen!2sin!4v1792186218803!5m2!1sen!2sin',
        workingHours: [
          { day: 'Monday - Saturday', time: '9:00 AM - 7:30 PM', status: 'Open' },
          { day: 'Sunday', time: '10:00 AM - 4:00 PM', status: 'Appointment Only' }
        ],
        social: {
          youtube: 'https://youtube.com/@mahadevgaragegohana?si=kZuT5kpBOgSfW0TX',
          instagram: 'https://www.instagram.com/mahadevmechanical.gohana?obrf=MTVhNjQwNjVzbnE4cA==',
          facebook: 'https://www.facebook.com/share/1G2yEuMHh9/',
          whatsapp: 'https://wa.me/918295669463?text=Hello%20Mahadev%20Mechanical%20Car%20Garage',
          googleMaps:
            'https://www.google.com/maps/dir//Mahadev+Mechanical+Car+Garage,+Indian+Oil+Petrol+Pump,+Near,+Rohtak+-+Panipat+Rd,+Gohana,+Haryana+131301/@29.1471882,76.716434,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x390dedb9926e978d:0xba4bb7c45381f66d!2m2!1d76.716434!2d29.1471882'
        }
      },
      stats: [
        { id: 'stat-1', number: '100% Genuine', label: 'OEM & OES Parts', sublabel: 'Authentic fluids, filters & components', icon: 'ShieldCheck' },
        { id: 'stat-2', number: 'Multibrand', label: 'Complete Service Bay', sublabel: 'Hatchbacks, Sedans, SUVs & Commercial', icon: 'Wrench' },
        { id: 'stat-3', number: 'Japanese Tech', label: 'Carbon Cleaning', sublabel: 'In-chassis hydrogen engine decarbonization', icon: 'Zap' },
        { id: 'stat-4', number: 'Transparent', label: 'Digital Job Cards', sublabel: 'Fair estimates & upfront billing', icon: 'CheckCircle' }
      ]
    });
    console.log('[Seed] Business settings initialized.');
    stats.businessSettings = 'created';
  } else {
    console.log('[Seed] Business settings already exist. Skipping.');
  }

  console.log('[Seed] Database seeding process completed.');
  return stats;
}

// Standalone execution wrapper
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error('[Seed Error] MONGODB_URI is not defined in environment variables.');
      }
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err.message || err);
      process.exit(1);
    }
  })();
}
