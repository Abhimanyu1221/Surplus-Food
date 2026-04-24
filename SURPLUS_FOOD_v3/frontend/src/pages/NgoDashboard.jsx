import React, { useState, useCallback } from 'react';
import { foodService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { PUNE_REGIONS } from '../utils/regions';

/**
 * NgoDashboard — Food discovery and pickup hub for NGO partners.
 * V2.1: Auto-refreshes every 20s, proper error states,
 *        last-synced indicator, OTP reveal in-card.
 */
const POLL_INTERVAL = 20_000; // 20s — NGOs need faster updates to grab food

const NgoDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [foods, setFoods]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [lockStates, setLockStates] = useState({}); // {foodId: {loading, otp, error}}
  const [activeRegion, setActiveRegion] = useState('All');

  const fetchFoods = useCallback(async () => {
    try {
      const response = await foodService.getAvailable();
      setFoods(response.data);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guard runs before polling setup — redirect if not NGO
  React.useEffect(() => {
    if (user !== undefined && (!user || user.role !== 'ngo')) {
      navigate('/login');
    }
  }, [user, navigate]);

  // 20s auto-refresh; only enabled once user is confirmed as NGO
  const pollingEnabled = !!user && user.role === 'ngo';
  usePolling(fetchFoods, POLL_INTERVAL, pollingEnabled);

  const handleLockFood = async (foodId) => {
    setLockStates(prev => ({ ...prev, [foodId]: { loading: true, otp: null, error: null } }));
    try {
      const response = await foodService.lock(foodId, user.id);
      const otp = response.data.otp_code;
      setLockStates(prev => ({ ...prev, [foodId]: { loading: false, otp, error: null } }));
      // Remove from list after a short delay (so OTP is visible first)
      setTimeout(() => {
        setFoods(prev => prev.filter(f => f.id !== foodId));
      }, 5000);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to lock food. It may have already been taken.';
      setLockStates(prev => ({ ...prev, [foodId]: { loading: false, otp: null, error: detail } }));
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="loader-text">Finding food near you…</p>
      </div>
    );
  }

  const filteredFoods = activeRegion === 'All' 
    ? foods 
    : foods.filter(f => f.region === activeRegion);

  return (
    <div>
      {/* ── Page Hero ─────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(249,115,22,0.05) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '2.5rem 0',
        }}
      >
        <div className="container">
          <div className="flex-between animate-in" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-hero-title">NGO Dashboard</h1>
              <p className="page-hero-subtitle">
                Discover surplus food available for pickup across Pune.
                Lock a listing to claim it — auto-refreshes every 20s.
              </p>
              {lastSync && (
                <div className="flex" style={{ gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="tag">
                    <span style={{ color: 'var(--accent)' }}>●</span>
                    {foods.length} available
                  </span>
                  <span className="tag" style={{ color: 'var(--text-muted)' }}>
                    🔄 Synced {formatTimeAgo(lastSync)}
                  </span>
                </div>
              )}
            </div>

            {/* Manual refresh */}
            <button
              className="btn btn-ghost"
              onClick={() => { setLoading(true); fetchFoods(); }}
              style={{ flexShrink: 0 }}
              title="Force refresh now"
            >
              ↻ Refresh Now
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>

        {/* Network error banner */}
        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.5rem' }}>
            <span>📡</span>
            <div>
              <strong>Could not connect to server</strong>
              <br />
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{error} — retrying automatically.</span>
            </div>
          </div>
        )}

        {/* ── Stats ─────────────────────────────────── */}
        <div className="stats-row animate-in">
          <div className="stat-card accent-green">
            <div className="stat-icon">🍛</div>
            <div className="stat-value">{foods.length}</div>
            <div className="stat-label">Available Now</div>
          </div>
          <div className="stat-card accent-primary">
            <div className="stat-icon">📍</div>
            <div className="stat-value">Pune</div>
            <div className="stat-label">Coverage Area</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-icon">🔄</div>
            <div className="stat-value">20s</div>
            <div className="stat-label">Auto-Refresh</div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────── */}
        <div
          className="region-tabs"
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '0.5rem',
            paddingBottom: '1rem',
            marginBottom: '1rem',
            scrollbarWidth: 'none'
          }}
        >
          <button
            onClick={() => setActiveRegion('All')}
            className={`btn btn-sm ${activeRegion === 'All' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}
          >
            All Pune
          </button>
          {PUNE_REGIONS.map((r) => (
            <button
              key={r.name}
              onClick={() => setActiveRegion(r.name)}
              className={`btn btn-sm ${activeRegion === r.name ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* ── Listings ──────────────────────────────── */}
        {filteredFoods.length === 0 && !error ? (
          <div className="empty-state animate-in">
            <div className="empty-state-icon">🕐</div>
            <div className="empty-state-title">No food available in {activeRegion}</div>
            <p className="empty-state-desc">
              Hotels post surplus food throughout the day.
              Check back later or try a different region.
            </p>
            <button
              className="btn btn-ghost"
              style={{ marginTop: '0.5rem' }}
              onClick={() => { setLoading(true); fetchFoods(); }}
            >
              ↻ Refresh Now
            </button>
          </div>
        ) : filteredFoods.length > 0 ? (
          <>
            <div className="section-header">
              <span className="section-title">Available Listings in {activeRegion}</span>
              <span className="section-count">{filteredFoods.length} listings</span>
            </div>
            <div className="card-grid">
              {filteredFoods.map((food, i) => (
                <NgoFoodCard
                  key={food.id}
                  food={food}
                  index={i}
                  lockState={lockStates[food.id]}
                  onLock={() => handleLockFood(food.id)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/** Format date as "just now", "Xs ago", "Xm ago" */
function formatTimeAgo(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5)  return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}

/* ─────────────────────────────────────────────────────────────
   NgoFoodCard — individual listing with OTP reveal
   ───────────────────────────────────────────────────────────── */
const NgoFoodCard = ({ food, index, lockState, onLock }) => {
  const delayClass = `animate-in-delay-${Math.min(index + 1, 4)}`;
  const isLoading  = lockState?.loading;
  const otp        = lockState?.otp;
  const error      = lockState?.error;

  return (
    <div className={`card food-card animate-in ${delayClass}`}>
      <div className="card-accent-top" />

      <div className="food-card-header">
        {/* Title + badge */}
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{food.title}</h3>
          <span className="badge badge-available">
            <span className="badge-dot" />
            Available
          </span>
        </div>

        {/* Hotel info */}
        {food.hotel_name && (
          <div className="flex" style={{ gap: '0.5rem', marginBottom: '0.85rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>📍</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {food.hotel_name}
              </div>
              {food.hotel_address && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  {food.hotel_address}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {food.description}
        </p>

        {/* Error feedback */}
        {error && (
          <div className="alert alert-error animate-in" style={{ marginTop: '0.75rem', fontSize: '0.82rem', padding: '0.6rem 0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* OTP reveal — shown 5s after successful lock */}
        {otp && (
          <div className="otp-display animate-in">
            <div className="otp-label">🔑 Your Pickup OTP</div>
            <div className="otp-code">{otp}</div>
            <div className="otp-sub">
              Show this to the hotel on arrival. Do not share with anyone else.
              <br />
              <strong style={{ color: 'var(--primary)' }}>This card will disappear in 5 seconds.</strong>
            </div>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="food-card-footer">
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem' }}>
            Quantity
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {food.quantity}
          </div>
        </div>

        <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {food.hotel_phone && (
            <a href={`tel:${food.hotel_phone}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              📞
            </a>
          )}
          <button
            className="btn btn-primary"
            onClick={onLock}
            disabled={isLoading || !!otp}
          >
            {isLoading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Locking…</>
            ) : otp ? (
              '✓ Locked!'
            ) : (
              '🔒 Lock Pickup'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NgoDashboard;
