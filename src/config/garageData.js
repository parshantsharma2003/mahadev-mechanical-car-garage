/**
 * Mahadev Mechanical Car Garage - Business Configuration & Data
 */

export const garageData = {
  business: {
    name: "Mahadev Mechanical Car Garage",
    shortName: "Mahadev Garage",
    tagline: "Complete Car Care Under One Roof",
    subTagline: "Expert service, modern machines and genuine care for your car.",
    locationBadge: "Haryana's Trusted Car Service Center",
    rating: "4.8",
    ratingMax: "5.0",
    reviewCount: "250+",
    happyCustomers: "5000+",
    establishedYear: "2018"
  },

  contact: {
    phone: "8295669463",
    phoneDisplay: "+91 82956 69463",
    whatsapp: "918295669463",
    whatsappDisplay: "+91 82956 69463",
    email: "mahadevgaragegohana@gmail.com",
    address: {
      landmark: "Near Indian Oil Petrol Pump",
      road: "Rohtak - Panipat Rd",
      city: "Gohana",
      state: "Haryana",
      pincode: "131301",
      full: "Mahadev Mechanical Car Garage, Near Indian Oil Petrol Pump, Rohtak - Panipat Rd, Gohana, Haryana 131301"
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
      number: "5000+",
      label: "Happy Customers",
      sublabel: "Satisfied car owners across Haryana",
      icon: "Users"
    },
    {
      id: "stat-2",
      number: "Trusted",
      label: "Car Owners in Haryana",
      sublabel: "100% Genuine parts & transparent care",
      icon: "ShieldCheck"
    },
    {
      id: "stat-3",
      number: "4.8/5",
      label: "Customer Rating",
      sublabel: "Verified Google reviews",
      icon: "Star"
    },
    {
      id: "stat-4",
      number: "All Brands",
      label: "Servicing & Repair",
      sublabel: "Hatchbacks, Sedans, SUVs & Luxury cars",
      icon: "Car"
    }
  ],

  services: [
    {
      id: "general-car-service",
      title: "General Car Service",
      shortDesc: "Engine oil change, filters, complete checkup.",
      fullDesc: "Complete bumper-to-bumper vehicle periodic service covering certified synthetic engine oil, oil filter, air filter, spark plugs / fuel filter inspection, fluid top-up, and a detailed 40-point safety check.",
      image: "/images/periodic-service.jpg",
      tag: "Popular",
      highlights: ["OEM Filters & Engine Oil", "40-Point Safety Check", "Coolant & Fluid Top-Up", "Brake Pad Inspection"]
    },
    {
      id: "car-washing",
      title: "Car Washing",
      shortDesc: "Foam wash, steam wash, exterior cleaning.",
      fullDesc: "Thorough exterior and underbody cleaning using pH-neutral automotive snow foam, high-pressure washers, delicate microfiber wash mitts, and underchassis flush to remove mud, road salt, and grime.",
      image: "/images/foam-wash.jpg",
      tag: "Quick Service",
      highlights: ["Thick Snow Foam Soak", "High-Pressure Underbody Wash", "Microfiber Scratch-Free Dry", "Tyre Dressing & Polish"]
    },
    {
      id: "car-detailing",
      title: "Car Detailing",
      shortDesc: "Rubbing, compound, interior wash, steam wash, vacuum.",
      fullDesc: "Showroom-finish restoration with multi-stage machine compounding and swirl removal, deep interior vacuuming, fabric upholstery steam extraction, leather conditioning, and windshield treatment.",
      image: "/images/car-detailing.jpg",
      tag: "Deep Clean",
      highlights: ["Dual-Action Machine Buffing", "Interior High-Temp Steam Sanitize", "Swirl & Oxidation Removal", "UV Dashboard Protection"]
    },
    {
      id: "engine-carbon-cleaning",
      title: "Engine Carbon Cleaning",
      shortDesc: "Japanese technology machine for better performance.",
      fullDesc: "Advanced in-chassis decarbonization using Japanese-tech equipment. Dissolves stubborn carbon deposits from combustion chambers, intake valves, and catalytic converters without tearing down your engine.",
      image: "/images/carbon-cleaning.jpg",
      tag: "Specialized Tech",
      highlights: ["Japanese Tech Equipment", "Zero Engine Dismantling", "Smoother Idle & Pickup", "Improves Fuel Efficiency"]
    },
    {
      id: "ac-servicing",
      title: "Automated AC Servicing",
      shortDesc: "Cooling diagnostics, gas recharge & leak testing.",
      fullDesc: "Computerized automotive AC station for recovery, deep vacuum dehydration, leak testing, compressor oil top-up, and precise weight refrigerant recharge (R134a).",
      image: "/images/ac-service.jpg",
      tag: "Cooling Care",
      highlights: ["Automated Gas Recovery & Charge", "Deep Vacuum Leak Test", "Cabin Filter Replacement", "Vent Antibacterial Steam"]
    },
    {
      id: "diagnostics-repair",
      title: "OBD-II Computer Diagnostics",
      shortDesc: "Live sensor telemetry, check engine light & electrical.",
      fullDesc: "Digital scan tool diagnostics to read ECU error codes, inspect live sensor data, test alternator and battery health, and resolve complex electrical/electronic issues.",
      image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
      tag: "Precision Tech",
      highlights: ["Full ECU Computer Scan", "Check Engine Light Diagnosis", "Battery & Alternator Health", "Sensor & Wiring Repairs"]
    },
    {
      id: "brake-suspension",
      title: "Brakes & Suspension Repair",
      shortDesc: "Disc rotor truing, caliper overhaul, shock absorbers.",
      fullDesc: "Complete hydraulic brake bleeding, genuine ceramic/semi-metallic brake pads, disc rotor truing, link rod, bush, and shock absorber overhaul.",
      image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
      tag: "Safety Critical",
      highlights: ["OEM Brake Pads & Rotors", "Hydraulic Fluid Bleed", "Shock Absorber Check", "Steering Rack Inspection"]
    },
    {
      id: "denting-painting",
      title: "Denting & Paint Correction",
      shortDesc: "Panel repair, scratch removal & color match spray.",
      fullDesc: "Precision panel beating, dent puller equipment, high-grade primer, computerized paint matching, and dust-free heated clear coat finish.",
      image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
      tag: "Bodywork",
      highlights: ["Computerized Color Match", "Dent Puller Technology", "High-Gloss Clear Coat", "Anti-Corrosion Primer"]
    }
  ],

  gallery: [
    {
      id: "gal-1",
      title: "Multi-Stage Paint Correction & Gloss Finish",
      category: "Detailing",
      image: "/images/car-detailing.jpg",
      description: "Paint compounding & scratch removal on deep clear coat finish."
    },
    {
      id: "gal-2",
      title: "Japanese-Tech Engine Carbon Cleaning Setup",
      category: "Carbon Cleaning",
      image: "/images/carbon-cleaning.jpg",
      description: "In-chassis hydrogen decarbonization for intake valves & combustion chamber."
    },
    {
      id: "gal-3",
      title: "Automated AC Recovery & Gas Recharge",
      category: "AC Service",
      image: "/images/ac-service.jpg",
      description: "Deep vacuum moisture evacuation and automated R134a precision charging."
    },
    {
      id: "gal-4",
      title: "Interior High-Temp Steam Sanitization",
      category: "Interior Wash",
      image: "/images/steam-wash.jpg",
      description: "High-temperature steam dislodging grime, allergens, and odors from upholstery."
    },
    {
      id: "gal-5",
      title: "Thick Snow Foam Contactless Wash",
      category: "Car Wash",
      image: "/images/foam-wash.jpg",
      description: "pH-neutral snow foam dwelling before two-bucket wash and underbody rinse."
    },
    {
      id: "gal-6",
      title: "Periodic Engine Service & Oil Replacement",
      category: "Periodic Service",
      image: "/images/periodic-service.jpg",
      description: "Synthetic engine oil replacement with OEM filter and 40-point safety inspection."
    },
    {
      id: "gal-7",
      title: "Precision Brake Disc Truing & Caliper Service",
      category: "Brakes & Suspension",
      image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1000&q=80",
      description: "Hydraulic caliper overhaul, fresh brake fluid, and rotor thickness inspection."
    },
    {
      id: "gal-8",
      title: "Computerized OBD-II Electronic Scan Tool",
      category: "Diagnostics",
      image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80",
      description: "Real-time engine telemetry and sensor diagnostics for all brands."
    },
    {
      id: "gal-9",
      title: "High-Precision Laser Wheel Alignment & Balancing",
      category: "Tyres & Alignment",
      image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=1000&q=80",
      description: "Computerized laser wheel alignment eliminating uneven tire wear and steering vibrations."
    },
    {
      id: "gal-10",
      title: "Comprehensive Engine Block & Mechanical Overhaul",
      category: "Engine Work",
      image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1000&q=80",
      description: "Precision engine cylinder inspection, piston ring fitment, and timing calibration."
    },
    {
      id: "gal-11",
      title: "Professional 9H Ceramic Coating & Paint Sealant",
      category: "Detailing",
      image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1000&q=80",
      description: "Ultra-hydrophobic ceramic glass coating providing years of paint protection and gloss."
    },
    {
      id: "gal-12",
      title: "Hydraulic Two-Post Ramp Underbody Inspection",
      category: "Inspection",
      image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
      description: "Full underchassis inspection checking exhaust system, differential, and suspension bushings."
    },
    {
      id: "gal-13",
      title: "Suspension Bushing & Performance Shock Overhaul",
      category: "Brakes & Suspension",
      image: "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1000&q=80",
      description: "Heavy-duty shock absorber, link rod, and lower arm replacement for smooth highway cruising."
    },
    {
      id: "gal-14",
      title: "Modern Dedicated Bay Maintenance Workshop",
      category: "Workshop",
      image: "https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=1000&q=80",
      description: "Clean, organized service bays with specialized tools for quick and error-free turnaround."
    },
    {
      id: "gal-15",
      title: "Heavy-Duty Alternator & Battery Diagnostics",
      category: "Electrical",
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      description: "Digital battery load testing, cranking voltage measurement, and charging circuit check."
    },
    {
      id: "gal-16",
      title: "Crystal-Clear Headlight Restoration & Polish",
      category: "Detailing",
      image: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1000&q=80",
      description: "Multi-grit wet sanding and UV sealing restoring cloudy, yellowed headlights to crystal clarity."
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

  reviews: [
    {
      id: 1,
      author: "Rahul Verma",
      vehicle: "Hyundai Creta",
      service: "Periodic Service & Detailing",
      rating: 5,
      comment: "Excellent service! Very professional and honest. My car feels like new again. Highly recommended!",
      date: "2 weeks ago",
      verified: true
    },
    {
      id: 2,
      author: "Amit Sharma",
      vehicle: "Swift Dzire (Diesel)",
      service: "Japanese Engine Carbon Cleaning",
      rating: 5,
      comment: "Got the Japanese carbon cleaning done here. Engine sound is noticeably quieter and pickup improved immediately on highway drives.",
      date: "1 month ago",
      verified: true
    },
    {
      id: 3,
      author: "Deepak Malik",
      vehicle: "Mahindra Scorpio",
      service: "AC Service & Suspension Check",
      rating: 5,
      comment: "Best car garage in Gohana without doubt. Transparent work right in front of you, genuine spare parts, and reasonable rates.",
      date: "3 weeks ago",
      verified: true
    },
    {
      id: 4,
      author: "Suresh Hooda",
      vehicle: "Maruti Baleno",
      service: "Foam Wash & Steam Sanitization",
      rating: 5,
      comment: "Exceptional AC servicing and foam wash. The cooling is icy cold now even in peak summer heat. Staff is polite and skilled.",
      date: "2 months ago",
      verified: true
    }
  ],

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
