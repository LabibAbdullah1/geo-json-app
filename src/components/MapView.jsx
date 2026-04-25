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

function BoundsHandler({ data, isDrawing }) {
  const map = useMap();
  useEffect(() => {
    // Only auto-fit if we have data and ARE NOT drawing
    if (!isDrawing && data && data.features && data.features.length > 0) {
      try {
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {}
    }
  }, [data, map, isDrawing]);
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

const MapView = ({ data, onUpdateData, isDrawing, drawPoints, onAddPoint }) => {
  
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
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapEvents onAddPoint={onAddPoint} isDrawing={isDrawing} />
      
      {/* Current Drawing Preview */}
      {isDrawing && drawPoints.length > 0 && (
        <>
          <Polyline 
            positions={drawPoints.map(p => [p[1], p[0]])} 
            color="#6366f1" 
            weight={3} 
            dashArray="5, 10"
          />
          {drawPoints.map((p, idx) => (
            <Marker 
              key={`draw-p-${idx}`} 
              position={[p[1], p[0]]} 
              icon={vertexIcon} 
            />
          ))}
        </>
      )}

      {/* Base GeoJSON Layer */}
      {data && (
        <GeoJSON 
          key={`geojson-${JSON.stringify(data)}`}
          data={data} 
          style={{
            fillColor: '#6366f1',
            weight: 2,
            opacity: 1,
            color: '#818cf8',
            fillOpacity: 0.15,
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
                dragend: (e) => handleMarkerDragEnd(fIdx, 0, e.target.getLatLng(), 'Point')
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
                    dragend: (e) => handleMarkerDragEnd(fIdx, cIdx, e.target.getLatLng(), 'Polygon', rIdx)
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
      
      <BoundsHandler data={data} isDrawing={isDrawing} />
      <ZoomControls />
    </MapContainer>
  );
};

export default MapView;
