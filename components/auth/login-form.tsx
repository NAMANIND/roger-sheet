'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  completeOnboarding,
  sendLoginOtp,
  verifyLoginOtp,
} from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PRODUCT_NAME } from '@/lib/brand';

type Step = 'email' | 'otp' | 'profile';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    router.replace(next);
    router.refresh();
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendLoginOtp(email);
      if (!result.success) {
        setError(result.error ?? 'Failed to send code');
        return;
      }
      setEmail(result.data?.email ?? email.trim().toLowerCase());
      setMessage('Check your email for a 6-digit code.');
      setStep('otp');
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyLoginOtp(email, code);
      if (!result.success) {
        setError(result.error ?? 'Verification failed');
        return;
      }
      if (result.data?.step === 'profile') {
        setStep('profile');
        return;
      }
      finish();
    });
  }

  function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({ name, workspaceName });
      if (!result.success) {
        setError(result.error ?? 'Could not create workspace');
        return;
      }
      finish();
    });
  }

  return (
    <Card className="w-full shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{PRODUCT_NAME}</CardTitle>
        <CardDescription>
          {step === 'email' && 'Sign in with your email'}
          {step === 'otp' && 'Enter the code we sent you'}
          {step === 'profile' && 'Set up your workspace'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending…' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">{email}</p>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                disabled={pending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={pending}
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Use a different email
            </Button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace name</Label>
              <Input
                id="workspace"
                placeholder="Acme Inc"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating…' : 'Create workspace'}
            </Button>
          </form>
        )}

        {message && (
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        )}
        {error && (
          <p className="text-sm text-destructive text-center" role="alert">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
