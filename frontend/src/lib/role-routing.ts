import type { Role } from './api-types';

// Redirige chaque rôle vers son espace une fois connecté.
// L'équipe de vérification arrive sur son portail dédié ; l'ADMIN garde
// /admin, d'où il pilote aussi le catalogue et les ventes (le portail
// vérificateur lui reste ouvert).
export function roleHomePath(role: Role): string {
  switch (role) {
    case 'PRODUCER':
      return '/producteur';
    case 'FIELD_AGENT':
      return '/agent';
    case 'VERIFICATION_TEAM':
      return '/verificateur';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}

// Portails protégés et rôles admis — même règle que les ProtectedRoute
// d'AppRouter. Toute route hors de ces préfixes est publique.
const PORTAL_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/verificateur', roles: ['VERIFICATION_TEAM', 'ADMIN'] },
  { prefix: '/agent', roles: ['FIELD_AGENT'] },
  { prefix: '/producteur', roles: ['PRODUCER'] },
];

export function canAccessPath(role: Role, path: string): boolean {
  const portal = PORTAL_ROLES.find(
    ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return !portal || portal.roles.includes(role);
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * Destination après connexion.
 *
 * La page demandée avant la connexion a pu être mémorisée pendant la session
 * d'un autre utilisateur, sur le même navigateur. On ne la reprend donc que
 * si elle est dans le portail principal du compte, ou si c'est une page
 * publique (fiche produit, vérification QR...). Sinon — y compris pour un
 * portail secondaire autorisé, comme /verificateur pour l'ADMIN — le compte
 * arrive dans son propre espace.
 */
export function postLoginPath(role: Role, from?: string | null): string {
  const home = roleHomePath(role);
  if (!from || from === '/' || from.startsWith('/connexion') || from.startsWith('/inscription')) {
    return home;
  }
  const inPortal = PORTAL_ROLES.some(({ prefix }) => isUnder(from, prefix));
  if (!inPortal) return from;
  return home !== '/' && isUnder(from, home) ? from : home;
}
