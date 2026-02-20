import { useEffect, useState } from 'react'

const styles = {
  wrap: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 18px',
    borderRadius: 10,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 14,
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideIn 0.25s ease',
    pointerEvents: 'auto',
    minWidth: 220,
    maxWidth: 340,
  },
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={styles.wrap}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

function Toast({ toast, onRemove }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [])

  const colors = {
    success: { bg: '#e6f7ef', color: '#1d6e44', border: '1.5px solid #a3dbbf' },
    error: { bg: '#fdecea', color: '#8b1a14', border: '1.5px solid #f5b0ac' },
    info: { bg: '#e8f3fb', color: '#1e4d73', border: '1.5px solid #9CD5FF' },
  }
  const c = colors[toast.type] || colors.info
  const icons = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <div style={{
      ...styles.toast,
      ...c,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(40px)',
      transition: 'opacity 0.3s, transform 0.3s',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: c.color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {icons[toast.type] || 'ℹ'}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, fontSize: 16, padding: 0 }}
      >×</button>
    </div>
  )
}
