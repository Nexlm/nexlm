import { ExternalLink, Lock, RefreshCw, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ActivityList } from '../components/wallet/ActivityList.jsx';
import { DepositPanel } from '../components/wallet/DepositPanel.jsx';
import { WithdrawForm } from '../components/wallet/WithdrawForm.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Alert, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatXlm } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';

function Stat({ label, value, hint }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function WalletPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('deposit');
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: wallet, loading, error, reload } = useApi(() => api.get('/wallet'), [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  if (loading && !wallet) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="mt-1 text-sm text-slate-500">Your Nexlm Stellar wallet for trading.</p>
        </div>
        <Button variant="ghost" onClick={refresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {!wallet.funded && (
        <Alert tone="warning" title="Wallet not activated yet">
          Stellar accounts need at least 1 XLM to exist. Deposit XLM to activate your wallet.
        </Alert>
      )}

      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-brand-100">
              <Wallet className="h-4 w-4" /> Total balance
            </span>
            <Badge tone="brand" className="bg-white/15 text-white ring-white/30">
              {wallet.network === 'testnet' ? 'Testnet' : 'Mainnet'}
            </Badge>
          </div>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{formatXlm(wallet.balance)}</p>
          <a
            href={wallet.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand-100 hover:text-white"
          >
            View on Stellar Expert <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          <Stat label="Available" value={formatXlm(wallet.available)} hint="After Stellar reserve" />
          <Stat
            label="In sell orders"
            value={
              <span className="inline-flex items-center gap-1">
                <Lock className="h-4 w-4 text-slate-400" /> {formatXlm(wallet.committedToOrders)}
              </span>
            }
          />
          <Stat label="Withdrawable" value={formatXlm(wallet.withdrawable)} />
          <Stat label="Reserve" value={formatXlm(wallet.minimumBalance)} hint="Required by Stellar" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <Tabs
            tabs={[
              { value: 'deposit', label: 'Deposit' },
              { value: 'withdraw', label: 'Withdraw' },
            ]}
            value={tab}
            onChange={setTab}
            className="mb-5"
          />
          {tab === 'deposit' ? (
            <DepositPanel />
          ) : !user?.emailVerified ? (
            <Alert tone="warning">Verify your email address before withdrawing.</Alert>
          ) : (
            <WithdrawForm withdrawable={wallet.withdrawable} onDone={refresh} />
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Recent activity</h2>
          <ActivityList refreshKey={refreshKey} />
        </section>
      </div>
    </div>
  );
}
