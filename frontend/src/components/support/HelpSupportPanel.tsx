import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, Accordion, Input, Textarea, Button, Alert, StatusBadge, EmptyState } from '../../design-system';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';
import { useSubmitContactMessage } from '../../lib/contact-hooks';
import {
  useMyTickets,
  useCreateTicket,
  useTicket,
  useAddTicketMessage,
  useUpdateTicketStatus,
  type SupportTicketStatus,
} from '../../lib/support-hooks';

type Tab = 'help' | 'faq' | 'contact' | 'tickets';
const STAFF_ROLES = ['ADMIN', 'VERIFICATION_TEAM'];
const TICKET_STATUSES: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface HelpSupportPanelProps {
  initialTab?: Tab;
}

export const HelpSupportPanel: React.FC<HelpSupportPanelProps> = ({ initialTab = 'help' }) => {
  const { t } = useTranslation(['support', 'common']);
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const topics = t('support:helpCenter.topics', { returnObjects: true }) as { title: string; body: string }[];
  const faqItems = t('support:faq.items', { returnObjects: true }) as { q: string; a: string }[];

  const tabs: Tab[] = isAuthenticated ? ['help', 'faq', 'contact', 'tickets'] : ['help', 'faq', 'contact'];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#0C261B]">{t('support:title')}</h1>

      <div className="flex flex-wrap gap-2 border-b border-[#EAE1D2] pb-3">
        {tabs.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => {
              setTab(tabKey);
              setSelectedTicketId(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === tabKey ? 'bg-[#0C261B] text-white' : 'text-[#0C261B] hover:bg-[#FAF6EE]'
            }`}
          >
            {tabKey === 'help' && t('support:helpCenter.heading')}
            {tabKey === 'faq' && t('support:faq.heading')}
            {tabKey === 'contact' && t('support:contact.heading')}
            {tabKey === 'tickets' && t('support:tickets.heading')}
          </button>
        ))}
      </div>

      {tab === 'help' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('support:helpCenter.intro')}</p>
          {topics.map((topic, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>{topic.title}</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 leading-relaxed">{topic.body}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'faq' && (
        <Accordion items={faqItems.map((item, i) => ({ id: String(i), title: item.q, content: item.a }))} />
      )}

      {tab === 'contact' && <ContactForm />}

      {tab === 'tickets' &&
        isAuthenticated &&
        (selectedTicketId ? (
          <TicketDetail id={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
        ) : (
          <TicketsList onSelect={setSelectedTicketId} />
        ))}
    </div>
  );
};

const ContactForm: React.FC = () => {
  const { t } = useTranslation(['support', 'common']);
  const { user } = useAuth();
  const submitMutation = useSubmitContactMessage();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await submitMutation.mutateAsync({ name, email, subject, message });
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('support:contact.heading')}</CardTitle>
        <p className="text-sm text-gray-500 mt-1">{t('support:contact.intro')}</p>
      </CardHeader>
      {success ? (
        <Alert tone="success">{t('support:contact.success')}</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('support:contact.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label={t('support:contact.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input label={t('support:contact.subjectLabel')} value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <Textarea
            label={t('support:contact.messageLabel')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" isLoading={submitMutation.isPending}>
            {t('support:contact.submit')}
          </Button>
        </form>
      )}
    </Card>
  );
};

const TicketsList: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
  const { t } = useTranslation(['support', 'common']);
  const { data: tickets, isLoading } = useMyTickets();
  const createMutation = useCreateTicket();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({ subject, message });
      setSubject('');
      setMessage('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0C261B]">{t('support:tickets.myTickets')}</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {t('support:tickets.newTicket')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('support:tickets.subjectLabel')} value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Textarea
              label={t('support:tickets.messageLabel')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" isLoading={createMutation.isPending}>
              {t('support:tickets.submit')}
            </Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (tickets?.length ?? 0) === 0 && <EmptyState title={t('support:tickets.empty')} />}
      <div className="space-y-2">
        {tickets?.map((ticket) => (
          <Card
            key={ticket.id}
            className="cursor-pointer hover:border-[#D49B37] transition-colors"
            onClick={() => onSelect(ticket.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#0C261B]">{ticket.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('support:tickets.openedOn')} {new Date(ticket.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge kind="supportTicket" status={ticket.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const TicketDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { t } = useTranslation(['support', 'common', 'status']);
  const { user } = useAuth();
  const { data: ticket, isLoading } = useTicket(id);
  const addMessageMutation = useAddTicketMessage(id);
  const updateStatusMutation = useUpdateTicketStatus(id);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await addMessageMutation.mutateAsync(reply);
      setReply('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  if (isLoading || !ticket) {
    return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;
  }

  const closed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-[#0C261B]/70 hover:text-[#0C261B]">
        {t('support:tickets.backToList')}
      </button>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C261B]">{ticket.subject}</h2>
            {isStaff && (
              <p className="text-xs text-gray-400 mt-0.5">
                {ticket.user.name} · {ticket.user.email}
              </p>
            )}
          </div>
          <StatusBadge kind="supportTicket" status={ticket.status} />
        </div>

        {isStaff && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-500">{t('support:tickets.statusLabel')}</span>
            <select
              value={ticket.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value as SupportTicketStatus)}
              className="text-sm border-2 border-[#EAE1D2] rounded-lg px-2 py-1.5"
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status:supportTicket.${s}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${msg.authorId === user?.id ? 'bg-[#FAF6EE]' : 'bg-white border border-[#EAE1D2]'}`}
            >
              <p className="text-xs font-bold text-[#0C261B]/70 mb-1">{msg.author.name}</p>
              <p className="text-sm text-[#0C261B] whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>

        {closed ? (
          <Alert tone="info">{t('support:tickets.closedNotice')}</Alert>
        ) : (
          <form onSubmit={handleReply} className="space-y-3">
            <Textarea
              label={t('support:tickets.conversation')}
              placeholder={t('support:tickets.replyPlaceholder')}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              required
            />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" size="sm" isLoading={addMessageMutation.isPending}>
              {t('common:actions.reply')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
