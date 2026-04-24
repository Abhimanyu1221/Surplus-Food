import React, { useState, useCallback } from 'react';
import { foodService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';

/**
 * VolunteerDashboard — Pickup hub for individual volunteers.
 *
 * Flow:
 *  1. Browse available food (same pool as NGOs)
 *  2. Claim a listing → get a unique OTP
 *  3. Arrive at the hotel → show OTP → hotel verifies → status = "picked"
 *  4. "My Pickups" tab shows claimed/completed history
 *
 * Features: 20s auto-polling, in-card OTP reveal, error states,
 *            tab switching between browse and my pickups.
 */

const POLL_INTERVAL = 20_000;

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('browse'); // 'browse' | 'mypickups'
  const [available, setAvailable] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [claimStates, setClaimStates] = useState({}); // {foodId: {loading, otp, error}}

  // Auth guard
  React.useEffect(() => {
    if (user !== undefined && (!user || user.role !== 'volunteer')) {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Parallel fetch: available food + volunteer's claimed pickups
      const [availRes, myRes] = await Promise.all([
        foodService.getAvailable(),
        foodService.getByVolunteer(user.id),
      ]);
      setAvailable(availRes.data);
      setMyPickups(myRes.data);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Server unreachable.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const pollingEnabled = !!user && user.role === 'volunteer';
  usePolling(fetchData, POLL_INTERVAL, pollingEnabled);

  const handleClaim = async (foodId) => {
    setClaimStates(prev => ({ ...prev, [foodId]: { loading: true, otp: null, error: null } }));
    try {
      const response = await foodService.claim(foodId, user.id);
      const otp = response.data.otp_code;
      setClaimStates(prev => ({ ...prev, [foodId]: { loading: false, otp, error: null } }));
      // After 6s, remove from browse list and refresh my pickups
      setTimeout(() => {
        setAvailable(prev => prev.filter(f => f.id !== foodId));
        fetchData();
      }, 6000);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to claim this listing.';
      setClaimStates(prev => ({ ...prev, [foodId]: { loading: false, otp: null, error: detail } }));
    }
  };

  // ── Derived stats ─────────────────────────────────────────
  const stats = {
    claimed:   myPickups.filter(f => f.status === 'locked').length,
    completed: myPickups.filter(f => f.status === 'picked').length,
    available: available.length,
  };

  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="loader-text">Loading your volunteer dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Hero ─────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.07) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '2.5rem 0',
        }}
      >
        <div className="container">
          <div className="flex-between animate-in" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-hero-title">Volunteer Dashboard</h1>
              <p className="page-hero-subtitle">
                Claim surplus food listings and pick them up directly.
                Show your OTP to the hotel on arrival.
              </p>
              {lastSync && (
                <div className="flex" style={{ gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="tag" style={{ color: 'var(--accent)' }}>
                    <span>●</span> {stats.available} available
                  </span>
                  <span className="tag">🔄 Synced {formatTimeAgo(lastSync)}</span>
                  <span className="tag">⚡ Auto-refresh 20s</span>
                </div>
              )}
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => { setLoading(true); fetchData(); }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>

        {/* Network error */}
        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.5rem' }}>
            <span>📡</span>
            <div>
              <strong>Server unreachable</strong> — retrying automatically.<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{error}</span>
            </div>
          </div>
        )}

        {/* ── Stats Row ─────────────────────────────── */}
        <div className="stats-row animate-in">
          <div className="stat-card accent-green">
            <div className="stat-icon">🍛</div>
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available Now</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-icon">🔒</div>
            <div className="stat-value">{stats.claimed}</div>
            <div className="stat-label">Claimed by You</div>
          </div>
          <div className="stat-card accent-purple">
            <div className="stat-icon">🎉</div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Pickups Completed</div>
          </div>
        </div>

        {/* ── Tab Switcher ───────────────────────────── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1.5rem',
            gap: '0',
          }}
        >
          {[
            { key: 'browse',    label: `🔍 Browse Listings (${stats.available})` },
            { key: 'mypickups', label: `📦 My Pickups (${myPickups.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: tab === t.key ? 700 : 500,
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.92rem',
                padding: '0.75rem 1.25rem',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                marginBottom: '-1px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Browse Tab ────────────────────────────── */}
        {tab === 'browse' && (
          available.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="empty-state-icon">🕐</div>
              <div className="empty-state-title">No food available right now</div>
              <p className="empty-state-desc">
                Hotels post surplus food throughout the day.
                This page auto-refreshes every 20 seconds.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {available.map((food, i) => (
                <VolunteerFoodCard
                  key={food.id}
                  food={food}
                  index={i}
                  claimState={claimStates[food.id]}
                  onClaim={() => handleClaim(food.id)}
                />
              ))}
            </div>
          )
        )}

        {/* ── My Pickups Tab ────────────────────────── */}
        {tab === 'mypickups' && (
          myPickups.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No pickups yet</div>
              <p className="empty-state-desc">
                Claim a food listing from the Browse tab to get started.
                Your claimed pickups and completed deliveries will appear here.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setTab('browse')}
                style={{ marginTop: '0.5rem' }}
              >
                Browse Available Food →
              </button>
            </div>
          ) : (
            <div className="card-grid">
              {myPickups.map((food, i) => (
                <MyPickupCard key={food.id} food={food} index={i} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

/** Format time ago */
function formatTimeAgo(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5)  return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}

/* ─────────────────────────────────────────────────────────────
   VolunteerFoodCard — browse card with "Claim Pickup" CTA
   ───────────────────────────────────────────────────────────── */
const VolunteerFoodCard = ({ food, index, claimState, onClaim }) => {
  const delayClass = `animate-in-delay-${Math.min(index + 1, 4)}`;
  const isLoading  = claimState?.loading;
  const otp        = claimState?.otp;
  const claimErr   = claimState?.error;

  return (
    <div className={`card food-card animate-in ${delayClass}`}>
      {/* Indigo accent for volunteers (distinct from NGO orange) */}
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          borderRadius: '18px 18px 0 0',
        }}
      />

      <div className="food-card-header">
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{food.title}</h3>
          <span className="badge badge-available">
            <span className="badge-dot" />
            Available
          </span>
        </div>

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

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {food.description}
        </p>

        {claimErr && (
          <div className="alert alert-error animate-in" style={{ marginTop: '0.75rem', fontSize: '0.82rem', padding: '0.6rem 0.9rem' }}>
            ⚠️ {claimErr}
          </div>
        )}

        {/* OTP reveal box */}
        {otp && (
          <div className="otp-display animate-in" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.1))', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div className="otp-label" style={{ color: '#818cf8' }}>🔑 Your Pickup OTP</div>
            <div className="otp-code" style={{ color: '#a5b4fc', textShadow: '0 0 16px rgba(99,102,241,0.4)' }}>{otp}</div>
            <div className="otp-sub">
              Show this to the hotel on arrival. Keep it private.
              <br />
              <strong style={{ color: '#818cf8' }}>Switching to My Pickups in 6 seconds…</strong>
            </div>
          </div>
        )}
      </div>

      <div className="food-card-footer">
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem' }}>Quantity</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{food.quantity}</div>
        </div>

        <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {food.hotel_phone && (
            <a href={`tel:${food.hotel_phone}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>📞</a>
          )}
          <button
            style={{
              background: otp
                ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
            }}
            className="btn"
            onClick={onClaim}
            disabled={isLoading || !!otp}
          >
            {isLoading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Claiming…</>
            ) : otp ? '✓ Claimed!' : '🙋 Claim Pickup'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MyPickupCard — shows status of volunteer's claimed pickups
   ───────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  locked: { badge: 'badge-locked',  label: '🔒 En Route',    desc: 'Head to the hotel and show your OTP to verify pickup.' },
  picked: { badge: 'badge-picked',  label: '✅ Completed',   desc: 'Pickup successfully verified. Great work!' },
};

const MyPickupCard = ({ food, index }) => {
  const delayClass = `animate-in-delay-${Math.min(index + 1, 4)}`;
  const cfg = STATUS_CONFIG[food.status] || STATUS_CONFIG.locked;

  return (
    <div className={`card food-card animate-in ${delayClass}`}>
      <div
        style={{
          height: '3px',
          background: food.status === 'picked'
            ? 'linear-gradient(90deg, var(--accent), #6ee7b7)'
            : 'linear-gradient(90deg, var(--amber), #f97316)',
          borderRadius: '18px 18px 0 0',
        }}
      />

      <div className="food-card-header">
        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{food.title}</h3>
          <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Qty: <strong style={{ color: 'var(--text-primary)' }}>{food.quantity}</strong>
        </div>

        {food.hotel_name && (
          <div className="flex" style={{ gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>📍</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{food.hotel_name}</div>
              {food.hotel_address && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{food.hotel_address}</div>
              )}
            </div>
          </div>
        )}

        <div className="alert alert-info" style={{ fontSize: '0.82rem', padding: '0.6rem 0.9rem' }}>
          {cfg.desc}
        </div>

        {/* Show call button for en-route pickups */}
        {food.status === 'locked' && food.hotel_phone && (
          <a
            href={`tel:${food.hotel_phone}`}
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: 'none', marginTop: '0.75rem', display: 'inline-flex' }}
          >
            📞 Call Hotel — {food.hotel_phone}
          </a>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
