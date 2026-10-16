'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button, { IconButton } from '../ui/Button';
import { TextInput } from '../ui/Fields';
import { Callout } from '../ui/Misc';
import { PocBadge } from '../ui/Badges';
import { login, useSession } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(next) {
  // Only allow same-site paths (avoid open redirects).
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/advisor';
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const session = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Already signed in → go straight to the advisor.
  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Enter your password.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (e.email) { emailRef.current && emailRef.current.focus(); return; }
    if (e.password) { passwordRef.current && passwordRef.current.focus(); return; }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-forest-900 text-logo text-ivory-50" aria-hidden="true">K</span>
        <span className="text-brand text-forest-900">Kinova</span>
        <span className="h-5 w-px bg-line" aria-hidden="true" />
        <span className="text-body-md text-charcoal-700">Breeding Advisor</span>
        <PocBadge />
      </div>

      <form onSubmit={onSubmit} noValidate
        className="flex w-full flex-col gap-5 rounded-card border border-line bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">Sign in</h1>
          <p className="text-body-sm text-stone-500">Use your Kinova account to open the Breeding Advisor.</p>
        </div>

        {formError && <Callout tone="Risk" title="Couldn't sign you in" role="alert">{formError}</Callout>}

        <TextInput
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: null }); }}
          error={errors.email}
          inputRef={emailRef}
          disabled={submitting}
          autoFocus
        />

        <TextInput
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: null }); }}
          error={errors.password}
          inputRef={passwordRef}
          disabled={submitting}
          trailing={
            <IconButton
              icon={showPassword ? 'eye-off' : 'eye'}
              label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((s) => !s)}
            />
          }
        />

        <Button type="submit" variant="primary" size="md" loading={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-label text-stone-500">Proof of concept · sample data</p>
    </div>
  );
}
