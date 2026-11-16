import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  PauseCircle,
  AlertTriangle,
  MapPin,
  Layers,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Flag,
  ShoppingBag,
  ScanLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReportLabel, useVerify, type LabelReportReason, type PublicLabParameter, type VerifyResult } from '../lib/marketplace-hooks';
import { API_URL } from '../lib/api';
import { Logo } from '../components/Logo';
import { dateLocale } from '../i18n';
import { productImageUrl } from '../lib/product-adapter';
import { localizePlace, localizeSeason } from '../lib/tunisia-places';

// Les mesures qu'un acheteur comprend et qui font la qualité d'un miel :
// affichées d'emblée, sans clic. Chaque groupe réunit les clés équivalentes
// des deux référentiels de résultats (historique et normé).
const KEY_PARAMETER_GROUPS = [
  ['humidite_pct', 'moisture'],
  ['hmf_mg_kg', 'hmf'],
  ['sucres_reducteurs_pct', 'sugarProfile'],
  ['antibiotiques', 'antibiotics'],
];

function keyParameters(parameters: PublicLabParameter[]): PublicLabParameter[] {
  const picked = KEY_PARAMETER_GROUPS.map((group) => parameters.find((p) => group.includes(p.parameterKey))).filter(
    (p): p is PublicLabParameter => !!p,
  );
  // Référentiel inconnu : à défaut des mesures attendues, les trois premières.
  return picked.length > 0 ? picked : parameters.slice(0, 3);
}

const STATUS_TONE: Record<PublicLabParameter['status'], string> = {
  WITHIN_RANGE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NOT_DETECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OUT_OF_RANGE: 'bg-rose-50 text-rose-700 border-rose-200',
  DETECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  NOT_APPLICABLE: 'bg-gray-50 text-gray-500 border-gray-200',
};

export const PublicVerifyPage: React.FC = () => {
  const { t, i18n } = useTranslation(['auth']);
  const { identifier } = useParams<{ identifier: string }>();
  // Codes proposés en exemple sur la page d'accueil : tout le monde les
  // vérifie, leur compteur ne dit rien de l'authenticité d'un pot.
  const [searchParams] = useSearchParams();
  const isExample = searchParams.get('exemple') === '1';
  const { data, isLoading, isError } = useVerify(identifier);
  const [showDetails, setShowDetails] = useState(false);
  const lang = i18n.language;
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    setShowDetails(false);
  }, [identifier]);

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white border-b border-[#EAE1D2] px-4 py-4 flex justify-center">
        <Link to="/" aria-label={t('auth:publicVerify.backHome')}>
          <Logo compact />
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        {isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-[#D49B37] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">{t('auth:publicVerify.verifyingLoading')}</p>
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-2xl border border-[#EAE1D2] p-8 text-center">
            <PauseCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[#0C261B] mb-2">{t('auth:publicVerify.notFoundTitle')}</h1>
            <p className="text-sm text-gray-500">{t('auth:publicVerify.notFoundHint')}</p>
            <Link to="/" className="inline-block mt-5 text-sm font-bold text-[#D49B37] hover:text-[#C68A28]">
              {t('auth:publicVerify.backHome')}
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Statut — compréhensible en 3 secondes, sans jargon */}
            {data.displayStatus === 'VERIFIED' ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center">
                <ShieldCheck className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
                <h1 className="text-xl font-extrabold text-emerald-800 mb-1">{t('auth:publicVerify.verifiedTitle')}</h1>
                <p className="text-sm text-emerald-700">{t('auth:publicVerify.verifiedDescription')}</p>
              </div>
            ) : data.displayStatus === 'RECALLED' ? (
              // Un rappel est un signal de sécurité : il ne doit pas se
              // confondre visuellement avec une simple indisponibilité.
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 text-center">
                <AlertTriangle className="w-14 h-14 text-rose-600 mx-auto mb-3" />
                <h1 className="text-xl font-extrabold text-rose-800 mb-1">{t('auth:publicVerify.recalledTitle')}</h1>
                <p className="text-sm text-rose-700">{t('auth:publicVerify.recalledDescription')}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
                <PauseCircle className="w-14 h-14 text-amber-600 mx-auto mb-3" />
                <h1 className="text-xl font-extrabold text-amber-800 mb-1">{t('auth:publicVerify.suspendedTitle')}</h1>
                <p className="text-sm text-amber-700">{t('auth:publicVerify.suspendedDescription')}</p>
              </div>
            )}

            <ScanHistory scans={data.scans} isExample={isExample} formatDate={formatDate} />

            {/* Informations essentielles */}
            <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
              {data.product.images[0] && (
                <img
                  src={productImageUrl(data.product.images[0])}
                  alt={data.product.nom}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-1">{data.product.categorie}</p>
                <h2 className="text-lg font-bold text-[#0C261B] mb-3">{data.product.nom}</h2>

                {data.producer && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" aria-hidden="true" />
                    <span>
                      {data.producer.farmName} · {localizePlace(data.producer.location, lang)}
                    </span>
                  </div>
                )}
                {data.batch && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Layers className="w-4 h-4 text-[#D49B37] shrink-0" aria-hidden="true" />
                    <span dir="ltr" className="font-mono">
                      {data.batch.batchCode}
                    </span>
                  </div>
                )}

                {/* Le visiteur qui vient de vérifier un pot est celui qui est
                    le plus prêt à en acheter : on ne le laisse pas sans suite. */}
                {data.displayStatus === 'VERIFIED' && data.product.purchasable && (
                  <Link
                    to={`/produit/${encodeURIComponent(data.product.id)}`}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm px-5 py-3 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D49B37]" aria-hidden="true" />
                    {t('auth:publicVerify.buy')}
                  </Link>
                )}
              </div>
            </div>

            {/* Résultats clés : la promesse de la marque, visible sans clic */}
            {data.analysis && (
              <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
                <div className="p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#0C261B] mb-1">
                    <FlaskConical className="w-4 h-4 text-[#D49B37]" aria-hidden="true" />
                    {t('auth:publicVerify.keyResultsHeading')}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {t('auth:publicVerify.analysedBy', {
                      lab: data.analysis.laboratory,
                      date: formatDate(data.analysis.analysisDate),
                    })}
                  </p>
                  <ul className="space-y-2.5">
                    {keyParameters(data.analysis.parameters ?? []).map((param) => (
                      <li key={param.parameterKey} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600">
                          {t(`auth:publicVerify.resultLabels.${param.parameterKey}`, { defaultValue: param.parameterKey })}
                        </span>
                        <span className="flex items-center gap-2">
                          {/* Détecté / non détecté : la pastille dit tout. La
                              valeur brute (« Non détecté ») est saisie en
                              français et doublerait la pastille. */}
                          {param.value && param.status !== 'NOT_DETECTED' && param.status !== 'DETECTED' && (
                            <span className="font-semibold text-[#0C261B]" dir="ltr">
                              {param.value}
                              {param.unit ? ` ${param.unit}` : ''}
                            </span>
                          )}
                          {/* « Sans objet » à côté d'une mesure se lirait comme
                              un échec : sans norme applicable, pas de pastille. */}
                          {param.status !== 'NOT_APPLICABLE' && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[param.status]}`}>
                              {t(`auth:publicVerify.resultStatus.${param.status}`)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  aria-expanded={showDetails}
                  aria-controls="verify-all-results"
                  className="w-full flex items-center justify-center gap-1.5 border-t border-[#EAE1D2] px-4 py-3 text-xs font-bold text-[#96661A] hover:bg-[#FAF6EE]"
                >
                  {showDetails ? t('auth:publicVerify.allResultsHide') : t('auth:publicVerify.allResultsShow')}
                  {showDetails ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                </button>
                {showDetails && (
                  <div id="verify-all-results" className="px-5 pb-5 space-y-2 text-sm border-t border-[#EAE1D2] pt-3">
                    <div className="flex justify-between text-gray-500">
                      <span>{t('auth:publicVerify.laboratoryLabel')}</span>
                      <span className="font-semibold text-[#0C261B] text-end">{data.analysis.laboratory}</span>
                    </div>
                    {data.analysis.parameters?.map((param) => (
                      <div key={param.parameterKey} className="flex justify-between gap-3 text-gray-500">
                        <span>
                          {t(`auth:publicVerify.resultLabels.${param.parameterKey}`, { defaultValue: param.parameterKey })}
                        </span>
                        <span className="font-semibold text-[#0C261B] text-end">
                          <span dir="ltr">
                            {param.value ?? '—'}
                            {param.unit ? ` ${param.unit}` : ''}
                          </span>
                          {param.reference ? (
                            <span className="block text-xs font-normal text-gray-400">
                              {t('auth:publicVerify.referenceLabel')} :{' '}
                              {/* Le référentiel stocke des libellés techniques
                                  (ex: NOT_DETECTED) : on les traduit avant
                                  affichage, sinon on garde la plage telle quelle. */}
                              {t(`auth:publicVerify.referenceValues.${param.reference}`, { defaultValue: param.reference })}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <BatchTimeline data={data} lang={lang} formatDate={formatDate} />

            <ReportLabel identifier={data.qrId} />

            <div className="text-center">
              <a href={`${API_URL}/verify/${data.qrId}/image`} className="text-xs text-gray-400 hover:text-[#D49B37]" dir="ltr">
                {data.qrCode}
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Historique public du code. Un pot qu'on vient d'acheter est rarement
// vérifié ; un code copié sur des contrefaçons l'est souvent, et par des
// personnes différentes — l'analyse anti-fraude du serveur en juge.
const ScanHistory: React.FC<{
  scans: VerifyResult['scans'];
  isExample: boolean;
  formatDate: (value: string) => string;
}> = ({ scans, isExample, formatDate }) => {
  const { t } = useTranslation(['auth']);

  if (isExample) {
    return (
      <p className="flex items-start gap-2 text-xs text-gray-500 bg-white border border-[#EAE1D2] rounded-xl px-4 py-3">
        <ScanLine className="w-4 h-4 text-[#D49B37] shrink-0 mt-px" aria-hidden="true" />
        {t('auth:publicVerify.scans.example')}
      </p>
    );
  }

  if (scans.suspicious) {
    return (
      <div role="alert" className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-1">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {t('auth:publicVerify.scans.warningTitle')}
        </p>
        <p className="text-xs text-amber-800">{t('auth:publicVerify.scans.warning')}</p>
      </div>
    );
  }

  return (
    <p className="flex items-start gap-2 text-xs text-gray-600 bg-white border border-[#EAE1D2] rounded-xl px-4 py-3">
      <ScanLine className="w-4 h-4 text-[#D49B37] shrink-0 mt-px" aria-hidden="true" />
      {scans.count <= 1 || !scans.firstScannedAt
        ? t('auth:publicVerify.scans.first')
        : t('auth:publicVerify.scans.count', { count: scans.count, date: formatDate(scans.firstScannedAt) })}
    </p>
  );
};

// Chronologie du lot dans l'ordre réel : la récolte précède l'analyse, qui
// précède la décision ; la mise en pot ne vient qu'après. Afficher ces étapes
// dans l'ordre rend la séquence lisible — et vérifiable par le visiteur.
const BatchTimeline: React.FC<{ data: VerifyResult; lang: string; formatDate: (value: string) => string }> = ({
  data,
  lang,
  formatDate,
}) => {
  const { t } = useTranslation(['auth']);
  const steps = [
    data.batch?.harvestSeason && { key: 'harvest', when: localizeSeason(data.batch.harvestSeason, lang) },
    data.analysis?.analysisDate && { key: 'analysis', when: formatDate(data.analysis.analysisDate) },
    data.verification?.verifiedAt && { key: 'verification', when: formatDate(data.verification.verifiedAt) },
    data.batch?.packagingDate && { key: 'packaging', when: formatDate(data.batch.packagingDate) },
  ].filter((step): step is { key: string; when: string } => !!step);

  if (steps.length < 2) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE1D2] p-5">
      <h3 className="text-sm font-bold text-[#0C261B] mb-4">{t('auth:publicVerify.timeline.heading')}</h3>
      <ol className="relative border-s-2 border-[#EAE1D2] ms-1.5 space-y-4">
        {steps.map((step) => (
          <li key={step.key} className="ps-5 relative">
            <span className="absolute -start-[7px] top-1 w-3 h-3 rounded-full bg-[#D49B37] ring-4 ring-white" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#0C261B]">{t(`auth:publicVerify.timeline.${step.key}`)}</p>
            <p className="text-xs text-gray-500">{step.when}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

const REPORT_REASONS: LabelReportReason[] = ['DAMAGED_SEAL', 'LABEL_MISMATCH', 'SUSPICIOUS_PRODUCT', 'OTHER'];

// Le consommateur peut signaler une étiquette abîmée ou un doute : le
// signalement ouvre une alerte anti-contrefaçon côté Kounouz.
const ReportLabel: React.FC<{ identifier: string }> = ({ identifier }) => {
  const { t } = useTranslation(['auth']);
  const report = useReportLabel(identifier);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<LabelReportReason>('DAMAGED_SEAL');
  const [comment, setComment] = useState('');

  if (report.isSuccess) {
    return (
      <p className="text-sm text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        {t('auth:publicVerify.report.thanks')}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-rose-700"
        >
          <Flag className="w-3.5 h-3.5" aria-hidden="true" />
          {t('auth:publicVerify.report.open')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        report.mutate({ reason, comment: comment.trim() || undefined });
      }}
      className="bg-white rounded-2xl border border-[#EAE1D2] p-4 space-y-3"
    >
      <p className="text-sm font-bold text-[#0C261B]">{t('auth:publicVerify.report.title')}</p>
      <div className="space-y-1.5">
        {REPORT_REASONS.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="report-reason"
              checked={reason === value}
              onChange={() => setReason(value)}
              className="accent-[#D49B37]"
            />
            {t(`auth:publicVerify.report.reasons.${value}`)}
          </label>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        aria-label={t('auth:publicVerify.report.commentPlaceholder')}
        placeholder={t('auth:publicVerify.report.commentPlaceholder')}
        className="w-full min-h-[70px] rounded-lg border border-[#EAE1D2] px-3 py-2 text-sm focus:outline-none focus:border-[#D49B37]"
      />
      {report.isError && <p className="text-xs text-rose-700">{t('auth:publicVerify.report.error')}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-gray-500">
          {t('auth:publicVerify.report.cancel')}
        </button>
        <button
          type="submit"
          disabled={report.isPending}
          className="px-4 py-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold disabled:opacity-50"
        >
          {t('auth:publicVerify.report.submit')}
        </button>
      </div>
    </form>
  );
};
