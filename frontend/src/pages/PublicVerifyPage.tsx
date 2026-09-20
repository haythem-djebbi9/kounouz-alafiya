import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, PauseCircle, AlertTriangle, MapPin, Layers, FlaskConical, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReportLabel, useVerify, type LabelReportReason } from '../lib/marketplace-hooks';
import { resolveFileUrl, API_URL } from '../lib/api';
import { Logo } from '../components/Logo';
import { dateLocale } from '../i18n';

export const PublicVerifyPage: React.FC = () => {
  const { t, i18n } = useTranslation(['auth']);
  const { identifier } = useParams<{ identifier: string }>();
  const { data, isLoading, isError } = useVerify(identifier);
  const [showDetails, setShowDetails] = useState(false);

  // Un scan doit se journaliser une seule fois par affichage.
  useEffect(() => {
    setShowDetails(false);
  }, [identifier]);

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white border-b border-[#EAE1D2] px-4 py-4 flex justify-center">
        <Link to="/">
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
            <p className="text-sm text-gray-500">
              {t('auth:publicVerify.notFoundHint')}
            </p>
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

            {/* Informations essentielles */}
            <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
              {data.product.images[0] && (
                <img
                  src={resolveFileUrl(data.product.images[0])}
                  alt={data.product.nom}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-1">{data.product.categorie}</p>
                <h2 className="text-lg font-bold text-[#0C261B] mb-3">{data.product.nom}</h2>

                {data.producer && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
                    <span>{data.producer.farmName} · {data.producer.location}</span>
                  </div>
                )}
                {data.batch && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Layers className="w-4 h-4 text-[#D49B37] shrink-0" />
                    <span className="font-mono">{data.batch.batchCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Détails techniques — repliés par défaut */}
            {data.analysis && (
              <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  className="w-full flex items-center justify-between p-4 text-sm font-bold text-[#0C261B]"
                >
                  <span className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#D49B37]" />
                    {t('auth:publicVerify.labResultsHeading')}
                  </span>
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showDetails && (
                  <div className="px-4 pb-4 space-y-2 text-sm border-t border-[#EAE1D2] pt-3">
                    <div className="flex justify-between text-gray-500">
                      <span>{t('auth:publicVerify.laboratoryLabel')}</span>
                      <span className="font-semibold text-[#0C261B]">{data.analysis.laboratory}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>{t('auth:publicVerify.analysisDateLabel')}</span>
                      <span className="font-semibold text-[#0C261B]">
                        {new Date(data.analysis.analysisDate).toLocaleDateString(dateLocale(i18n.language))}
                      </span>
                    </div>
                    {data.analysis.parameters?.map((param) => (
                      <div key={param.parameterKey} className="flex justify-between gap-3 text-gray-500">
                        <span>
                          {t(`auth:publicVerify.resultLabels.${param.parameterKey}`, {
                            defaultValue: param.parameterKey,
                          })}
                        </span>
                        <span className="font-semibold text-[#0C261B] text-right">
                          {param.value ?? '—'}
                          {param.unit ? ` ${param.unit}` : ''}
                          {param.reference ? (
                            <span className="block text-xs font-normal text-gray-400">
                              {t('auth:publicVerify.referenceLabel')} :{' '}
                              {/* Le référentiel stocke des libellés techniques
                                  (ex: NOT_DETECTED) : on les traduit avant
                                  affichage, sinon on garde la plage telle quelle. */}
                              {t(`auth:publicVerify.referenceValues.${param.reference}`, {
                                defaultValue: param.reference,
                              })}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ReportLabel identifier={data.qrId} />

            <div className="text-center">
              <a
                href={`${API_URL}/verify/${data.qrId}/image`}
                className="text-xs text-gray-400 hover:text-[#D49B37]"
              >
                {data.qrCode}
              </a>
            </div>
          </div>
        )}
      </main>
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
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-rose-700">
          <Flag className="w-3.5 h-3.5" />
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
            <input type="radio" name="report-reason" checked={reason === value} onChange={() => setReason(value)} className="accent-[#D49B37]" />
            {t(`auth:publicVerify.report.reasons.${value}`)}
          </label>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder={t('auth:publicVerify.report.commentPlaceholder')}
        className="w-full min-h-[70px] rounded-lg border border-[#EAE1D2] px-3 py-2 text-sm focus:outline-none focus:border-[#D49B37]"
      />
      {report.isError && <p className="text-xs text-rose-700">{t('auth:publicVerify.report.error')}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-gray-500">
          {t('auth:publicVerify.report.cancel')}
        </button>
        <button type="submit" disabled={report.isPending} className="px-4 py-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold disabled:opacity-50">
          {t('auth:publicVerify.report.submit')}
        </button>
      </div>
    </form>
  );
};
