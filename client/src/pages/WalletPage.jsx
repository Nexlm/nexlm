import { ExternalLink, RefreshCw } from 'lucide-react';
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
import { usePageTitle } from '../hooks/usePageTitle.js';

function Stat({ label, value, hint }) {
  return (
    <div className="stat-cell">
      <p className="table-head">{label}</p>
      <p className="num mt-2 text-xl font-semibold text-paper">{value}</p>
      {hint && <p className="mt-1 text-xs text-moss">{hint}</p>}
    </div>
  );
}

export default function WalletPage() {
  usePageTitle('Wallet');
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('deposit');
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: wallet, loading, error, reload } = useApi(() => api.get('/wallet'), [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  if (loading && !wallet) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const [whole, fraction] = String(Number(wallet.balance).toLocaleString('en-US', { maximumFractionDigits: 7 })).split('.');

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="eyebrow">Stellar wallet</p>
            <Badge tone={wallet.network === 'testnet' ? 'gold' : 'mint'}>{wallet.network === 'testnet' ? 'Testnet' : 'Mainnet'}</Badge>
          </div>
          <p className="mt-4 font-display text-6xl font-extrabold leading-none tracking-tight text-paper sm:text-7xl">
            {whole}
            {fraction && <span className="text-moss">.{fraction}</span>}
            <span className="ml-3 font-mono text-2xl font-semibold text-gold">XLM</span>
          </p>
          <a
            href={wallet.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-moss hover:text-gold"
          >
            {wallet.publicKey} <ExternalLink className="h-3 w-3" />
          </a>
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

      <div className="stat-grid stat-cols-4 grid-cols-2 sm:grid-cols-4">
        <Stat label="Available" value={formatXlm(wallet.available)} hint="After Stellar reserve" />
        <Stat label="In sell orders" value={formatXlm(wallet.committedToOrders)} hint="Amount + 2 XLM escrow each" />
        <Stat label="Withdrawable" value={formatXlm(wallet.withdrawable)} />
        <Stat label="Reserve" value={formatXlm(wallet.minimumBalance)} hint="Required by Stellar" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <Tabs
            tabs={[
              { value: 'deposit', label: 'Deposit' },
              { value: 'withdraw', label: 'Withdraw' },
            ]}
            value={tab}
            onChange={setTab}
            className="mb-6"
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
          <p className="eyebrow mb-4">Recent on-chain activity</p>
          <ActivityList refreshKey={refreshKey} />
        </section>
      </div>
    </div>
  );
}
