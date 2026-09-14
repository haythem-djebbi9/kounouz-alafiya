import type { Role } from './api-types';

// Redirige chaque rôle vers son espace une fois connecté. Les espaces non
// encore construits (agent terrain, centre de vérification) retombent sur
// l'accueil plutôt que vers une page inexistante.
export function roleHomePath(role: Role): string {
  switch (role) {
    case 'PRODUCER':
      return '/producteur';
    default:
      return '/';
  }
}
