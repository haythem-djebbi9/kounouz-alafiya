import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Outils partagés par les écrans d'analyse de la console d'administration :
// période demandée, période de comparaison, variations et séries temporelles.

export class PeriodQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PageQueryDto extends PeriodQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  pageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export interface Period {
  from: Date;
  to: Date;
  /** Période précédente de même durée, pour les variations. */
  prevFrom: Date;
  prevTo: Date;
  days: number;
}

const DAY = 86400000;

/**
 * Période [from, to[ en jours UTC entiers. `to` est inclusif côté utilisateur :
 * « 1 août → 16 sept. » couvre toute la journée du 16.
 */
export function parsePeriod(from?: string, to?: string, defaultDays = 30): Period {
  const today = startOfUtcDay(new Date());
  const end = to ? new Date(startOfUtcDay(new Date(to)).getTime() + DAY) : new Date(today.getTime() + DAY);
  let start = from ? startOfUtcDay(new Date(from)) : new Date(end.getTime() - defaultDays * DAY);
  if (start >= end) start = new Date(end.getTime() - DAY);
  const span = end.getTime() - start.getTime();
  return {
    from: start,
    to: end,
    prevFrom: new Date(start.getTime() - span),
    prevTo: start,
    days: Math.round(span / DAY),
  };
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfUtcMonth(date: Date, offsetMonths = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offsetMonths, 1));
}

/**
 * Variation en pourcentage. `null` quand la référence est vide : afficher
 * « +100 % » à partir de zéro donnerait une fausse impression de mesure.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type Granularity = 'day' | 'week' | 'month';

export function granularityFor(period: Period): Granularity {
  if (period.days <= 45) return 'day';
  if (period.days <= 200) return 'week';
  return 'month';
}

/** Début de l'intervalle contenant `date`, aligné comme date_trunc de PostgreSQL (semaine = lundi). */
export function bucketStart(date: Date, granularity: Granularity): Date {
  const day = startOfUtcDay(date);
  if (granularity === 'day') return day;
  if (granularity === 'month') return startOfUtcMonth(day);
  const weekday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - weekday * DAY);
}

export function bucketKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Clés successives des intervalles couvrant la période, pour des séries sans trou. */
export function bucketKeys(period: Period, granularity: Granularity): string[] {
  const keys: string[] = [];
  let cursor = bucketStart(period.from, granularity);
  while (cursor < period.to) {
    keys.push(bucketKey(cursor));
    cursor =
      granularity === 'day'
        ? new Date(cursor.getTime() + DAY)
        : granularity === 'week'
          ? new Date(cursor.getTime() + 7 * DAY)
          : startOfUtcMonth(cursor, 1);
  }
  return keys;
}

/** Série complète : chaque clé reçoit la valeur trouvée ou zéro. */
export function fillSeries<T extends Record<string, number>>(
  keys: string[],
  rows: { bucket: Date; values: T }[],
  zero: T,
): ({ date: string } & T)[] {
  const byKey = new Map(rows.map((r) => [bucketKey(r.bucket), r.values]));
  return keys.map((date) => ({ date, ...zero, ...byKey.get(date) }));
}

export function toNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function paginate(page = 1, pageSize = 10) {
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
