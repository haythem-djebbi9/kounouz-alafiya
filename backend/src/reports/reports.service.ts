import { Injectable } from '@nestjs/common';
import {
  BatchStatus,
  ProductStatus,
  SampleStatus,
  VerificationRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service.js';
import { toCsv } from '../common/csv.js';

function zeroFilledCounts<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((v) => [v, 0])) as Record<T, number>;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  async getOperationsSummary() {
    const [requests, samples, verifications, batches, products, producerCount, verifiedProducerCount] =
      await Promise.all([
        // Les brouillons des producteurs ne sont pas encore des demandes.
        this.prisma.verificationRequest.groupBy({
          by: ['status'],
          where: { status: { not: VerificationRequestStatus.DRAFT } },
          _count: { _all: true },
        }),
        this.prisma.sample.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.verification.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.batch.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['statut'], _count: { _all: true } }),
        this.prisma.producer.count(),
        this.prisma.producer.count({ where: { isVerified: true } }),
      ]);

    const requestsByStatus = zeroFilledCounts(
      Object.values(VerificationRequestStatus).filter((s) => s !== VerificationRequestStatus.DRAFT),
    );
    requests.forEach((r) => (requestsByStatus[r.status as keyof typeof requestsByStatus] = r._count._all));

    const samplesByStatus = zeroFilledCounts(Object.values(SampleStatus));
    samples.forEach((s) => (samplesByStatus[s.status] = s._count._all));

    const verificationsByStatus = zeroFilledCounts(Object.values(VerificationStatus));
    verifications.forEach((v) => (verificationsByStatus[v.status] = v._count._all));

    const batchesByStatus = zeroFilledCounts(Object.values(BatchStatus));
    batches.forEach((b) => (batchesByStatus[b.status] = b._count._all));

    const productsByStatut = zeroFilledCounts(Object.values(ProductStatus));
    products.forEach((p) => (productsByStatut[p.statut] = p._count._all));

    const decided = verificationsByStatus.VERIFIED + verificationsByStatus.NOT_VERIFIED;
    const verificationRate = decided > 0 ? verificationsByStatus.VERIFIED / decided : 0;

    return {
      requestsByStatus,
      samplesByStatus,
      verificationsByStatus,
      verificationRate,
      batchesByStatus,
      productsByStatut,
      totals: {
        producers: producerCount,
        verifiedProducers: verifiedProducerCount,
        publishedProducts: productsByStatut.PUBLIE,
      },
    };
  }

  async getByProducer() {
    const producers = await this.prisma.producer.findMany({
      include: {
        verificationRequests: {
          where: { status: { not: VerificationRequestStatus.DRAFT } },
          include: { verifications: true },
        },
      },
    });

    return Promise.all(
      producers.map(async (producer) => {
        const requests = producer.verificationRequests;
        const verifications = requests.flatMap((r) => r.verifications);
        const verifiedIds = verifications.filter((v) => v.status === VerificationStatus.VERIFIED).map((v) => v.id);

        const totalBatchedKg = verifiedIds.length
          ? await this.prisma.batch
              .aggregate({
                where: { verificationId: { in: verifiedIds } },
                _sum: { quantityKg: true },
              })
              .then((r) => Number(r._sum.quantityKg ?? 0))
          : 0;

        return {
          producerId: producer.id,
          name: producer.name,
          farmName: producer.farmName,
          location: producer.location,
          totalRequests: requests.length,
          accepted: requests.filter((r) => r.status === VerificationRequestStatus.ACCEPTED).length,
          rejected: requests.filter((r) => r.status === VerificationRequestStatus.REJECTED).length,
          pending: requests.filter(
            (r) => r.status === VerificationRequestStatus.NEW || r.status === VerificationRequestStatus.IN_REVIEW,
          ).length,
          verifiedCount: verifications.filter((v) => v.status === VerificationStatus.VERIFIED).length,
          notVerifiedCount: verifications.filter((v) => v.status === VerificationStatus.NOT_VERIFIED).length,
          totalBatchedKg,
        };
      }),
    );
  }

  getAntiFraudStats() {
    return this.antiFraud.getStats();
  }

  async exportOperationsCsv(): Promise<string> {
    const summary = await this.getOperationsSummary();
    const rows = [
      ...Object.entries(summary.requestsByStatus).map(([k, v]) => ({ categorie: 'Demandes', statut: k, total: v })),
      ...Object.entries(summary.samplesByStatus).map(([k, v]) => ({ categorie: 'Échantillons', statut: k, total: v })),
      ...Object.entries(summary.verificationsByStatus).map(([k, v]) => ({
        categorie: 'Vérifications',
        statut: k,
        total: v,
      })),
      ...Object.entries(summary.batchesByStatus).map(([k, v]) => ({ categorie: 'Lots', statut: k, total: v })),
      ...Object.entries(summary.productsByStatut).map(([k, v]) => ({ categorie: 'Produits', statut: k, total: v })),
    ];
    return toCsv(rows, [
      { key: 'categorie', header: 'Catégorie' },
      { key: 'statut', header: 'Statut' },
      { key: 'total', header: 'Total' },
    ]);
  }

  async exportByProducerCsv(): Promise<string> {
    const rows = await this.getByProducer();
    return toCsv(rows, [
      { key: 'name', header: 'Producteur' },
      { key: 'farmName', header: 'Exploitation' },
      { key: 'location', header: 'Localisation' },
      { key: 'totalRequests', header: 'Demandes totales' },
      { key: 'accepted', header: 'Acceptées' },
      { key: 'rejected', header: 'Rejetées' },
      { key: 'pending', header: 'En attente' },
      { key: 'verifiedCount', header: 'Vérifiées' },
      { key: 'notVerifiedCount', header: 'Non vérifiées' },
      { key: 'totalBatchedKg', header: 'Total mis en lot (kg)' },
    ]);
  }
}
