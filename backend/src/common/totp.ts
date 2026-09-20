import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// TOTP (RFC 6238) compatible Google Authenticator / Microsoft Authenticator :
// HMAC-SHA1, 6 chiffres, pas de 30 s. Implémenté sans dépendance externe.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

// Tolère un décalage d'horloge d'un pas (±30 s) entre le serveur et le téléphone.
export function verifyTotp(secret: string, token: string, now = Date.now()): boolean {
  const normalized = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(secret, counter + drift));
    if (timingSafeEqual(expected, Buffer.from(normalized))) {
      return true;
    }
  }
  return false;
}

export function buildOtpauthUrl(secret: string, accountName: string, issuer = 'Kounouz Alafiya'): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
