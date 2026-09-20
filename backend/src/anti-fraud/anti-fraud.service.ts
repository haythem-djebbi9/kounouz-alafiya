import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  CounterfeitAlertStatus,
  CounterfeitAlertType,
  NotificationType,
  QrCodeStatus,
  Role,
  ScanResult,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { countryByCode, nearestGovernorate, normalizeCountry, normalizeGovernorate } from '../common/geo.js';
import { deviceLabelOf, deviceTypeOf } from '../common/user-agent.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

export interface ScanInput {
  identifier?: string;
  location?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  visitorId?: string;
  userAgent?: string;
  ipAddress?: string | null;
}

interface ScannedCode {
  id: string;
  status: QrCodeStatus;
  productId: string;
  batchId: string | null;
}

const HIGH_FREQUENCY_WINDOW_MIN = 10;
const HIGH_FREQUENCY_THRESHOLD = 5;
const MULTI_COUNTRY_WINDOW_MIN = 60;
const VOLUME_WINDOW_HOURS = 24;
const VOLUME_THRESHOLD = 20;
const DISTINCT_VISITORS_WINDOW_DAYS = 7;
const DISTINCT_VISITORS_THRESHOLD = 8;
const BULK_WINDOW_MIN = 5;
const BULK_DISTINCT_CODES = 10;
const FLAG_THRESHOLD = 0.5;
// Une alerte ouverte absorbe les déclenchements identiques pendant ce délai.
const ALERT_MERGE_WINDOW_HOURS = 24;

interface Trigger {
  type: CounterfeitAlertType;
  severity: AlertSeverity;
  details: string;
}

// Règles de détection sur les scans QR (cahier des charges §7.6). Un scan
// suspect est journalisé et ouvre (ou alimente) une alerte anti-contrefaçon ;
// le consommateur n'est jamais bloqué.
@Injectable()
export class AntiFraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async assessAndRecordScan(qrCode: ScannedCode | null, input: ScanInput) {
    const now = Date.now();
    const countryCode = normalizeCountry(input.countryCode) ?? normalizeCountry(input.country);
    const hasCoordinates = typeof input.latitude === 'number' && typeof input.longitude === 'number';
    const governorate =
      countryCode === 'TN' || !countryCode
        ? ((hasCoordinates ? nearestGovernorate(input.latitude!, input.longitude!) : null) ??
          normalizeGovernorate(input.city) ??
          normalizeGovernorate(input.location))
        : null;
    const resolvedCountry = countryCode ?? (governorate ? 'TN' : null);
    const country = input.country ?? countryByCode(resolvedCountry)?.name ?? null;
    const location =
      input.location ?? ([input.city ?? governorate, country].filter(Boolean).join(', ') || null);

    const base = {
      scannedIdentifier: input.identifier ?? null,
      location,
      country,
      countryCode: resolvedCountry,
      city: input.city ?? governorate,
      governorate,
      latitude: hasCoordinates ? input.latitude : null,
      longitude: hasCoordinates ? input.longitude : null,
      deviceInfo: deviceLabelOf(input.userAgent),
      deviceType: deviceTypeOf(input.userAgent),
      ipAddress: input.ipAddress ?? null,
      visitorId: input.visitorId ?? null,
    };

    if (!qrCode) {
      const scan = await this.prisma.qRScan.create({
        data: { ...base, result: ScanResult.INVALID, riskScore: 1, flagged: true },
      });
      await this.raise(
        {
          type: CounterfeitAlertType.INVALID_QR,
          severity: AlertSeverity.HIGH,
          details: `Identifiant inconnu scanné : ${input.identifier ?? '—'}`,
        },
        null,
        scan,
      );
      return scan;
    }

    const since = new Date(now - DISTINCT_VISITORS_WINDOW_DAYS * 86400000);
    const recentScans = await this.prisma.qRScan.findMany({
      where: { qrCodeId: qrCode.id, scannedAt: { gte: since } },
      select: { scannedAt: true, countryCode: true, country: true, visitorId: true, ipAddress: true },
      orderBy: { scannedAt: 'desc' },
    });
    const within = (minutes: number) =>
      recentScans.filter((s) => now - s.scannedAt.getTime() <= minutes * 60000);

    const triggers: Trigger[] = [];
    let riskScore = 0;

    const highFrequency = within(HIGH_FREQUENCY_WINDOW_MIN);
    const highFrequencyScanners = new Set(
      [...highFrequency.map((s) => s.visitorId ?? s.ipAddress), base.visitorId ?? base.ipAddress].filter(Boolean),
    );
    if (highFrequency.length + 1 >= HIGH_FREQUENCY_THRESHOLD) {
      riskScore += 0.5;
      if (highFrequencyScanners.size >= 2) {
        triggers.push({
          type: CounterfeitAlertType.SUSPECTED_DUPLICATE,
          severity: AlertSeverity.HIGH,
          details: `${highFrequency.length + 1} scans en ${HIGH_FREQUENCY_WINDOW_MIN} min depuis ${highFrequencyScanners.size} appareils différents.`,
        });
      }
    }

    const weekVisitors = new Set([...recentScans.map((s) => s.visitorId), base.visitorId].filter(Boolean));
    if (weekVisitors.size >= DISTINCT_VISITORS_THRESHOLD) {
      riskScore += 0.3;
      triggers.push({
        type: CounterfeitAlertType.SUSPECTED_DUPLICATE,
        severity: AlertSeverity.MEDIUM,
        details: `Code scanné par ${weekVisitors.size} appareils distincts en ${DISTINCT_VISITORS_WINDOW_DAYS} jours : étiquette probablement dupliquée.`,
      });
    }

    const countryOf = (s: { countryCode: string | null; country: string | null }) =>
      s.countryCode ?? normalizeCountry(s.country);
    const countriesHour = new Set(
      [...within(MULTI_COUNTRY_WINDOW_MIN).map(countryOf), resolvedCountry].filter(Boolean),
    );
    const countriesDay = new Set(
      [...within(VOLUME_WINDOW_HOURS * 60).map(countryOf), resolvedCountry].filter(Boolean),
    );
    if (countriesHour.size >= 2 || countriesDay.size >= 2) {
      const fast = countriesHour.size >= 2;
      riskScore += fast ? 0.5 : 0.3;
      triggers.push({
        type: CounterfeitAlertType.UNUSUAL_LOCATION,
        severity: fast ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        details: `Scanné depuis ${[...(fast ? countriesHour : countriesDay)].join(', ')} en moins de ${fast ? '1 heure' : '24 heures'}.`,
      });
    }

    const dayScans = within(VOLUME_WINDOW_HOURS * 60).length + 1;
    if (dayScans >= VOLUME_THRESHOLD) {
      riskScore += 0.3;
      triggers.push({
        type: CounterfeitAlertType.BULK_SCAN,
        severity: AlertSeverity.MEDIUM,
        details: `${dayScans} scans du même code en 24 heures.`,
      });
    }

    const scanner = base.visitorId ?? base.ipAddress;
    if (scanner) {
      const bulk = await this.prisma.qRScan.findMany({
        where: {
          scannedAt: { gte: new Date(now - BULK_WINDOW_MIN * 60000) },
          ...(base.visitorId ? { visitorId: base.visitorId } : { ipAddress: base.ipAddress }),
          qrCodeId: { not: null },
        },
        select: { qrCodeId: true },
        distinct: ['qrCodeId'],
      });
      const distinctCodes = new Set([...bulk.map((b) => b.qrCodeId), qrCode.id]).size;
      if (distinctCodes >= BULK_DISTINCT_CODES) {
        riskScore += 0.5;
        triggers.push({
          type: CounterfeitAlertType.BULK_SCAN,
          severity: AlertSeverity.HIGH,
          details: `${distinctCodes} codes différents scannés en ${BULK_WINDOW_MIN} min par le même appareil.`,
        });
      }
    }

    // Un code désactivé n'a jamais été posé sur un pot : le retrouver en
    // circulation signifie qu'une étiquette a été récupérée ou reproduite.
    if (qrCode.status === QrCodeStatus.DEACTIVATED) {
      riskScore += 0.6;
      triggers.push({
        type: CounterfeitAlertType.TAMPERED_LABEL,
        severity: AlertSeverity.HIGH,
        details: 'Scan d’un code désactivé, jamais mis en circulation.',
      });
    }

    riskScore = Math.min(riskScore, 1);
    const flagged = riskScore >= FLAG_THRESHOLD || triggers.length > 0;

    const scan = await this.prisma.qRScan.create({
      data: {
        ...base,
        qrCodeId: qrCode.id,
        riskScore,
        flagged,
        result: flagged ? ScanResult.SUSPICIOUS : ScanResult.VALID,
      },
    });

    for (const trigger of dedupeByType(triggers)) {
      await this.raise(trigger, qrCode, scan);
    }
    return scan;
  }

  /** Signalement consommateur d'une étiquette abîmée ou non conforme. */
  async reportTamperedLabel(qrCode: ScannedCode, input: ScanInput & { reason: string; comment?: string }) {
    const scan = await this.prisma.qRScan.findFirst({
      where: { qrCodeId: qrCode.id, ...(input.visitorId ? { visitorId: input.visitorId } : {}) },
      orderBy: { scannedAt: 'desc' },
    });
    return this.raise(
      {
        type: CounterfeitAlertType.TAMPERED_LABEL,
        severity: AlertSeverity.HIGH,
        details: `Signalement consommateur (${input.reason})${input.comment ? ` : ${input.comment.slice(0, 500)}` : ''}`,
      },
      qrCode,
      scan,
    );
  }

  private async raise(
    trigger: Trigger,
    qrCode: ScannedCode | null,
    scan: {
      id: string;
      location: string | null;
      country: string | null;
      countryCode: string | null;
      deviceInfo: string | null;
      deviceType: string | null;
      ipAddress: string | null;
      scannedIdentifier: string | null;
    } | null,
  ) {
    const mergeSince = new Date(Date.now() - ALERT_MERGE_WINDOW_HOURS * 3600000);
    const existing = await this.prisma.counterfeitAlert.findFirst({
      where: {
        type: trigger.type,
        status: {
          in: [CounterfeitAlertStatus.OPEN, CounterfeitAlertStatus.INVESTIGATING, CounterfeitAlertStatus.CONFIRMED],
        },
        lastSeenAt: { gte: mergeSince },
        ...(qrCode
          ? { qrCodeId: qrCode.id }
          : { qrCodeId: null, scannedIdentifier: scan?.scannedIdentifier ?? undefined }),
      },
    });

    const snapshot = {
      scanId: scan?.id ?? null,
      location: scan?.location ?? null,
      country: scan?.country ?? null,
      countryCode: scan?.countryCode ?? null,
      deviceInfo: scan?.deviceInfo ?? null,
      deviceType: scan?.deviceType ?? null,
      ipAddress: scan?.ipAddress ?? null,
      details: trigger.details,
      lastSeenAt: new Date(),
    };

    if (existing) {
      return this.prisma.counterfeitAlert.update({
        where: { id: existing.id },
        data: {
          ...snapshot,
          scanCount: { increment: 1 },
          severity: rank(trigger.severity) > rank(existing.severity) ? trigger.severity : existing.severity,
        },
      });
    }

    const alert = await allocateYearCode(
      'ALERT',
      (prefix) => this.prisma.counterfeitAlert.count({ where: { alertCode: { startsWith: prefix } } }),
      (alertCode) =>
        this.prisma.counterfeitAlert.create({
          data: {
            ...snapshot,
            alertCode,
            type: trigger.type,
            severity: trigger.severity,
            qrCodeId: qrCode?.id ?? null,
            scannedIdentifier: scan?.scannedIdentifier ?? null,
            productId: qrCode?.productId ?? null,
            batchId: qrCode?.batchId ?? null,
          },
        }),
      { width: 5 },
    );

    // AC-03 : signal interne, jamais une accusation — il attend une revue humaine.
    await this.domainEvents.publish(EventType.COUNTERFEIT_ALERT_RAISED, 'CounterfeitAlert', alert.id, {
      alertCode: alert.alertCode,
      type: trigger.type,
      severity: trigger.severity,
    });
    if (trigger.severity === AlertSeverity.HIGH) {
      await this.notifications.notifyRole(
        Role.ADMIN,
        NotificationType.COUNTERFEIT_ALERT,
        'Alerte anti-contrefaçon',
        `${alert.alertCode} — ${trigger.details}`,
        'CounterfeitAlert',
        alert.id,
      );
    }
    return alert;
  }

  findFlaggedScans() {
    return this.prisma.qRScan.findMany({
      where: { flagged: true },
      include: { qrCode: { include: { product: true } } },
      orderBy: { scannedAt: 'desc' },
    });
  }

  async getStats() {
    const [totalScans, flaggedScans, byCountry] = await Promise.all([
      this.prisma.qRScan.count(),
      this.prisma.qRScan.count({ where: { flagged: true } }),
      this.prisma.qRScan.groupBy({
        by: ['country'],
        _count: { _all: true },
        where: { country: { not: null } },
        orderBy: { _count: { country: 'desc' } },
      }),
    ]);

    const flaggedByProduct = await this.prisma.qRScan.findMany({
      where: { flagged: true, qrCodeId: { not: null } },
      include: { qrCode: { include: { product: { select: { id: true, nom: true } } } } },
    });
    const topFlagged = Object.values(
      flaggedByProduct.reduce<Record<string, { productId: string; nom: string; count: number }>>((acc, s) => {
        const p = s.qrCode?.product;
        if (!p) return acc;
        acc[p.id] = acc[p.id] ?? { productId: p.id, nom: p.nom, count: 0 };
        acc[p.id].count += 1;
        return acc;
      }, {}),
    ).sort((a, b) => b.count - a.count);

    return {
      totalScans,
      flaggedScans,
      flaggedRate: totalScans > 0 ? flaggedScans / totalScans : 0,
      scansByCountry: byCountry.map((c) => ({ country: c.country, count: c._count._all })),
      topFlaggedProducts: topFlagged,
    };
  }
}

function rank(severity: AlertSeverity): number {
  return severity === AlertSeverity.HIGH ? 3 : severity === AlertSeverity.MEDIUM ? 2 : 1;
}

/** Une seule alerte par type pour un même scan : la plus sévère l'emporte. */
function dedupeByType(triggers: Trigger[]): Trigger[] {
  const byType = new Map<CounterfeitAlertType, Trigger>();
  for (const trigger of triggers) {
    const current = byType.get(trigger.type);
    if (!current || rank(trigger.severity) > rank(current.severity)) byType.set(trigger.type, trigger);
  }
  return [...byType.values()];
}
