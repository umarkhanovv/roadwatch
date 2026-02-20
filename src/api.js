// Dynamically use the same host the page was loaded from
// This makes it work from iPhone, other devices on the network, etc.
const BASE = import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`

export async function submitReport({ file, description, latitude, longitude }) {
  const form = new FormData()
  form.append('file', file)
  form.append('description', description || '')
  form.append('latitude', String(latitude))
  form.append('longitude', String(longitude))

  const res = await fetch(`${BASE}/api/reports`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Submit failed')
  }
  return res.json()
}

export async function fetchReports() {
  const res = await fetch(`${BASE}/api/reports`)
  if (!res.ok) throw new Error('Failed to fetch reports')
  return res.json()
}

export async function fetchDetections() {
  const res = await fetch(`${BASE}/api/detections`)
  if (!res.ok) throw new Error('Failed to fetch detections')
  return res.json()
}

export function createWebSocket(onMessage) {
  const wsUrl = BASE.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws'
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch {}
  }
  ws.onerror = (e) => console.warn('WS error', e)
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send('ping')
  }, 25000)
  ws.onclose = () => clearInterval(ping)
  return ws
}