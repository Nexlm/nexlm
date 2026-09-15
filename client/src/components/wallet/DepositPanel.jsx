import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { CopyButton } from '../ui/CopyButton.jsx';
import { Alert, ErrorState, Spinner } from '../ui/Feedback.jsx';

export function DepositPanel() {
  const { data, loading, error, reload } = useApi(() => api.get('/wallet/deposit'), []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        {/* QR codes need a light quiet zone to scan reliably. */}
        <img src={data.qrCode} alt="Deposit address QR code" className="h-48 w-48 rounded bg-white p-2" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="label mb-0">Your Stellar address</span>
          <CopyButton value={data.publicKey} />
        </div>
        <p className="mono mt-2 break-all rounded border border-line bg-ink p-3 text-paper">{data.publicKey}</p>
      </div>
      <Alert tone={data.network === 'testnet' ? 'warning' : 'info'}>
        {data.warning} No memo needed. Deposits appear after one ledger (~5 seconds).
      </Alert>
    </div>
  );
}
