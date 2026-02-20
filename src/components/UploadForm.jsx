import { useState, useRef } from 'react'
import { submitReport } from '../api'
import { LocationModal } from './LocationModal'

const ACCEPT = '.jpg,.jpeg,.png,.mp4,.mov,.avi'
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Not supported')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  })
}

export function UploadForm({ onSuccess, addToast, t = (k) => k }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(null)
  const [locationSource, setLocationSource] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [mode, setMode] = useState(null)

  const fileInputRef = useRef()
  const cameraInputRef = useRef()

  const handleCameraCapture = async (f) => {
    if (!f) return
    setFile(f); setMode('camera'); setLocation(null); setLocationSource(null); setLocating(true)
    try {
      const gpsLoc = await getBrowserLocation()
      setLocation(gpsLoc); setLocationSource('gps')
      addToast(t('toastLocation'), 'success')
    } catch {
      addToast(t('toastLocationDenied'), 'info')
      setShowMap(true)
    } finally { setLocating(false) }
  }

  const handleFileUpload = (f) => {
    if (!f) return
    setFile(f); setMode('upload'); setLocation(null); setLocationSource(null); setShowMap(true)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileUpload(f)
  }

  const handleSubmit = async () => {
    if (!file) { addToast(t('toastNoFile'), 'error'); return }
    if (!location) { addToast(t('toastNoLoc'), 'error'); return }
    setSubmitting(true)
    try {
      const result = await submitReport({ file, description, latitude: location.lat, longitude: location.lng })
      onSuccess(result)
      addToast(t('toastSubmitOk'), 'success')
      setFile(null); setDescription(''); setLocation(null); setLocationSource(null); setMode(null)
    } catch (err) {
      addToast(err.message || 'Submission failed', 'error')
    } finally { setSubmitting(false) }
  }

  const reset = () => { setFile(null); setLocation(null); setLocationSource(null); setMode(null) }
  const canSubmit = file && location && !locating && !submitting

  return (
    <div style={card}>
      <h2 style={titleStyle}><span>⚠️</span> {t('reportTitle').replace('⚠️ ','')}</h2>

      <input ref={fileInputRef} type="file" accept={ACCEPT} style={{display:'none'}}
        onChange={(e) => handleFileUpload(e.target.files[0])} />
      <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment"
        style={{display:'none'}} onChange={(e) => handleCameraCapture(e.target.files[0])} />

      {/* Drop zone */}
      <div style={dropZone(dragging, !!file)}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div style={{textAlign:'center',width:'100%'}}>
            <div style={{fontSize:28}}>{file.type.startsWith('video') ? '🎬' : '🖼️'}</div>
            <div style={{fontWeight:700,color:'var(--primary)',marginTop:4,fontSize:13,wordBreak:'break-all',padding:'0 8px'}}>{file.name}</div>
            <div style={{color:'var(--text-muted)',fontSize:12}}>{(file.size/1024/1024).toFixed(2)} MB</div>
            {locating && (
              <div style={{fontSize:12,color:'var(--secondary)',marginTop:4,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Spinner small /> {t('locationGetting')}
              </div>
            )}
            <button onClick={reset} style={clearBtn}>{t('fileRemove')}</button>
          </div>
        ) : (
          <div style={{textAlign:'center',pointerEvents:'none'}}>
            <div style={{fontSize:32,marginBottom:6}}>📂</div>
            <div style={{fontWeight:600,color:dragging?'var(--primary)':'var(--text-muted)',fontSize:14}}>
              {dragging ? t('dragHere') : t('dragDrop')}
            </div>
            <div style={{color:'var(--text-muted)',fontSize:12,marginTop:3}}>{t('dragDrop2')}</div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={btnRow}>
        <button style={outlineBtn} onClick={() => fileInputRef.current?.click()}>
          {t('uploadFile')}
        </button>
        {IS_MOBILE ? (
          <button style={solidBtn} onClick={() => cameraInputRef.current?.click()}>
            {t('cameraBtn')}
          </button>
        ) : (
          <div style={hintBox}>{t('cameraMobile')}</div>
        )}
      </div>

      {/* Location */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>{t('locationLabel')} <span style={{color:'var(--error)'}}>{t('locationRequired')}</span></label>
        {location ? (
          <div style={locBox}>
            <span style={{fontSize:18}}>{locationSource === 'gps' ? '📡' : '🗺️'}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--primary)'}}>
                {locationSource === 'gps' ? t('locationGps') : t('locationManual')}
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </div>
            </div>
            <button style={changeBtn} onClick={() => setShowMap(true)}>{t('locationChange')}</button>
          </div>
        ) : (
          <div style={locEmpty}>
            {locating
              ? <span style={{display:'flex',alignItems:'center',gap:8,color:'var(--secondary)',fontSize:13}}><Spinner small />{t('locationGetting')}</span>
              : <span style={{color:'var(--text-muted)',fontSize:13}}>
                  {mode === 'upload' ? t('locationEmpty') : t('locationAfterFile')}
                </span>
            }
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>{t('descLabel')} <span style={{color:'var(--text-muted)',fontWeight:400,fontSize:12}}>{t('descOptional')}</span></label>
        <textarea style={textareaStyle} placeholder={t('descPlaceholder')}
          value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>

      {/* Submit */}
      <button style={submitStyle(canSubmit)} onClick={handleSubmit} disabled={!canSubmit}>
        {submitting
          ? <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><Spinner /> {t('submitting')}</span>
          : !file ? t('submitFile')
          : !location ? t('submitLocation')
          : t('submitReady')
        }
      </button>

      {showMap && (
        <LocationModal
          initial={location}
          onConfirm={(c) => { setLocation(c); setLocationSource('manual'); setShowMap(false) }}
          onCancel={() => setShowMap(false)}
          t={t}
        />
      )}
    </div>
  )
}

function Spinner({ small }) {
  const s = small ? 12 : 16
  return <span style={{width:s,height:s,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite',flexShrink:0}} />
}

const card = { background:'var(--bg-card)',borderRadius:14,padding:'20px',boxShadow:'var(--shadow)',border:'1px solid var(--border)' }
const titleStyle = { fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--primary)',marginBottom:16,display:'flex',alignItems:'center',gap:8 }
const dropZone = (drag, hasFile) => ({ border:`2px dashed ${drag?'var(--primary)':hasFile?'var(--secondary)':'var(--border)'}`,borderRadius:10,padding:'18px 12px',minHeight:90,background:drag?'rgba(53,88,114,0.05)':hasFile?'rgba(122,170,206,0.06)':'transparent',transition:'all 0.2s',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center' })
const btnRow = { display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' }
const outlineBtn = { flex:1,padding:'11px 8px',background:'transparent',border:'2px solid var(--secondary)',borderRadius:8,color:'var(--primary)',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:700,fontSize:13,minWidth:0 }
const solidBtn = { flex:1,padding:'11px 8px',background:'var(--primary)',border:'none',borderRadius:8,color:'#fff',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:700,fontSize:13,minWidth:0 }
const hintBox = { flex:1,padding:'11px 8px',background:'rgba(53,88,114,0.05)',border:'1.5px dashed var(--border)',borderRadius:8,color:'var(--text-muted)',fontSize:12,fontWeight:600,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',minWidth:0 }
const labelStyle = { display:'block',fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:6 }
const textareaStyle = { width:'100%',padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,color:'var(--text)',background:'var(--bg)',resize:'vertical',outline:'none',boxSizing:'border-box' }
const locBox = { padding:'10px 12px',background:'rgba(156,213,255,0.15)',borderRadius:8,border:'1.5px solid var(--accent)',display:'flex',alignItems:'center',gap:10 }
const locEmpty = { padding:'10px 12px',background:'var(--bg)',borderRadius:8,border:'1.5px dashed var(--border)',display:'flex',alignItems:'center',minHeight:42 }
const changeBtn = { padding:'5px 10px',background:'transparent',border:'1.5px solid var(--secondary)',borderRadius:6,cursor:'pointer',fontSize:12,color:'var(--primary)',fontFamily:'var(--font-body)',fontWeight:700,whiteSpace:'nowrap',flexShrink:0 }
const submitStyle = (can) => ({ width:'100%',padding:'13px',background:can?'var(--primary)':'#aac3d4',color:'#fff',border:'none',borderRadius:10,cursor:can?'pointer':'not-allowed',fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,transition:'background 0.2s' })
const clearBtn = { marginTop:6,padding:'4px 12px',background:'transparent',border:'1.5px solid var(--border)',borderRadius:6,cursor:'pointer',fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-body)' }
