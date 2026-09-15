import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { formatXlm, shortAddress } from '../../lib/format.js';
import { toast } from '../../store/toastStore.js';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Feedback.jsx';
import { Input } from '../ui/Field.jsx';
import { Modal } from '../ui/Modal.jsx';

const EMPTY = { destination: '', amount: '', memo: '' };

export function WithdrawForm({ withdrawable, onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value.trim() }));

  function review(e) {
    e.preventDefault();
    const next = {};
    if (!/^G[A-Z2-7]{55}$/.test(form.destination)) next.destination = 'Enter a valid Stellar address (starts with G)';
    if (!(Number(form.amount) > 0)) next.amount = 'Enter an amount';
    else if (Number(form.amount) > Number(withdrawable)) next.amount = `You can withdraw up to ${formatXlm(withdrawable)}`;
    setErrors(next);
    if (!Object.keys(next).length) setReviewing(true);
  }

  async function submit() {
    setSending(true);
    try {
      const res = await api.post('/wallet/withdraw', { ...form, memo: form.memo || undefined });
      setResult(res);
      setForm(EMPTY);
      toast.success('Withdrawal sent');
      onDone?.();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(err);
    } finally {
      setSending(false);
      setReviewing(false);
    }
  }

  return (
    <>
      <form onSubmit={review} className="space-y-5" noValidate>
        {result && (
          <Alert tone="success" title="Withdrawal submitted">
            <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
              View on Stellar Expert <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Alert>
        )}
        <Input
          label="Destination address"
          placeholder="G…"
          value={form.destination}
          onChange={update('destination')}
          error={errors.destination}
          autoComplete="off"
          spellCheck={false}
        />
        <div>
          <Input label="Amount" inputMode="decimal" placeholder="0.00" suffix="XLM" value={form.amount} onChange={update('amount')} error={errors.amount} />
          <button
            type="button"
            className="link mt-2 font-mono text-[11px]"
            onClick={() => setForm((f) => ({ ...f, amount: String(withdrawable) }))}
          >
            Max {formatXlm(withdrawable)}
          </button>
        </div>
        <Input
          label="Memo (optional)"
          placeholder="Required by some exchanges"
          maxLength={28}
          value={form.memo}
          onChange={update('memo')}
          error={errors.memo}
          hint="Sending to an exchange? Include its memo or funds may not be credited."
        />
        <Button type="submit" className="w-full" size="lg">
          Review withdrawal
        </Button>
      </form>

      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title="Confirm withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewing(false)}>
              Back
            </Button>
            <Button variant="gold" loading={sending} onClick={submit}>
              Send {formatXlm(form.amount)}
            </Button>
          </>
        }
      >
        <dl className="border-t border-line text-sm">
          {[
            ['To', <span key="to" className="num" title={form.destination}>{shortAddress(form.destination, 8)}</span>],
            ['Amount', <span key="amt" className="num font-semibold text-gold">{formatXlm(form.amount)}</span>],
            ...(form.memo ? [['Memo', form.memo]] : []),
            ['Network fee', <span key="fee" className="num">0.00001 XLM</span>],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-line py-3">
              <dt className="text-moss">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <Alert tone="warning" className="mt-4">
          Stellar payments are irreversible. Double-check the address.
        </Alert>
      </Modal>
    </>
  );
}
