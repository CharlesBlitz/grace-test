'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

interface HomeNavProps {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function HomeNav({ showBackButton = false, backHref = '/', backLabel = 'Back' }: HomeNavProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {showBackButton && backHref && (
          <Link href={backHref}>
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label={backLabel}
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        )}
      </div>
      <Link href="/">
        <Button
          variant="ghost"
          className="text-deep-navy hover:bg-white/20 flex items-center gap-2"
          aria-label="Return to home page"
        >
          <Home className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-semibold">Home</span>
        </Button>
      </Link>
    </div>
  );
}
