import { supabase, supabaseEnabled } from './supabase.js'

// API unificada de auth. Funciona contra Supabase si está configurado,
// o contra localStorage en modo "demo / desarrollo". En ambos casos:
//   - signUp({ email, password, name })   → { user, error }
//   - signIn({ email, password })         → { user, error }
//   - signOut()                            → void
//   - resetPassword({ email })            → { error }
//   - getSession()                         → { user } | null
//   - onAuthChange(cb)                     → unsubscribe()

const LS_USERS    = 'agm-users-v1'
const LS_SESSION  = 'agm-session-v1'

export const isLocalAuth = !supabaseEnabled

// ---------- Helpers locales ----------
async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function readUsers()  { try { return JSON.parse(localStorage.getItem(LS_USERS)  || '[]') } catch { return [] } }
function writeUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)) }
function readSession() {
  try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null') } catch { return null }
}
function writeSession(s) {
  if (s) localStorage.setItem(LS_SESSION, JSON.stringify(s))
  else   localStorage.removeItem(LS_SESSION)
  window.dispatchEvent(new CustomEvent('agm:auth', { detail: s }))
}

// ---------- API ----------
export async function signUp({ email, password, name }) {
  email = (email || '').trim().toLowerCase()
  if (!email || !password) return { user: null, error: 'Email y contraseña son obligatorios.' }
  if (password.length < 6)  return { user: null, error: 'La contraseña debe tener al menos 6 caracteres.' }

  if (supabaseEnabled) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    })
    if (error) return { user: null, error: error.message }
    return { user: data.user, needsConfirmation: !data.session }
  }

  // ---- Local fallback ----
  const users = readUsers()
  if (users.some(u => u.email === email)) return { user: null, error: 'Ya existe una cuenta con ese email.' }
  const user = {
    id: crypto.randomUUID(),
    email,
    name: (name || '').trim() || email.split('@')[0],
    pwd: await sha256(password),
    createdAt: new Date().toISOString(),
  }
  writeUsers([...users, user])
  writeSession({ userId: user.id, email: user.email, name: user.name, mode: 'local' })
  return { user, needsConfirmation: false }
}

export async function signIn({ email, password }) {
  email = (email || '').trim().toLowerCase()
  if (!email || !password) return { user: null, error: 'Completá email y contraseña.' }

  if (supabaseEnabled) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { user: null, error: humanizeSupabaseError(error.message) }
    return { user: data.user }
  }

  const users = readUsers()
  const u = users.find(x => x.email === email)
  if (!u) return { user: null, error: 'No existe una cuenta con ese email.' }
  if (u.pwd !== await sha256(password)) return { user: null, error: 'Contraseña incorrecta.' }
  writeSession({ userId: u.id, email: u.email, name: u.name, mode: 'local' })
  return { user: u }
}

export async function signOut() {
  if (supabaseEnabled) {
    await supabase.auth.signOut()
  }
  writeSession(null)
}

export async function resetPassword({ email }) {
  email = (email || '').trim().toLowerCase()
  if (!email) return { error: 'Indicá tu email.' }
  if (supabaseEnabled) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth?reset=1',
    })
    if (error) return { error: error.message }
    return { error: null, info: 'Te enviamos un email con instrucciones.' }
  }
  // Local: imposible enviar mail. Le decimos cómo proceder.
  return { error: null, info: 'En modo demo no hay envío de email. Borrá los datos del navegador para volver a empezar.' }
}

export async function getSession() {
  if (supabaseEnabled) {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user
    if (!u) return null
    return {
      userId: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      mode: 'supabase',
    }
  }
  return readSession()
}

export function onAuthChange(cb) {
  if (supabaseEnabled) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      cb(u ? { userId: u.id, email: u.email, name: u.user_metadata?.name || u.email, mode: 'supabase' } : null)
    })
    return () => data.subscription?.unsubscribe?.()
  }
  const handler = (e) => cb(e.detail || null)
  window.addEventListener('agm:auth', handler)
  return () => window.removeEventListener('agm:auth', handler)
}

function humanizeSupabaseError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el email (revisá tu casilla).'
  if (m.includes('user already registered')) return 'Ya existe una cuenta con ese email.'
  if (m.includes('rate')) return 'Demasiados intentos, esperá un momento.'
  return msg
}
