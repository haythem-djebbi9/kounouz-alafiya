import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Leaf, MapPin, Pencil, Plus, Power, Star } from 'lucide-react';
import {
  useReferenceHoneys,
  useSaveReferenceHoney,
  useSetReferenceHoneyActive,
  type ReferenceHoneyFilters,
  type ReferenceHoneyInput,
} from '../hooks';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  SelectInput,
  StatusPill,
  Table,
  Tabs,
  Td,
  TextArea,
  TextInput,
  Th,
} from '../ui';
import { Modal } from '../../../design-system';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { ReferenceHoney } from '../types';

type Facet = 'ALL' | 'honeyType' | 'region' | 'harvestSeason';
type DetailTab = 'details' | 'analysis' | 'photos';

export const ReferenceSamplesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [facet, setFacet] = useState<Facet>('ALL');
  const [filters, setFilters] = useState<ReferenceHoneyFilters>({
    search: '',
    sort: 'NEWEST',
    page: 1,
    pageSize: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReferenceHoney | 'new' | null>(null);

  const list = useReferenceHoneys(filters);
  const setActive = useSetReferenceHoneyActive();

  useEffect(() => {
    if (!selectedId && list.data && list.data.items.length > 0) {
      setSelectedId(list.data.items[0].id);
    }
  }, [list.data, selectedId]);

  const selected = list.data?.items.find((item) => item.id === selectedId) ?? null;
  const stats = list.data?.stats;
  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // Les facettes ne filtrent pas à elles seules : elles ouvrent la liste de
  // valeurs correspondante, que l'on applique ensuite comme filtre.
  const facetValues =
    facet === 'ALL' || !stats ? [] : stats.facets[facet as keyof typeof stats.facets];

  const applyFacet = (value: string) => {
    setFilters((f) => ({
      ...f,
      honeyType: facet === 'honeyType' ? value : undefined,
      region: facet === 'region' ? value : undefined,
      harvestSeason: facet === 'harvestSeason' ? value : undefined,
      page: 1,
    }));
  };

  const activeFacetValue =
    facet === 'honeyType'
      ? filters.honeyType
      : facet === 'region'
        ? filters.region
        : facet === 'harvestSeason'
          ? filters.harvestSeason
          : undefined;

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:reference.title') }]} />
      <PageHeader
        title={t('verifier:reference.title')}
        subtitle={t('verifier:reference.subtitle')}
        actions={
          <Btn onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" />
            {t('verifier:actions.addReference')}
          </Btn>
        }
      />

      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
          <KpiCard
            label={t('verifier:reference.kpi.total')}
            value={stats.total}
            icon={<Database className="w-4 h-4" />}
          />
          <KpiCard
            label={t('verifier:reference.kpi.honeyTypes')}
            value={stats.honeyTypes}
            icon={<Leaf className="w-4 h-4" />}
            tone="green"
          />
          <KpiCard
            label={t('verifier:reference.kpi.regions')}
            value={stats.regions}
            icon={<MapPin className="w-4 h-4" />}
            tone="blue"
          />
          <KpiCard
            label={t('verifier:reference.kpi.active')}
            value={stats.active}
            icon={<Star className="w-4 h-4" />}
            tone="amber"
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <Tabs
          tabs={[
            { key: 'ALL' as Facet, label: t('verifier:tabs.all'), count: stats?.total },
            { key: 'honeyType' as Facet, label: t('verifier:reference.byHoneyType') },
            { key: 'region' as Facet, label: t('verifier:reference.byRegion') },
            { key: 'harvestSeason' as Facet, label: t('verifier:reference.bySeason') },
          ]}
          active={facet}
          onChange={(next) => {
            setFacet(next);
            if (next === 'ALL') {
              setFilters((f) => ({
                ...f,
                honeyType: undefined,
                region: undefined,
                harvestSeason: undefined,
                page: 1,
              }));
            }
          }}
        />
        <div className="lg:ms-auto">
          <SelectInput
            value={filters.sort}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value as ReferenceHoneyFilters['sort'], page: 1 }))
            }
            className="w-auto text-xs"
          >
            <option value="NEWEST">{t('verifier:sort.newest')}</option>
            <option value="OLDEST">{t('verifier:sort.oldest')}</option>
            <option value="CODE">{t('verifier:sort.code')}</option>
          </SelectInput>
        </div>
      </div>

      {facetValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {facetValues.map((value) => (
            <button
              key={value.value}
              onClick={() => applyFacet(activeFacetValue === value.value ? '' : value.value)}
              className={`text-xs rounded-full border px-2.5 py-1 font-semibold transition-colors ${
                activeFacetValue === value.value
                  ? 'bg-[#0C261B] text-white border-[#0C261B]'
                  : 'bg-white text-[#0C261B] border-[#EAE1D2] hover:border-[#D49B37]'
              }`}
            >
              {value.value}
              <span className="ms-1.5 opacity-60 tabular-nums">{value.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel bodyClassName="p-0">
            <div className="p-3 border-b border-[#EAE1D2]">
              <SearchBox
                value={filters.search ?? ''}
                onChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
                placeholder={t('verifier:reference.searchPlaceholder')}
              />
            </div>

            {list.isLoading && <LoadingBlock label={t('common:status.loading')} />}

            {list.data && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('verifier:table.sampleCode')}</Th>
                      <Th>{t('verifier:table.honeyType')}</Th>
                      <Th>{t('verifier:table.region')}</Th>
                      <Th>{t('verifier:table.harvestSeason')}</Th>
                      <Th>{t('verifier:table.addedDate')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyBlock
                            title={t('verifier:reference.empty')}
                            action={
                              <Btn size="sm" onClick={() => setEditing('new')}>
                                <Plus className="w-3.5 h-3.5" />
                                {t('verifier:actions.addReference')}
                              </Btn>
                            }
                          />
                        </td>
                      </tr>
                    )}
                    {list.data.items.map((honey) => (
                      <tr
                        key={honey.id}
                        onClick={() => setSelectedId(honey.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedId === honey.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                        }`}
                      >
                        <Td className="font-mono text-xs font-bold text-[#0C261B]">{honey.code}</Td>
                        <Td className="text-xs text-[#0C261B]">{honey.honeyType}</Td>
                        <Td className="text-xs text-gray-600">{honey.region}</Td>
                        <Td className="text-xs text-gray-600">{honey.harvestSeason}</Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(honey.createdAt)}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={honey.isActive ? 'green' : 'neutral'}
                            label={
                              honey.isActive
                                ? t('verifier:reference.active')
                                : t('verifier:reference.inactive')
                            }
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

        <div className="xl:col-span-5">
          {!selected && (
            <Panel>
              <EmptyBlock title={t('verifier:reference.selectPrompt')} icon={<Database className="w-8 h-8" />} />
            </Panel>
          )}
          {selected && (
            <ReferenceDetail
              honey={selected}
              onEdit={() => setEditing(selected)}
              onToggleActive={() =>
                setActive.mutate({ id: selected.id, isActive: !selected.isActive })
              }
              isToggling={setActive.isPending}
              formatDate={formatDate}
            />
          )}
        </div>
      </div>

      {editing && (
        <ReferenceFormModal
          honey={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

// --- Détail étalon ---------------------------------------------------------

const ReferenceDetail: React.FC<{
  honey: ReferenceHoney;
  onEdit: () => void;
  onToggleActive: () => void;
  isToggling: boolean;
  formatDate: (value: string | null) => string;
}> = ({ honey, onEdit, onToggleActive, isToggling, formatDate }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const [tab, setTab] = useState<DetailTab>('details');

  const analysisEntries = Object.entries(honey.analysisResults ?? {});

  return (
    <Panel bodyClassName="p-0">
      <div className="p-4 border-b border-[#EAE1D2]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold text-[#0C261B] font-mono">{honey.code}</h2>
          <StatusPill
            tone={honey.isActive ? 'green' : 'neutral'}
            label={honey.isActive ? t('verifier:reference.active') : t('verifier:reference.inactive')}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">{honey.honeyType}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {honey.region}
          </span>
          <span className="inline-flex items-center gap-1">
            <Leaf className="w-3 h-3" />
            {honey.harvestSeason}
          </span>
        </div>
      </div>

      <div className="px-4 pt-2">
        <Tabs
          tabs={[
            { key: 'details' as DetailTab, label: t('verifier:detailTabs.details') },
            { key: 'analysis' as DetailTab, label: t('verifier:detailTabs.analysisResults') },
            { key: 'photos' as DetailTab, label: t('verifier:detailTabs.photos'), count: honey.photos.length },
          ]}
          active={tab}
          onChange={setTab}
          variant="underline"
        />
      </div>

      <div className="p-4 space-y-4">
        {tab === 'details' && (
          <dl className="space-y-1.5 text-xs">
            <DetailRow label={t('verifier:fields.honeyType')} value={honey.honeyType} />
            <DetailRow label={t('verifier:fields.region')} value={honey.region} />
            <DetailRow label={t('verifier:fields.harvestSeason')} value={honey.harvestSeason} />
            <DetailRow label={t('verifier:fields.collectionDate')} value={formatDate(honey.collectionDate)} />
            <DetailRow label={t('verifier:fields.color')} value={honey.color} />
            <DetailRow label={t('verifier:fields.texture')} value={honey.texture} />
            <DetailRow label={t('verifier:fields.floralSource')} value={honey.floralSource} />
            {honey.notes && (
              <p className="text-xs text-gray-600 bg-[#FAF6EE] rounded-lg p-2.5 mt-2">{honey.notes}</p>
            )}
          </dl>
        )}

        {tab === 'analysis' && (
          <>
            {analysisEntries.length === 0 && <EmptyBlock title={t('verifier:reference.noAnalysis')} />}
            <dl className="space-y-1.5 text-xs">
              {analysisEntries.map(([key, value]) => (
                <DetailRow key={key} label={t(`verifier:parameters.${key}`)} value={String(value)} />
              ))}
            </dl>
          </>
        )}

        {tab === 'photos' && (
          <>
            {honey.photos.length === 0 && <EmptyBlock title={t('verifier:reference.noPhotos')} />}
            <div className="grid grid-cols-3 gap-2">
              {honey.photos.map((photo) => (
                <img
                  key={photo}
                  src={resolveFileUrl(photo)}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover border border-[#EAE1D2]"
                />
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-3 border-t border-[#EAE1D2]">
          <Btn variant="secondary" size="sm" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
            {t('verifier:actions.editReference')}
          </Btn>
          <Btn
            variant={honey.isActive ? 'danger' : 'success'}
            size="sm"
            className="ms-auto"
            isLoading={isToggling}
            onClick={onToggleActive}
          >
            <Power className="w-3.5 h-3.5" />
            {honey.isActive ? t('verifier:actions.deactivate') : t('verifier:actions.activate')}
          </Btn>
        </div>
      </div>
    </Panel>
  );
};

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-[#0C261B] font-semibold text-end truncate">{value || '—'}</dd>
  </div>
);

// --- Formulaire ------------------------------------------------------------

const ReferenceFormModal: React.FC<{ honey: ReferenceHoney | null; onClose: () => void }> = ({
  honey,
  onClose,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const save = useSaveReferenceHoney();
  const [error, setError] = useState('');
  const [form, setForm] = useState<ReferenceHoneyInput>({
    honeyType: honey?.honeyType ?? '',
    region: honey?.region ?? '',
    harvestSeason: honey?.harvestSeason ?? '',
    collectionDate: honey?.collectionDate?.slice(0, 10) ?? '',
    color: honey?.color ?? '',
    texture: honey?.texture ?? '',
    floralSource: honey?.floralSource ?? '',
    notes: honey?.notes ?? '',
  });

  const update =
    (field: keyof ReferenceHoneyInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await save.mutateAsync({
        id: honey?.id,
        input: {
          ...form,
          collectionDate: form.collectionDate ? new Date(form.collectionDate).toISOString() : undefined,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={honey ? t('verifier:actions.editReference') : t('verifier:actions.addReference')}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-3">
        {error && <InlineError message={error} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('verifier:fields.honeyType')} required>
            <TextInput value={form.honeyType} onChange={update('honeyType')} required minLength={2} />
          </Field>
          <Field label={t('verifier:fields.region')} required>
            <TextInput value={form.region} onChange={update('region')} required minLength={2} />
          </Field>
          <Field label={t('verifier:fields.harvestSeason')} required>
            <TextInput
              value={form.harvestSeason}
              onChange={update('harvestSeason')}
              required
              minLength={2}
              placeholder={t('verifier:reference.seasonPlaceholder')}
            />
          </Field>
          <Field label={t('verifier:fields.collectionDate')}>
            <TextInput type="date" value={form.collectionDate} onChange={update('collectionDate')} />
          </Field>
          <Field label={t('verifier:fields.color')}>
            <TextInput value={form.color} onChange={update('color')} />
          </Field>
          <Field label={t('verifier:fields.texture')}>
            <TextInput value={form.texture} onChange={update('texture')} />
          </Field>
        </div>

        <Field label={t('verifier:fields.floralSource')} hint={t('verifier:reference.floralHint')}>
          <TextInput value={form.floralSource} onChange={update('floralSource')} />
        </Field>

        <Field label={t('verifier:fields.notes')}>
          <TextArea value={form.notes} onChange={update('notes')} maxLength={2000} />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Btn>
          <Btn type="submit" isLoading={save.isPending}>
            {t('common:actions.save')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};
