import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Beaker,
  CheckCircle2,
  FileText,
  Images,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import {
  useAddRequestComment,
  useDeleteRequestComment,
  useReviewRequest,
  useVerifierRequest,
  useVerifierRequests,
  type RequestFilters,
} from '../hooks';
import { NEXT_STEP_KEY, REQUEST_STATUS_TONE } from '../status-map';
import { CollectionAssignmentPanel } from '../CollectionAssignmentPanel';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  LoadingBlock,
  PageHeader,
  Panel,
  Pagination,
  SearchBox,
  SelectInput,
  StatusPill,
  Stepper,
  Table,
  Tabs,
  Td,
  TextArea,
  Th,
} from '../ui';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { RequestTab, ReviewDecision } from '../types';

type DetailTab = 'overview' | 'documents' | 'samples' | 'history' | 'comments';

export const RequestReviewPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState<RequestFilters>({
    tab: 'ALL',
    search: '',
    sort: 'NEWEST',
    page: 1,
    pageSize: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(params.get('selected'));

  const list = useVerifierRequests(filters);
  const detail = useVerifierRequest(selectedId ?? undefined);

  // Sélectionne le premier dossier de la page tant que rien n'est choisi, pour
  // que le panneau de droite ne reste pas vide à l'arrivée.
  useEffect(() => {
    if (!selectedId && list.data && list.data.items.length > 0) {
      setSelectedId(list.data.items[0].id);
    }
  }, [list.data, selectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    setParams({ selected: id }, { replace: true });
  };

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const counts = list.data?.counts;
  const tabs: { key: RequestTab; label: string; count?: number }[] = [
    { key: 'ALL', label: t('verifier:tabs.all'), count: counts?.ALL },
    { key: 'UNDER_REVIEW', label: t('verifier:status.family.UNDER_REVIEW'), count: counts?.UNDER_REVIEW },
    { key: 'IN_LABORATORY', label: t('verifier:status.family.IN_LABORATORY'), count: counts?.IN_LABORATORY },
    { key: 'VERIFIED', label: t('verifier:status.family.VERIFIED'), count: counts?.VERIFIED },
    { key: 'REJECTED', label: t('verifier:status.family.REJECTED'), count: counts?.REJECTED },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:requests.title') }]} />
      <PageHeader title={t('verifier:requests.title')} subtitle={t('verifier:requests.subtitle')} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <Tabs
          tabs={tabs}
          active={filters.tab ?? 'ALL'}
          onChange={(tab) => setFilters((f) => ({ ...f, tab, page: 1 }))}
        />
        <div className="lg:ms-auto">
          <SelectInput
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as RequestFilters['sort'], page: 1 }))}
            className="w-auto text-xs"
          >
            <option value="NEWEST">{t('verifier:sort.newest')}</option>
            <option value="OLDEST">{t('verifier:sort.oldest')}</option>
            <option value="PRODUCER">{t('verifier:sort.producer')}</option>
          </SelectInput>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Liste */}
        <div className="xl:col-span-5">
          <Panel bodyClassName="p-0">
            <div className="p-3 border-b border-[#EAE1D2]">
              <SearchBox
                value={filters.search ?? ''}
                onChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
                placeholder={t('verifier:requests.searchPlaceholder')}
              />
            </div>

            {list.isLoading && <LoadingBlock label={t('common:status.loading')} />}

            {list.data && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('verifier:table.requestId')}</Th>
                      <Th>{t('verifier:table.producer')}</Th>
                      <Th>{t('verifier:table.honeyType')}</Th>
                      <Th>{t('verifier:table.submitted')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <EmptyBlock
                            title={t('verifier:requests.empty')}
                            description={t('verifier:requests.emptyHint')}
                          />
                        </td>
                      </tr>
                    )}
                    {list.data.items.map((request) => (
                      <tr
                        key={request.id}
                        onClick={() => select(request.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedId === request.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                        }`}
                      >
                        <Td className="font-mono text-xs font-bold text-[#0C261B]">
                          {request.requestCode ?? '—'}
                        </Td>
                        <Td className="text-xs text-[#0C261B]">{request.producer.name}</Td>
                        <Td className="text-xs text-gray-600">{request.honeyType}</Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(request.submittedAt ?? request.createdAt)}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={REQUEST_STATUS_TONE[request.status]}
                            label={t(`verifier:status.request.${request.status}`)}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Pagination
                  page={list.data.page}
                  pageCount={list.data.pageCount}
                  total={list.data.total}
                  pageSize={list.data.pageSize}
                  onChange={(page) => setFilters((f) => ({ ...f, page }))}
                  summary={(from, to, total) => t('verifier:pagination.summary', { from, to, total })}
                />
              </>
            )}
          </Panel>
        </div>

        {/* Détail */}
        <div className="xl:col-span-7">
          {!selectedId && (
            <Panel>
              <EmptyBlock
                title={t('verifier:requests.selectPrompt')}
                icon={<FileText className="w-8 h-8" />}
              />
            </Panel>
          )}
          {selectedId && detail.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}
          {detail.data && <RequestDetail key={detail.data.id} request={detail.data} />}
        </div>
      </div>
    </div>
  );
};

// --- Panneau de détail ----------------------------------------------------

const RequestDetail: React.FC<{ request: NonNullable<ReturnType<typeof useVerifierRequest>['data']> }> = ({
  request,
}) => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState<{ decision: ReviewDecision; message: string } | null>(null);
  const [comment, setComment] = useState('');

  const review = useReviewRequest();
  const addComment = useAddRequestComment();
  const deleteComment = useDeleteRequestComment();

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const canReview = ['NEW', 'IN_REVIEW', 'INFO_REQUESTED'].includes(request.status);

  const submitReview = async (decision: ReviewDecision, message?: string) => {
    setError('');
    try {
      await review.mutateAsync({ id: request.id, decision, message });
      setPrompt(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setError('');
    try {
      await addComment.mutateAsync({ id: request.id, body: comment.trim() });
      setComment('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const tabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: 'overview', label: t('verifier:detailTabs.overview') },
    { key: 'documents', label: t('verifier:detailTabs.documents'), count: request.documents.length },
    { key: 'samples', label: t('verifier:detailTabs.samples'), count: request.samples?.length ?? 0 },
    { key: 'history', label: t('verifier:detailTabs.history') },
    { key: 'comments', label: t('verifier:detailTabs.comments'), count: request.comments.length },
  ];

  return (
    <Panel bodyClassName="p-0">
      {/* En-tête du dossier */}
      <div className="p-4 border-b border-[#EAE1D2]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold text-[#0C261B] font-mono">{request.requestCode ?? '—'}</h2>
          <StatusPill
            tone={REQUEST_STATUS_TONE[request.status]}
            label={t(`verifier:status.request.${request.status}`)}
          />
          <span className="ms-auto text-xs text-gray-500">
            {formatDate(request.submittedAt ?? request.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{request.producer?.name}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-[#F1F3F0] px-2 py-0.5 text-[#0C261B]">
            <MapPin className="w-3 h-3" />
            {request.governorate ?? request.collectionLocation}
          </span>
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-[#FDF6E7] px-2 py-0.5 text-[#96661A]">
            {request.honeyType}
          </span>
        </div>
      </div>

      <div className="px-4 pt-2">
        <Tabs tabs={tabs} active={tab} onChange={setTab} variant="underline" />
      </div>

      <div className="p-4 space-y-4">
        {error && <InlineError message={error} />}
        <CollectionAssignmentPanel requestId={request.id} requestStatus={request.status} />

        {tab === 'overview' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoGroup
                title={t('verifier:requests.producerInfo')}
                icon={<User className="w-3.5 h-3.5" />}
                rows={[
                  { label: t('verifier:fields.name'), value: request.producer?.name },
                  { label: t('verifier:fields.region'), value: request.governorate ?? request.producer?.governorate },
                  { label: t('verifier:fields.farm'), value: request.producer?.farmName },
                  {
                    label: t('verifier:fields.phone'),
                    value: request.producer?.phone,
                    icon: <Phone className="w-3 h-3" />,
                  },
                ]}
              />
              <InfoGroup
                title={t('verifier:requests.batchInfo')}
                icon={<Beaker className="w-3.5 h-3.5" />}
                rows={[
                  { label: t('verifier:fields.batchNumber'), value: request.batchNumber },
                  {
                    label: t('verifier:fields.quantity'),
                    value: request.quantity ? `${request.quantity} kg` : undefined,
                  },
                  { label: t('verifier:fields.harvestDate'), value: formatDate(request.harvestStartDate) },
                  { label: t('verifier:fields.hives'), value: request.hivesCount?.toString() },
                ]}
              />
            </div>

            {request.description && (
              <p className="text-sm text-gray-600 bg-[#FAF6EE] rounded-lg p-3">{request.description}</p>
            )}

            {request.photos.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#0C261B] mb-2">
                  <Images className="w-3.5 h-3.5" />
                  {t('verifier:requests.photos', { count: request.photos.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {request.photos.slice(0, 4).map((photo) => (
                    <img
                      key={photo}
                      src={resolveFileUrl(photo)}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border border-[#EAE1D2]"
                    />
                  ))}
                </div>
              </div>
            )}

            {request.infoRequested && (
              <div className="rounded-lg border border-[#D8CCF2] bg-[#F1EDFB] p-3">
                <p className="text-xs font-bold text-[#5B3FA8]">{t('verifier:requests.infoRequested')}</p>
                <p className="text-sm text-[#5B3FA8] mt-0.5">{request.infoRequested}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-[#0C261B] mb-3">{t('verifier:requests.progress')}</p>
              <Stepper
                steps={request.progress.steps.map((step) => ({
                  label: t(`verifier:progress.${step.step}`),
                  state: step.state,
                }))}
                currentLabel={t('verifier:progress.current')}
              />
            </div>

            {canReview && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#EAE1D2]">
                {request.status === 'NEW' && (
                  <Btn
                    variant="secondary"
                    size="sm"
                    isLoading={review.isPending}
                    onClick={() => submitReview('START_REVIEW')}
                  >
                    {t('verifier:actions.startReview')}
                  </Btn>
                )}
                <Btn variant="danger" size="sm" onClick={() => setPrompt({ decision: 'REJECT', message: '' })}>
                  <XCircle className="w-3.5 h-3.5" />
                  {t('verifier:actions.reject')}
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => setPrompt({ decision: 'REQUEST_INFO', message: '' })}
                >
                  {t('verifier:actions.requestInfo')}
                </Btn>
                <Btn
                  variant="success"
                  size="sm"
                  className="ms-auto"
                  isLoading={review.isPending}
                  onClick={() => submitReview('APPROVE')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('verifier:actions.approveAndSend')}
                </Btn>
              </div>
            )}

            {prompt && (
              <div className="rounded-lg border border-[#EAE1D2] bg-[#FAF6EE] p-3 space-y-2">
                <Field
                  label={
                    prompt.decision === 'REJECT'
                      ? t('verifier:requests.rejectReason')
                      : t('verifier:requests.infoNeeded')
                  }
                  required
                  hint={t('verifier:requests.messageHint')}
                >
                  <TextArea
                    value={prompt.message}
                    onChange={(e) => setPrompt({ ...prompt, message: e.target.value })}
                    maxLength={2000}
                  />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Btn variant="ghost" size="sm" onClick={() => setPrompt(null)}>
                    {t('common:actions.cancel')}
                  </Btn>
                  <Btn
                    size="sm"
                    variant={prompt.decision === 'REJECT' ? 'danger' : 'primary'}
                    isLoading={review.isPending}
                    disabled={!prompt.message.trim()}
                    onClick={() => submitReview(prompt.decision, prompt.message)}
                  >
                    {t('common:actions.confirm')}
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'documents' && (
          <>
            {request.documents.length === 0 && (
              <EmptyBlock
                title={t('verifier:requests.noDocuments')}
                description={t('verifier:requests.noDocumentsHint')}
                icon={<FileText className="w-8 h-8" />}
              />
            )}
            <ul className="space-y-2">
              {request.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-[#EAE1D2] px-3 py-2"
                >
                  <FileText className="w-4 h-4 text-[#B42323] shrink-0" />
                  <span className="text-sm text-[#0C261B] truncate flex-1">{doc.fileName}</span>
                  <span className="text-xs text-gray-400">{(doc.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'samples' && (
          <>
            {(request.samples ?? []).length === 0 && (
              <EmptyBlock title={t('verifier:requests.noSamples')} icon={<Beaker className="w-8 h-8" />} />
            )}
            <ul className="space-y-2">
              {(request.samples ?? []).map((sample) => (
                <li
                  key={sample.id}
                  className="flex items-center gap-3 rounded-lg border border-[#EAE1D2] px-3 py-2"
                >
                  <span className="font-mono text-xs font-bold text-[#0C261B]">
                    {sample.sampleCode ?? sample.id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(sample.collectionDate)}</span>
                  <span className="ms-auto text-xs text-gray-600">{sample.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'history' && (
          <ul className="space-y-2.5">
            <HistoryRow
              label={t('verifier:history.submitted')}
              at={formatDate(request.submittedAt ?? request.createdAt)}
            />
            {request.reviewedAt && (
              <HistoryRow label={t('verifier:history.reviewed')} at={formatDate(request.reviewedAt)} />
            )}
            {request.assignedTo && (
              <HistoryRow label={t('verifier:history.assigned')} at={request.assignedTo.name} />
            )}
          </ul>
        )}

        {tab === 'comments' && (
          <>
            <ul className="space-y-2.5">
              {request.comments.length === 0 && (
                <EmptyBlock
                  title={t('verifier:requests.noComments')}
                  icon={<MessageSquare className="w-8 h-8" />}
                />
              )}
              {request.comments.map((item) => (
                <li key={item.id} className="rounded-lg bg-[#FAF6EE] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0C261B]">{item.author.name}</span>
                    <span className="text-[11px] text-gray-400">{formatDateTime(item.createdAt)}</span>
                    <button
                      onClick={() => deleteComment.mutate(item.id)}
                      className="ms-auto p-1 rounded text-gray-400 hover:text-[#B42323]"
                      aria-label={t('common:actions.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{item.body}</p>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 items-end">
              <TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('verifier:requests.commentPlaceholder')}
                className="min-h-[60px]"
              />
              <Btn size="sm" isLoading={addComment.isPending} disabled={!comment.trim()} onClick={submitComment}>
                <Send className="w-3.5 h-3.5" />
              </Btn>
            </div>
            <p className="text-[11px] text-gray-400">{t('verifier:requests.commentsInternal')}</p>
          </>
        )}
      </div>
    </Panel>
  );
};

const InfoGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  rows: { label: string; value?: string | null; icon?: React.ReactNode }[];
}> = ({ title, icon, rows }) => (
  <div className="rounded-lg border border-[#EAE1D2] p-3">
    <p className="flex items-center gap-1.5 text-xs font-bold text-[#0C261B] mb-2">
      {icon}
      {title}
    </p>
    <dl className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
          <dt className="text-gray-500 flex items-center gap-1">
            {row.icon}
            {row.label}
          </dt>
          <dd className="text-[#0C261B] font-semibold text-end truncate">{row.value || '—'}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const HistoryRow: React.FC<{ label: string; at: string }> = ({ label, at }) => (
  <li className="flex items-center gap-3 text-sm">
    <span className="w-2 h-2 rounded-full bg-[#D49B37] shrink-0" />
    <span className="text-[#0C261B]">{label}</span>
    <span className="ms-auto text-xs text-gray-500">{at}</span>
  </li>
);
