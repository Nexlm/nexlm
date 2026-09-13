import { ListOrdered, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PaymentMethodChips } from '../components/common/PaymentMethodChips.jsx';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { ORDER_STATUS } from '../lib/constants.js';
import { formatDateTime, formatNgn, formatXlm } from '../lib/format.js';
import { toast } from '../store/toastStore.js';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'FILLED', label: 'Matched' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function MyOrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.get('/orders/mine', { status, page }), [status, page]);

  async function cancel(id) {
    setCancelling(id);
    try {
      await api.post(`/orders/${id}/cancel`);
      toast.success('Order cancelled');
      reload({ silent: true });
    } catch (err) {
      toast.error(err);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Orders you&apos;ve posted on the P2P market.</p>
        </div>
        <Link to="/orders/new">
          <Button>
            <Plus className="h-4 w-4" /> New order
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Tabs
          tabs={STATUS_TABS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={ListOrdered} title="No orders here" description="Post a buy or sell order to start trading." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <Badge tone={order.type === 'SELL' ? 'red' : 'green'}>{order.type === 'SELL' ? 'Sell' : 'Buy'}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{formatXlm(order.xlmAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatNgn(order.ngnRate)}</td>
                    <td className="px-4 py-3">
                      <PaymentMethodChips methods={order.paymentMethods} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge map={ORDER_STATUS} status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(order.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {order.status === 'ACTIVE' && (
                        <Button variant="secondary" size="sm" loading={cancelling === order.id} onClick={() => cancel(order.id)}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onChange={setPage} />
      </div>
    </div>
  );
}
