import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { foodService } from '../services/api';
import { PUNE_REGIONS } from '../utils/regions';
import L from 'leaflet';

// Fix leaflet marker icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapView = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const res = await foodService.getAvailable();
      setFoods(res.data);
    } catch (err) {
      console.error("Failed to load map data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group foods by region
  const foodsByRegion = {};
  foods.forEach(food => {
    if (food.region) {
      if (!foodsByRegion[food.region]) {
        foodsByRegion[food.region] = [];
      }
      foodsByRegion[food.region].push(food);
    }
  });

  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="loader-text">Loading map…</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(16,185,129,0.05) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '2rem 0',
        }}
      >
        <div className="container">
          <h1 className="page-hero-title">Live Food Map</h1>
          <p className="page-hero-subtitle">
            Explore available surplus food across Pune in real-time.
          </p>
        </div>
      </div>
      
      <div style={{ height: 'calc(100vh - 200px)', width: '100%', position: 'relative', zIndex: 0 }}>
        <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {PUNE_REGIONS.map(region => {
            const regionFoods = foodsByRegion[region.name];
            // Only show a marker if there's active food in this region
            if (!regionFoods || regionFoods.length === 0) return null;
            
            return (
              <Marker key={region.name} position={[region.lat, region.lng]}>
                <Popup>
                  <div style={{ maxWidth: '250px', fontFamily: 'Inter, sans-serif' }}>
                    <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: 'var(--primary)', fontFamily: 'Outfit, sans-serif' }}>
                      {region.name} ({regionFoods.length} listings)
                    </h3>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                      {regionFoods.map(f => (
                        <div key={f.id} style={{ marginBottom: '10px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong><br/>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            📍 {f.hotel_name}<br/>
                            📦 Qty: {f.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
