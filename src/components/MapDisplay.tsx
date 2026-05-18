import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getStatusColor, getScoreColor } from '../lib/utils';
import { format } from 'date-fns';
import { Report } from '../types';
import kemangData from '../kemangPolygon.json';

// Fix for default marker icons in Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

import { Role } from '../App';

interface MapDisplayProps {
  reports: Report[];
  role?: Role;
}

export default function MapDisplay({ reports, role }: MapDisplayProps) {
  // Center of Kecamatan Kemang, Bogor approximately
  const defaultPosition: [number, number] = [-6.4952, 106.7423];

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <MapContainer 
        center={defaultPosition} 
        zoom={13} 
        scrollWheelZoom={false}
        className="z-0 w-full h-full rounded-3xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* District Boundary Colored */}
        <GeoJSON 
          data={kemangData as any} 
          style={{
            color: '#1e3a8a', // Blue border
            weight: 3,
            fillColor: '#facc15', // Yellow fill
            fillOpacity: 0.2
          }} 
        />

        {reports.map((report) => (
          <Marker 
            key={report.id} 
            position={[report.latitude, report.longitude]}
          >
            <Popup className="custom-popup">
              <div className="p-3 space-y-2.5" style={{ minWidth: '180px' }}>
                {(() => {
                  let firstImg = report.imageUrl;
                  try {
                    const parsed = JSON.parse(firstImg);
                    if (Array.isArray(parsed) && parsed.length > 0) firstImg = parsed[0];
                  } catch (e) {}
                  return firstImg ? (
                    <img 
                      src={firstImg} 
                      alt="Damage" 
                      className="w-full h-24 object-cover"
                      style={{ borderRadius: '12px' }}
                    />
                  ) : null;
                })()}
                <div>
                  {role !== 'warga' && (
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                      RDS: <span className={getScoreColor(report.rdsScore)}>{report.rdsScore}</span>
                    </p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-on-surface-muted)' }}>
                    {report.createdAt
                      ? format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')
                      : 'Baru saja'}
                  </p>
                </div>
                <div className={cn(
                  "text-[10px] uppercase font-bold px-2.5 py-1 rounded-full inline-block",
                  getStatusColor(report.status)
                )}>
                  {report.status}
                </div>
                
                <a 
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-1 py-2 text-[10px] font-bold text-center block rounded-xl transition-colors"
                  style={{ background: 'var(--color-brand-blue)', color: '#fff' }}
                >
                  Buka Street View
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// Minimal cn helper for this file if needed
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
