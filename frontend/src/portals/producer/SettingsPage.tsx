import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMyProfile } from './hooks';
import { ErrorBlock, LoadingBlock, PageHeader } from './ui';
import { AccountSettingsTab } from './profile/AccountSettingsTab';

// "Paramètres" du menu : même contenu que l'onglet Paramètres du compte du profil.
export const SettingsPage: React.FC = () => {
  const { t } = useTranslation('producer');
  const { data: profile, isLoading, isError } = useMyProfile();
  return (
    <div>
      <PageHeader
        title={t('nav.settings')}
        subtitle={t('account.pageSubtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), to: '/producteur' }, { label: t('nav.settings') }]}
      />
      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock />}
      {profile && <AccountSettingsTab profile={profile} />}
    </div>
  );
};
