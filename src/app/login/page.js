import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign in · Kinova Breeding Advisor — PoC',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory-50 px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
