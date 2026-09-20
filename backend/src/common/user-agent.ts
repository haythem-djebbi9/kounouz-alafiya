export type DeviceType = 'MOBILE' | 'DESKTOP' | 'TABLET' | 'OTHER';

/** Famille d'appareil déduite du user-agent — une heuristique, jamais une empreinte. */
export function deviceTypeOf(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return 'OTHER';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'TABLET';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'MOBILE';
  if (/windows|macintosh|linux|cros|x11/.test(ua)) return 'DESKTOP';
  return 'OTHER';
}

/** Libellé court et lisible (« iPhone · Safari ») pour les tableaux de l'administration. */
export function deviceLabelOf(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : null;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  if (!os && !browser) return ua.slice(0, 60);
  return [os, browser].filter(Boolean).join(' · ');
}
