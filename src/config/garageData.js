/**
 * Mahadev Mechanical Car Garage - Business Configuration & Data
 */

export const garageData = {
  business: {
    name: "Mahadev Mechanical Car Garage",
    shortName: "Mahadev Garage",
    tagline: "Complete Car Care Under One Roof",
    subTagline: "Expert multi-brand car servicing, modern diagnostic machines and genuine care for your vehicle.",
    locationBadge: "Gohana, Haryana • Near JK Garden",
    establishedYear: "2018"
  },

  contact: {
    phone: "8295669463",
    phoneDisplay: "+91 82956 69463",
    whatsapp: "918295669463",
    whatsappDisplay: "+91 82956 69463",
    email: "mahadevgaragegohana@gmail.com",
    address: {
      landmark: "Near JK Garden",
      road: "Gohana–Panipat Road",
      city: "Gohana",
      state: "Haryana",
      pincode: "131301",
      full: "Mahadev Mechanical Car Garage, Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301"
    },
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir//Mahadev+Mechanical+Car+Garage,+Indian+Oil+Petrol+Pump,+Near,+Rohtak+-+Panipat+Rd,+Gohana,+Haryana+131301/@29.1471882,76.716434,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x390dedb9926e978d:0xba4bb7c45381f66d!2m2!1d76.716434!2d29.1471882",
    googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d888.244051151117!2d76.71606702116054!3d29.147288639684156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390dedb9926e978d%3A0xba4bb7c45381f66d!2sMahadev%20Mechanical%20Car%20Garage!5e1!3m2!1sen!2sin!4v1792186218803!5m2!1sen!2sin",
    workingHours: [
      { day: "Monday - Saturday", time: "9:00 AM - 7:30 PM", status: "Open" },
      { day: "Sunday", time: "10:00 AM - 4:00 PM", status: "Appointment Only" }
    ],
    social: {
      youtube: "https://youtube.com/@mahadevgaragegohana?si=kZuT5kpBOgSfW0TX",
      instagram: "https://www.instagram.com/mahadevmechanical.gohana?obrf=MTVhNjQwNjVzbnE4cA==",
      facebook: "https://www.facebook.com/share/1G2yEuMHh9/",
      whatsapp: "https://wa.me/918295669463?text=Hello%20Mahadev%20Mechanical%20Car%20Garage,%20I%20am%20connecting%20from%20your%20website.",
      googleMaps: "https://www.google.com/maps/dir//Mahadev+Mechanical+Car+Garage,+Indian+Oil+Petrol+Pump,+Near,+Rohtak+-+Panipat+Rd,+Gohana,+Haryana+131301/@29.1471882,76.716434,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x390dedb9926e978d:0xba4bb7c45381f66d!2m2!1d76.716434!2d29.1471882"
    }
  },

  stats: [
    {
      id: "stat-1",
      number: "100% Genuine",
      label: "OEM & OES Parts",
      sublabel: "Authentic manufacturer components",
      icon: "ShieldCheck"
    },
    {
      id: "stat-2",
      number: "Multibrand",
      label: "Complete Service Bay",
      sublabel: "Hatchbacks, Sedans, SUVs & Luxury Cars",
      icon: "Car"
    },
    {
      id: "stat-3",
      number: "Japanese Tech",
      label: "Carbon Cleaning",
      sublabel: "Specialized in-chassis decarbonization",
      icon: "Zap"
    },
    {
      id: "stat-4",
      number: "Transparent",
      label: "Digital Job Cards",
      sublabel: "Clear upfront quotes & honest advice",
      icon: "CheckCircle"
    }
  ],

  services: [
    {
      id: "general-car-service",
      title: "General Car Service",
      shortDesc: "Engine oil change, filters, complete checkup.",
      fullDesc: "Complete bumper-to-bumper vehicle periodic service covering certified synthetic engine oil, oil filter, air filter, spark plugs / fuel filter inspection, fluid top-up, and a detailed 40-point safety check.",
      image: "/images/periodic-service.webp",
      tag: "Popular",
      highlights: ["OEM Filters & Engine Oil", "40-Point Safety Check", "Coolant & Fluid Top-Up", "Brake Pad Inspection"]
    },
    {
      id: "car-washing",
      title: "Car Washing",
      shortDesc: "Foam wash, steam wash, exterior cleaning.",
      fullDesc: "Thorough exterior and underbody cleaning using pH-neutral automotive snow foam, high-pressure washers, delicate microfiber wash mitts, and underchassis flush to remove mud, road salt, and grime.",
      image: "/images/foam-wash.webp",
      tag: "Quick Service",
      highlights: ["Thick Snow Foam Soak", "High-Pressure Underbody Wash", "Microfiber Scratch-Free Dry", "Tyre Dressing & Polish"]
    },
    {
      id: "car-detailing",
      title: "Car Detailing",
      shortDesc: "Rubbing, compound, interior wash, steam wash, vacuum.",
      fullDesc: "Showroom-finish restoration with multi-stage machine compounding and swirl removal, deep interior vacuuming, fabric upholstery steam extraction, leather conditioning, and windshield treatment.",
      image: "/images/car-detailing.webp",
      tag: "Deep Clean",
      highlights: ["Dual-Action Machine Buffing", "Interior High-Temp Steam Sanitize", "Swirl & Oxidation Removal", "UV Dashboard Protection"]
    },
    {
      id: "engine-carbon-cleaning",
      title: "Engine Carbon Cleaning",
      shortDesc: "Japanese technology machine for better performance.",
      fullDesc: "Advanced in-chassis decarbonization using Japanese-tech equipment. Dissolves stubborn carbon deposits from combustion chambers, intake valves, and catalytic converters without tearing down your engine.",
      image: "/images/carbon-cleaning.webp",
      tag: "Specialized Tech",
      highlights: ["Japanese Tech Equipment", "Zero Engine Dismantling", "Smoother Idle & Pickup", "Improves Fuel Efficiency"]
    },
    {
      id: "ac-servicing",
      title: "Automated AC Servicing",
      shortDesc: "Cooling diagnostics, gas recharge & leak testing.",
      fullDesc: "Computerized automotive AC station for recovery, deep vacuum dehydration, leak testing, compressor oil top-up, and precise weight refrigerant recharge (R134a).",
      image: "/images/ac-service.webp",
      tag: "Cooling Care",
      highlights: ["Automated Gas Recovery & Charge", "Deep Vacuum Leak Test", "Cabin Filter Replacement", "Vent Antibacterial Steam"]
    },
    {
      id: "diagnostics-repair",
      title: "OBD-II Computer Diagnostics",
      shortDesc: "Live sensor telemetry, check engine light & electrical.",
      fullDesc: "Digital scan tool diagnostics to read ECU error codes, inspect live sensor data, test alternator and battery health, and resolve complex electrical/electronic issues.",
      image: "/images/periodic-service.webp",
      tag: "Precision Tech",
      highlights: ["Full ECU Computer Scan", "Check Engine Light Diagnosis", "Battery & Alternator Health", "Sensor & Wiring Repairs"]
    },
    {
      id: "brake-suspension",
      title: "Brakes & Suspension Repair",
      shortDesc: "Disc rotor truing, caliper overhaul, shock absorbers.",
      fullDesc: "Complete hydraulic brake bleeding, genuine ceramic/semi-metallic brake pads, disc rotor truing, link rod, bush, and shock absorber overhaul.",
      image: "/images/steam-wash.webp",
      tag: "Safety Critical",
      highlights: ["OEM Brake Pads & Rotors", "Hydraulic Fluid Bleed", "Shock Absorber Check", "Steering Rack Inspection"]
    },
    {
      id: "denting-painting",
      title: "Denting & Paint Correction",
      shortDesc: "Panel repair, scratch removal & color match spray.",
      fullDesc: "Precision panel beating, dent puller equipment, high-grade primer, computerized paint matching, and dust-free heated clear coat finish.",
      image: "/images/car-detailing.webp",
      tag: "Bodywork",
      highlights: ["Computerized Color Match", "Dent Puller Technology", "High-Gloss Clear Coat", "Anti-Corrosion Primer"]
    }
  ],

  gallery: [
    {
      id: "gal-1",
      title: "Multi-Stage Paint Correction & Gloss Finish",
      category: "Detailing",
      image: "/images/car-detailing.webp",
      description: "Paint compounding & scratch removal on deep clear coat finish."
    },
    {
      id: "gal-2",
      title: "Japanese-Tech Engine Carbon Cleaning Setup",
      category: "Carbon Cleaning",
      image: "/images/carbon-cleaning.webp",
      description: "In-chassis hydrogen decarbonization for intake valves & combustion chamber."
    },
    {
      id: "gal-3",
      title: "Automated AC Recovery & Gas Recharge",
      category: "AC Service",
      image: "/images/ac-service.webp",
      description: "Deep vacuum moisture evacuation and automated R134a precision charging."
    },
    {
      id: "gal-4",
      title: "Interior High-Temp Steam Sanitization",
      category: "Interior Wash",
      image: "/images/steam-wash.webp",
      description: "High-temperature steam dislodging grime, allergens, and odors from upholstery."
    },
    {
      id: "gal-5",
      title: "Thick Snow Foam Contactless Wash",
      category: "Car Wash",
      image: "/images/foam-wash.webp",
      description: "pH-neutral snow foam dwelling before two-bucket wash and underbody rinse."
    },
    {
      id: "gal-6",
      title: "Periodic Engine Service & Oil Replacement",
      category: "Periodic Service",
      image: "/images/periodic-service.webp",
      description: "Synthetic engine oil replacement with OEM filter and 40-point safety inspection."
    }
  ],

  features: [
    {
      icon: "Wrench",
      title: "Modern Equipment",
      subtitle: "Japanese Technology",
      description: "Equipped with automated AC recharge units, hydrogen carbon cleaning machines, and digital OBD-II diagnostic scanners."
    },
    {
      icon: "ShieldCheck",
      title: "Quality Service",
      subtitle: "Genuine Care for Your Vehicle",
      description: "100% genuine OEM/OES parts and certified synthetic engine oils tailored specifically for your car brand and model."
    },
    {
      icon: "Clock",
      title: "On-Time Delivery",
      subtitle: "Your Time Matters",
      description: "Transparent turnaround times with real-time WhatsApp status updates so your car is back on the road when promised."
    }
  ],

  reviews: [],

  carBrands: [
    "Maruti Suzuki", "Hyundai", "Tata Motors", "Mahindra", "Toyota", 
    "Honda", "Kia", "Volkswagen", "Skoda", "Renault", "MG Motors", "Ford"
  ]
};

/**
 * Builds direct WhatsApp click-to-chat URL
 */
export function getWhatsAppBookingUrl(customDetails = {}) {
  const { service, carModel, date, name } = customDetails;
  let text = `Hello Mahadev Mechanical Car Garage, I would like to book an appointment for my car service.`;
  if (service) text += `\nService: ${service}`;
  if (carModel) text += `\nCar Model: ${carModel}`;
  if (date) text += `\nPreferred Date: ${date}`;
  if (name) text += `\nName: ${name}`;
  return `https://wa.me/${garageData.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds direct tel: phone dialer URL
 */
export function getPhoneCallUrl() {
  return `tel:+91${garageData.contact.phone}`;
}
