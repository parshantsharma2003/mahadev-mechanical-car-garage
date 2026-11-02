import React, { createContext, useContext, useState, useEffect } from 'react';
import { garageData as defaultGarageData } from '../config/garageData';

import { 
  adminLogin as apiAdminLogin, 
  adminGetMe as apiAdminGetMe, 
  adminLogout as apiAdminLogout 
} from '../utils/api';

const GarageContext = createContext(null);

const STORAGE_KEY_DATA = 'mahadev_garage_data_v2';
const STORAGE_KEY_BOOKINGS = 'mahadev_garage_bookings_v2';

// Initial sample bookings
const DEFAULT_BOOKINGS = [
  {
    id: 'MHG-1082',
    name: 'Suresh Kumar',
    phone: '9812345678',
    service: 'General Car Service',
    brand: 'Hyundai',
    model: 'Creta 1.5 Petrol',
    date: '2026-10-26',
    timeSlot: 'Morning (09:00 AM - 12:00 PM)',
    status: 'Confirmed',
    notes: 'Engine oil replacement and 40-point safety check',
    source: 'Website Online',
    createdAt: '2026-10-24T09:15:00.000Z'
  },
  {
    id: 'MHG-1085',
    name: 'Rajesh Hooda',
    phone: '9416283921',
    service: 'Japanese Engine Carbon Cleaning',
    brand: 'Maruti Suzuki',
    model: 'Swift Dzire Diesel',
    date: '2026-10-26',
    timeSlot: 'Afternoon (12:00 PM - 03:00 PM)',
    status: 'Pending',
    notes: 'Low mileage issue and sluggish pickup on highway',
    source: 'Website Online',
    createdAt: '2026-10-24T11:40:00.000Z'
  },
  {
    id: 'MHG-1077',
    name: 'Vikram Nain',
    phone: '8950123490',
    service: 'Automated AC Servicing',
    brand: 'Mahindra',
    model: 'Scorpio-N',
    date: '2026-10-25',
    timeSlot: 'Evening (03:00 PM - 07:00 PM)',
    status: 'In Progress',
    notes: 'AC cooling weak in afternoon heat, filter check requested',
    source: 'Walk-in / Phone',
    createdAt: '2026-10-23T14:20:00.000Z'
  },
  {
    id: 'MHG-1064',
    name: 'Anil Malik',
    phone: '9812987654',
    service: 'Car Detailing & Foam Wash',
    brand: 'Kia',
    model: 'Seltos',
    date: '2026-10-24',
    timeSlot: 'Morning (09:00 AM - 12:00 PM)',
    status: 'Completed',
    notes: 'Deep interior vacuuming and ceramic gloss wax polish',
    source: 'WhatsApp',
    createdAt: '2026-10-22T16:00:00.000Z'
  }
];

export function GarageProvider({ children }) {
  // 1. Garage Data (Business info, services, gallery, reviews, stats)
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedSocial = parsed.contact?.social || {};
        const legacyInstagram = 'https://www.instagram.com/mahadev_mechanical_car_garage';
        const legacyFacebook = 'https://www.facebook.com/mahadevmechanicalcargarage';
        const legacyYoutube = 'https://www.youtube.com/@mahadevmechanicalgarage';

        const mergedSocial = {
          ...defaultGarageData.contact.social,
          ...savedSocial
        };

        if (!mergedSocial.instagram || mergedSocial.instagram === legacyInstagram) {
          mergedSocial.instagram = defaultGarageData.contact.social.instagram;
        }
        if (!mergedSocial.facebook || mergedSocial.facebook === legacyFacebook) {
          mergedSocial.facebook = defaultGarageData.contact.social.facebook;
        }
        if (!mergedSocial.youtube || mergedSocial.youtube === legacyYoutube) {
          mergedSocial.youtube = defaultGarageData.contact.social.youtube;
        }

        return {
          ...defaultGarageData,
          ...parsed,
          business: { ...defaultGarageData.business, ...(parsed.business || {}) },
          contact: { 
            ...defaultGarageData.contact, 
            ...(parsed.contact || {}),
            social: mergedSocial
          },
          services: parsed.services?.length ? parsed.services : defaultGarageData.services,
          gallery: (() => {
            const savedGallery = parsed.gallery || [];
            const savedIds = new Set(savedGallery.map(g => g.id));
            const newDefaults = defaultGarageData.gallery.filter(g => !savedIds.has(g.id));
            return [...savedGallery, ...newDefaults];
          })(),
          reviews: parsed.reviews?.length ? parsed.reviews : defaultGarageData.reviews,
          stats: parsed.stats?.length ? parsed.stats : defaultGarageData.stats
        };
      }
    } catch (e) {
      console.error('Failed to parse saved garage data from localStorage', e);
    }
    return defaultGarageData;
  });

  // 2. Customer Bookings / Appointments
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved bookings from localStorage', e);
    }
    return DEFAULT_BOOKINGS;
  });

  // 3. Admin Authentication State (Real HTTP-only Cookie JWT + Session restore via /auth/me)
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Restore authenticated session on mount using /api/v1/auth/me
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const user = await apiAdminGetMe();
        if (isMounted && user) {
          setAdminUser(user);
          setIsAdminLoggedIn(true);
        }
      } catch {
        if (isMounted) {
          setAdminUser(null);
          setIsAdminLoggedIn(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist Data on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }, [data]);

  // Persist Bookings on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
    } catch (e) {
      console.error('Error saving bookings to localStorage', e);
    }
  }, [bookings]);

  // ---------------- AUTH METHODS ----------------
  const adminLogin = async (email, password) => {
    try {
      const data = await apiAdminLogin(email, password);
      if (data && data.user) {
        setAdminUser(data.user);
        setIsAdminLoggedIn(true);
        return { success: true, user: data.user };
      }
      return { success: false, message: 'Invalid email or password. Please verify your credentials.' };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Invalid email or password. Please verify your credentials.'
      };
    }
  };

  const adminLogout = async () => {
    try {
      await apiAdminLogout();
    } catch (err) {
      console.warn('Logout API warning:', err.message);
    } finally {
      setAdminUser(null);
      setIsAdminLoggedIn(false);
    }
  };

  // ---------------- SERVICES CRUD ----------------
  const addService = (newService) => {
    const id = newService.id || 'service-' + Date.now();
    const serviceObj = {
      ...newService,
      id,
      highlights: Array.isArray(newService.highlights) 
        ? newService.highlights 
        : (newService.highlights || '').split(',').map(s => s.trim()).filter(Boolean)
    };
    setData((prev) => ({
      ...prev,
      services: [serviceObj, ...prev.services]
    }));
    return serviceObj;
  };

  const updateService = (id, updatedFields) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((svc) => {
        if (svc.id === id) {
          const highlights = Array.isArray(updatedFields.highlights)
            ? updatedFields.highlights
            : (typeof updatedFields.highlights === 'string'
                ? updatedFields.highlights.split(',').map(s => s.trim()).filter(Boolean)
                : svc.highlights);
          return { ...svc, ...updatedFields, highlights };
        }
        return svc;
      })
    }));
  };

  const deleteService = (id) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((svc) => svc.id !== id)
    }));
  };

  // ---------------- GALLERY CRUD ----------------
  const addGalleryItem = (newItem) => {
    const id = newItem.id || Date.now();
    const itemObj = { ...newItem, id };
    setData((prev) => ({
      ...prev,
      gallery: [itemObj, ...prev.gallery]
    }));
    return itemObj;
  };

  const updateGalleryItem = (id, updatedFields) => {
    setData((prev) => ({
      ...prev,
      gallery: prev.gallery.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    }));
  };

  const deleteGalleryItem = (id) => {
    setData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((item) => item.id !== id)
    }));
  };

  // ---------------- REVIEWS CRUD ----------------
  const addReview = (newReview) => {
    const id = newReview.id || Date.now();
    const reviewObj = {
      ...newReview,
      id,
      rating: Number(newReview.rating) || 5,
      date: newReview.date || 'Just now',
      verified: newReview.verified !== false
    };
    setData((prev) => ({
      ...prev,
      reviews: [reviewObj, ...prev.reviews]
    }));
    return reviewObj;
  };

  const updateReview = (id, updatedFields) => {
    setData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((r) => (
        r.id === id 
          ? { 
              ...r, 
              ...updatedFields, 
              rating: updatedFields.rating !== undefined ? Number(updatedFields.rating) : r.rating 
            } 
          : r
      ))
    }));
  };

  const deleteReview = (id) => {
    setData((prev) => ({
      ...prev,
      reviews: prev.reviews.filter((r) => r.id !== id)
    }));
  };

  // ---------------- BOOKINGS / APPOINTMENTS CRUD ----------------
  const addBooking = (newBooking) => {
    const id = newBooking.id || 'MHG-' + Math.floor(1000 + Math.random() * 9000);
    const bookingObj = {
      ...newBooking,
      id,
      status: newBooking.status || 'Pending',
      createdAt: newBooking.createdAt || new Date().toISOString()
    };
    setBookings((prev) => [bookingObj, ...prev]);
    return bookingObj;
  };

  const updateBooking = (id, updatedFields) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedFields } : b))
    );
  };

  const updateBookingStatus = (id, status) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const deleteBooking = (id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  // ---------------- BUSINESS & CONTACT SETTINGS ----------------
  const updateBusiness = (businessFields) => {
    setData((prev) => ({
      ...prev,
      business: { ...prev.business, ...businessFields }
    }));
  };

  const updateContact = (contactFields) => {
    setData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        ...contactFields,
        social: {
          ...(prev.contact?.social || {}),
          ...(contactFields?.social || {})
        }
      }
    }));
  };

  const updateStats = (newStats) => {
    setData((prev) => ({
      ...prev,
      stats: newStats
    }));
  };

  // ---------------- BACKUP & FACTORY RESET ----------------
  const resetToDefaults = () => {
    setData(defaultGarageData);
    setBookings(DEFAULT_BOOKINGS);
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_BOOKINGS);
  };

  const exportDataBackup = () => {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      data,
      bookings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahadev-garage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDataBackup = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.data) {
        setData(parsed.data);
      }
      if (Array.isArray(parsed.bookings)) {
        setBookings(parsed.bookings);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const value = {
    data,
    bookings,
    isAdminLoggedIn,
    adminUser,
    isLoadingAuth,
    adminRole: adminUser?.role || null,
    isOwner: adminUser?.role === 'OWNER',
    isSuperAdmin: adminUser?.role === 'SUPER_ADMIN',
    adminLogin,
    adminLogout,
    // Services
    addService,
    updateService,
    deleteService,
    // Gallery
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    // Reviews
    addReview,
    updateReview,
    deleteReview,
    // Bookings
    addBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    // Settings
    updateBusiness,
    updateContact,
    updateStats,
    // Utilities
    resetToDefaults,
    exportDataBackup,
    importDataBackup
  };

  return (
    <GarageContext.Provider value={value}>
      {children}
    </GarageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGarage() {
  const context = useContext(GarageContext);
  if (!context) {
    throw new Error('useGarage must be used within a GarageProvider');
  }
  return context;
}
