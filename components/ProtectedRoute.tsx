'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Store the intended destination
        const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
        router.replace(redirectUrl);
      } else {
        setIsVerifying(false);
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream flex items-center justify-center">
        <div className="text-2xl text-deep-navy animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
