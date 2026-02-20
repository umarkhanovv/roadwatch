import { useEffect, useRef, useState } from 'react'

export function LocationModal({ onConfirm, onCancel, initial }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markerRef = useRef(null)
  const [coords, setCoords] = useState(initial || null)

  useEffect(() => {
    if (!mapRef.current) return

    // Dynamic import to avoid SSR issues
    import('leaflet').then(L => {
      if (leafletMapRef.current) return

      const defaultCenter = initial
        ? [initial.lat, initial.lng]
        : [48.8566, 2.3522]

      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: initial ? 15 : 5,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Custom marker icon
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:38px;
          background:var(--primary,#355872);
          border:3px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
      })

      let marker = null

      if (initial) {
        marker = L.marker([initial.lat, initial.lng], { icon, draggable: true }).addTo(map)
        markerRef.current = marker
      }

      const handleClick = (e) => {
        const { lat, lng } = e.latlng
        setCoords({ lat, lng })
        if (marker) {
          marker.setLatLng([lat, lng])
        } else {
          marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
          markerRef.current = marker
          marker.on('dragend', () => {
            const p = marker.getLatLng()
            setCoords({ lat: p.lat, lng: p.lng })
          })
        }
      }

      map.on('click', handleClick)

      if (marker) {
        marker.on('dragend', () => {
          const p = marker.getLatLng()
          setCoords({ lat: p.lat, lng: p.lng })
        })
      }

      leafletMapRef.current = map
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>
            📍 Choose Location
          </span>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Click on the map to place a marker. Drag to adjust.
          </p>
        </div>

        <div ref={mapRef} style={{ width: '100%', height: 420, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--border)' }} />

        {coords && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'var(--bg)', borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'var(--primary)', border: '1px solid var(--border)',
          }}>
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={() => coords && onConfirm(coords)}
            disabled={!coords}
            style={btnPrimary(!!coords)}
          >
            Confirm Location
          </button>
          <button onClick={onCancel} style={btnSecondary}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(26,42,54,0.65)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, backdropFilter: 'blur(4px)',
  animation: 'fadeIn 0.2s ease',
}

const modal = {
  background: 'var(--bg-card)',
  borderRadius: 14,
  padding: 24,
  width: '100%',
  maxWidth: 700,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-lg)',
}

const header = { marginBottom: 14 }

const btnPrimary = (enabled) => ({
  flex: 1,
  padding: '11px 0',
  background: enabled ? 'var(--primary)' : '#aac3d4',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontFamily: 'var(--font-body)',
  fontWeight: 700,
  fontSize: 14,
  transition: 'background 0.2s',
})

const btnSecondary = {
  flex: 1,
  padding: '11px 0',
  background: 'transparent',
  color: 'var(--primary)',
  border: '2px solid var(--primary)',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontWeight: 700,
  fontSize: 14,
}
