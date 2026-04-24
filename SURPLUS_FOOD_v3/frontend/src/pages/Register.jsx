import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hotelService, ngoService, volunteerService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PUNE_REGIONS } from '../utils/regions';

/**
 * Register — Three-role onboarding (Hotel / NGO / Volunteer).
 * V2.2: Added Region selection for Hotels.
 */

const ROLE_CONFIG = {
  hotel: {
    label: '🏨 Hotel / Mess',
    title: 'List your surplus food and help feed Pune.',
    namePlaceholder: 'e.g. Hotel Shreyas',
    nameLabel: 'Hotel / Restaurant Name',
  },
  ngo: {
    label: '🤝 NGO Organization',
    title: 'Coordinate pickups and distribute food to those in need.',
    namePlaceholder: 'e.g. Helping Hands Foundation',
    nameLabel: 'Organization Name',
  },
  volunteer: {
    label: '🙋 Individual Volunteer',
    title: 'Pick up surplus food independently and deliver it directly.',
    namePlaceholder: 'Your full name',
    nameLabel: 'Your Name',
  },
};

const Register = () => {
  const [role, setRole]       = useState('hotel');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', region: '', password: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (role === 'hotel') {
        const res = await hotelService.register({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          region: formData.region,
          password: formData.password,
        });
        login({ ...res.data, role: 'hotel' });
        navigate('/hotel');
      } else if (role === 'ngo') {
        const res = await ngoService.register({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
        });
        login({ ...res.data, role: 'ngo' });
        navigate('/ngo');
      } else {
        const res = await volunteerService.register({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
        });
        login({ ...res.data, role: 'volunteer' });
        navigate('/volunteer');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const config = ROLE_CONFIG[role];

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        {/* Brand */}
        <div className="auth-brand">
          <span className="auth-brand-icon">🍱</span>
          <div className="auth-brand-name">SurplusFood Pune</div>
          <div className="auth-brand-tagline">Join the movement against food waste</div>
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">{config.title}</p>

        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* 3-way role toggle */}
          <div className="form-group">
            <div className="form-label">I want to register as</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.4rem',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                padding: '4px',
                border: '1px solid var(--border)',
              }}
            >
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.55rem 0.4rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    gap: '0.2rem',
                    color: role === key ? 'white' : 'var(--text-secondary)',
                    background: role === key
                      ? 'linear-gradient(135deg, var(--primary), #ea580c)'
                      : 'transparent',
                    boxShadow: role === key ? '0 2px 8px var(--primary-glow)' : 'none',
                    transition: 'all var(--transition)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={key}
                    checked={role === key}
                    onChange={() => setRole(key)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '1.1rem' }}>{cfg.label.split(' ')[0]}</span>
                  <span>{cfg.label.split(' ').slice(1).join(' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">{config.nameLabel}</label>
            <input
              id="reg-name"
              type="text"
              className="input-field"
              placeholder={config.namePlaceholder}
              value={formData.name}
              onChange={handleChange('name')}
              required
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone Number</label>
            <input
              id="reg-phone"
              type="tel"
              className="input-field"
              placeholder="10-digit mobile number"
              value={formData.phone}
              onChange={handleChange('phone')}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="input-field"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange('password')}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              className="input-field"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Address — hotel only */}
          {role === 'hotel' && (
            <>
              <div className="form-group animate-in">
                <label className="form-label" htmlFor="reg-region">Region in Pune</label>
                <select
                  id="reg-region"
                  className="input-field"
                  style={{ backgroundColor: '#1a1a1a', color: 'white' }} // Add this line
                  value={formData.region}
                  onChange={handleChange('region')}
                  required
                >
                  <option value="" disabled>Select your region</option>
                  {PUNE_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group animate-in">
                <label className="form-label" htmlFor="reg-address">Hotel Address</label>
                <textarea
                  id="reg-address"
                  className="input-field"
                  placeholder="Full address with landmark, Pune"
                  value={formData.address}
                  onChange={handleChange('address')}
                  required
                  rows={3}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                  Shown to NGOs and volunteers when they browse listings.
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account…</>
            ) : (
              `Register as ${role === 'hotel' ? 'Hotel' : role === 'ngo' ? 'NGO' : 'Volunteer'} →`
            )}
          </button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: 'center', fontSize: '0.87rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
