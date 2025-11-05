'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuccessBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'success' | 'cancelled' | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');

    if (success === 'true') {
      setStatus('success');
      setShow(true);

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('plan');
        router.replace(url.pathname + url.search);
      }, 5000);
    } else if (cancelled === 'true') {
      setStatus('cancelled');
      setShow(true);

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('cancelled');
        router.replace(url.pathname + url.search);
      }, 5000);
    }
  }, [searchParams, router]);

  if (!show || !status) {
    return null;
  }

  if (status === 'success') {
    return (
      <Alert className="bg-green-50 border-green-200 mb-6">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-900">Subscription Activated!</AlertTitle>
        <AlertDescription className="text-green-800">
          Your payment was successful. Welcome to your new plan! You now have access to all premium features.
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShow(false)}
          className="mt-2"
        >
          Dismiss
        </Button>
      </Alert>
    );
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 mb-6">
      <XCircle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-900">Payment Cancelled</AlertTitle>
      <AlertDescription className="text-amber-800">
        Your payment was cancelled. No charges were made. You can try again anytime.
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShow(false)}
        className="mt-2"
      >
        Dismiss
      </Button>
    </Alert>
  );
}
