/**
 * Secure client-side storage for API keys using Web Crypto API.
 *
 * Flow:
 *   1. User provides an API key + a PIN they choose.
 *   2. A random salt is generated, and the PIN is run through PBKDF2
 *      to derive a 256-bit AES-GCM key.
 *   3. The API key is encrypted with AES-GCM (random IV each time).
 *   4. salt + IV + ciphertext are stored in localStorage as base64.
 *
 * On subsequent visits the user only needs their PIN to decrypt.
 */

const STORAGE_KEY = 'topology_encrypted_api_key'

// ── helpers ──────────────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ── public API ───────────────────────────────────────────────────────

/** Encrypt `apiKey` with the user's `pin` and persist to localStorage. */
export async function encryptAndStore(apiKey: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey),
  )

  const payload = JSON.stringify({
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(ciphertext),
  })

  localStorage.setItem(STORAGE_KEY, payload)
}

/** Decrypt the stored API key using the user's `pin`. Throws on wrong PIN. */
export async function decryptFromStorage(pin: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('No saved key found')

  const { salt, iv, data } = JSON.parse(raw)
  const key = await deriveKey(pin, fromBase64(salt) as unknown as Uint8Array)

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      key,
      fromBase64(data),
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new Error('Incorrect PIN')
  }
}

/** Returns true if an encrypted key exists in localStorage. */
export function hasSavedKey(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

/** Remove the encrypted key from localStorage. */
export function clearSavedKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}
