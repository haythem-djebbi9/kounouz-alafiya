import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marque une route comme accessible sans jeton JWT (ex: login, register,
// page de vérification publique).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
