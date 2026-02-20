export function ReportsTable({ reports, isAdmin = false }) {
  const allDetections = reports.flatMap(r =>
    (r.detections || []).map(d => ({ ...d, report: r }))
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (allDetections.length === 0) {
    return (
      <div style={emptyBox}>
        <div style={{fontSize:40,marginBottom:10}}>🛣️</div>
        <div style={{fontWeight:700,color:'var(--text-muted)'}}>No reports yet. Submit the first defect!</div>
      </div>
    )
  }

  return (
    <div style={tableCard}>
      <div style={tableHeader}>
        <h2 style={tableTitle}>
          {isAdmin ? '🗄️ All Detections' : '📋 Detection Log'}
        </h2>
        <span style={countBadge}>{allDetections.length} total</span>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={table}>
          <thead>
            <tr>
              {['TIME','REPORT ID','TYPE','CONFIDENCE','LATITUDE','LONGITUDE','STATUS'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allDetections.map((d, i) => (
              <tr key={d.id || i} style={i % 2 === 0 ? rowEven : rowOdd}>
                <td style={td}>{new Date(d.created_at).toLocaleString()}</td>
                <td style={td}><span style={reportId}>#{d.report.id}</span></td>
                <td style={td}><span style={defectBadge(d.defect_type)}>{formatType(d.defect_type)}</span></td>
                <td style={td}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={confBar}>
                      <div style={confFill(d.confidence)} />
                    </div>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:600,color:confColor(d.confidence)}}>
                      {Math.round((d.confidence||0)*100)}%
                    </span>
                  </div>
                </td>
                <td style={td}><span style={mono}>{(d.latitude||0).toFixed(5)}</span></td>
                <td style={td}><span style={mono}>{(d.longitude||0).toFixed(5)}</span></td>
                <td style={td}><span style={statusBadge(d.report.status)}>{d.report.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatType(t) {
  if (!t && t !== 0) return 'Unknown'
  const s = String(t)
  try { if (!isNaN(Number(s))) return 'Pothole' } catch {}
  return s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
}

const DEFECT_COLORS = {
  pothole:'#e74c3c', crack:'#e67e22', alligator_crack:'#d35400',
  rutting:'#8e44ad', depression:'#2980b9', edge_crack:'#c0392b',
  patching:'#27ae60', weathering:'#7f8c8d',
}

const defectBadge = (t) => {
  const key = String(t||'').toLowerCase().replace(/ /g,'_')
  const color = DEFECT_COLORS[key] || '#355872'
  return { padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700, background:color+'22', color, whiteSpace:'nowrap' }
}

const statusBadge = (s) => {
  const colors = { pending:'#f39c12', processed:'#27ae60', no_defects:'#7AAACE', failed:'#e74c3c' }
  const c = colors[s] || '#aaa'
  return { padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)', background:c+'22', color:c, textTransform:'uppercase', whiteSpace:'nowrap' }
}

const confColor = (c) => { const p=(c||0)*100; return p>=70?'#27ae60':p>=40?'#f39c12':'#e74c3c' }

const tableCard = { background:'var(--bg-card)', borderRadius:14, border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }
const tableHeader = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }
const tableTitle = { fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--primary)' }
const countBadge = { background:'rgba(53,88,114,0.1)', color:'var(--primary)', padding:'4px 12px', borderRadius:20, fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700 }
const table = { width:'100%', borderCollapse:'collapse', fontSize:13 }
const th = { padding:'10px 16px', textAlign:'left', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', background:'rgba(53,88,114,0.04)', whiteSpace:'nowrap' }
const td = { padding:'10px 16px', color:'var(--text)', verticalAlign:'middle' }
const rowEven = { borderBottom:'1px solid var(--border)' }
const rowOdd = { borderBottom:'1px solid var(--border)', background:'rgba(247,248,240,0.6)' }
const reportId = { color:'var(--secondary)', fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13 }
const mono = { fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }
const confBar = { width:60, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }
const confFill = (c) => ({ height:'100%', width:`${Math.round((c||0)*100)}%`, background: (c||0)>=0.7?'#27ae60':(c||0)>=0.4?'#f39c12':'#e74c3c', borderRadius:3 })
const emptyBox = { background:'var(--bg-card)', borderRadius:14, border:'1px solid var(--border)', padding:'40px', textAlign:'center' }