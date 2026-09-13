import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Restreint une route aux rôles listés. Sans ce décorateur, toute personne
// authentifiée peut accéder à la route (voir RolesGuard).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
