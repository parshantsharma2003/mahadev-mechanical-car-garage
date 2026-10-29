import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { useGarage } from '../../context/GarageContext';
import './AdminLogin.css';

export default function AdminLogin({ onBackToSite }) {
  const { adminLogin } = useGarage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = adminLogin(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message);
      }
    }, 400);
  };

  return (
    <div className="admin-login-wrapper">
      <div className="login-bg-glow"></div>

      <div className="admin-login-card">
        {/* Back Link */}
        <button className="login-back-btn" onClick={onBackToSite} type="button">
          <ArrowLeft size={16} />
          <span>Back to Live Website</span>
        </button>

        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-box">
            <img 
              src="/images/logo.png" 
              alt="Mahadev Mechanical Car Garage" 
              className="login-brand-img"
            />
          </div>
          <div className="admin-badge">
            <ShieldCheck size={14} className="badge-icon" />
            <span>AUTHORISED ACCESS ONLY</span>
          </div>
          <h1 className="login-title">Admin Control Portal</h1>
          <p className="login-sub">Manage workshop appointments, services, reviews, and garage operations</p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={18} className="error-icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="admin-email" className="input-label">
              <Mail size={16} />
              <span>Admin Email / Username</span>
            </label>
            <div className="input-field-wrap">
              <input
                id="admin-email"
                type="text"
                className="login-input"
                placeholder="e.g. admin@mahadevgarage.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="admin-pass" className="input-label">
              <KeyRound size={16} />
              <span>Master Password</span>
            </label>
            <div className="input-field-wrap">
              <input
                id="admin-pass"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-pw-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-submit-btn" 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-spinner">Verifying...</span>
            ) : (
              <>
                <Lock size={18} />
                <span>Enter Admin Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Mahadev Mechanical Car Garage • Gohana, Haryana</p>
        </div>
      </div>
    </div>
  );
}
