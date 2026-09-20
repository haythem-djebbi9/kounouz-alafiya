import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Calendar, Camera, FileText, Leaf, MapPin, Settings, Trees, UserRound } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { resolveFileUrl } from '../../lib/api';
import { useMyProfile, useUpdateMyProfile, useUploadProducerImage } from './hooks';
import { governorateLabel } from './constants';
import { ErrorBlock, LoadingBlock, NAVY, PageHeader, Panel, Tabs, ToneBadge } from './ui';
import type { TabItem } from './ui';
import { Avatar } from './ProducerLayout';
import { formatDate } from './utils';
import { PersonalInfoTab } from './profile/PersonalInfoTab';
import { FarmInfoTab } from './profile/FarmInfoTab';
import { FarmsTab } from './profile/FarmsTab';
import { DocumentsTab } from './profile/DocumentsTab';
import { AccountSettingsTab } from './profile/AccountSettingsTab';
import type { ProducerProfile, ProducerStatus } from './types';

type ProfileTab = 'personal' | 'farm' | 'farms' | 'documents' | 'account';
const TABS: ProfileTab[] = ['personal', 'farm', 'farms', 'documents', 'account'];

const STATUS_TONE: Record<ProducerStatus, 'green' | 'gold' | 'red'> = {
  ACTIVE: 'green',
  PENDING: 'gold',
  SUSPENDED: 'red',
  REJECTED: 'red',
};

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation(['producer', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as ProfileTab | null;
  const tab: ProfileTab = requested && TABS.includes(requested) ? requested : 'personal';
  const { data: profile, isLoading, isError } = useMyProfile();

  const tabs: TabItem<ProfileTab>[] = [
    { key: 'personal', label: t('producer:profile.tabs.personal'), icon: <UserRound className="w-4.5 h-4.5" /> },
    { key: 'farm', label: t('producer:profile.tabs.farm'), icon: <Building2 className="w-4.5 h-4.5" /> },
    { key: 'farms', label: t('producer:profile.tabs.farms'), icon: <Trees className="w-4.5 h-4.5" /> },
    { key: 'documents', label: t('producer:profile.tabs.documents'), icon: <FileText className="w-4.5 h-4.5" /> },
    { key: 'account', label: t('producer:profile.tabs.account'), icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={t('producer:profile.title')}
        subtitle={t('producer:profile.subtitle')}
        breadcrumb={[
          { label: t('producer:nav.dashboard'), to: '/producteur' },
          ...(tab === 'personal'
            ? [{ label: t('producer:nav.profile') }]
            : [{ label: t('producer:nav.profile'), to: '/producteur/profil' }, { label: t(`producer:profile.tabs.${tab}`) }]),
        ]}
      />

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock />}
      {profile && (
        <div className="space-y-5">
          {tab === 'personal' && <ProfileOverview profile={profile} />}
          <Tabs tabs={tabs} active={tab} onChange={(key) => setSearchParams(key === 'personal' ? {} : { tab: key })} />
          {tab === 'personal' && <PersonalInfoTab profile={profile} />}
          {tab === 'farm' && <FarmInfoTab profile={profile} />}
          {tab === 'farms' && <FarmsTab />}
          {tab === 'documents' && <DocumentsTab />}
          {tab === 'account' && <AccountSettingsTab profile={profile} />}
        </div>
      )}
    </div>
  );
};

const ProfileOverview: React.FC<{ profile: ProducerProfile }> = ({ profile }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { user } = useAuth();
  const upload = useUploadProducerImage();
  const update = useUpdateMyProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const { url } = await upload.mutateAsync(file);
      await update.mutateAsync({ avatarUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:status.error'));
    }
  };

  const location = profile.farmGovernorate
    ? [profile.farmDelegation, governorateLabel(profile.farmGovernorate, lang)].filter(Boolean).join(', ')
    : profile.location;

  return (
    <Panel title={t('producer:profile.overview')}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 flex-1">
          <div className="relative w-fit">
            <Avatar src={profile.avatarUrl ? resolveFileUrl(profile.avatarUrl) : null} name={profile.name} size={112} />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-1 end-1 w-9 h-9 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center border-2 border-white"
              aria-label={t('producer:profile.changePhoto')}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void handleAvatar(e.target.files?.[0])} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-2xl font-extrabold ${NAVY}`}>{profile.name}</h2>
              <ToneBadge tone={STATUS_TONE[profile.status]} icon={<span className="w-2 h-2 rounded-full bg-current" />}>
                {t(`producer:producerStatus.${profile.status}`)}
              </ToneBadge>
            </div>
            <p className="text-sm text-gray-600">{t('producer:common.roleLabel')} · {profile.farmName}</p>
            <ul className="mt-2 space-y-1 text-sm text-[#374151]">
              {location && (
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#14215B]" />{location}</li>
              )}
              <li className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#14215B]" />
                {profile.registrationStatus ? t(`producer:options.registration.${profile.registrationStatus}`) : t('producer:profile.registrationUnknown')}
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#14215B]" />
                {t('producer:profile.memberSince', { date: formatDate(user?.createdAt ?? profile.createdAt, lang) })}
              </li>
            </ul>
            {(upload.isPending || update.isPending) && <p className="text-xs text-gray-500 mt-1">{t('common:status.saving')}</p>}
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>
        </div>
        <div
          className={`rounded-xl border p-5 flex items-center gap-4 lg:w-[380px] ${
            profile.isVerified ? 'bg-[#F0F8F2] border-[#D9ECDF]' : 'bg-[#FFF8EA] border-[#F5E5C2]'
          }`}
        >
          <span className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${profile.isVerified ? 'bg-[#0B4A2F] text-white' : 'bg-[#FBE9C5] text-[#A56A0B]'}`}>
            <Leaf className="w-7 h-7" />
          </span>
          <div>
            <p className={`font-bold ${NAVY}`}>{profile.isVerified ? t('producer:profile.verifiedTitle') : t('producer:profile.notVerifiedTitle')}</p>
            <p className="text-sm text-gray-600">{profile.isVerified ? t('producer:profile.verifiedBody') : t('producer:profile.notVerifiedBody')}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
};
