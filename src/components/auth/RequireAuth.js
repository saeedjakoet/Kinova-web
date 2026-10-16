'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth';

/** Redirects signed-out visitors to /login?next=<current path>. */
export default function RequireAuth({ children }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [session, pathname, router]);

  if (!session) return <div className="min-h-dvh bg-ivory-50" aria-busy="true" />;
  return children;
}
