import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Clock,
  Globe,
  Share2
} from 'lucide-react';
import { fetchBusinessSettings, updateBusinessSettings } from '../../utils/api';

export default function SettingsTab() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchBusinessSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message || 'Failed to load business settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateBusinessSettings({
        business: settings.business,
        contact: settings.contact,
        stats: settings.stats
      });
      setSuccess('Business profile and operational settings updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="tab-loading-state">
        <div className="loading-spinner" />
        <p>Loading operational garage settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="tab-error-state">
        <AlertCircle size={24} className="text-red-500" />
        <p>Could not retrieve settings.</p>
        <button className="btn btn-outline-dark" onClick={loadSettings}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const business = settings.business || {};
  const contact = settings.contact || {};
  const address = contact.address || {};
  const social = contact.social || {};

  return (
    <div className="tab-pane-container">
      <form onSubmit={handleSave}>
        {/* Top Header */}
        <div className="filter-toolbar-card">
          <div>
            <h3 className="section-card-title">Garage Profile & Operational Policy</h3>
            <p className="section-card-sub">
              Manage workshop identity, contact channels, address, and Sunday appointment hours
            </p>
          </div>

          <div className="filter-actions-row">
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={loadSettings} disabled={isSaving}>
              <RefreshCw size={15} />
              <span>Reload</span>
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="admin-alert-banner alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="admin-alert-banner alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* 1. BUSINESS IDENTITY */}
        <div className="admin-content-card">
          <h4 className="section-card-title flex items-center gap-2">
            <Globe size={18} />
            <span>Workshop Brand Identity</span>
          </h4>
          <p className="section-card-sub">Primary business names and public headlines</p>

          <div className="form-row-two mt-3">
            <div className="form-group">
              <label className="input-label">
                <span>Business Full Name:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={business.name || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    business: { ...business, name: e.target.value }
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Short Brand Name:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={business.shortName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    business: { ...business, shortName: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="input-label">
                <span>Main Tagline:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={business.tagline || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    business: { ...business, tagline: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Location Trust Badge:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={business.locationBadge || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    business: { ...business, locationBadge: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">
              <span>Sub-Tagline Description:</span>
            </label>
            <input
              type="text"
              className="login-input"
              value={business.subTagline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  business: { ...business, subTagline: e.target.value }
                })
              }
            />
          </div>
        </div>

        {/* 2. CONTACT DETAILS & APPOINTMENT HOTLINES */}
        <div className="admin-content-card">
          <h4 className="section-card-title flex items-center gap-2">
            <Phone size={18} />
            <span>Contact Information & WhatsApp</span>
          </h4>
          <p className="section-card-sub">Phone numbers used for click-to-call and customer WhatsApp notifications</p>

          <div className="form-row-two mt-3">
            <div className="form-group">
              <label className="input-label">
                <span>Direct Calling Number (Raw):</span>
              </label>
              <input
                type="text"
                className="login-input font-mono"
                value={contact.phone || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...contact, phone: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Calling Number Display:</span>
              </label>
              <input
                type="text"
                className="login-input font-mono"
                value={contact.phoneDisplay || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...contact, phoneDisplay: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="input-label">
                <span>WhatsApp Number (International with 91):</span>
              </label>
              <input
                type="text"
                className="login-input font-mono"
                value={contact.whatsapp || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...contact, whatsapp: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Workshop Email:</span>
              </label>
              <input
                type="email"
                className="login-input"
                value={contact.email || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...contact, email: e.target.value }
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* 3. WORKSHOP TIMINGS & SUNDAY APPOINTMENT POLICY */}
        <div className="admin-content-card">
          <h4 className="section-card-title flex items-center gap-2">
            <Clock size={18} />
            <span>Operational Working Hours & Sunday Policy</span>
          </h4>
          <p className="section-card-sub">Operating times for service bays and Sunday policy</p>

          <div className="admin-alert-banner alert-warning mt-2">
            <Clock size={18} />
            <div className="text-xs">
              <strong>Approved Sunday Operational Policy:</strong> Sunday bookings are allowed as requests with special 10:00 AM – 04:00 PM hours.
              Prior staff confirmation is required for all Sunday bookings.
            </div>
          </div>

          <div className="form-row-two mt-3">
            <div className="form-group">
              <label className="input-label">
                <span>Monday – Saturday Hours:</span>
              </label>
              <input
                type="text"
                className="login-input"
                defaultValue="09:00 AM – 08:00 PM"
                disabled
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Sunday Special Hours:</span>
              </label>
              <input
                type="text"
                className="login-input"
                defaultValue="10:00 AM – 04:00 PM (Prior Confirmation)"
                disabled
              />
            </div>
          </div>
        </div>

        {/* 4. ADDRESS & GOOGLE MAPS */}
        <div className="admin-content-card">
          <h4 className="section-card-title flex items-center gap-2">
            <MapPin size={18} />
            <span>Physical Location & Maps Navigation</span>
          </h4>
          <p className="section-card-sub">Garage address and Google Maps directions link</p>

          <div className="form-row-two mt-3">
            <div className="form-group">
              <label className="input-label">
                <span>Landmark:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={address.landmark || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      address: { ...address, landmark: e.target.value }
                    }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Road / Highway:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={address.road || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      address: { ...address, road: e.target.value }
                    }
                  })
                }
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="input-label">
                <span>City:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={address.city || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      address: { ...address, city: e.target.value }
                    }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>State & Pincode:</span>
              </label>
              <input
                type="text"
                className="login-input"
                value={`${address.state || 'Haryana'} ${address.pincode || '131301'}`}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      address: {
                        ...address,
                        state: parts[0] || 'Haryana',
                        pincode: parts[1] || '131301'
                      }
                    }
                  });
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">
              <span>Full Address String (Public Footer & Invoices):</span>
            </label>
            <input
              type="text"
              className="login-input"
              value={address.full || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contact: {
                    ...contact,
                    address: { ...address, full: e.target.value }
                  }
                })
              }
            />
          </div>

          <div className="form-group">
            <label className="input-label">
              <span>Google Maps Directions URL:</span>
            </label>
            <input
              type="text"
              className="login-input"
              value={contact.googleMapsDirectionsUrl || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contact: { ...contact, googleMapsDirectionsUrl: e.target.value }
                })
              }
            />
          </div>
        </div>

        {/* 5. SOCIAL MEDIA CHANNELS */}
        <div className="admin-content-card">
          <h4 className="section-card-title flex items-center gap-2">
            <Share2 size={18} />
            <span>Social Media & Digital Profiles</span>
          </h4>
          <p className="section-card-sub">Links displayed across header, footer, and contact sections</p>

          <div className="form-row-two mt-3">
            <div className="form-group">
              <label className="input-label">
                <span>Instagram Profile URL:</span>
              </label>
              <input
                type="text"
                className="login-input"
                placeholder="https://instagram.com/..."
                value={social.instagram || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      social: { ...social, instagram: e.target.value }
                    }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>YouTube Channel URL:</span>
              </label>
              <input
                type="text"
                className="login-input"
                placeholder="https://youtube.com/@..."
                value={social.youtube || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      social: { ...social, youtube: e.target.value }
                    }
                  })
                }
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="input-label">
                <span>Facebook Page URL:</span>
              </label>
              <input
                type="text"
                className="login-input"
                placeholder="https://facebook.com/..."
                value={social.facebook || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      social: { ...social, facebook: e.target.value }
                    }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <span>Google Maps Business URL:</span>
              </label>
              <input
                type="text"
                className="login-input"
                placeholder="https://maps.app.goo.gl/..."
                value={social.googleMaps || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: {
                      ...contact,
                      social: { ...social, googleMaps: e.target.value }
                    }
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 mb-8">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
