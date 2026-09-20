import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { Button, Modal, Textarea } from '../design-system';
import { setOverrideReasonProvider } from '../lib/api';

const MIN_LENGTH = 5;

interface PendingRequest {
  message: string;
  resolve: (reason: string | null) => void;
}

/**
 * Saisie du motif d'override administratif.
 *
 * Monté une seule fois à la racine : quand un administrateur déclenche une
 * action réservée à l'Équipe de Vérification (décision, lot, QR...), le
 * serveur exige un motif. Cette boîte le demande, puis le client API rejoue
 * automatiquement la requête ; l'override est tracé dans le journal d'audit.
 */
export const OverrideReasonDialog: React.FC = () => {
  const { t } = useTranslation('common');
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [reason, setReason] = useState('');
  const pendingRef = useRef<PendingRequest | null>(null);

  useEffect(() => {
    setOverrideReasonProvider(
      ({ message }) =>
        new Promise<string | null>((resolve) => {
          // Une seule demande à la fois : une demande précédente est annulée.
          pendingRef.current?.resolve(null);
          const next = { message, resolve };
          pendingRef.current = next;
          setReason('');
          setPending(next);
        }),
    );
    return () => setOverrideReasonProvider(null);
  }, []);

  const close = (value: string | null) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setPending(null);
  };

  const trimmed = reason.trim();

  return (
    <Modal isOpen={pending !== null} onClose={() => close(null)} title={t('override.title')}>
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed.length >= MIN_LENGTH) close(trimmed);
        }}
      >
        <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{t('override.explanation')}</p>
        </div>
        <Textarea
          label={t('override.reasonLabel')}
          hint={t('override.reasonHint', { min: MIN_LENGTH })}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => close(null)}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={trimmed.length < MIN_LENGTH}>
            {t('override.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
