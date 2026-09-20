// Contexte d'un scan consommateur, transmis à la page de vérification publique
// pour l'analyse et la lutte anti-contrefaçon. Rien de personnel : un
// identifiant aléatoire propre au navigateur, le pays déduit du fuseau horaire,
// et la position uniquement si le visiteur l'a déjà autorisée pour ce site.

const VISITOR_KEY = 'kz_visitor';

export function getVisitorId(): string | undefined {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

const TIME_ZONE_COUNTRY: Record<string, string> = {
  'Africa/Tunis': 'TN',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Brussels': 'BE',
  'Europe/Amsterdam': 'NL',
  'Europe/Zurich': 'CH',
  'Europe/London': 'GB',
  'Europe/Lisbon': 'PT',
  'Europe/Stockholm': 'SE',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA',
  'Africa/Tripoli': 'LY',
  'Africa/Cairo': 'EG',
  'Africa/Dakar': 'SN',
  'Africa/Lagos': 'NG',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Shanghai': 'CN',
  'Asia/Tokyo': 'JP',
  'Asia/Kolkata': 'IN',
  'Australia/Sydney': 'AU',
  'America/Sao_Paulo': 'BR',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
};

export function countryFromTimeZone(): string | undefined {
  try {
    return TIME_ZONE_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone];
  } catch {
    return undefined;
  }
}

/** Position du visiteur, seulement si l'autorisation est déjà accordée : aucune demande n'est affichée. */
async function grantedPosition(): Promise<{ latitude: number; longitude: number } | undefined> {
  try {
    if (!navigator.permissions || !navigator.geolocation) return undefined;
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return undefined;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(undefined),
        { timeout: 3000, maximumAge: 10 * 60000 },
      );
    });
  } catch {
    return undefined;
  }
}

export async function buildScanParams(): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  const visitorId = getVisitorId();
  const countryCode = countryFromTimeZone();
  const position = await grantedPosition();
  if (visitorId) params.visitorId = visitorId;
  if (countryCode) params.countryCode = countryCode;
  if (position) {
    params.latitude = position.latitude.toFixed(4);
    params.longitude = position.longitude.toFixed(4);
  }
  return params;
}
