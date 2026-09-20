import PDFDocument from 'pdfkit';
import type { SalesService } from './sales.service.js';

type SettlementDetail = Awaited<ReturnType<SalesService['findMySettlement']>>;

const money = (value: number) => `${value.toFixed(2)} TND`;
const day = (date: Date | string) => new Date(date).toLocaleDateString('fr-FR');

// Reçu de versement d'une période réglée (téléchargé depuis "Historique des
// paiements" du portail producteur).
export function buildSettlementReceiptPdf(settlement: SettlementDetail): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#0C261B').text('Kounouz Alafiya', { align: 'center' });
    doc.fontSize(12).fillColor('#555555').text('Reçu de versement producteur', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#000000').fontSize(11);
    doc.text(`Règlement : ${settlement.id}`);
    doc.text(`Producteur : ${settlement.producer.name} — ${settlement.producer.farmName}`);
    doc.text(`Période : ${day(settlement.periodStart)} au ${day(settlement.periodEnd)}`);
    if (settlement.paidAt) doc.text(`Date du versement : ${day(settlement.paidAt)}`);
    if (settlement.reference) doc.text(`Référence du virement : ${settlement.reference}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#0C261B').text('Récapitulatif');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#000000');
    doc.text(`Commandes livrées : ${settlement.orderCount}`);
    doc.text(`Articles vendus : ${settlement.itemsSold}`);
    doc.text(`Ventes totales : ${money(settlement.grossAmount)}`);
    doc.text(`Commission Kounouz (${(settlement.commissionRate * 100).toFixed(0)} %) : ${money(settlement.commissionAmount)}`);
    doc.font('Helvetica-Bold').text(`Montant net versé : ${money(settlement.netAmount)}`).font('Helvetica');
    doc.moveDown(1);

    if (settlement.payment.bankName || settlement.payment.iban) {
      doc.fontSize(13).fillColor('#0C261B').text('Coordonnées de paiement');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#000000');
      if (settlement.payment.paymentMethod) doc.text(`Mode : ${settlement.payment.paymentMethod}`);
      if (settlement.payment.bankName) doc.text(`Banque : ${settlement.payment.bankName}`);
      if (settlement.payment.iban) doc.text(`IBAN : ${settlement.payment.iban}`);
      doc.moveDown(1);
    }

    doc.fontSize(13).fillColor('#0C261B').text('Commandes incluses');
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#000000');
    for (const item of settlement.items) {
      doc.text(
        `${day(item.order.deliveredAt ?? item.order.createdAt)}  #${item.order.orderNumber}  ${item.productName}${
          item.packageSize ? ` (${item.packageSize})` : ''
        }  x${item.quantity}  ${money(Number(item.lineTotal))}  commission ${money(Number(item.commissionAmount))}  net ${money(
          Number(item.netAmount),
        )}`,
      );
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#777777').text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.end();
  });
}
