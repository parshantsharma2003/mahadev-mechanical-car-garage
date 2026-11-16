import React, { createContext, useContext, useState, useEffect } from 'react';
import { garageData as defaultGarageData } from '../config/garageData';

import { 
  adminLogin as apiAdminLogin, 
  adminGetMe as apiAdminGetMe, 
  adminLogout as apiAdminLogout 
} from '../utils/api';

const GarageContext = createContext(null);

const STORAGE_KEY_DATA = 'mahadev_garage_data_v2';
const LEGACY_STORAGE_KEY_BOOKINGS = 'mahadev_garage_bookings_v2';

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

        const fakeReviewAuthors = new Set(['Rahul Verma', 'Amit Sharma', 'Deepak Malik', 'Suresh Hooda']);
        const sanitizedReviews = (parsed.reviews || []).filter(r => !fakeReviewAuthors.has(r.author));

        const sanitizedGallery = (parsed.gallery || []).filter(item => {
          const img = item.image || '';
          return !img.includes('unsplash.com') && !['gal-7', 'gal-8', 'gal-9', 'gal-10', 'gal-11', 'gal-12', 'gal-13', 'gal-14', 'gal-15', 'gal-16'].includes(item.id);
        });

        const mergedGallery = (() => {
          const savedIds = new Set(sanitizedGallery.map(g => g.id));
          const newDefaults = defaultGarageData.gallery.filter(g => !savedIds.has(g.id));
          return [...sanitizedGallery, ...newDefaults];
        })();

        const sanitizedBusiness = {
          ...defaultGarageData.business,
          ...(parsed.business || {}),
          locationBadge: defaultGarageData.business.locationBadge,
          subTagline: defaultGarageData.business.subTagline
        };
        delete sanitizedBusiness.rating;
        delete sanitizedBusiness.ratingMax;
        delete sanitizedBusiness.reviewCount;
        delete sanitizedBusiness.happyCustomers;

        const sanitizedContact = {
          ...defaultGarageData.contact,
          ...(parsed.contact || {}),
          address: defaultGarageData.contact.address,
          social: mergedSocial
        };

        return {
          ...defaultGarageData,
          ...parsed,
          business: sanitizedBusiness,
          contact: sanitizedContact,
          services: defaultGarageData.services,
          gallery: mergedGallery,
          reviews: sanitizedReviews,
          stats: defaultGarageData.stats
        };
      }
    } catch (e) {
      console.error('Failed to parse saved garage data from localStorage', e);
    }
    return defaultGarageData;
  });

  // 2. Customer Bookings / Appointments (Empty by default, real appointments loaded via API)
  const [bookings, setBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);

  // Phase 2 Cleanup: purge legacy mock booking localStorage key once on mount without deleting unrelated localStorage data
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(LEGACY_STORAGE_KEY_BOOKINGS);
      }
    } catch (e) {
      console.warn('Unable to clean legacy localStorage bookings:', e);
    }
  }, []);

  // 3. Admin Authentication State (Real HTTP-only Cookie JWT + Session restore via /auth/me)
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Restore authenticated session only on admin routes to prevent public 401 console errors
  useEffect(() => {
    let isMounted = true;
    const isTargetAdmin = () => {
      if (typeof window === 'undefined') return false;
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
      return hash === '#admin' || path === '/admin';
    };

    async function checkAuth() {
      if (!isTargetAdmin()) {
        if (isMounted) setIsLoadingAuth(false);
        return;
      }

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

    checkAuth();

    const handleRouteAuthCheck = () => {
      if (isTargetAdmin() && !isAdminLoggedIn) {
        setIsLoadingAuth(true);
        checkAuth();
      }
    };

    window.addEventListener('hashchange', handleRouteAuthCheck);
    window.addEventListener('popstate', handleRouteAuthCheck);

    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', handleRouteAuthCheck);
      window.removeEventListener('popstate', handleRouteAuthCheck);
    };
  }, [isAdminLoggedIn]);

  // Persist Data on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }, [data]);


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
    if (!newBooking || !newBooking.id) {
      console.warn('addBooking rejected: booking must have a valid identifier.');
      return null;
    }
    const bookingObj = {
      ...newBooking,
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
    setBookings([]);
    localStorage.removeItem(STORAGE_KEY_DATA);
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY_BOOKINGS);
    } catch (e) {
      console.warn('Error clearing legacy bookings key on reset', e);
    }
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
    isLoadingBookings,
    bookingsError,
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
