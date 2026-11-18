// Cifratura lato client: AES-GCM 256 con chiave derivata dalla password (PBKDF2-SHA256).
// A Supabase arriva solo testo cifrato: senza la password nemmeno chi gestisce il database può leggere i dati.
const enc = new TextEncoder()
const dec = new TextDecoder()
const ITERATIONS = 600000

export const toB64 = (buf) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}
export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

// La chiave è "non estraibile": il codice non può rileggerne i byte, solo usarla.
export async function deriveKey(password, saltB64, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function createKey(password) {
  const meta = { salt: toB64(crypto.getRandomValues(new Uint8Array(16))), iterations: ITERATIONS }
  return { key: await deriveKey(password, meta.salt, meta.iterations), meta }
}

export async function encryptJSON(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)))
  return `v1.${toB64(iv)}.${toB64(ct)}`
}

export async function decryptJSON(key, payload) {
  const [version, iv, ct] = String(payload).split('.')
  if (version !== 'v1') throw new Error('Formato dati non supportato')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct))
  return JSON.parse(dec.decode(pt))
}

export async function verifyKey(key, checkBlob) {
  try {
    return (await decryptJSON(key, checkBlob)) === 'ok'
  } catch {
    return false
  }
}

// ---- chiavi personali (RSA-OAEP) e chiavi delle associazioni (AES) ----
// Ogni utente ha una coppia di chiavi: la privata è protetta dalla sua password.
// Ogni associazione ha una chiave AES casuale, "consegnata" a ciascun membro cifrata con la sua chiave pubblica.
const RSA = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }
const RSA_IMPORT = { name: 'RSA-OAEP', hash: 'SHA-256' }

export async function createIdentity() {
  const pair = await crypto.subtle.generateKey(RSA, true, ['encrypt', 'decrypt'])
  return {
    pkcs8: toB64(await crypto.subtle.exportKey('pkcs8', pair.privateKey)),
    publicKey: toB64(await crypto.subtle.exportKey('spki', pair.publicKey)),
  }
}
export const importPrivateKey = (pkcs8) =>
  crypto.subtle.importKey('pkcs8', fromB64(pkcs8), RSA_IMPORT, false, ['decrypt'])
export const importPublicKey = (spki) =>
  crypto.subtle.importKey('spki', fromB64(spki), RSA_IMPORT, false, ['encrypt'])

export const generateDek = () =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
export const importDek = (raw) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])

export async function wrapDek(dek, publicKey) {
  const raw = await crypto.subtle.exportKey('raw', dek)
  return toB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, raw))
}
export const unwrapDekRaw = (wrapped, privateKey) =>
  crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromB64(wrapped))
export async function rewrapDek(wrapped, privateKey, targetPublicKey) {
  const raw = await unwrapDekRaw(wrapped, privateKey)
  return toB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, targetPublicKey, raw))
}

// "Ricorda su questo dispositivo": la CryptoKey non estraibile viene tenuta in IndexedDB.
const openDb = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open('ricevute-keys', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('keys')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
const withStore = async (mode, fn) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction('keys', mode)
    const req = fn(t.objectStore('keys'))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
  })
}
export const saveDeviceKey = (uid, key) => withStore('readwrite', (s) => s.put(key, uid))
export const loadDeviceKey = (uid) => withStore('readonly', (s) => s.get(uid)).catch(() => null)
export const clearDeviceKey = (uid) => withStore('readwrite', (s) => s.delete(uid)).catch(() => {})
