import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Recherche transversale de la barre supérieure : quelques résultats par famille. */
@Injectable()
export class AdminSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(raw: string) {
    const q = raw.trim();
    if (q.length < 2) {
      return { producers: [], users: [], batches: [], qrCodes: [], products: [], laboratories: [], alerts: [] };
    }
    const contains = { contains: q, mode: 'insensitive' as const };
    const take = 5;

    const [producers, users, batches, qrCodes, products, laboratories, alerts] = await Promise.all([
      this.prisma.producer.findMany({
        where: { OR: [{ name: contains }, { farmName: contains }, { user: { email: contains } }] },
        select: { id: true, name: true, farmName: true, governorate: true, status: true },
        take,
      }),
      this.prisma.user.findMany({
        where: { OR: [{ name: contains }, { email: contains }] },
        select: { id: true, name: true, email: true, role: true },
        take,
      }),
      this.prisma.batch.findMany({
        where: { OR: [{ batchCode: contains }, { honeyType: contains }] },
        select: { id: true, batchCode: true, honeyType: true, status: true },
        take,
      }),
      this.prisma.qRCode.findMany({
        where: { OR: [{ qrCode: contains }, { serialNumber: contains }, { qrId: q }] },
        select: { id: true, qrId: true, qrCode: true, status: true, product: { select: { nom: true } } },
        take,
      }),
      this.prisma.product.findMany({
        where: { nom: contains },
        select: { id: true, nom: true, statut: true },
        take,
      }),
      this.prisma.laboratory.findMany({
        where: { OR: [{ name: contains }, { city: contains }, { email: contains }] },
        select: { id: true, name: true, city: true, country: true, status: true },
        take,
      }),
      this.prisma.counterfeitAlert.findMany({
        where: { OR: [{ alertCode: contains }, { scannedIdentifier: contains }, { location: contains }] },
        select: { id: true, alertCode: true, type: true, status: true },
        take,
      }),
    ]);
    return { producers, users, batches, qrCodes, products, laboratories, alerts };
  }
}
