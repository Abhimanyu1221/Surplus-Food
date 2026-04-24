import React, { useState, useCallback } from 'react';
import { foodService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';

const POLL_INTERVAL = 15_000;
const STEPS = ['Listed', 'Locked', 'Verified', 'Picked Up'];

const getStepIndex = (status) => {
  switch (status) {
    case 'available': return 0;
    case 'locked':    return 1;
    case 'picked':    return 3;
    default:          return 0;
  }
};

const BADGE = {
  available: { cls: 'badge-available', label: 'Available',    dot: true  },
  locked:    { cls: 'badge-locked',    label: 'Locked',       dot: false },
  picked:    { cls: 'badge-picked',    label: 'Picked Up ✓',  dot: false },
  expired:   { cls: 'badge-expired',   label: 'Expired',      dot: false },
};

// ── Expiry slider helper ─────────────────────────────────────────────────────
// Allowed steps: 0.5, 1, 1.5, 2, 3, 4, 5, 6  (kept intentionally coarse)
const EXPIRY_STEPS = [0.5, 1, 1.5, 2, 3, 4, 5, 6];
const fmtHours = (h) =>
  h < 1 ? `${h * 60} min` : h === 1 ? '1 hr' : `${h} hrs`;

const HotelDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [foods,     setFoods]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastSync,  setLastSync]  = useState(null);

  const [showForm,     setShowForm]     = useState(false);
  const [formData,     setFormData]     = useState({
    title: '', description: '', quantity: '', expiry_hours: 6,
  });
  const [formLoading,  setFormLoading]  = useState(false);
  const [formMsg,      setFormMsg]      = useState(null);

  const [otpInputs,   setOtpInputs]   = useState({});
  const [otpMessages, setOtpMessages] = useState({});

  // Auth guard
  React.useEffect(() => {
    if (user !== undefined && (!user || user.role !== 'hotel')) navigate('/login');
  }, [user, navigate]);

  const fetchFoods = useCallback(async () => {
    if (!user) return;
    try {
      const res = await foodService.getByHotel(user.id);
      setFoods(res.data);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Server unreachable.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  usePolling(fetchFoods, POLL_INTERVAL, !!user && user.role === 'hotel');

  const stats = {
    total:     foods.length,
    available: foods.filter(f => f.status === 'available').length,
    locked:    foods.filter(f => f.status === 'locked').length,
    picked:    foods.filter(f => f.status === 'picked').length,
    expired:   foods.filter(f => f.status === 'expired').length,
  };

  // ── Add food listing ──────────────────────────────────────────────────────
  const handleAddFood = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg(null);
    try {
      await foodService.add({ ...formData, hotel_id: user.id });
      setFormMsg({ type: 'success', text: `🎉 Food listed! Expires in ${fmtHours(formData.expiry_hours)}.` });
      setFormData({ title: '', description: '', quantity: '', expiry_hours: 6 });
      fetchFoods();
      setTimeout(() => { setShowForm(false); setFormMsg(null); }, 2400);
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to add listing. Try again.' });
    } finally {
      setFormLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (foodId) => {
    const otp = (otpInputs[foodId] || '').trim();
    if (otp.length < 4) {
      setOtpMessages(prev => ({ ...prev, [foodId]: { type: 'error', text: 'Enter the 4-digit OTP.' } }));
      return;
    }
    try {
      await foodService.verifyOtp(foodId, otp);
      setOtpMessages(prev => ({ ...prev, [foodId]: { type: 'success', text: '✅ Pickup verified!' } }));
      setOtpInputs(prev => ({ ...prev, [foodId]: '' }));
      fetchFoods();
    } catch (err) {
      const detail = err.response?.data?.detail || 'OTP verification failed.';
      setOtpMessages(prev => ({ ...prev, [foodId]: { type: 'error', text: `❌ ${detail}` } }));
    }
  };

  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="loader-text">Loading your kitchen dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(245,158,11,0.05) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '2.5rem 0',
      }}>
        <div className="container">
          <div className="flex-between animate-in" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-hero-title">Hotel Dashboard</h1>
              <p className="page-hero-subtitle">Manage surplus food listings, track pickups, and verify deliveries.</p>
              {lastSync && (
                <div className="flex" style={{ gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="tag" style={{ color: 'var(--text-muted)' }}>🔄 Synced {formatTimeAgo(lastSync)}</span>
                  <span className="tag">⚡ Auto-refresh 15s</span>
                </div>
              )}
            </div>
            <button
              className={`btn btn-lg ${showForm ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => { setShowForm(p => !p); setFormMsg(null); }}
            >
              {showForm ? '✕ Cancel' : '+ Add Surplus Food'}
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>

        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.5rem' }}>
            <span>📡</span>
            <div>
              <strong>Server unreachable</strong> — showing last known data.<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-row animate-in">
          <div className="stat-card accent-primary">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Listed</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-icon">🔒</div>
            <div className="stat-value">{stats.locked}</div>
            <div className="stat-label">Locked</div>
          </div>
          <div className="stat-card accent-purple">
            <div className="stat-icon">🎉</div>
            <div className="stat-value">{stats.picked}</div>
            <div className="stat-label">Completed</div>
          </div>
          {stats.expired > 0 && (
            <div className="stat-card" style={{ borderTop: '3px solid #94a3b8' }}>
              <div className="stat-icon">⏰</div>
              <div className="stat-value">{stats.expired}</div>
              <div className="stat-label">Expired</div>
            </div>
          )}
        </div>

        {/* Add Food Form */}
        {showForm && (
          <div className="card animate-in" style={{ marginBottom: '2rem', padding: '2rem', borderTop: '3px solid var(--primary)' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              🍲 Add New Listing
            </h2>

            {formMsg && (
              <div className={`alert alert-${formMsg.type} animate-in`} style={{ marginBottom: '1.25rem' }}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleAddFood}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="food-title">Food Title</label>
                  <input
                    id="food-title" className="input-field"
                    placeholder="e.g. 50 Chapatis + Dal" required
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="food-qty">Quantity</label>
                  <input
                    id="food-qty" className="input-field"
                    placeholder="e.g. 5 kg or 20 boxes" required
                    value={formData.quantity}
                    onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="food-desc">Description</label>
                <textarea
                  id="food-desc" className="input-field"
                  placeholder="Dietary info, container requirements, pickup instructions…"
                  required rows={3}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* ── Expiry duration picker ───────────────────────────────── */}
              <div className="form-group">
                <label className="form-label" htmlFor="food-expiry">
                  ⏱ Available for pickup —&nbsp;
                  <strong style={{ color: 'var(--primary)' }}>{fmtHours(formData.expiry_hours)}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    (max 6 hrs)
                  </span>
                </label>
                <input
                  id="food-expiry"
                  type="range"
                  min={0} max={EXPIRY_STEPS.length - 1} step={1}
                  value={EXPIRY_STEPS.indexOf(formData.expiry_hours) === -1 ? EXPIRY_STEPS.length - 1 : EXPIRY_STEPS.indexOf(formData.expiry_hours)}
                  onChange={e => setFormData(p => ({ ...p, expiry_hours: EXPIRY_STEPS[+e.target.value] }))}
                  style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '0.4rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {EXPIRY_STEPS.map(h => <span key={h}>{fmtHours(h)}</span>)}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  After this period the listing auto-expires and is removed from the NGO/volunteer feed.
                </p>
              </div>
              {/* ─────────────────────────────────────────────────────────── */}

              <button
                type="submit" className="btn btn-primary"
                style={{ padding: '0.7rem 2rem' }} disabled={formLoading}
              >
                {formLoading
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Listing…</>
                  : 'Submit Listing'
                }
              </button>
            </form>
          </div>
        )}

        {/* Active Listings */}
        <div className="section-header">
          <span className="section-title">Your Listings</span>
          <span className="section-count">{foods.length} total</span>
        </div>

        {foods.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍲</div>
            <div className="empty-state-title">No listings yet</div>
            <p className="empty-state-desc">
              Click "Add Surplus Food" above to post your first listing. NGOs across Pune will see it instantly.
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {foods.map((food, i) => (
              <HotelFoodCard
                key={food.id} food={food} index={i}
                otpInput={otpInputs[food.id] || ''}
                otpMessage={otpMessages[food.id]}
                onOtpChange={val => setOtpInputs(p => ({ ...p, [food.id]: val }))}
                onVerifyOtp={() => handleVerifyOtp(food.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5)  return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}

function formatExpiresAt(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── HotelFoodCard ─────────────────────────────────────────────────────────── */
const HotelFoodCard = ({ food, index, otpInput, otpMessage, onOtpChange, onVerifyOtp }) => {
  const activeStep = getStepIndex(food.status);
  const badge      = BADGE[food.status] || BADGE.available;
  const delayClass = `animate-in-delay-${Math.min(index + 1, 4)}`;
  const isExpired  = food.status === 'expired';

  const accentColor =
    food.status === 'available' ? 'linear-gradient(90deg, var(--primary), var(--amber))' :
    food.status === 'locked'    ? 'linear-gradient(90deg, var(--amber), #f97316)' :
    food.status === 'expired'   ? 'linear-gradient(90deg, #94a3b8, #64748b)' :
                                  'linear-gradient(90deg, var(--accent), #6ee7b7)';

  return (
    <div className={`card food-card animate-in ${delayClass}`} style={{ opacity: isExpired ? 0.65 : 1 }}>
      <div style={{ height: '3px', background: accentColor, borderRadius: '18px 18px 0 0' }} />

      <div className="food-card-header">
        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{food.title}</h3>
          <span className={`badge ${badge.cls}`}>
            {badge.dot && <span className="badge-dot" />}
            {badge.label}
          </span>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
          Qty: <strong style={{ color: 'var(--text-primary)' }}>{food.quantity}</strong>
          {food.expires_at && food.status === 'available' && (
            <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
              ⏰ expires {formatExpiresAt(food.expires_at)}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', minHeight: '2.5rem' }}>
          {food.description}
        </p>

        {!isExpired && (
          <>
            <div className="stepper">
              {STEPS.map((label, si) => {
                const isDone   = si < activeStep;
                const isActive = si === activeStep;
                const isLast   = si === STEPS.length - 1;
                return (
                  <div key={label} className={`step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                    <div className="step-circle" title={label}>{isDone ? '✓' : si + 1}</div>
                    {!isLast && <div className="step-line" />}
                  </div>
                );
              })}
            </div>
            <div className="flex-between" style={{ marginTop: '0.25rem' }}>
              {STEPS.map((s, si) => (
                <span key={s} style={{
                  fontSize: '0.6rem',
                  color: si <= activeStep ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: si === activeStep ? 700 : 400,
                  flex: 1, textAlign: si === 0 ? 'left' : si === STEPS.length - 1 ? 'right' : 'center',
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {isExpired && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            This listing expired and has been removed from the public feed.
          </p>
        )}

        {food.status === 'locked' && (
          <div className="pickup-panel animate-in" style={{ marginTop: '1rem' }}>
            <div className="pickup-panel-label">Pickup Assigned To</div>
            <div className="pickup-panel-value">{food.ngo_name || food.volunteer_name || 'Claimant'}</div>
            {(food.ngo_phone || food.volunteer_phone) && (
              <div className="pickup-panel-phone">📞 {food.ngo_phone || food.volunteer_phone}</div>
            )}
          </div>
        )}
      </div>

      {food.status === 'locked' && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            Ask the NGO/volunteer for their OTP to confirm pickup
          </div>
          <div className="flex" style={{ gap: '0.5rem' }}>
            <input
              type="text" inputMode="numeric"
              className="input-field otp-input" placeholder="0000" maxLength={4}
              value={otpInput}
              onChange={e => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ margin: 0, flex: 1 }}
            />
            <button className="btn btn-success" onClick={onVerifyOtp} style={{ flexShrink: 0 }}>Verify</button>
          </div>
          {otpMessage && (
            <div className={`alert alert-${otpMessage.type} animate-in`}
              style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', fontSize: '0.82rem' }}>
              {otpMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelDashboard;
