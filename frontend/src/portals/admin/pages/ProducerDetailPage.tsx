import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Eye, ShieldCheck, X } from 'lucide-react';
import { useProducer } from '../hooks/useProducers';
import { useAdminRequests } from '../hooks/useRequests';
import { useProducerDocuments, useReviewDocument, useUpdateProducerStatus } from '../hooks/useSales';
import { Card, Badge, StatusBadge, EmptyState, Button, Alert, Select } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import { openAuthorizedFile } from '../../producer/utils';
import type { DocumentStatus, ProducerDocument, ProducerStatus } from '../../producer/types';

const PRODUCER_STATUSES: ProducerStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
const DOCUMENT_TONE: Record<DocumentStatus, 'green' | 'gold' | 'red'> = {
  VERIFIED: 'green',
  PENDING_REVIEW: 'gold',
  REJECTED: 'red',
};

export const ProducerDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'producer', 'common']);
  const { id } = useParams<{ id: string }>();
  const { data: producer, isLoading } = useProducer(id);
  const { data: requests } = useAdminRequests();
  const { data: documents = [] } = useProducerDocuments(id);
  const updateStatus = useUpdateProducerStatus();
  const review = useReviewDocument();
  const [error, setError] = useState('');

  if (isLoading || !producer) {
    return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;
  }

  const producerRequests = (requests ?? []).filter((r) => r.producerId === producer.id);

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : t('common:status.error'));
    }
  };

  const reject = (doc: ProducerDocument) => {
    const note = window.prompt(t('admin:producerDetail.rejectReason'));
    if (note === null) return;
    void run(() => review.mutateAsync({ id: doc.id, status: 'REJECTED', note: note || undefined }));
  };

  return (
    <div className="max-w-3xl">
      <Link to="/admin/producteurs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        {t('admin:producerDetail.backToProducers')}
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{producer.name}</h1>
        {producer.isVerified && (
          <Badge tone="green" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            {t('admin:producers.verifiedBadge')}
          </Badge>
        )}
      </div>
      <p className="text-gray-500 mb-6">{producer.farmName} · {producer.location}</p>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6 grid sm:grid-cols-2 gap-4 items-end">
        <div className="space-y-1 text-sm">
          <p className="text-gray-500">{t('admin:producerDetail.contact')}</p>
          <p className="font-bold text-[#0C261B]">{producer.user?.email ?? '—'}</p>
          <p className="text-[#0C261B]">{producer.phone ?? '—'}</p>
          {producer.hivesCount != null && (
            <p className="text-gray-500">{t('admin:producerDetail.hives', { count: producer.hivesCount })}</p>
          )}
        </div>
        <Select
          label={t('admin:producerDetail.status')}
          value={producer.status ?? 'PENDING'}
          disabled={updateStatus.isPending}
          onChange={(e) => void run(() => updateStatus.mutateAsync({ id: producer.id, status: e.target.value as ProducerStatus }))}
        >
          {PRODUCER_STATUSES.map((status) => (
            <option key={status} value={status}>{t(`producer:producerStatus.${status}`)}</option>
          ))}
        </Select>
      </Card>

      {producer.description && (
        <Card className="mb-6 bg-[#FAF6EE]/60">
          <p className="text-sm text-gray-600">{producer.description}</p>
        </Card>
      )}

      <h2 className="font-bold text-[#0C261B] mb-3">{t('admin:producerDetail.documentsHeading')}</h2>
      {documents.length === 0 ? (
        <Card className="mb-6">
          <EmptyState title={t('admin:producerDetail.noDocuments')} />
        </Card>
      ) : (
        <div className="space-y-3 mb-6">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B]">{t(`producer:documents.types.${doc.type}.label`)}</p>
                <p className="text-xs text-gray-400 truncate">
                  {doc.fileName} · {new Date(doc.createdAt).toLocaleDateString(dateLocale(i18n.language))}
                </p>
                {doc.reviewNote && <p className="text-xs text-rose-600 mt-1">{doc.reviewNote}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={DOCUMENT_TONE[doc.status]}>{t(`producer:documents.status.${doc.status}`)}</Badge>
                <Button size="sm" variant="ghost" onClick={() => void run(() => openAuthorizedFile(`/producer-documents/${doc.id}/file`))}>
                  <Eye className="w-4 h-4" />
                  {t('admin:requestDetail.view')}
                </Button>
                {doc.status !== 'VERIFIED' && (
                  <Button size="sm" onClick={() => void run(() => review.mutateAsync({ id: doc.id, status: 'VERIFIED' }))} isLoading={review.isPending}>
                    <Check className="w-4 h-4" />
                    {t('admin:producerDetail.approve')}
                  </Button>
                )}
                {doc.status !== 'REJECTED' && (
                  <Button size="sm" variant="danger" onClick={() => reject(doc)} isLoading={review.isPending}>
                    <X className="w-4 h-4" />
                    {t('admin:producerDetail.reject')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-bold text-[#0C261B] mb-3">{t('admin:producerDetail.requestsHeading')}</h2>
      {producerRequests.length === 0 && (
        <Card>
          <EmptyState title={t('admin:producerDetail.noRequests')} />
        </Card>
      )}
      <div className="space-y-3">
        {producerRequests.map((req) => (
          <Link key={req.id} to={`/admin/demandes/${req.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">
                  {req.requestCode ? `${req.requestCode} · ` : ''}{req.honeyType}
                </p>
                <p className="text-xs text-gray-400">{req.collectionLocation}</p>
              </div>
              <StatusBadge kind="request" status={req.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
