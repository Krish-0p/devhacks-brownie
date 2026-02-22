/* ── Nearby Players Map – Doodle Dash ── */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Icon } from '../components/ui';

interface NearbyPlayer {
  username: string;
  avatar?: string;
  location: { lat: number; lon: number; name?: string; label?: string };
}

// Custom Leaflet icon factory
function makeMarkerIcon(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `<div style="
      width:36px;height:36px;display:flex;align-items:center;justify-content:center;
      background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid #000;box-shadow:2px 2px 0 #000;
    "><span style="transform:rotate(45deg);font-size:18px;">🎨</span></div>`,
  });
}

const MY_ICON = makeMarkerIcon('#facc15');
const OTHER_ICON = makeMarkerIcon('#a855f7');

export default function Nearby() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);

  // Fetch players on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ players: NearbyPlayer[] }>('/location/players');
        setPlayers(data.players);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Initialize map after data loads
  useEffect(() => {
    if (!mapRef.current || loading || mapInstanceRef.current) return;

    const defaultCenter = user?.location
      ? [user.location.lat, user.location.lon] as [number, number]
      : [20.5937, 78.9629] as [number, number]; // India center

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: user?.location ? 10 : 4,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add player markers
    const bounds: [number, number][] = [];

    players.forEach(p => {
      if (!p.location) return;
      const isMe = p.username === user?.username;
      const icon = isMe ? MY_ICON : OTHER_ICON;
      const pos: [number, number] = [p.location.lat, p.location.lon];
      bounds.push(pos);

      const marker = L.marker(pos, { icon }).addTo(map);
      marker.bindPopup(`
        <div style="text-align:center;font-family:'Nunito',sans-serif;padding:4px;">
          <strong style="font-size:14px;">${isMe ? '⭐ You' : p.username}</strong>
          <br/>
          <span style="font-size:11px;color:#888;">${p.location.name || p.location.label || 'Unknown location'}</span>
        </div>
      `);

      if (isMe) marker.openPopup();
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loading, players, user]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 z-20 relative">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-purple-800/60 backdrop-blur-md text-white/80 hover:text-white font-bold px-4 py-2 rounded-xl border-2 border-purple-600/50 transition-colors shadow-lg"
        >
          <Icon name="arrow_back" className="text-xl" /> Back
        </button>
        <h1 className="font-display font-black text-2xl text-white drop-shadow-lg flex items-center gap-2">
          <Icon name="explore" filled className="text-3xl text-accent" />
          NEARBY PLAYERS
        </h1>
        <div className="ml-auto bg-purple-800/60 backdrop-blur-md px-4 py-2 rounded-xl border-2 border-purple-600/50 text-purple-200 text-sm font-bold shadow-lg">
          {loading ? '...' : `${players.length} players`}
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative -mt-2">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-purple-950/50 backdrop-blur-sm">
            <div className="text-center">
              <Icon name="sync" className="text-4xl text-accent animate-spin" />
              <p className="text-white font-bold mt-2">Loading players...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="absolute inset-0 rounded-t-3xl overflow-hidden" />
      </div>

      {/* No location notice */}
      {!loading && !user?.location && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-yellow-400 border-4 border-black rounded-2xl px-6 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] z-20 flex items-center gap-3 max-w-sm">
          <Icon name="location_off" filled className="text-2xl text-yellow-900" />
          <div>
            <p className="font-bold text-yellow-900 text-sm">Set your location!</p>
            <button onClick={() => navigate('/profile')} className="text-yellow-700 font-black text-xs underline hover:text-yellow-900">
              Go to Profile →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
