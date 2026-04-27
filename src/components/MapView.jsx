import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom small circle icon for vertices
const vertexIcon = L.divIcon({
  className: 'custom-vertex-icon',
  html: '<div style="width: 10px; height: 10px; background: white; border: 2px solid #6366f1; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const activeVertexIcon = L.divIcon({
  className: 'custom-vertex-icon active',
  html: '<div style="width: 14px; height: 14px; background: #f59e0b; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapEvents({ onAddPoint, isDrawing }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint(e.latlng);
      }
    },
  });
  return null;
}

function BoundsHandler({ data, shouldFitBounds, onFitBoundsComplete }) {
  const map = useMap();
  useEffect(() => {
    if (shouldFitBounds && data && data.features && data.features.length > 0) {
      try {
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          onFitBoundsComplete();
        }
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }
  }, [data, map, shouldFitBounds, onFitBoundsComplete]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="custom-zoom-controls">
      <button className="zoom-btn top" onClick={() => map.zoomIn()}>+</button>
      <button className="zoom-btn bottom" onClick={() => map.zoomOut()}>-</button>
    </div>
  );
}

const MapView = ({ data, onUpdateData, isDrawing, drawPoints, onAddPoint, onDeleteDrawPoint, onEditFeature, mapTheme, shouldFitBounds, onFitBoundsComplete, activeDrawIndex, onSetActiveDrawIndex }) => {
  
  const tileUrl = mapTheme === 'light' 
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  const handleMarkerDragEnd = (featureIndex, coordIndex, latlng, type = 'Point', ringIndex = 0, polyIndex = 0) => {
    const newData = JSON.parse(JSON.stringify(data));
    const feature = newData.features[featureIndex];
    
    if (type === 'Polygon') {
      feature.geometry.coordinates[ringIndex][coordIndex] = [latlng.lng, latlng.lat];
      const ring = feature.geometry.coordinates[ringIndex];
      if (coordIndex === 0 || coordIndex === ring.length - 1) {
        ring[0] = [latlng.lng, latlng.lat];
        ring[ring.length - 1] = [latlng.lng, latlng.lat];
      }
    } else if (type === 'MultiPolygon') {
      feature.geometry.coordinates[polyIndex][ringIndex][coordIndex] = [latlng.lng, latlng.lat];
      const ring = feature.geometry.coordinates[polyIndex][ringIndex];
      if (coordIndex === 0 || coordIndex === ring.length - 1) {
        ring[0] = [latlng.lng, latlng.lat];
        ring[ring.length - 1] = [latlng.lng, latlng.lat];
      }
    } else {
      feature.geometry.coordinates = [latlng.lng, latlng.lat];
    }
    
    onUpdateData(newData);
  };

  return (
    <MapContainer 
      center={[-7.5360, 112.2384]} // Focused on East Java
      zoom={8} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        key={mapTheme} // Force re-render of tiles on theme change
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />
      
      <MapEvents onAddPoint={onAddPoint} isDrawing={isDrawing} />
      
      {/* Current Drawing Preview */}
      {isDrawing && drawPoints.length > 0 && (
        <>
          {/* Active Path */}
          <Polyline 
            positions={drawPoints.slice(0, activeDrawIndex + 1).map(p => [p[1], p[0]])} 
            color={mapTheme === 'light' ? '#4f46e5' : '#6366f1'} 
            weight={3} 
          />
          
          {/* Tail Path (Disconnected) */}
          {activeDrawIndex < drawPoints.length - 1 && (
            <Polyline 
              positions={drawPoints.slice(activeDrawIndex).map(p => [p[1], p[0]])} 
              color="#9ca3af" 
              weight={2} 
              dashArray="5, 10"
            />
          )}

          {drawPoints.map((p, idx) => (
            <Marker 
              key={`draw-p-${idx}`} 
              position={[p[1], p[0]]} 
              icon={idx === activeDrawIndex ? activeVertexIcon : vertexIcon}
              zIndexOffset={idx === activeDrawIndex ? 1000 : 0}
            >
              <Popup closeButton={false} className="mini-popup">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px' }}>
                  <button 
                    onClick={() => onSetActiveDrawIndex(idx)}
                    style={{ 
                      background: idx === activeDrawIndex ? '#f59e0b' : '#6366f1',
                      color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    {idx === activeDrawIndex ? 'Titik Aktif' : 'Mulai dari sini'}
                  </button>
                  <button 
                    onClick={() => onDeleteDrawPoint(idx)}
                    style={{ 
                      background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    Hapus Titik
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )}

      {/* Base GeoJSON Layer */}
      {data && (
        <GeoJSON 
          key={`geojson-${JSON.stringify(data)}-${mapTheme}`}
          data={data} 
          style={{
            fillColor: mapTheme === 'light' ? '#4f46e5' : '#6366f1',
            weight: 2,
            opacity: 1,
            color: mapTheme === 'light' ? '#4338ca' : '#818cf8',
            fillOpacity: 0.2,
          }}
        />
      )}

      {/* Draggable Markers Layer */}
      {!isDrawing && data && data.features.map((feature, fIdx) => {
        const { type } = feature.geometry;

        if (type === 'Point') {
          const [lng, lat] = feature.geometry.coordinates;
          return (
            <Marker 
              key={`point-${fIdx}`}
              position={[lat, lng]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(fIdx, 0, e.target.getLatLng(), 'Point'),
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onEditFeature(fIdx, 0);
                }
              }}
            >
              <Popup>{feature.properties?.name || 'Point'}</Popup>
            </Marker>
          );
        }
        
        if (type === 'Polygon') {
          return feature.geometry.coordinates.map((ring, rIdx) => 
            ring.map((coord, cIdx) => {
              if (cIdx === ring.length - 1) return null;
              const [lng, lat] = coord;
              return (
                <Marker
                  key={`poly-${fIdx}-${rIdx}-${cIdx}`}
                  position={[lat, lng]}
                  icon={vertexIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => handleMarkerDragEnd(fIdx, cIdx, e.target.getLatLng(), 'Polygon', rIdx),
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      onEditFeature(fIdx, cIdx);
                    }
                  }}
                />
              );
            })
          );
        }

        if (type === 'MultiPolygon') {
          return feature.geometry.coordinates.map((poly, pIdx) => 
            poly.map((ring, rIdx) => 
              ring.map((coord, cIdx) => {
                if (cIdx === ring.length - 1) return null;
                const [lng, lat] = coord;
                return (
                  <Marker
                    key={`multipoly-${fIdx}-${pIdx}-${rIdx}-${cIdx}`}
                    position={[lat, lng]}
                    icon={vertexIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => handleMarkerDragEnd(fIdx, cIdx, e.target.getLatLng(), 'MultiPolygon', rIdx, pIdx)
                    }}
                  />
                );
              })
            )
          );
        }
        
        return null;
      })}
      
      <BoundsHandler data={data} shouldFitBounds={shouldFitBounds} onFitBoundsComplete={onFitBoundsComplete} />
      <ZoomControls />
    </MapContainer>
  );
};

export default MapView;
