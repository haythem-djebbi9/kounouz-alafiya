import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, X } from 'lucide-react';
import { useAdminRequestDetail, useUpdateRequestStatus } from '../hooks/useRequests';
import { Card, StatusBadge, Button, Alert } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';

export const RequestDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request, isLoading } = useAdminRequestDetail(id);
  const updateStatus = useUpdateRequestStatus();
  const [error, setError] = useState('');

  if (isLoading || !request) {
    return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;
  }

  const decide = async (status: 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED') => {
    setError('');
    try {
      await updateStatus.mutateAsync({ id: request.id, status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:requestDetail.updateError'));
    }
  };

  const sample = request.samples?.[0];

  return (
    <div className="max-w-2xl">
      <Link to="/admin/demandes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        {t('admin:requestDetail.backToRequests')}
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{request.honeyType}</h1>
        <StatusBadge kind="request" status={request.status} />
      </div>
      <p className="text-gray-500 mb-6">
        <Link to={`/admin/producteurs/${request.producerId}`} className="hover:text-[#D49B37] font-semibold">
          {request.producer?.name}
        </Link>{' '}
        · {request.producer?.farmName}
      </p>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6 space-y-2">
        {request.requestCode && <Row label={t('admin:requestDetail.requestCode')} value={request.requestCode} />}
        {request.preferredCollectionMethod && (
          <Row label={t('admin:requestDetail.preferredMethod')} value={t(`producer:collectionMethod.${request.preferredCollectionMethod}.title`)} />
        )}
        <Row label={t('admin:requestDetail.collectionLocation')} value={request.collectionLocation} />
        <Row label={t('admin:requestDetail.quantity')} value={`${request.quantity} ${t('admin:units.kg')}`} />
        {request.floralCategory && <Row label={t('admin:requestDetail.floralCategory')} value={t(`producer:floralCategory.${request.floralCategory}`)} />}
        {request.floralOrigin && <Row label={t('admin:requestDetail.floralOrigin')} value={request.floralOrigin} />}
        {request.productionSeason && (
          <Row
            label={t('admin:requestDetail.season')}
            value={`${t(`producer:honey.seasons.${request.productionSeason.split('_')[0]}`, { defaultValue: request.productionSeason })} ${request.productionSeason.split('_')[1] ?? ''}`}
          />
        )}
        {(request.harvestStartDate || request.harvestEndDate) && (
          <Row
            label={t('admin:requestDetail.harvest')}
            value={[request.harvestStartDate, request.harvestEndDate]
              .map((d) => (d ? new Date(d).toLocaleDateString(dateLocale(i18n.language)) : '—'))
              .join(' → ')}
          />
        )}
        {request.latitude != null && <Row label={t('admin:requestDetail.coordinates')} value={`${request.latitude}, ${request.longitude}`} />}
        {request.hivesCount != null && <Row label={t('admin:requestDetail.hives')} value={String(request.hivesCount)} />}
        {request.beekeepingMethod && (
          <Row label={t('admin:requestDetail.beekeepingMethod')} value={t(`producer:honey.methods.${request.beekeepingMethod}`, { defaultValue: request.beekeepingMethod })} />
        )}
        {request.hiveType && <Row label={t('admin:requestDetail.hiveType')} value={t(`producer:honey.hives.${request.hiveType}`, { defaultValue: request.hiveType })} />}
        {request.farmSize && <Row label={t('admin:requestDetail.farmSize')} value={request.farmSize} />}
        {request.description && <Row label={t('admin:requestDetail.description')} value={request.description} />}
        <Row label={t('admin:requestDetail.requestDate')} value={new Date(request.createdAt).toLocaleDateString(dateLocale(i18n.language))} />
      </Card>

      {(request.status === 'NEW' || request.status === 'IN_REVIEW') && (
        <div className="flex flex-wrap gap-3 mb-6">
          {request.status === 'NEW' && (
            <Button variant="outline" onClick={() => decide('IN_REVIEW')} isLoading={updateStatus.isPending}>
              {t('admin:requestDetail.setInReview')}
            </Button>
          )}
          <Button onClick={() => decide('ACCEPTED')} isLoading={updateStatus.isPending}>
            <Check className="w-4 h-4" />
            {t('admin:requestDetail.accept')}
          </Button>
          <Button variant="danger" onClick={() => decide('REJECTED')} isLoading={updateStatus.isPending}>
            <X className="w-4 h-4" />
            {t('admin:requestDetail.reject')}
          </Button>
        </div>
      )}

      {sample && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0C261B]">{t('admin:requestDetail.linkedSample')}</p>
              <p className="text-xs text-gray-400">{sample.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge kind="sample" status={sample.status} />
              <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/echantillons/${sample.id}`)}>
                {t('admin:requestDetail.view')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-sm text-gray-500 shrink-0">{label}</span>
    <span className="text-sm font-bold text-[#0C261B] text-end">{value}</span>
  </div>
);
