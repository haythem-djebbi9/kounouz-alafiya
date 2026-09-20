import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, ExternalLink, FileText, LayoutGrid, Leaf, List, Package, PauseCircle, PackageOpen, QrCode } from 'lucide-react';
import { Modal, QRCodeDisplay } from '../../design-system';
import { resolveFileUrl } from '../../lib/api';
import type { ProductStatut } from '../../lib/api-types';
import { useMyProducts } from './hooks';
import { PAGE_SIZE } from './constants';
import {
  ActionMenu,
  BtnLink,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  NAVY,
  PageHeader,
  Pagination,
  Panel,
  ProductThumb,
  SearchBox,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
} from './ui';
import { formatDate, formatMoney, formatNumber } from './utils';
import type { Tone } from './utils';
import type { ProducerProduct } from './types';

// Regroupement des statuts catalogue pour la vue producteur.
type ProductGroup = 'ACTIVE' | 'PENDING' | 'INACTIVE';
const GROUP_OF: Record<ProductStatut, ProductGroup> = {
  PUBLIE: 'ACTIVE',
  BROUILLON: 'PENDING',
  RUPTURE: 'INACTIVE',
  SUSPENDU: 'INACTIVE',
  ARCHIVE: 'INACTIVE',
};
export const PRODUCT_TONE: Record<ProductStatut, Tone> = {
  PUBLIE: 'green',
  BROUILLON: 'gold',
  RUPTURE: 'red',
  SUSPENDU: 'red',
  ARCHIVE: 'gray',
};

type SortKey = 'NEWEST' | 'OLDEST' | 'NAME' | 'STOCK' | 'SALES';

export const ProductsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const navigate = useNavigate();
  const { data: products = [], isLoading, isError } = useMyProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [honeyType, setHoneyType] = useState('ALL');
  const [group, setGroup] = useState<ProductGroup | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortKey>('NEWEST');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);

  const selected = products.find((p) => p.id === searchParams.get('produit')) ?? null;
  const honeyTypes = [...new Set(products.map((p) => p.batch?.honeyType).filter(Boolean))] as string[];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (group !== 'ALL' && GROUP_OF[p.statut] !== group) return false;
      if (honeyType !== 'ALL' && p.batch?.honeyType !== honeyType) return false;
      if (!q) return true;
      return [p.nom, p.batch?.batchCode, p.qrCode?.qrCode, p.categorie.nom].some((v) => v?.toLowerCase().includes(q));
    });
    const sorters: Record<SortKey, (a: ProducerProduct, b: ProducerProduct) => number> = {
      NEWEST: (a, b) => b.createdAt.localeCompare(a.createdAt),
      OLDEST: (a, b) => a.createdAt.localeCompare(b.createdAt),
      NAME: (a, b) => a.nom.localeCompare(b.nom),
      STOCK: (a, b) => b.stock - a.stock,
      SALES: (a, b) => b.unitsSold - a.unitsSold,
    };
    return [...filtered].sort(sorters[sort]);
  }, [products, search, group, honeyType, sort]);

  const countGroup = (g: ProductGroup) => products.filter((p) => GROUP_OF[p.statut] === g).length;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetPage = () => setPage(1);

  const statusLabel = (p: ProducerProduct) => t(`producer:productStatus.${p.statut}`);

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
        <PageHeader title={t('producer:products.title')} subtitle={t('producer:products.subtitle')} />
        <div className="flex flex-col sm:flex-row gap-3 xl:mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-[#DCEDE2] bg-[#F1F8F3] px-4 py-2.5 max-w-sm">
            <span className="w-8 h-8 rounded-full bg-[#DDEFE3] text-[#17693F] flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4" />
            </span>
            <p className="text-xs text-[#27315F]">{t('producer:products.createdByKounouz')}</p>
          </div>
          <BtnLink to="/producteur/demandes/nouvelle">
            <FileText className="w-4 h-4" />
            {t('producer:products.requestVerification')}
          </BtnLink>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard tone="green" icon={<Package className="w-5 h-5" />} label={t('producer:products.stats.total')} value={formatNumber(products.length, lang)} hint={t('producer:products.stats.totalHint')} />
        <StatCard tone="gold" icon={<CheckCircle2 className="w-5 h-5" />} label={t('producer:products.stats.active')} value={formatNumber(countGroup('ACTIVE'), lang)} hint={t('producer:products.stats.activeHint')} />
        <StatCard tone="blue" icon={<Clock className="w-5 h-5" />} label={t('producer:products.stats.pending')} value={formatNumber(countGroup('PENDING'), lang)} hint={t('producer:products.stats.pendingHint')} />
        <StatCard tone="red" icon={<PauseCircle className="w-5 h-5" />} label={t('producer:products.stats.inactive')} value={formatNumber(countGroup('INACTIVE'), lang)} hint={t('producer:products.stats.inactiveHint')} />
      </div>

      <Panel bodyClassName="p-4">
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); resetPage(); }} placeholder={t('producer:products.searchPlaceholder')} className="flex-1" />
          <SelectInput value={honeyType} onChange={(e) => { setHoneyType(e.target.value); resetPage(); }} className="lg:w-48" aria-label={t('producer:products.cols.honeyType')}>
            <option value="ALL">{t('producer:products.allHoneyTypes')}</option>
            {honeyTypes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </SelectInput>
          <SelectInput value={group} onChange={(e) => { setGroup(e.target.value as ProductGroup | 'ALL'); resetPage(); }} className="lg:w-44" aria-label={t('producer:products.cols.status')}>
            <option value="ALL">{t('producer:common.allStatuses')}</option>
            {(['ACTIVE', 'PENDING', 'INACTIVE'] as ProductGroup[]).map((g) => (
              <option key={g} value={g}>{t(`producer:products.groups.${g}`)}</option>
            ))}
          </SelectInput>
          <SelectInput value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="lg:w-44" aria-label={t('producer:products.sort.label')}>
            {(['NEWEST', 'OLDEST', 'NAME', 'STOCK', 'SALES'] as SortKey[]).map((s) => (
              <option key={s} value={s}>{t(`producer:products.sort.${s}`)}</option>
            ))}
          </SelectInput>
          <div className="flex rounded-lg border border-[#D5DAD4] overflow-hidden shrink-0 self-start">
            {(['list', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`w-11 h-[42px] flex items-center justify-center ${view === mode ? 'bg-[#E6F0FB] text-[#14215B]' : 'bg-white text-gray-500 hover:bg-[#F6F7F5]'}`}
                aria-label={t(`producer:products.view.${mode}`)}
                aria-pressed={view === mode}
              >
                {mode === 'list' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock />}
        {!isLoading && !isError && view === 'list' && (
          <Table>
            <thead>
              <tr>
                <Th>{t('producer:products.cols.product')}</Th>
                <Th>{t('producer:products.cols.honeyType')}</Th>
                <Th>{t('producer:products.cols.package')}</Th>
                <Th>{t('producer:products.cols.price')}</Th>
                <Th>{t('producer:products.cols.stock')}</Th>
                <Th>{t('producer:products.cols.sales')}</Th>
                <Th>{t('producer:products.cols.status')}</Th>
                <Th>{t('producer:products.cols.batch')}</Th>
                <Th>{t('producer:products.cols.added')}</Th>
                <Th className="text-end">{t('producer:common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={10} message={products.length === 0 ? t('producer:products.empty') : t('producer:common.noResults')} />}
              {pageRows.map((product) => (
                <tr key={product.id} className="hover:bg-[#FAFBF9]">
                  <Td>
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <ProductThumb src={product.images[0] ? resolveFileUrl(product.images[0]) : undefined} alt={product.nom} size={44} />
                      <div className="min-w-0">
                        <p className="font-bold text-[#14215B] truncate">{product.nom}</p>
                        <p className="text-xs text-gray-500 truncate">{product.batch?.verification.request.collectionLocation ?? product.categorie.nom}</p>
                        {product.gamme && <ToneBadge tone="green" className="mt-1 !py-0.5 !text-[10px]">{product.gamme}</ToneBadge>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {product.batch?.verification.request.floralCategory ? (
                      <ToneBadge tone={product.batch.verification.request.floralCategory === 'MONOFLORAL' ? 'green' : 'blue'}>
                        {t(`producer:floralCategory.${product.batch.verification.request.floralCategory}`)}
                      </ToneBadge>
                    ) : (
                      <span className="text-sm">{product.batch?.honeyType ?? '—'}</span>
                    )}
                  </Td>
                  <Td>
                    {product.packaging ? (
                      <span className="inline-block rounded-md border border-[#E1E5DF] bg-[#F6F7F5] px-2 py-0.5 text-xs font-semibold whitespace-nowrap">{product.packaging.size}</span>
                    ) : '—'}
                  </Td>
                  <Td className="whitespace-nowrap">{formatMoney(Number(product.prix), lang, t, 2)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-semibold text-[#14215B]">{formatNumber(product.stock, lang)}</span>
                    <span className="block text-xs text-gray-500">{t('producer:common.units')}</span>
                  </Td>
                  <Td className="font-semibold">{formatNumber(product.unitsSold, lang)}</Td>
                  <Td>
                    <ToneBadge tone={PRODUCT_TONE[product.statut]}>{statusLabel(product)}</ToneBadge>
                  </Td>
                  <Td>
                    {product.batch ? (
                      <Link to={`/producteur/lots?lot=${product.batch.id}`} className="flex flex-col">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#1F4FA3] hover:underline">
                          {product.batch.batchCode}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                        <span className={`text-[11px] font-semibold ${product.batch.verification.status === 'VERIFIED' ? 'text-[#17693F]' : 'text-[#A56A0B]'}`}>
                          {t(`producer:verificationStatus.${product.batch.verification.status}`)}
                        </span>
                      </Link>
                    ) : '—'}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(product.createdAt, lang)}</Td>
                  <Td className="text-end">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setSearchParams({ produit: product.id })}
                        className="rounded-md bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#E4E9F1] whitespace-nowrap"
                      >
                        {t('producer:products.viewProduct')}
                      </button>
                      <ActionMenu
                        actions={[
                          ...(product.qrCode
                            ? [{ label: t('producer:products.openVerification'), icon: <QrCode className="w-4 h-4" />, onClick: () => window.open(`/verify/${product.qrCode!.qrId}`, '_blank') }]
                            : []),
                          ...(product.batch
                            ? [{ label: t('producer:products.viewBatch'), icon: <PackageOpen className="w-4 h-4" />, onClick: () => navigate(`/producteur/lots?lot=${product.batch!.id}`) }]
                            : []),
                          { label: t('producer:products.viewSales'), icon: <FileText className="w-4 h-4" />, onClick: () => navigate(`/producteur/ventes/historique?produit=${product.id}`) },
                        ]}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {!isLoading && !isError && view === 'grid' && (
          <>
            {rows.length === 0 && <p className="py-10 text-center text-sm text-gray-500">{products.length === 0 ? t('producer:products.empty') : t('producer:common.noResults')}</p>}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {pageRows.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSearchParams({ produit: product.id })}
                  className="text-start rounded-xl border border-[#E6E8E3] bg-white hover:border-[#0B4A2F] transition-colors overflow-hidden"
                >
                  <div className="h-36 bg-[#FBF3E2]">
                    {product.images[0] && <img src={resolveFileUrl(product.images[0])} alt={product.nom} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold ${NAVY}`}>{product.nom}</p>
                      <ToneBadge tone={PRODUCT_TONE[product.statut]}>{statusLabel(product)}</ToneBadge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{product.batch?.batchCode} · {product.packaging?.size ?? '—'}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="rounded-md bg-[#F6F7F5] py-2">
                        <p className="text-[11px] text-gray-500">{t('producer:products.cols.price')}</p>
                        <p className="text-sm font-bold text-[#14215B]">{formatNumber(Number(product.prix), lang, 2)}</p>
                      </div>
                      <div className="rounded-md bg-[#F6F7F5] py-2">
                        <p className="text-[11px] text-gray-500">{t('producer:products.cols.stock')}</p>
                        <p className="text-sm font-bold text-[#14215B]">{formatNumber(product.stock, lang)}</p>
                      </div>
                      <div className="rounded-md bg-[#F6F7F5] py-2">
                        <p className="text-[11px] text-gray-500">{t('producer:products.cols.sales')}</p>
                        <p className="text-sm font-bold text-[#14215B]">{formatNumber(product.unitsSold, lang)}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {!isLoading && !isError && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onChange={setPage}
            summary={(from, to, total) => t('producer:products.showing', { from, to, total })}
          />
        )}
      </Panel>

      <Modal isOpen={!!selected} onClose={() => setSearchParams({})} title={selected?.nom ?? ''} maxWidth="max-w-2xl">
        {selected && <ProductDetail product={selected} />}
      </Modal>
    </div>
  );
};

const ProductDetail: React.FC<{ product: ProducerProduct }> = ({ product }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 text-sm border-b border-[#EEF0EC] last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-[#14215B] text-end">{value}</span>
    </div>
  );

  return (
    <div className="grid sm:grid-cols-[1fr_auto] gap-6">
      <div className="min-w-0">
        {product.images[0] && (
          <img src={resolveFileUrl(product.images[0])} alt={product.nom} className="w-full h-44 object-cover rounded-lg mb-4" />
        )}
        {product.description && <p className="text-sm text-gray-600 mb-3">{product.description}</p>}
        {row(t('producer:products.cols.status'), <ToneBadge tone={PRODUCT_TONE[product.statut]}>{t(`producer:productStatus.${product.statut}`)}</ToneBadge>)}
        {row(t('producer:products.category'), product.categorie.nom)}
        {row(t('producer:products.cols.honeyType'), product.batch?.honeyType ?? '—')}
        {row(t('producer:products.cols.package'), product.packaging ? `${product.packaging.packageType} · ${product.packaging.size}` : '—')}
        {row(t('producer:products.cols.price'), formatMoney(Number(product.prix), lang, t, 2))}
        {row(t('producer:products.cols.stock'), t('producer:products.stockUnits', { count: product.stock }))}
        {row(t('producer:products.cols.sales'), formatNumber(product.unitsSold, lang))}
        {row(t('producer:products.cols.batch'), product.batch?.batchCode ?? '—')}
        {row(t('producer:products.verifiedOn'), formatDate(product.batch?.verification.verifiedAt, lang))}
        <p className="text-xs text-gray-500 mt-3">{t('producer:products.readOnlyNote')}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        {product.qrCode ? (
          <>
            <QRCodeDisplay qrId={product.qrCode.qrId} code={product.qrCode.qrCode} size={150} />
            <p className="text-xs text-gray-500 text-center max-w-[180px]">{t('producer:products.qrNote')}</p>
          </>
        ) : (
          <p className="text-xs text-gray-500 text-center max-w-[180px]">{t('producer:products.noQr')}</p>
        )}
      </div>
    </div>
  );
};
