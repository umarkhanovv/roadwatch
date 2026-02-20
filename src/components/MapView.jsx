import { useEffect, useRef } from 'react'

const DEFECT_COLORS = {
  pothole: '#cc3a2f',
  crack: '#d47c1a',
  alligator_crack: '#b8420f',
  rutting: '#8b5e3c',
  depression: '#6b4c9a',
  edge_crack: '#d4881a',
  patching: '#2e9966',
  weathering: '#5a7080',
  default: '#355872',
}

function getColor(type) {
  return DEFECT_COLORS[type] || DEFECT_COLORS.default
}

export function MapView({ reports, t = (k) => k }) {
  const mapRef = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef({}) // report_id -> marker

  useEffect(() => {
    import('leaflet').then(L => {
      if (leafletRef.current) return
      const map = L.map(mapRef.current, {
        center: [48.8566, 2.3522],
        zoom: 5,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      leafletRef.current = map
    })
  }, [])

  useEffect(() => {
    if (!leafletRef.current) return
    import('leaflet').then(L => {
      const map = leafletRef.current
      const existingIds = new Set(Object.keys(markersRef.current).map(Number))

      reports.forEach(report => {
        if (existingIds.has(report.id)) return

        const dets = report.detections || []
        const mainDet = dets[0]
        const color = mainDet ? getColor(mainDet.defect_type) : 'var(--secondary)'
        const label = mainDet ? formatType(mainDet.defect_type) : 'Unknown'
        const conf = mainDet ? `${(mainDet.confidence * 100).toFixed(0)}%` : '—'

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:18px;height:18px;
            background:${color};
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
            cursor:pointer;
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })

        const popup = `
          <div style="font-family:'Nunito',sans-serif;min-width:160px;padding:4px 0;">
            <div style="font-weight:700;color:#355872;font-size:14px;margin-bottom:4px;">
              ${label}
            </div>
            <div style="font-size:12px;color:#5a7080;margin-bottom:2px;">
              Confidence: <strong style="color:${color}">${conf}</strong>
            </div>
            ${dets.length > 1 ? `<div style="font-size:12px;color:#5a7080;">+${dets.length - 1} more defect(s)</div>` : ''}
            <div style="font-size:11px;color:#9aabb5;margin-top:6px;">
              Report #${report.id}<br/>
              ${new Date(report.created_at).toLocaleString()}
            </div>
            ${report.description ? `<div style="font-size:12px;color:#355872;margin-top:4px;font-style:italic;">"${report.description}"</div>` : ''}
          </div>
        `

        const marker = L.marker([report.latitude, report.longitude], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 260 })

        marker.on('add', () => {
          const el = marker.getElement()
          if (el) el.style.animation = 'pulse 0.5s ease'
        })

        markersRef.current[report.id] = marker
      })

      if (reports.length > 0) {
        const latest = reports[0]
        if (!existingIds.has(latest.id)) {
          map.flyTo([latest.latitude, latest.longitude], Math.max(map.getZoom(), 13), { duration: 1.2 })
          setTimeout(() => {
            const m = markersRef.current[latest.id]
            if (m) m.openPopup()
          }, 1400)
        }
      }
    })
  }, [reports])

  const defectCount = reports.filter(r => r.detections?.length > 0).length

  return (
    <div style={wrapper}>
      <div style={mapHeader}>
        <span style={mapTitle}>{t('mapTitle')}</span>
        <span style={badge}>{defectCount} {t('defectsMapped')}</span>
      </div>
      <div ref={mapRef} style={mapStyle} />
      <Legend t={t} />
    </div>
  )
}

function Legend({ t }) {
  const types = [
    { type: 'pothole', label: 'Pothole' },
    { type: 'crack', label: 'Crack' },
    { type: 'rutting', label: 'Rutting' },
    { type: 'patching', label: 'Patching' },
  ]
  return (
    <div style={legendStyle}>
      {types.map(({ type, label }) => (
        <span key={type} style={legendItem}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(type), display: 'inline-block' }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function formatType(t) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const wrapper = { background:'var(--bg-card)',borderRadius:14,boxShadow:'var(--shadow)',border:'1px solid var(--border)',overflow:'hidden' }
const mapHeader = { padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--border)' }
const mapTitle = { fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)' }
const badge = { background:'rgba(156,213,255,0.25)',color:'var(--primary)',border:'1px solid var(--accent)',borderRadius:20,padding:'2px 12px',fontSize:12,fontWeight:700 }
const mapStyle = { height:420,width:'100%' }
const legendStyle = { padding:'10px 20px',display:'flex',gap:16,flexWrap:'wrap',borderTop:'1px solid var(--border)',background:'var(--bg)' }
const legendItem = { display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text-muted)',fontWeight:600 }
