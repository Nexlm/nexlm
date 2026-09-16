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
import { usePageTitle } from '../hooks/usePageTitle.js';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'FILLED', label: 'Matched' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function MyOrdersPage() {
  usePageTitle('My orders');
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your offers</p>
          <h1 className="page-title mt-3">My orders</h1>
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
              <thead className="table-head border-b border-line text-left">
                <tr>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Expires</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((order) => (
                  <tr key={order.id} className="hover:bg-raised/50">
                    <td className="px-5 py-4">
                      <Badge tone={order.type === 'SELL' ? 'ember' : 'mint'}>{order.type === 'SELL' ? 'Sell' : 'Buy'}</Badge>
                    </td>
                    <td className="num whitespace-nowrap px-5 py-4 font-semibold">{formatXlm(order.xlmAmount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-display text-base font-bold">{formatNgn(order.ngnRate)}</td>
                    <td className="px-5 py-4">
                      <PaymentMethodChips methods={order.paymentMethods} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge map={ORDER_STATUS} status={order.status} />
                    </td>
                    <td className="num whitespace-nowrap px-5 py-4 text-xs text-moss">{formatDateTime(order.expiresAt)}</td>
                    <td className="px-5 py-4 text-right">
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
