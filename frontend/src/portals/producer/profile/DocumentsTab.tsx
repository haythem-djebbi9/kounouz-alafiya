import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleCheck, CloudUpload, Eye, FileLock2, FileText, IdCard, Lightbulb, Lock, RefreshCw, Trash2, Upload } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import { useDeleteDocument, useMyDocuments, useUploadDocument } from '../hooks';
import { DOCUMENT_TYPES } from '../constants';
import { ActionMenu, Btn, EmptyRow, Field, LoadingBlock, NAVY, Notice, Panel, SelectInput, Table, Td, Th, ToneBadge } from '../ui';
import { formatDate, formatFileSize, openAuthorizedFile } from '../utils';
import type { DocumentStatus, DocumentType, ProducerDocument } from '../types';

const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

const STATUS_TONE: Record<DocumentStatus, 'green' | 'gold' | 'red'> = {
  VERIFIED: 'green',
  PENDING_REVIEW: 'gold',
  REJECTED: 'red',
};

export const DocumentsTab: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { data: documents = [], isLoading } = useMyDocuments();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<DocumentType>('NATIONAL_ID');
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const latestOf = (type: DocumentType) => documents.find((d) => d.type === type);
  const others = documents.filter((d) => d.type === 'OTHER');

  const upload = async (file: File | undefined, type: DocumentType) => {
    if (!file) return;
    setNotice(null);
    if (!ALLOWED.includes(file.type)) {
      setNotice({ tone: 'error', text: t('producer:documents.errors.format') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setNotice({ tone: 'error', text: t('producer:documents.errors.size') });
      return;
    }
    try {
      await uploadDocument.mutateAsync({ type, file });
      setNotice({ tone: 'success', text: t('producer:documents.uploaded', { name: file.name }) });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  const pickFor = (type: DocumentType) => {
    setUploadType(type);
    // Laisse React appliquer le type avant l'ouverture du sélecteur.
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const view = async (doc: ProducerDocument) => {
    try {
      await openAuthorizedFile(`/producer-documents/${doc.id}/file`);
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : t('common:status.error') });
    }
  };

  const remove = async (doc: ProducerDocument) => {
    if (!window.confirm(t('producer:documents.confirmDelete', { name: doc.fileName }))) return;
    try {
      await deleteDocument.mutateAsync(doc.id);
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  const statusCell = (doc: ProducerDocument | undefined) =>
    doc ? (
      <div>
        <ToneBadge tone={STATUS_TONE[doc.status]}>{t(`producer:documents.status.${doc.status}`)}</ToneBadge>
        <p className="text-[11px] text-gray-500 mt-1">{t('producer:documents.uploadedOn', { date: formatDate(doc.createdAt, lang) })}</p>
        {doc.status === 'REJECTED' && doc.reviewNote && <p className="text-[11px] text-rose-600 mt-0.5 max-w-[200px]">{doc.reviewNote}</p>}
      </div>
    ) : (
      <ToneBadge tone="gray">{t('producer:documents.status.NOT_UPLOADED')}</ToneBadge>
    );

  const actionsCell = (doc: ProducerDocument | undefined, type: DocumentType) => (
    <div className="inline-flex items-center gap-2">
      {doc ? (
        <button onClick={() => void view(doc)} className="w-9 h-8 rounded-md border border-[#CBD2CC] flex items-center justify-center text-[#14215B] hover:bg-[#F6F7F5]" aria-label={t('producer:common.view')}>
          <Eye className="w-4 h-4" />
        </button>
      ) : (
        <Btn variant="outline" size="sm" onClick={() => pickFor(type)}>{t('producer:documents.upload')}</Btn>
      )}
      <ActionMenu
        actions={[
          ...(doc && doc.status !== 'VERIFIED'
            ? [
                { label: t('producer:documents.replace'), icon: <RefreshCw className="w-4 h-4" />, onClick: () => pickFor(type) },
                { label: t('common:actions.delete'), icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => void remove(doc) },
              ]
            : []),
          ...(!doc ? [{ label: t('producer:documents.upload'), icon: <Upload className="w-4 h-4" />, onClick: () => pickFor(type) }] : []),
          ...(doc?.status === 'VERIFIED' ? [{ label: t('producer:documents.lockedVerified'), icon: <Lock className="w-4 h-4" />, onClick: () => undefined, disabled: true }] : []),
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-[#D9ECDF] bg-[#F0F8F2] p-5">
          <span className="w-12 h-12 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </span>
          <div>
            <p className={`font-bold ${NAVY}`}>{t('producer:documents.bannerTitle')}</p>
            <p className="text-sm text-[#374151]">{t('producer:documents.bannerBody')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#F5E5C2] bg-[#FFF3DA] p-5">
          <FileLock2 className="w-9 h-9 text-[#D08C1A] shrink-0" />
          <div>
            <p className={`font-bold ${NAVY}`}>{t('producer:documents.secureTitle')}</p>
            <p className="text-sm text-[#374151]">{t('producer:documents.secureBody')}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Panel title={t('producer:documents.required')} bodyClassName="p-3 sm:p-4">
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('producer:documents.cols.document')}</Th>
                  <Th>{t('producer:documents.cols.description')}</Th>
                  <Th>{t('producer:documents.cols.status')}</Th>
                  <Th className="text-end">{t('producer:common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {DOCUMENT_TYPES.filter((d) => d.type !== 'OTHER').map(({ type, required }) => {
                  const doc = latestOf(type);
                  return (
                    <tr key={type}>
                      <Td>
                        <span className="flex items-center gap-2.5 font-semibold text-[#14215B] min-w-[170px]">
                          {type === 'NATIONAL_ID' ? <IdCard className="w-5 h-5 shrink-0" /> : <FileText className="w-5 h-5 shrink-0" />}
                          <span>
                            {t(`producer:documents.types.${type}.label`)}
                            {required && <span className="text-rose-600 ms-0.5">*</span>}
                            {doc && <span className="block text-[11px] font-normal text-gray-500 truncate max-w-[180px]">{doc.fileName} · {formatFileSize(doc.size)}</span>}
                          </span>
                        </span>
                      </Td>
                      <Td className="text-xs text-gray-600 min-w-[180px]">{t(`producer:documents.types.${type}.description`)}</Td>
                      <Td>{statusCell(doc)}</Td>
                      <Td className="text-end">{actionsCell(doc, type)}</Td>
                    </tr>
                  );
                })}
                <tr>
                  <Td>
                    <span className="flex items-center gap-2.5 font-semibold text-[#14215B]">
                      <FileText className="w-5 h-5 shrink-0" />
                      {t('producer:documents.types.OTHER.label')}
                    </span>
                  </Td>
                  <Td className="text-xs text-gray-600">{t('producer:documents.types.OTHER.description')}</Td>
                  <Td>{others.length ? <ToneBadge tone="blue">{t('producer:documents.filesCount', { count: others.length })}</ToneBadge> : statusCell(undefined)}</Td>
                  <Td className="text-end">
                    <Btn variant="outline" size="sm" onClick={() => pickFor('OTHER')}>{t('producer:documents.upload')}</Btn>
                  </Td>
                </tr>
                {others.map((doc) => (
                  <tr key={doc.id} className="bg-[#FAFBF9]">
                    <Td className="ps-10 text-xs text-[#14215B]">{doc.fileName}</Td>
                    <Td className="text-xs text-gray-500">{formatFileSize(doc.size)}</Td>
                    <Td>{statusCell(doc)}</Td>
                    <Td className="text-end">{actionsCell(doc, 'OTHER')}</Td>
                  </tr>
                ))}
                {!isLoading && documents.length === 0 && <EmptyRow colSpan={4} message={t('producer:documents.noneYet')} />}
              </tbody>
            </Table>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title={t('producer:documents.uploadNew')}>
            <Field label={t('producer:documents.documentType')} className="mb-3">
              <SelectInput value={uploadType} onChange={(e) => setUploadType(e.target.value as DocumentType)}>
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d.type} value={d.type}>{t(`producer:documents.types.${d.type}.label`)}</option>
                ))}
              </SelectInput>
            </Field>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files?.[0], uploadType); }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#0B4A2F] bg-[#F0F8F2]' : 'border-[#CBD2CC] hover:bg-[#F6F7F5]'}`}
            >
              <CloudUpload className="w-9 h-9 mx-auto text-[#14215B]" />
              <p className={`text-sm font-semibold mt-2 ${NAVY}`}>{t('producer:documents.dropzone')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('producer:documents.formats')}</p>
            </div>
            <Btn variant="gold" className="w-full mt-3" onClick={() => fileRef.current?.click()} loading={uploadDocument.isPending}>
              <Upload className="w-4 h-4" />
              {t('producer:documents.chooseFile')}
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => { void upload(e.target.files?.[0], uploadType); e.target.value = ''; }}
            />
          </Panel>

          <Panel title={t('producer:documents.guidelinesTitle')} icon={<Lightbulb className="w-5 h-5 text-[#D08C1A]" />}>
            <ul className="space-y-2">
              {(t('producer:documents.guidelines', { returnObjects: true }) as string[]).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#374151]">
                  <CircleCheck className="w-4 h-4 text-[#17693F] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
};
