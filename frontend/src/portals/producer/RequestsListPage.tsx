import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock3, Eye, FileCheck2, FilePen, FileText, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useDeleteDraft, useMyRequests } from './hooks';
import { PAGE_SIZE } from './constants';
import {
  ActionMenu,
  BtnLink,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
} from './ui';
import { STAGE_TONE, formatDate, formatNumber, requestLabel, requestStage } from './utils';
import type { RequestStage } from './utils';

const STAGES: RequestStage[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'COLLECTION_SCHEDULED',
  'SAMPLE_COLLECTED',
  'UNDER_ANALYSIS',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'NOT_VERIFIED',
  'REJECTED',
];

export const RequestsListPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const navigate = useNavigate();
  const { data: requests = [], isLoading, isError } = useMyRequests();
  const deleteDraft = useDeleteDraft();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<RequestStage | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .map((request) => ({ request, stage: requestStage(request) }))
      .filter(({ request, stage }) => {
        if (stageFilter !== 'ALL' && stage !== stageFilter) return false;
        if (!q) return true;
        return [request.requestCode, request.honeyType, request.collectionLocation].some((v) => v?.toLowerCase().includes(q));
      });
  }, [requests, search, stageFilter]);

  const count = (predicate: (stage: RequestStage) => boolean) => requests.filter((r) => predicate(requestStage(r))).length;
  const inProgress = count((s) => !['DRAFT', 'VERIFIED', 'NOT_VERIFIED', 'REJECTED'].includes(s));

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('producer:requests.confirmDeleteDraft'))) return;
    await deleteDraft.mutateAsync(id);
    setNotice(t('producer:requests.draftDeleted'));
  };

  return (
    <div>
      <PageHeader
        title={t('producer:requests.title')}
        subtitle={t('producer:requests.subtitle')}
        breadcrumb={[{ label: t('producer:nav.dashboard'), to: '/producteur' }, { label: t('producer:nav.requests') }]}
        actions={
          <BtnLink to="/producteur/demandes/nouvelle">
            <Plus className="w-4 h-4" />
            {t('producer:dashboard.newRequest')}
          </BtnLink>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard tone="blue" icon={<FileText className="w-5 h-5" />} label={t('producer:requests.stats.total')} value={formatNumber(requests.filter((r) => r.status !== 'DRAFT').length, lang)} />
        <StatCard tone="gold" icon={<Clock3 className="w-5 h-5" />} label={t('producer:requests.stats.inProgress')} value={formatNumber(inProgress, lang)} />
        <StatCard tone="green" icon={<ShieldCheck className="w-5 h-5" />} label={t('producer:requests.stats.verified')} value={formatNumber(count((s) => s === 'VERIFIED'), lang)} />
        <StatCard tone="gray" icon={<FilePen className="w-5 h-5" />} label={t('producer:requests.stats.drafts')} value={formatNumber(count((s) => s === 'DRAFT'), lang)} />
      </div>

      {notice && <Notice tone="success" onClose={() => setNotice(null)} className="mb-4">{notice}</Notice>}

      <Panel bodyClassName="p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={t('producer:requests.searchPlaceholder')}
            className="flex-1"
          />
          <SelectInput
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value as RequestStage | 'ALL');
              setPage(1);
            }}
            className="md:w-60"
            aria-label={t('producer:requests.cols.status')}
          >
            <option value="ALL">{t('producer:common.allStatuses')}</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {t(`producer:stage.${stage}`)}
              </option>
            ))}
          </SelectInput>
        </div>

        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock />}
        {!isLoading && !isError && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('producer:requests.cols.id')}</Th>
                  <Th>{t('producer:requests.cols.honeyType')}</Th>
                  <Th>{t('producer:requests.cols.quantity')}</Th>
                  <Th>{t('producer:requests.cols.location')}</Th>
                  <Th>{t('producer:requests.cols.method')}</Th>
                  <Th>{t('producer:requests.cols.submitted')}</Th>
                  <Th>{t('producer:requests.cols.status')}</Th>
                  <Th className="text-end">{t('producer:common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={8} message={requests.length === 0 ? t('producer:requests.empty') : t('producer:common.noResults')} />
                )}
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ request, stage }) => {
                  const isDraft = request.status === 'DRAFT';
                  const to = isDraft ? `/producteur/demandes/${request.id}/modifier` : `/producteur/demandes/${request.id}`;
                  return (
                    <tr key={request.id} className="hover:bg-[#FAFBF9]">
                      <Td>
                        <Link to={to} className="font-semibold text-[#1F4FA3] hover:underline whitespace-nowrap">
                          {requestLabel(request, t)}
                        </Link>
                      </Td>
                      <Td className="font-semibold text-[#14215B]">{request.honeyType || '—'}</Td>
                      <Td className="whitespace-nowrap">
                        {Number(request.quantity) > 0 ? t('producer:common.kg', { value: formatNumber(Number(request.quantity), lang, 1) }) : '—'}
                      </Td>
                      <Td>{request.collectionLocation || '—'}</Td>
                      <Td className="whitespace-nowrap">
                        {request.preferredCollectionMethod ? t(`producer:collectionMethod.${request.preferredCollectionMethod}.short`) : '—'}
                      </Td>
                      <Td className="whitespace-nowrap">{isDraft ? '—' : formatDate(request.submittedAt ?? request.createdAt, lang)}</Td>
                      <Td>
                        <ToneBadge tone={STAGE_TONE[stage]}>{t(`producer:stage.${stage}`)}</ToneBadge>
                      </Td>
                      <Td className="text-end">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={to}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#E4E9F1] whitespace-nowrap"
                          >
                            {isDraft ? <FilePen className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {isDraft ? t('producer:requests.continueDraft') : t('producer:common.view')}
                          </Link>
                          <ActionMenu
                            actions={[
                              isDraft
                                ? { label: t('producer:requests.deleteDraft'), icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => void handleDelete(request.id) }
                                : { label: t('producer:requests.trackProgress'), icon: <FileCheck2 className="w-4 h-4" />, onClick: () => navigate(to) },
                            ]}
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onChange={setPage}
              summary={(from, to, total) => t('producer:common.showing', { from, to, total })}
            />
          </>
        )}
      </Panel>
    </div>
  );
};
