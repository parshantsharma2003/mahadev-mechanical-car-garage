import mongoose from 'mongoose';

const BusinessSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'singleton',
      unique: true
    },
    business: {
      name: { type: String, default: 'Mahadev Mechanical Car Garage' },
      shortName: { type: String, default: 'Mahadev Garage' },
      tagline: { type: String, default: 'Complete Car Care Under One Roof' },
      subTagline: { type: String, default: 'Expert service, modern machines and genuine care for your car.' },
      locationBadge: { type: String, default: 'Gohana, Haryana • Near JK Garden' },
      rating: { type: String, default: '' },
      ratingMax: { type: String, default: '' },
      reviewCount: { type: String, default: '' },
      happyCustomers: { type: String, default: '' },
      establishedYear: { type: String, default: '2018' }
    },
    contact: {
      phone: { type: String, default: '8295669463' },
      phoneDisplay: { type: String, default: '+91 82956 69463' },
      whatsapp: { type: String, default: '918295669463' },
      whatsappDisplay: { type: String, default: '+91 82956 69463' },
      email: { type: String, default: 'mahadevgaragegohana@gmail.com' },
      address: {
        landmark: { type: String, default: 'Near JK Garden' },
        road: { type: String, default: 'Gohana–Panipat Road' },
        city: { type: String, default: 'Gohana' },
        state: { type: String, default: 'Haryana' },
        pincode: { type: String, default: '131301' },
        full: {
          type: String,
          default: 'Mahadev Mechanical Car Garage, Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301'
        }
      },
      googleMapsDirectionsUrl: { type: String },
      googleMapsEmbedUrl: { type: String },
      workingHours: [
        {
          day: { type: String },
          time: { type: String },
          status: { type: String }
        }
      ],
      social: {
        youtube: { type: String },
        instagram: { type: String },
        facebook: { type: String },
        whatsapp: { type: String },
        googleMaps: { type: String }
      }
    },
    stats: [
      {
        id: { type: String },
        number: { type: String },
        label: { type: String },
        sublabel: { type: String },
        icon: { type: String }
      }
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const BusinessSetting = mongoose.model('BusinessSetting', BusinessSettingSchema);
export default BusinessSetting;
