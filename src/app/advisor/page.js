import { Suspense } from 'react';
import AdvisorWorkspace from '@/components/workspace/AdvisorWorkspace';
import RequireAuth from '@/components/auth/RequireAuth';

export const metadata = {
  title: 'Pairing Advisor · Kinova Breeding Advisor — PoC',
};

export default function AdvisorPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-dvh bg-ivory-50" aria-busy="true" />}>
        <AdvisorWorkspace />
      </Suspense>
    </RequireAuth>
  );
}
