// Crée le premier compte administrateur d'une installation de production,
// sans charger les données de démonstration du seed (comptes aux mots de
// passe publics, producteurs et commandes fictifs).
//
//   docker compose exec backend node prisma/create-admin.mjs admin@exemple.tn "Nom Prénom"
//
// Le mot de passe provisoire est généré aléatoirement et affiché une seule
// fois : l'administrateur le change ensuite dans Paramètres → Sécurité.
// Pour réinitialiser le mot de passe d'un administrateur existant :
//
//   docker compose exec backend node prisma/create-admin.mjs admin@exemple.tn --reset-password
//
// Script en JavaScript pur : l'image de production ne contient ni tsx ni les
// sources TypeScript, seulement @prisma/client et bcrypt.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const resetPassword = args.includes('--reset-password');
const [rawEmail, rawName] = args.filter((arg) => !arg.startsWith('--'));
const email = rawEmail?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage : node prisma/create-admin.mjs <email> "<nom complet>" [--reset-password]');
  process.exit(1);
}

const password = randomBytes(12).toString('base64url');
const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && !resetPassword) {
    console.error(
      `Un compte existe déjà pour ${email} (rôle ${existing.role}). ` +
        'Ajoutez --reset-password pour réinitialiser le mot de passe d\'un administrateur.',
    );
    process.exitCode = 1;
  } else if (existing) {
    if (existing.role !== 'ADMIN') {
      console.error(`${email} n'est pas un administrateur (rôle ${existing.role}) : rien n'est modifié.`);
      process.exitCode = 1;
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await bcrypt.hash(password, 10),
          passwordChangedAt: new Date(),
          // Déconnecte les sessions ouvertes avec l'ancien mot de passe.
          refreshTokenHash: null,
          isActive: true,
        },
      });
      printCredentials('Mot de passe réinitialisé');
    }
  } else {
    const name = rawName?.trim();
    if (!name) {
      console.error('Indiquez le nom complet de l\'administrateur (entre guillemets).');
      process.exitCode = 1;
    } else {
      await prisma.user.create({
        data: {
          email,
          name,
          role: 'ADMIN',
          passwordHash: await bcrypt.hash(password, 10),
          language: 'fr',
        },
      });
      printCredentials('Administrateur créé');
    }
  }
} finally {
  await prisma.$disconnect();
}

function printCredentials(title) {
  console.log(`\n${title}.`);
  console.log(`  E-mail       : ${email}`);
  console.log(`  Mot de passe : ${password}`);
  console.log('\nNotez ce mot de passe maintenant : il ne sera plus affiché.');
  console.log('Changez-le dès la première connexion (Paramètres → Sécurité et mot de passe).\n');
}
