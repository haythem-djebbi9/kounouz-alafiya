import PDFDocument from 'pdfkit';
import type { ReportsService } from './reports.service.js';

type OperationsSummary = Awaited<ReturnType<ReportsService['getOperationsSummary']>>;

export function buildOperationsPdf(summary: OperationsSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Kounouz Alafiya — Rapport opérationnel', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);

    const section = (title: string, counts: Record<string, number>) => {
      doc.fontSize(14).text(title);
      doc.moveDown(0.3);
      Object.entries(counts).forEach(([key, value]) => {
        doc.fontSize(11).text(`${key} : ${value}`);
      });
      doc.moveDown(1);
    };

    section('Demandes de vérification', summary.requestsByStatus);
    section('Échantillons', summary.samplesByStatus);
    section('Vérifications', summary.verificationsByStatus);
    doc.fontSize(11).text(`Taux de vérification : ${(summary.verificationRate * 100).toFixed(1)} %`);
    doc.moveDown(1);
    section('Lots', summary.batchesByStatus);
    section('Produits publiés', summary.productsByStatut);
    doc.fontSize(11).text(`Producteurs enregistrés : ${summary.totals.producers}`);
    doc.text(`Producteurs vérifiés : ${summary.totals.verifiedProducers}`);
    doc.text(`Produits publiés au catalogue : ${summary.totals.publishedProducts}`);

    doc.end();
  });
}
