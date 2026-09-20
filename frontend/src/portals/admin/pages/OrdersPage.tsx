import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminOrders, useUpdateOrderStatus } from '../hooks/useSales';
import type { AdminOrder } from '../hooks/useSales';
import { Card, Badge, Button, EmptyState, Alert } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { OrderStatus } from '../../producer/types';

const TABS: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Transitions autorisées (identiques au backend SalesService).
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const TONE: Record<OrderStatus, 'gray' | 'blue' | 'gold' | 'green' | 'red'> = {
  PENDING: 'gray',
  CONFIRMED: 'blue',
  SHIPPED: 'gold',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

export const OrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'producer', 'common']);
  const { data: orders = [], isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const [tab, setTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');

  const visible = tab === 'ALL' ? orders : orders.filter((o) => o.status === tab);

  const change = async (order: AdminOrder, status: OrderStatus) => {
    if (status === 'CANCELLED' && !window.confirm(t('admin:orders.confirmCancel', { number: order.orderNumber }))) return;
    setError('');
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:orders.heading')}</h1>
      <p className="text-gray-500 mb-4">{t('admin:orders.subtitle')}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px] ${
              tab === value ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:border-[#D49B37]'
            }`}
          >
            {value === 'ALL' ? t('admin:orders.all') : t(`producer:orderStatus.${value}`)}
          </button>
        ))}
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && visible.length === 0 && (
        <Card>
          <EmptyState title={t('admin:orders.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((order) => (
          <Card key={order.id}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[#0C261B]">#{order.orderNumber}</p>
                  <Badge tone={TONE[order.status]}>{t(`producer:orderStatus.${order.status}`)}</Badge>
                  <span className="text-xs text-gray-400">{t(`producer:channel.${order.channel}`)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleString(dateLocale(i18n.language))} · {order.customerName} · {order.customerPhone} · {order.city}
                </p>
                <p className="text-xs text-gray-400">{order.shippingAddress}</p>
                <ul className="mt-2 space-y-0.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="text-sm text-[#0C261B]">
                      {item.quantity} × {item.productName}{item.packageSize ? ` (${item.packageSize})` : ''}
                      <span className="text-xs text-gray-400"> — {item.producer.farmName}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <p className="text-lg font-bold text-[#D49B37]">{Number(order.total).toFixed(2)} {t('producer:common.currency')}</p>
                <div className="flex flex-wrap gap-2">
                  {NEXT[order.status].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={status === 'CANCELLED' ? 'danger' : 'primary'}
                      onClick={() => void change(order, status)}
                      isLoading={updateStatus.isPending}
                    >
                      {t(`admin:orders.actions.${status}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
