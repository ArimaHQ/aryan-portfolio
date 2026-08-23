'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { submitWithdrawalIntake } from '@/lib/withdrawal-intake-api';

const WALLET_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SUCCESS_MESSAGE = 'Your request has been received. Our team will contact you within 48 hours.';

type FormValues = {
  fullName: string;
  amount: string;
  walletAddress: string;
  network: 'Ethereum Mainnet';
  note: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  fullName: '',
  amount: '',
  walletAddress: '',
  network: 'Ethereum Mainnet',
  note: '',
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!values.amount.trim() || !Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) {
    errors.amount = 'Enter a positive ETH amount.';
  }
  if (!WALLET_PATTERN.test(values.walletAddress.trim())) {
    errors.walletAddress = 'Enter a valid Ethereum wallet address (0x followed by 40 hexadecimal characters).';
  }
  if (values.network !== 'Ethereum Mainnet') errors.network = 'Select a supported network.';
  return errors;
}

export function WithdrawalRequestForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    setSuccess(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setFormError(null);
    setSuccess(null);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await submitWithdrawalIntake({
        full_name: values.fullName.trim(),
        amount_eth: values.amount.trim(),
        wallet_address: values.walletAddress.trim(),
        network: values.network,
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      });
      setSuccess(response.message || SUCCESS_MESSAGE);
      setValues(initialValues);
    } catch (cause) {
      setFormError(cause instanceof ApiClientError ? cause.message : 'Unable to send your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: keyof FormValues) => errors[field];

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/"><i>AF</i><span>ARIMA<br />EXECUTIVE OS</span></Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/projects"><i>02</i>Projects</Link>
          <Link href="/tasks"><i>03</i>Tasks</Link>
          <Link className="active" href="/withdrawal-request"><i>04</i>Request intake</Link>
          <Link href="/settings"><i>05</i>Account</Link>
        </nav>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ request intake</b></div>
          <div><i />Authenticated request form</div>
        </header>
        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Operator contact</p>
            <h1>Request a withdrawal review.</h1>
            <p>Send your details to our team. This form only starts a conversation; it does not move, reserve, or record funds.</p>
          </div>
        </div>

        <section className="lab-panel" style={{ maxWidth: 720 }}>
          <form onSubmit={submit} noValidate className="grid gap-5" aria-label="Withdrawal request intake form">
            <label className="grid gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
              Full name
              <input aria-invalid={Boolean(fieldError('fullName'))} value={values.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40" />
              {fieldError('fullName') && <span role="alert" className="normal-case tracking-normal text-xs text-red-300">{fieldError('fullName')}</span>}
            </label>
            <label className="grid gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
              Amount (ETH)
              <input aria-invalid={Boolean(fieldError('amount'))} type="number" min="0" step="any" inputMode="decimal" value={values.amount} onChange={(event) => update('amount', event.target.value)} className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40" />
              {fieldError('amount') && <span role="alert" className="normal-case tracking-normal text-xs text-red-300">{fieldError('amount')}</span>}
            </label>
            <label className="grid gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
              ETH wallet address
              <input aria-invalid={Boolean(fieldError('walletAddress'))} value={values.walletAddress} onChange={(event) => update('walletAddress', event.target.value)} placeholder="0x..." spellCheck={false} autoComplete="off" className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40" />
              {fieldError('walletAddress') && <span role="alert" className="normal-case tracking-normal text-xs text-red-300">{fieldError('walletAddress')}</span>}
            </label>
            <label className="grid gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
              Network
              <select aria-invalid={Boolean(fieldError('network'))} value={values.network} onChange={(event) => update('network', event.target.value)} className="w-full border border-white/10 bg-[#07111d] px-4 py-3 text-sm text-white outline-none focus:border-white/40">
                <option>Ethereum Mainnet</option>
              </select>
              {fieldError('network') && <span role="alert" className="normal-case tracking-normal text-xs text-red-300">{fieldError('network')}</span>}
            </label>
            <label className="grid gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
              Optional note
              <textarea value={values.note} onChange={(event) => update('note', event.target.value)} rows={4} maxLength={2000} className="w-full resize-y border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40" />
            </label>

            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            {success && <p role="status" className="text-sm text-emerald-300">{success}</p>}
            <button type="submit" disabled={isSubmitting} className="world-command justify-center disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'Sending request…' : 'Send request'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
