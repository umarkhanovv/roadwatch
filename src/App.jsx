import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { fetchReports, createWebSocket } from './api'
import { UploadForm } from './components/UploadForm'
import { MapView } from './components/MapView'
import { ReportsTable } from './components/ReportsTable'
import { ToastContainer } from './components/Toast'

const TRANSLATIONS = {
  en: {
    appSubtitle: 'AI-Powered Road Defect Reporting',
    navReport: 'Report', navAdmin: 'Admin', navLogout: 'Logout',
    wsLive: 'Live', wsReconnecting: 'Reconnecting',
    footerPowered: 'Powered by FastAPI + YOLOv8',
    myReports: '📋 My Submitted Reports',
    recentReports: '🕐 Recent Reports',
    recentEmpty: 'No reports yet. Be the first to submit a defect!',
    recentNew: '🆕 New',
    adminTitle: '⚙️ Admin Dashboard', adminFiles: '📂 All Uploaded Files',
    statReports: 'Total Reports', statDefects: 'Total Defects',
    statProcessed: 'Processed', statPending: 'Pending',
    adminAccess: 'Admin Access', adminDesc: 'Enter the admin password to continue',
    adminPassword: 'Password', adminPlaceholder: 'Enter admin password',
    adminEnter: '🔓 Enter Admin Panel', adminChecking: 'Checking…',
    adminWrong: 'Incorrect password. Try again.',
    reportId: 'Report #', analyzing: '⏳ Analyzing…', noDefects: 'No defects detected',
    reportTitle: '⚠️ Report a Road Defect',
    uploadFile: '📁 Upload File', cameraBtn: '📸 Take Photo / Video',
    cameraMobile: '📱 Camera on mobile only',
    locationLabel: 'Location', locationRequired: '*',
    locationGps: 'Auto GPS', locationManual: 'Marked on map',
    locationChange: '✏️ Change', locationEmpty: '📍 Choose location on map',
    locationAfterFile: '📍 Set after selecting a file', locationGetting: 'Requesting GPS…',
    descLabel: 'Description', descOptional: '(optional)',
    descPlaceholder: 'Briefly describe the defect…',
    submitFile: '← Select a file first', submitLocation: '← Set location first',
    submitReady: '🚀 Upload & Analyze', submitting: 'Analyzing…',
    dragDrop: 'Drag & drop or use buttons below', dragDrop2: 'JPG · PNG · MP4 · MOV · AVI',
    dragHere: 'Drop here!', fileRemove: '✕ Remove',
    chooseLocation: '📍 Choose Location',
    chooseLocationDesc: 'Click on the map to place a marker. Drag to adjust.',
    confirmLocation: 'Confirm Location', cancel: 'Cancel',
    mapTitle: '🗺️ Live Detection Map', defectsMapped: 'defects mapped',
    tableTitle: '📋 Detection Log', tableAdmin: '🗄️ All Detections',
    tableEmpty: 'No reports yet. Submit the first defect!', tableTotal: 'total',
    colTime: 'TIME', colReport: 'REPORT ID', colType: 'TYPE',
    colConf: 'CONFIDENCE', colLat: 'LATITUDE', colLon: 'LONGITUDE', colStatus: 'STATUS',
    toastLocation: '📡 Location captured!',
    toastLocationDenied: 'Location access denied — mark it on the map',
    toastSubmitOk: 'Alert sent — report queued for analysis',
    toastNoFile: 'Please select a file', toastNoLoc: 'Please set a location',
    toastLoadErr: 'Could not load reports', toastIncorrectPw: 'Incorrect password',
    download: '⬇️ Download File', detections: 'DETECTIONS', description: 'DESCRIPTION',
    confidence: 'confidence', date: 'Date', status: 'Status', type: 'Type',
    size: 'Size', latitude: 'Latitude', longitude: 'Longitude',
  },
  ru: {
    appSubtitle: 'Система отчётов о дефектах дорог на ИИ',
    navReport: 'Отчёт', navAdmin: 'Админ', navLogout: 'Выйти',
    wsLive: 'Live', wsReconnecting: 'Переподключение',
    footerPowered: 'Работает на FastAPI + YOLOv8',
    myReports: '📋 Мои отчёты', recentReports: '🕐 Последние отчёты',
    recentEmpty: 'Отчётов пока нет. Будьте первым!', recentNew: '🆕 Новый',
    adminTitle: '⚙️ Панель администратора', adminFiles: '📂 Все загруженные файлы',
    statReports: 'Всего отчётов', statDefects: 'Всего дефектов',
    statProcessed: 'Обработано', statPending: 'Ожидает',
    adminAccess: 'Доступ администратора', adminDesc: 'Введите пароль для входа',
    adminPassword: 'Пароль', adminPlaceholder: 'Введите пароль администратора',
    adminEnter: '🔓 Войти в панель', adminChecking: 'Проверка…',
    adminWrong: 'Неверный пароль. Попробуйте снова.',
    reportId: 'Отчёт #', analyzing: '⏳ Анализируем…', noDefects: 'Дефектов не обнаружено',
    reportTitle: '⚠️ Сообщить о дефекте дороги',
    uploadFile: '📁 Загрузить файл', cameraBtn: '📸 Фото / Видео',
    cameraMobile: '📱 Камера только на мобильных',
    locationLabel: 'Местоположение', locationRequired: '*',
    locationGps: 'GPS автоматически', locationManual: 'Отмечено на карте',
    locationChange: '✏️ Изменить', locationEmpty: '📍 Выберите место на карте',
    locationAfterFile: '📍 Укажите после выбора файла', locationGetting: 'Получение GPS…',
    descLabel: 'Описание', descOptional: '(необязательно)',
    descPlaceholder: 'Кратко опишите дефект…',
    submitFile: '← Сначала выберите файл', submitLocation: '← Укажите местоположение',
    submitReady: '🚀 Загрузить и анализировать', submitting: 'Анализируем…',
    dragDrop: 'Перетащите или используйте кнопки ниже', dragDrop2: 'JPG · PNG · MP4 · MOV · AVI',
    dragHere: 'Отпустите здесь!', fileRemove: '✕ Удалить',
    chooseLocation: '📍 Выбор местоположения',
    chooseLocationDesc: 'Нажмите на карту чтобы поставить маркер.',
    confirmLocation: 'Подтвердить', cancel: 'Отмена',
    mapTitle: '🗺️ Карта обнаружений', defectsMapped: 'дефектов на карте',
    tableTitle: '📋 Журнал обнаружений', tableAdmin: '🗄️ Все обнаружения',
    tableEmpty: 'Отчётов пока нет.', tableTotal: 'всего',
    colTime: 'ВРЕМЯ', colReport: 'ОТЧЁТ', colType: 'ТИП',
    colConf: 'УВЕРЕННОСТЬ', colLat: 'ШИРОТА', colLon: 'ДОЛГОТА', colStatus: 'СТАТУС',
    toastLocation: '📡 Местоположение получено!',
    toastLocationDenied: 'Доступ к геолокации запрещён — отметьте на карте',
    toastSubmitOk: 'Отчёт отправлен на анализ',
    toastNoFile: 'Пожалуйста, выберите файл', toastNoLoc: 'Пожалуйста, укажите местоположение',
    toastLoadErr: 'Не удалось загрузить отчёты', toastIncorrectPw: 'Неверный пароль',
    download: '⬇️ Скачать файл', detections: 'ОБНАРУЖЕНИЯ', description: 'ОПИСАНИЕ',
    confidence: 'уверенность', date: 'Дата', status: 'Статус', type: 'Тип',
    size: 'Размер', latitude: 'Широта', longitude: 'Долгота',
  },
  kz: {
    appSubtitle: 'ЖИ негізіндегі жол ақаулықтарын есепке алу',
    navReport: 'Есеп', navAdmin: 'Admin', navLogout: 'Шығу',
    wsLive: 'Live', wsReconnecting: 'Қайта қосылуда',
    footerPowered: 'FastAPI + YOLOv8 арқылы жұмыс істейді',
    myReports: '📋 Менің хабарламаларым', recentReports: '🕐 Соңғы хабарламалар',
    recentEmpty: 'Хабарлама жоқ. Бірінші болыңыз!', recentNew: '🆕 Жаңа',
    adminTitle: '⚙️ Admin тақтасы', adminFiles: '📂 Барлық жүктелген файлдар',
    statReports: 'Барлық хабарлама', statDefects: 'Барлық ақаулық',
    statProcessed: 'Өңделген', statPending: 'Күтуде',
    adminAccess: 'Admin қолжетімділігі', adminDesc: 'Жалғастыру үшін паролді енгізіңіз',
    adminPassword: 'Пароль', adminPlaceholder: 'Admin паролін енгізіңіз',
    adminEnter: '🔓 Admin тақтасына кіру', adminChecking: 'Тексеруде…',
    adminWrong: 'Қате пароль. Қайталап көріңіз.',
    reportId: 'Хабарлама #', analyzing: '⏳ Талдануда…', noDefects: 'Ақаулық табылмады',
    reportTitle: '⚠️ Жол ақаулығын хабарлаңыз',
    uploadFile: '📁 Файл жүктеу', cameraBtn: '📸 Фото / Бейне',
    cameraMobile: '📱 Камера тек мобильде',
    locationLabel: 'Орналасу', locationRequired: '*',
    locationGps: 'GPS автоматты', locationManual: 'Картада белгіленді',
    locationChange: '✏️ Өзгерту', locationEmpty: '📍 Картада орынды таңдаңыз',
    locationAfterFile: '📍 Файл таңдағаннан кейін орнатыңыз', locationGetting: 'GPS алынуда…',
    descLabel: 'Сипаттама', descOptional: '(міндетті емес)',
    descPlaceholder: 'Ақаулықты қысқаша сипаттаңыз…',
    submitFile: '← Алдымен файл таңдаңыз', submitLocation: '← Орынды белгілеңіз',
    submitReady: '🚀 Жүктеу және талдау', submitting: 'Талдануда…',
    dragDrop: 'Сүйреп тастаңыз немесе батырмаларды пайдаланыңыз', dragDrop2: 'JPG · PNG · MP4 · MOV · AVI',
    dragHere: 'Осында тастаңыз!', fileRemove: '✕ Жою',
    chooseLocation: '📍 Орынды таңдаңыз',
    chooseLocationDesc: 'Маркер қою үшін картаны басыңыз.',
    confirmLocation: 'Растау', cancel: 'Болдырмау',
    mapTitle: '🗺️ Тікелей анықтау картасы', defectsMapped: 'ақаулық картада',
    tableTitle: '📋 Анықтау журналы', tableAdmin: '🗄️ Барлық анықтаулар',
    tableEmpty: 'Хабарлама жоқ.', tableTotal: 'барлығы',
    colTime: 'УАҚЫТ', colReport: 'ХАБАРЛАМА', colType: 'ТҮР',
    colConf: 'СЕНІМДІЛІК', colLat: 'ЕНДІК', colLon: 'БОЙЛЫҚ', colStatus: 'МӘРТЕБЕ',
    toastLocation: '📡 Орын алынды!',
    toastLocationDenied: 'Геолокацияға рұқсат жоқ — картада белгілеңіз',
    toastSubmitOk: 'Хабарлама талдауға жіберілді',
    toastNoFile: 'Файл таңдаңыз', toastNoLoc: 'Орынды белгілеңіз',
    toastLoadErr: 'Хабарламаларды жүктеу мүмкін болмады', toastIncorrectPw: 'Қате пароль',
    download: '⬇️ Файлды жүктеу', detections: 'АНЫҚТАУЛАР', description: 'СИПАТТАМА',
    confidence: 'сенімділік', date: 'Күні', status: 'Мәртебе', type: 'Түр',
    size: 'Өлшем', latitude: 'Ендік', longitude: 'Бойлық',
  }
}

const LangContext = createContext({ lang: 'en', t: (k) => k })
export const useLang = () => useContext(LangContext)
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
  const [lang, setLang] = useState(() => localStorage.getItem('rw_lang') || 'kz')
  const t = useCallback((key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key, [lang])
  const [reports, setReports] = useState([])
  const [toasts, setToasts] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const [myIds, setMyIds] = useState(getMyReportIds())
  const [adminAuthed, setAdminAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'true')
  const wsRef = useRef(null)

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    fetchReports().then(setReports).catch(() => addToast(t('toastLoadErr'), 'error'))
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
  const changeLang = (l) => { setLang(l); localStorage.setItem('rw_lang', l) }
  const myReports = reports.filter(r => myIds.includes(r.id))

  return (
    <LangContext.Provider value={{ lang, t }}>
      <div style={layout}>
        <style>{`
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
          @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
          * { box-sizing:border-box; }
          .main-grid { display:grid; grid-template-columns:minmax(300px,400px) 1fr; gap:20px; align-items:start; }
          .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
          .my-reports-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
          .files-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
          .recent-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
          @media(max-width:1200px) { .recent-grid { grid-template-columns:repeat(4,1fr); } }
          @media(max-width:900px) { .recent-grid { grid-template-columns:repeat(3,1fr); } }
          @media(max-width:600px) { .recent-grid { grid-template-columns:repeat(2,1fr); } }
          @media(max-width:768px) {
            body, html { overflow-x:hidden; }
            .main-grid { grid-template-columns:1fr; }
            .main-pad { padding:12px !important; }
            .header-inner {
              padding:6px 12px !important;
              height:auto !important;
              min-height:50px;
              flex-wrap:wrap;
              gap:4px;
            }
            .header-left { flex:1; min-width:0; }
            .header-right {
              display:flex;
              align-items:center;
              flex-wrap:wrap;
              gap:4px;
              justify-content:flex-end;
              width:100%;
            }
            .logo-name-text { font-size:15px !important; }
            .logo-sub { display:none; }
            .footer-right { display:none; }
            .stats-grid { grid-template-columns:repeat(2,1fr); }
            .my-reports-grid { grid-template-columns:1fr; }
            .files-grid { grid-template-columns:1fr; }
            .recent-grid { grid-template-columns:1fr; }
            .nav-label { display:none; }
            .ws-label { display:none; }
          }
          .lang-btn { padding:4px 8px; border:none; border-radius:6px; cursor:pointer; font-family:var(--font-mono); font-weight:700; font-size:11px; transition:all 0.15s; letter-spacing:0.04em; }
          .lang-btn.active { background:rgba(255,255,255,0.25); color:#fff; }
          .lang-btn.inactive { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.55); }
          .lang-btn:hover { background:rgba(255,255,255,0.2); color:#fff; }
          .recent-card { animation: slideDown 0.3s ease; }
        `}</style>

        <header style={headerStyle}>
          <div className="header-inner" style={headerInner}>
            {/* Left: logo */}
            <div className="header-left" style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:22,flexShrink:0}}>🛣️</span>
              <div style={{minWidth:0}}>
                <div className="logo-name-text" style={logoName}>AqyldyZhol AI</div>
                <div className="logo-sub" style={logoSub}>{t('appSubtitle')}</div>
              </div>
            </div>
            {/* Right: lang + nav + ws */}
            <div className="header-right" style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{display:'flex',gap:3}}>
                {['en','ru','kz'].map(l => (
                  <button key={l} className={`lang-btn ${lang===l?'active':'inactive'}`}
                    onClick={() => changeLang(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <a href="/" style={navLink(path==='/')}>🏠 <span className="nav-label">{t('navReport')}</span></a>
              <a href="/admin" style={navLink(isAdmin)}>⚙️ <span className="nav-label">{t('navAdmin')}</span></a>
              {isAdmin && adminAuthed && (
                <button onClick={handleAdminLogout} style={logoutBtn}>🚪</button>
              )}
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={wsDot(wsStatus)} />
                <span className="ws-label" style={wsText}>{wsStatus==='connected'?t('wsLive'):t('wsReconnecting')}</span>
              </div>
            </div>
          </div>
        </header>

        {isAdmin ? (
          adminAuthed
            ? <AdminView reports={reports} onLogout={handleAdminLogout} t={t} />
            : <AdminLogin onLogin={handleAdminLogin} addToast={addToast} t={t} />
        ) : (
          <UserView reports={reports} myReports={myReports} onSuccess={handleSuccess} addToast={addToast} t={t} />
        )}

        <footer style={footerStyle}>
          <span>AqyldyZhol AI · Road Defect Detection</span>
          <span className="footer-right" style={{opacity:0.5}}>{t('footerPowered')}</span>
        </footer>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </LangContext.Provider>
  )
}

function AdminLogin({ onLogin, addToast, t }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const handleSubmit = () => {
    setLoading(true)
    setTimeout(() => {
      const ok = onLogin(password)
      if (!ok) { setError(true); setPassword(''); addToast(t('toastIncorrectPw'), 'error') }
      setLoading(false)
    }, 400)
  }
  return (
    <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={loginCard}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:'var(--primary)',marginBottom:6}}>{t('adminAccess')}</h2>
          <p style={{color:'var(--text-muted)',fontSize:14}}>{t('adminDesc')}</p>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:8}}>{t('adminPassword')}</label>
          <input type="password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={t('adminPlaceholder')}
            style={{width:'100%',padding:'12px 14px',border:error?'2px solid var(--error)':'2px solid var(--border)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:15,color:'var(--text)',background:'var(--bg)',outline:'none'}}
            autoFocus />
          {error && <p style={{color:'var(--error)',fontSize:12,marginTop:6,fontWeight:600}}>{t('adminWrong')}</p>}
        </div>
        <button onClick={handleSubmit} disabled={!password||loading}
          style={{width:'100%',padding:'13px',background:password&&!loading?'var(--primary)':'#aac3d4',color:'#fff',border:'none',borderRadius:10,cursor:password&&!loading?'pointer':'not-allowed',fontFamily:'var(--font-display)',fontWeight:700,fontSize:15}}>
          {loading ? t('adminChecking') : t('adminEnter')}
        </button>
      </div>
    </main>
  )
}

function AdminView({ reports, t }) {
  const { lang } = useLang()
  const [selectedReport, setSelectedReport] = useState(null)
  const totalDefects = reports.reduce((s,r) => s+(r.detections?.length||0), 0)
  const processed = reports.filter(r => r.status==='processed').length
  const pending = reports.filter(r => r.status==='pending').length
  const apiBase = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`
  return (
    <main className="main-pad" style={mainStyle}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:'var(--primary)',marginBottom:20}}>{t('adminTitle')}</h1>
      <div className="stats-grid" style={{marginBottom:24}}>
        {[[t('statReports'),reports.length,'📁'],[t('statDefects'),totalDefects,'🕳️'],[t('statProcessed'),processed,'✅'],[t('statPending'),pending,'⏳']].map(([label,value,icon]) => (
          <div key={label} style={statCard}>
            <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:800,color:'var(--primary)'}}>{value}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)',marginBottom:14}}>{t('adminFiles')}</h2>
        <div className="files-grid">
          {reports.map(r => (
            <div key={r.id} style={fileCard} onClick={() => setSelectedReport(r)}>
              <div style={filePreview}>
                {r.file_type === 'video' ? (
                  <div style={{textAlign:'center'}}><div style={{fontSize:36}}>🎬</div></div>
                ) : r.filename ? (
                  <>
                    <img src={`${apiBase}/uploads/${r.filename}`} alt="upload"
                      style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'8px 8px 0 0'}}
                      onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                    <div style={{display:'none',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}>
                      <div style={{fontSize:36}}>🖼️</div>
                    </div>
                  </>
                ) : (
                  <div style={{textAlign:'center'}}><div style={{fontSize:36}}>🖼️</div></div>
                )}
              </div>
              <div style={{padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontWeight:800,color:'var(--primary)',fontFamily:'var(--font-mono)',fontSize:13}}>#{r.id}</span>
                  <span style={statusPill(r.status)}>{r.status}</span>
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{new Date(r.created_at).toLocaleString()}</div>
                <div style={{fontSize:12,color:'var(--text)',fontWeight:600}}>{(r.detections||[]).length} defect{(r.detections||[]).length!==1?'s':''}</div>
                {r.file_size && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{(r.file_size/1024/1024).toFixed(2)} MB</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ReportsTable reports={reports} isAdmin t={t} lang={lang} />
      {selectedReport && <FileModal report={selectedReport} apiBase={apiBase} onClose={() => setSelectedReport(null)} t={t} />}
    </main>
  )
}

function FileModal({ report, apiBase, onClose, t }) {
  const fileUrl = `${apiBase}/uploads/${report.filename}`
  const isVideo = report.file_type === 'video'
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:800,color:'var(--primary)',fontSize:18}}>{t('reportId')}{report.id}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{marginBottom:16,borderRadius:10,overflow:'hidden',background:'#000',maxHeight:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {isVideo ? <video src={fileUrl} controls style={{maxWidth:'100%',maxHeight:300}} /> : <img src={fileUrl} alt="upload" style={{maxWidth:'100%',maxHeight:300,objectFit:'contain'}} />}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[[t('date'),new Date(report.created_at).toLocaleString()],[t('status'),report.status],[t('type'),report.file_type||'image'],[t('size'),report.file_size?`${(report.file_size/1024/1024).toFixed(2)} MB`:'—'],[t('latitude'),(report.latitude||0).toFixed(5)],[t('longitude'),(report.longitude||0).toFixed(5)]].map(([k,v]) => (
            <div key={k} style={{background:'var(--bg)',borderRadius:8,padding:'8px 12px'}}>
              <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:2}}>{k}</div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{v}</div>
            </div>
          ))}
        </div>
        {report.description && (
          <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:16}}>
            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:4}}>{t('description')}</div>
            <div style={{fontSize:13,color:'var(--text)'}}>"{report.description}"</div>
          </div>
        )}
        {(report.detections||[]).length > 0 && (
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:8}}>{t('detections')}</div>
            {report.detections.map((d,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(156,213,255,0.15)',borderRadius:8,border:'1px solid var(--border)',marginBottom:6}}>
                <span style={{fontWeight:700,color:'var(--primary)',textTransform:'capitalize'}}>{String(d.defect_type||'').replace(/_/g,' ')}</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--text-muted)'}}>{Math.round((d.confidence||0)*100)}% {t('confidence')}</span>
              </div>
            ))}
          </div>
        )}
        <a href={fileUrl} download target="_blank" rel="noreferrer" style={downloadBtn}>{t('download')}</a>
      </div>
    </div>
  )
}

function UserView({ reports, myReports, onSuccess, addToast, t }) {
  const recentReports = reports.slice(0, 10)
  const seenIds = useRef(new Set())
  const initialLoaded = useRef(false)
  const [newIds, setNewIds] = useState(new Set())
  useEffect(() => {
    if (reports.length === 0) return
    if (!initialLoaded.current) {
      reports.forEach(r => seenIds.current.add(r.id))
      initialLoaded.current = true
      return
    }
    const fresh = recentReports.filter(r => !seenIds.current.has(r.id))
    reports.forEach(r => seenIds.current.add(r.id))
    if (fresh.length > 0) {
      setNewIds(prev => new Set([...prev, ...fresh.map(r => r.id)]))
      setTimeout(() => {
        setNewIds(prev => { const next = new Set(prev); fresh.forEach(r => next.delete(r.id)); return next })
      }, 8000)
    }
  }, [reports])
  return (
    <main className="main-pad" style={mainStyle}>
      <div className="main-grid">
        <div><UploadForm onSuccess={onSuccess} addToast={addToast} t={t} /></div>
        <div><MapView reports={reports} t={t} /></div>
      </div>
      <div style={{marginTop:28}}>
        <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)',marginBottom:14}}>{t('recentReports')}</h2>
        {recentReports.length === 0 ? (
          <div style={{background:'var(--bg-card)',borderRadius:14,border:'1px solid var(--border)',padding:'32px',textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:8}}>🛣️</div>
            <div style={{color:'var(--text-muted)',fontWeight:700}}>{t('recentEmpty')}</div>
          </div>
        ) : (
          <div className="recent-grid">
            {recentReports.map((r,i) => <RecentReportCard key={r.id} report={r} rank={i+1} isNew={newIds.has(r.id)} t={t} />)}
          </div>
        )}
      </div>
      {myReports.length > 0 && (
        <div style={{marginTop:24}}>
          <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--primary)',marginBottom:14}}>{t('myReports')}</h2>
          <div className="my-reports-grid">
            {myReports.map(r => <MyReportCard key={r.id} report={r} t={t} />)}
          </div>
        </div>
      )}
    </main>
  )
}

const DEFECT_NAMES = {
  en: { pothole:'Pothole',crack:'Crack',alligator_crack:'Alligator Crack',rutting:'Rutting',depression:'Depression',edge_crack:'Edge Crack',patching:'Patching',weathering:'Weathering' },
  ru: { pothole:'Выбоина',crack:'Трещина',alligator_crack:'Сетка трещин',rutting:'Колея',depression:'Просадка',edge_crack:'Краевая трещина',patching:'Заплатка',weathering:'Выветривание' },
  kz: { pothole:'Шұңқыр',crack:'Жарық',alligator_crack:'Крокодил жарығы',rutting:'Із қалу',depression:'Шөгу',edge_crack:'Жиек жарығы',patching:'Жамау',weathering:'Үгілу' },
}
function translateDefect(type, lang) {
  const key = String(type||'').toLowerCase().replace(/ /g,'_')
  return DEFECT_NAMES[lang]?.[key] || DEFECT_NAMES.en[key] || key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
}

const DEFECT_COLORS = { pothole:'#e74c3c',crack:'#e67e22',alligator_crack:'#d35400',rutting:'#8e44ad',depression:'#2980b9',edge_crack:'#c0392b',patching:'#27ae60',weathering:'#7f8c8d' }

function RecentReportCard({ report, rank, isNew, t }) {
  const { lang } = useLang()
  const defects = report.detections || []
  const mainDefect = defects[0]
  const statusColor = {pending:'#f39c12',processed:'#2ecc71',no_defects:'#7AAACE',failed:'#e74c3c'}[report.status]||'#aaa'
  const defectColor = mainDefect ? (DEFECT_COLORS[String(mainDefect.defect_type).toLowerCase().replace(/ /g,'_')] || 'var(--primary)') : 'var(--secondary)'
  return (
    <div className="recent-card" style={{background:'var(--bg-card)',borderRadius:12,padding:16,border:isNew?`2px solid ${defectColor}`:'1px solid var(--border)',boxShadow:isNew?`0 4px 20px ${defectColor}33`:'var(--shadow)',position:'relative',transition:'border 0.4s,box-shadow 0.4s'}}>
      <span style={{position:'absolute',top:10,left:10,background:'var(--primary)',color:'#fff',fontSize:10,fontWeight:800,width:20,height:20,borderRadius:'50%',fontFamily:'var(--font-mono)',display:'flex',alignItems:'center',justifyContent:'center'}}>{rank}</span>
      {isNew && <span style={{position:'absolute',top:-10,right:10,background:'#2ecc71',color:'#fff',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:20,fontFamily:'var(--font-mono)'}}>{t('recentNew')}</span>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,paddingLeft:26}}>
        <div style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(report.created_at).toLocaleString()}</div>
        <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:statusColor+'22',color:statusColor,textTransform:'uppercase',flexShrink:0}}>{report.status}</span>
      </div>
      <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer"
        style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,background:'var(--bg)',borderRadius:6,padding:'5px 8px',textDecoration:'none'}}>
        <span style={{fontSize:12}}>📍</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--secondary)',fontWeight:600,textDecoration:'underline',textDecorationStyle:'dotted'}}>{(report.latitude||0).toFixed(4)}, {(report.longitude||0).toFixed(4)}</span>
        <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:'auto'}}>↗</span>
      </a>
      {defects.length > 0 ? (
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {defects.slice(0,2).map((d,i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:defectColor+'11',borderRadius:6,border:`1px solid ${defectColor}33`}}>
              <span style={{fontWeight:700,fontSize:12,color:defectColor}}>{translateDefect(d.defect_type,lang)}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)'}}>{Math.round((d.confidence||0)*100)}%</span>
            </div>
          ))}
          {defects.length > 2 && <div style={{fontSize:11,color:'var(--text-muted)',textAlign:'center',paddingTop:2}}>+{defects.length-2} more</div>}
        </div>
      ) : (
        <div style={{fontSize:12,color:'var(--text-muted)',fontStyle:'italic'}}>{report.status==='pending'?t('analyzing'):t('noDefects')}</div>
      )}
      {report.description && <div style={{marginTop:8,fontSize:11,color:'var(--text-muted)',borderTop:'1px solid var(--border)',paddingTop:6,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{report.description}"</div>}
    </div>
  )
}

function MyReportCard({ report, t }) {
  const { lang } = useLang()
  const defects = report.detections || []
  const statusColor = {pending:'#f39c12',processed:'#2ecc71',no_defects:'#7AAACE',failed:'#e74c3c'}[report.status]||'#aaa'
  return (
    <div style={{background:'var(--bg-card)',borderRadius:12,padding:16,border:'1px solid var(--border)',boxShadow:'var(--shadow)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontWeight:800,fontFamily:'var(--font-display)',color:'var(--primary)',fontSize:15}}>{t('reportId')}{report.id}</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{new Date(report.created_at).toLocaleString()}</div>
        </div>
        <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:statusColor+'22',color:statusColor,textTransform:'uppercase'}}>{report.status}</span>
      </div>
      {defects.length > 0 ? defects.map((d,i) => (
        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'rgba(156,213,255,0.12)',borderRadius:6,border:'1px solid var(--border)',marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:13,color:'var(--primary)'}}>{translateDefect(d.defect_type,lang)}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)'}}>{Math.round((d.confidence||0)*100)}%</span>
        </div>
      )) : <div style={{fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>{report.status==='pending'?t('analyzing'):t('noDefects')}</div>}
      {report.description && <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)',borderTop:'1px solid var(--border)',paddingTop:8}}>"{report.description}"</div>}
    </div>
  )
}

const layout = {display:'flex',flexDirection:'column',minHeight:'100vh',background:'var(--bg)'}
const headerStyle = {background:'var(--primary)',boxShadow:'0 2px 16px rgba(53,88,114,0.25)',position:'sticky',top:0,zIndex:100}
const headerInner = {maxWidth:1300,margin:'0 auto',padding:'0 24px',height:62,display:'flex',alignItems:'center',justifyContent:'space-between'}
const logoName = {fontFamily:'var(--font-display)',fontWeight:800,fontSize:19,color:'#fff',letterSpacing:'-0.02em',lineHeight:1.1}
const logoSub = {fontFamily:'var(--font-body)',fontSize:11,color:'rgba(255,255,255,0.6)'}
const navLink = (active) => ({color:active?'#fff':'rgba(255,255,255,0.65)',textDecoration:'none',fontFamily:'var(--font-body)',fontWeight:700,fontSize:13,padding:'6px 8px',borderRadius:6,background:active?'rgba(255,255,255,0.15)':'transparent',display:'flex',alignItems:'center',gap:4,flexShrink:0})
const logoutBtn = {padding:'5px 8px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,color:'#fff',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:700,fontSize:12,flexShrink:0}
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
