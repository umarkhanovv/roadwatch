import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchReports, createWebSocket } from './api'
import { UploadForm } from './components/UploadForm'
import { MapView } from './components/MapView'
import { ReportsTable } from './components/ReportsTable'
import { ToastContainer } from './components/Toast'

let toastId = 0
const ADMIN_PASSWORD = 'wsuk'

function getMyReportIds() {
  try { return JSON.parse(sessionStorage.getItem('my_report_ids') || '[]') } catch { return [] }
}
function addMyReportId(id) {
  const ids = getMyReportIds()
  if (!ids.includes(id)) { ids.push(id); sessionStorage.setItem('my_report_ids', JSON.stringify(ids)) }
}

export default function App() {
  const path = window.location.pathname
  const isAdmin = path === '/admin'

  const [reports, setReports] = useState([])
  const [toasts, setToasts] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const [myIds, setMyIds] = useState(getMyReportIds())
  const [adminAuthed, setAdminAuthed] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  )
  const wsRef = useRef(null)

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    fetchReports().then(setReports).catch(() => addToast('Could not load reports', 'error'))
  }, [])

  useEffect(() => {
    let reconnectTimer = null
    function connect() {
      const ws = createWebSocket((msg) => {
        if (msg.event === 'new_report') {
          setReports(prev => {
            const exists = prev.find(r => r.id === msg.report.id)
            if (exists) return prev.map(r => r.id === msg.report.id ? { ...r, ...msg.report } : r)
            return [msg.report, ...prev]
          })
        }
      })
      ws.onopen = () => setWsStatus('connected')
      ws.onclose = () => { setWsStatus('disconnected'); reconnectTimer = setTimeout(connect, 3000) }
      wsRef.current = ws
    }
    connect()
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close() }
  }, [])

  const handleSuccess = (result) => {
    addMyReportId(result.report_id)
    setMyIds(getMyReportIds())
    setTimeout(() => { fetchReports().then(setReports).catch(() => {}) }, 500)
  }

  const handleAdminLogin = (password) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      setAdminAuthed(true)
      return true
    }
    return false
  }

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_auth')
    setAdminAuthed(false)
  }

  const myReports = reports.filter(r => myIds.includes(r.id))

  return (
    <div style={layout}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
        * { box-sizing:border-box; }
        .main-grid { display:grid; grid-template-columns:minmax(300px,400px) 1fr; gap:20px; align-items:start; }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .my-reports-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .files-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        @media(max-width:768px) {
          body, html { overflow-x: hidden; }
          .admin-wrap { overflow-x: hidden; width: 100%; max-width: 100vw; }
          .main-grid { grid-template-columns:1fr; }
          .main-pad { padding:12px !important; }
          .header-inner { padding:0 12px !important; height:52px !important; }
          .logo-sub { display:none; }
          .footer-right { display:none; }
          .stats-grid { grid-template-columns:repeat(2,1fr); }
          .my-reports-grid { grid-template-columns:1fr; }
          .files-grid { grid-template-columns:1fr; }
          .files-grid { grid-template-columns:1fr !important; }
          .nav-label { display:none; }
        }
      `}</style>

      <header style={headerStyle}>
        <div className="header-inner" style={headerInner}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:24}}>🛣️</span>
            <div>
              <div style={logoName}>RoadWatch</div>
              <div className="logo-sub" style={logoSub}>AI-Powered Road Defect Reporting</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <a href="/" style={navLink(path==='/')}>🏠 <span className="nav-label">Report</span></a>
            <a href="/admin" style={navLink(isAdmin)}>⚙️ <span className="nav-label">Admin</span></a>
            {isAdmin && adminAuthed && (
              <button onClick={handleAdminLogout} style={logoutBtn}>🚪 Logout</button>
            )}
            <div style={{display:'flex',alignItems:'center',gap:5,marginLeft:4}}>
              <span style={wsDot(wsStatus)} />
              <span style={wsText}>{wsStatus==='connected'?'Live':'Reconnecting'}</span>
            </div>
          </div>
        </div>
      </header>

      {isAdmin ? (
        adminAuthed
          ? <AdminView reports={reports} onLogout={handleAdminLogout} />
          : <AdminLogin onLogin={handleAdminLogin} addToast={addToast} />
      ) : (
        <UserView reports={reports} myReports={myReports} onSuccess={handleSuccess} addToast={addToast} />
      )}

      <footer style={footerStyle}>
        <span>RoadWatch · Road Defect Detection</span>
        <span className="footer-right" style={{opacity:0.5}}>Powered by FastAPI + YOLOv8</span>
      </footer>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// ── Admin Login ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, addToast }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    setLoading(true)
    setTimeout(() => {
      const ok = onLogin(password)
      if (!ok) {
        setError(true)
        setPassword('')
        addToast('Incorrect password', 'error')
      }
      setLoading(false)
    }, 400)
  }

  return (
    <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={loginCard}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:'var(--primary)',marginBottom:6}}>
            Admin Access
          </h2>
          <p style={{color:'var(--text-muted)',fontSize:14}}>Enter the admin password to continue</p>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:8}}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter admin password"
            style={{
              width:'100%', padding:'12px 14px',
              border: error ? '2px solid var(--error)' : '2px solid var(--border)',
              borderRadius:8, fontFamily:'var(--font-body)', fontSize:15,
              color:'var(--text)', background:'var(--bg)', outline:'none',
              transition:'border 0.2s'
            }}
            autoFocus
          />
          {error && <p style={{color:'var(--error)',fontSize:12,marginTop:6,fontWeight:600}}>Incorrect password. Try again.</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!password || loading}
          style={{
            width:'100%', padding:'13px',
            background: password && !loading ? 'var(--primary)' : '#aac3d4',
            color:'#fff', border:'none', borderRadius:10,
            cursor: password && !loading ? 'pointer' : 'not-allowed',
            fontFamily:'var(--font-display)', fontWeight:700, fontSize:15
          }}
        >
          {loading ? 'Checking…' : '🔓 Enter Admin Panel'}
        </button>
      </div>
    </main>
  )
}

// ── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminView({ reports }) {
  const [selectedReport, setSelectedReport] = useState(null)
  const totalDefects = reports.reduce((s,r) => s+(r.detections?.length||0), 0)
  const processed    = reports.filter(r => r.status==='processed').length
  const pending      = reports.filter(r => r.status==='pending').length

  const apiBase = `${window.location.protocol}//${window.location.hostname}:8000`

  return (
    <main className="main-pad" style={mainStyle}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:'var(--primary)',marginBottom:20}}>
        ⚙️ Admin Dashboard
      </h1>

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:24}}>
        {[['Total Reports',reports.length,'📁'],['Total Defects',totalDefects,'🕳️'],['Processed',processed,'✅'],['Pending',pending,'⏳']].map(([label,value,icon]) => (
          <div key={label} style={statCard}>
            <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:800,color:'var(--primary)'}}>{value}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Reports with file previews */}
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)',marginBottom:14}}>
          📂 All Uploaded Files
        </h2>
        <div className="files-grid">
          {reports.map(r => (
            <div key={r.id} style={fileCard} onClick={() => setSelectedReport(r)}>
              {/* File preview */}
              <div style={filePreview}>
                {r.file_type === 'video' ? (
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:36}}>🎬</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:4}}>Video</div>
                  </div>
                ) : r.filename ? (
                  <img
                    src={`${apiBase}/uploads/${r.filename}`}
                    alt="upload"
                    style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'8px 8px 0 0'}}
                    onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                  />
                ) : (
                  <div style={{textAlign:'center'}}><div style={{fontSize:36}}>🖼️</div></div>
                )}
                <div style={{display:'none',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}>
                  <div style={{fontSize:36}}>🖼️</div>
                </div>
              </div>

              {/* Info */}
              <div style={{padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontWeight:800,color:'var(--primary)',fontFamily:'var(--font-mono)',fontSize:13}}>#{r.id}</span>
                  <span style={{...statusPill(r.status)}}>{r.status}</span>
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div style={{fontSize:12,color:'var(--text)',fontWeight:600}}>
                  {(r.detections||[]).length} defect{(r.detections||[]).length!==1?'s':''} found
                </div>
                {r.file_size && (
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                    {(r.file_size/1024/1024).toFixed(2)} MB
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full detections table */}
      <ReportsTable reports={reports} isAdmin />

      {/* File detail modal */}
      {selectedReport && (
        <FileModal
          report={selectedReport}
          apiBase={apiBase}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </main>
  )
}

// ── File Detail Modal ────────────────────────────────────────────────────────
function FileModal({ report, apiBase, onClose }) {
  const fileUrl = `${apiBase}/uploads/${report.filename}`
  const isVideo = report.file_type === 'video'

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:800,color:'var(--primary)',fontSize:18}}>
            Report #{report.id}
          </h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Media */}
        <div style={{marginBottom:16,borderRadius:10,overflow:'hidden',background:'#000',maxHeight:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {isVideo ? (
            <video src={fileUrl} controls style={{maxWidth:'100%',maxHeight:300}} />
          ) : (
            <img src={fileUrl} alt="upload" style={{maxWidth:'100%',maxHeight:300,objectFit:'contain'}} />
          )}
        </div>

        {/* Details */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[
            ['Date', new Date(report.created_at).toLocaleString()],
            ['Status', report.status],
            ['Type', report.file_type || 'image'],
            ['Size', report.file_size ? `${(report.file_size/1024/1024).toFixed(2)} MB` : '—'],
            ['Latitude', (report.latitude||0).toFixed(5)],
            ['Longitude', (report.longitude||0).toFixed(5)],
          ].map(([k,v]) => (
            <div key={k} style={{background:'var(--bg)',borderRadius:8,padding:'8px 12px'}}>
              <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:2}}>{k}</div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{v}</div>
            </div>
          ))}
        </div>

        {report.description && (
          <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:16}}>
            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:4}}>DESCRIPTION</div>
            <div style={{fontSize:13,color:'var(--text)'}}>"{report.description}"</div>
          </div>
        )}

        {/* Detections */}
        {(report.detections||[]).length > 0 && (
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:8}}>DETECTIONS</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {report.detections.map((d,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(156,213,255,0.15)',borderRadius:8,border:'1px solid var(--border)'}}>
                  <span style={{fontWeight:700,color:'var(--primary)',textTransform:'capitalize'}}>
                    {String(d.defect_type||'').replace(/_/g,' ')}
                  </span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--text-muted)'}}>
                    {Math.round((d.confidence||0)*100)}% confidence
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <a href={fileUrl} download target="_blank" rel="noreferrer" style={downloadBtn}>
          ⬇️ Download File
        </a>
      </div>
    </div>
  )
}

// ── User View ────────────────────────────────────────────────────────────────
function UserView({ reports, myReports, onSuccess, addToast }) {
  return (
    <main className="main-pad" style={mainStyle}>
      <div className="main-grid">
        <div><UploadForm onSuccess={onSuccess} addToast={addToast} /></div>
        <div><MapView reports={reports} /></div>
      </div>
      {myReports.length > 0 && (
        <div style={{marginTop:24}}>
          <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)',marginBottom:14}}>
            📋 My Submitted Reports
          </h2>
          <div className="my-reports-grid">
            {myReports.map(r => <MyReportCard key={r.id} report={r} />)}
          </div>
        </div>
      )}
    </main>
  )
}

function MyReportCard({ report }) {
  const defects = report.detections || []
  const statusColor = {pending:'#f39c12',processed:'#2ecc71',no_defects:'#7AAACE',failed:'#e74c3c'}[report.status]||'#aaa'
  return (
    <div style={{background:'var(--bg-card)',borderRadius:12,padding:16,border:'1px solid var(--border)',boxShadow:'var(--shadow)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontWeight:800,fontFamily:'var(--font-display)',color:'var(--primary)',fontSize:15}}>Report #{report.id}</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{new Date(report.created_at).toLocaleString()}</div>
        </div>
        <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:statusColor+'22',color:statusColor,textTransform:'uppercase'}}>{report.status}</span>
      </div>
      {defects.length > 0 ? defects.map((d,i) => (
        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'rgba(156,213,255,0.12)',borderRadius:6,border:'1px solid var(--border)',marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:13,color:'var(--primary)',textTransform:'capitalize'}}>{String(d.defect_type||'').replace(/_/g,' ')}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)'}}>{Math.round((d.confidence||0)*100)}%</span>
        </div>
      )) : (
        <div style={{fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>
          {report.status==='pending'?'⏳ Analyzing…':'No defects detected'}
        </div>
      )}
      {report.description && <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)',borderTop:'1px solid var(--border)',paddingTop:8}}>"{report.description}"</div>}
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const layout = {display:'flex',flexDirection:'column',minHeight:'100vh',background:'var(--bg)'}
const headerStyle = {background:'var(--primary)',boxShadow:'0 2px 16px rgba(53,88,114,0.25)',position:'sticky',top:0,zIndex:100}
const headerInner = {maxWidth:1300,margin:'0 auto',padding:'0 24px',height:62,display:'flex',alignItems:'center',justifyContent:'space-between'}
const logoName = {fontFamily:'var(--font-display)',fontWeight:800,fontSize:19,color:'#fff',letterSpacing:'-0.02em',lineHeight:1.1}
const logoSub = {fontFamily:'var(--font-body)',fontSize:11,color:'rgba(255,255,255,0.6)'}
const navLink = (active) => ({color:active?'#fff':'rgba(255,255,255,0.65)',textDecoration:'none',fontFamily:'var(--font-body)',fontWeight:700,fontSize:13,padding:'6px 10px',borderRadius:6,background:active?'rgba(255,255,255,0.15)':'transparent',display:'flex',alignItems:'center',gap:4})
const logoutBtn = {padding:'5px 10px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,color:'#fff',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:700,fontSize:12}
const wsDot = (s) => ({width:8,height:8,borderRadius:'50%',display:'inline-block',background:s==='connected'?'#2ecc71':'#e74c3c',animation:s==='connected'?'pulse 2s infinite':'none',flexShrink:0})
const wsText = {fontFamily:'var(--font-mono)',fontSize:11,color:'rgba(255,255,255,0.8)'}
const mainStyle = {flex:1,maxWidth:1300,margin:'0 auto',width:'100%',padding:20}
const footerStyle = {background:'var(--primary)',color:'rgba(255,255,255,0.55)',fontFamily:'var(--font-mono)',fontSize:12,padding:'12px 20px',display:'flex',justifyContent:'space-between',marginTop:'auto'}
const loginCard = {background:'var(--bg-card)',borderRadius:16,padding:32,boxShadow:'0 8px 32px rgba(53,88,114,0.15)',border:'1px solid var(--border)',width:'100%',maxWidth:400}
const statCard = {background:'var(--bg-card)',borderRadius:12,padding:16,border:'1px solid var(--border)',boxShadow:'var(--shadow)',textAlign:'center'}
const fileCard = {background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',cursor:'pointer',overflow:'hidden',transition:'transform 0.15s,box-shadow 0.15s'}
const filePreview = {height:140,background:'linear-gradient(135deg,#355872,#7AAACE)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}
const statusPill = (s) => { const c={pending:'#f39c12',processed:'#27ae60',no_defects:'#7AAACE',failed:'#e74c3c'}[s]||'#aaa'; return {padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:c+'22',color:c,textTransform:'uppercase'} }
const modalOverlay = {position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}
const modalBox = {background:'var(--bg-card)',borderRadius:16,padding:24,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 16px 64px rgba(0,0,0,0.3)'}
const closeBtn = {background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontWeight:700,fontSize:14,color:'var(--text)'}
const downloadBtn = {display:'block',textAlign:'center',marginTop:16,padding:'11px',background:'var(--primary)',color:'#fff',borderRadius:10,textDecoration:'none',fontFamily:'var(--font-display)',fontWeight:700,fontSize:14}