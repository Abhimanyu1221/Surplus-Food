import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { foodService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';

/**
 * FoodList — Public-facing page showing all "available" food listings.
 * V2.1: Auto-refreshes every 30s, shows last-synced timestamp,
 *        and distinguishes network errors from empty state.
 */
const POLL_INTERVAL = 30_000; // 30 seconds

const FoodList = () => {
  const [foods, setFoods]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const { user } = useAuth();

  const fetchFoods = useCallback(async () => {
    try {
      const response = await foodService.getAvailable();
      setFoods(response.data);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      // Only set error on first load (loading=true); after that, silently retry
      setError(err.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30s auto-refresh
  usePolling(fetchFoods, POLL_INTERVAL);

  // ── Loading skeleton (first load only) ───────────────────
  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="loader-text">Scanning Pune for surplus food…</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Hero Banner ───────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(16,185,129,0.08) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '3rem 0 2.5rem',
        }}
      >
        <div className="container">
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
            <div className="animate-in">
              <h1 className="page-hero-title">Available Surplus Food</h1>
              <p className="page-hero-subtitle">
                Real-time listings from hotels and restaurants across Pune.
                Pick up and feed someone today. 🙏
              </p>

              <div className="flex" style={{ gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="tag">
                  <span style={{ color: 'var(--accent)' }}>●</span>
                  {foods.length} listing{foods.length !== 1 ? 's' : ''} live
                </span>
                <span className="tag">📍 Pune, Maharashtra</span>

                {/* Last synced timestamp */}
                {lastSync && (
                  <span className="tag" style={{ color: 'var(--text-muted)' }}>
                    🔄 Updated {formatTimeAgo(lastSync)}
                  </span>
                )}
              </div>
            </div>

            {!user && (
              <div className="animate-in animate-in-delay-1" style={{ flexShrink: 0 }}>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Join as NGO / Hotel →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="container" style={{ padding: '2rem 1.5rem' }}>

        {/* Network error banner — non-blocking, shows above results */}
        {error && (
          <div className="alert alert-error animate-in" style={{ marginBottom: '1.5rem' }}>
            <span>📡</span>
            <div>
              <strong>Server unreachable</strong> — showing last known results.
              <br />
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{error}</span>
            </div>
          </div>
        )}

        {/* Empty state — only if no error too */}
        {foods.length === 0 && !error ? (
          <div className="empty-state animate-in">
            <div className="empty-state-icon">🍽️</div>
            <div className="empty-state-title">No food available right now</div>
            <p className="empty-state-desc">
              Hotels will post surplus food here throughout the day.
              This page auto-refreshes every 30 seconds.
            </p>
            <Link to="/register" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>
              Register your Hotel
            </Link>
          </div>
        ) : foods.length > 0 ? (
          <>
            <div className="section-header">
              <span className="section-title">Live Listings</span>
              <span className="section-count">{foods.length} available</span>
            </div>
            <div className="card-grid">
              {foods.map((food, i) => (
                <FoodCard key={food.id} food={food} index={i} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/** Format a Date as "just now", "30s ago", "2m ago", etc. */
function formatTimeAgo(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5)  return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}

/** Individual food listing card */
const FoodCard = ({ food, index }) => {
  const delayClass = `animate-in-delay-${Math.min(index + 1, 4)}`;
  return (
    <div className={`card food-card animate-in ${delayClass}`}>
      <div className="card-accent-top" />
      <div className="food-card-header">
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{food.title}</h3>
          <span className="badge badge-available">
            <span className="badge-dot" />
            Available
          </span>
        </div>

        {food.hotel_name && (
          <div className="flex" style={{ gap: '0.5rem', marginBottom: '0.9rem', alignItems: 'flex-start' }}>
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

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {food.description}
        </p>
      </div>

      <div className="food-card-footer">
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem' }}>
            Quantity
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {food.quantity}
          </div>
        </div>
        {food.hotel_phone && (
          <a href={`tel:${food.hotel_phone}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            📞 Call Hotel
          </a>
        )}
      </div>
    </div>
  );
};

export default FoodList;
