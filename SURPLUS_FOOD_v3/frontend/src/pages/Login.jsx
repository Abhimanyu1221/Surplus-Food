import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('hotel');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.login({ phone, password, role });
      login(response.data); // stores access_token + user info
      if (role === 'hotel')     navigate('/hotel');
      else if (role === 'ngo')  navigate('/ngo');
      else                      navigate('/volunteer');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-brand">
          <span className="auth-brand-icon">🍱</span>
          <div className="auth-brand-name">SurplusFood Pune</div>
          <div className="auth-brand-tagline">Connecting surplus with need</div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Role toggle */}
          <div className="form-group">
            <div className="form-label">I am a</div>
            <div className="role-toggle" style={{ gridTemplateColumns: '1fr 1fr 1fr', display: 'grid', gap: '4px' }}>
              {[
                { value: 'hotel',     label: '🏨', sub: 'Hotel' },
                { value: 'ngo',       label: '🤝', sub: 'NGO' },
                { value: 'volunteer', label: '🙋', sub: 'Volunteer' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                  gap: '0.15rem',
                  color: role === opt.value ? 'white' : 'var(--text-secondary)',
                  background: role === opt.value ? 'linear-gradient(135deg, var(--primary), #ea580c)' : 'transparent',
                  boxShadow: role === opt.value ? '0 2px 8px var(--primary-glow)' : 'none',
                  transition: 'all var(--transition)', userSelect: 'none',
                }}>
                  <input type="radio" name="login-role" value={opt.value}
                    checked={role === opt.value} onChange={() => setRole(opt.value)}
                    style={{ display: 'none' }} />
                  <span style={{ fontSize: '1.2rem' }}>{opt.label}</span>
                  <span>{opt.sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-phone">Phone Number</label>
            <input id="login-phone" type="tel" className="input-field"
              placeholder="Enter your registered phone number"
              value={phone} onChange={e => setPhone(e.target.value)}
              required autoComplete="tel" />
          </div>

          {/* Password — NEW */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" className="input-field"
              placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            disabled={loading} style={{ marginTop: '0.25rem' }}>
            {loading
              ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</>
              : 'Sign In →'
            }
          </button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: 'center', fontSize: '0.87rem', color: 'var(--text-secondary)' }}>
          New here?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
