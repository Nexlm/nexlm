import { useState } from 'react';
import { api } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { toast } from '../../store/toastStore.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Field.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated');
      setForm(EMPTY);
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(Object.keys(mapped).length ? mapped : { currentPassword: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6">
      <p className="eyebrow">Change password</p>
      <form onSubmit={submit} className="mt-5 grid gap-5 sm:grid-cols-3" noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={update('currentPassword')}
          error={errors.currentPassword}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={update('newPassword')}
          error={errors.newPassword}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <div className="sm:col-span-3">
          <Button type="submit" loading={saving}>
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}
