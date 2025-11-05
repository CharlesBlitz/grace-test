'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BiometricLogin from './BiometricLogin';
import { useAuth } from '@/lib/authContext';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  reason?: string;
  lockTime?: Date;
}

export default function LockScreen({ isLocked, onUnlock, reason, lockTime }: LockScreenProps) {
  const { user, profile } = useAuth();
  const [showBiometric, setShowBiometric] = useState(false);
  const [lockDuration, setLockDuration] = useState<string>('');

  useEffect(() => {
    if (!isLocked) return;

    setShowBiometric(true);

    if (lockTime) {
      const updateDuration = () => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - lockTime.getTime()) / 1000);

        if (diff < 60) {
          setLockDuration(`${diff} seconds ago`);
        } else if (diff < 3600) {
          const minutes = Math.floor(diff / 60);
          setLockDuration(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
        } else {
          const hours = Math.floor(diff / 3600);
          setLockDuration(`${hours} hour${hours > 1 ? 's' : ''} ago`);
        }
      };

      updateDuration();
      const interval = setInterval(updateDuration, 1000);

      return () => clearInterval(interval);
    }
  }, [isLocked, lockTime]);

  const getLockReason = () => {
    if (reason === 'inactivity_timeout') {
      return 'Your session was locked due to inactivity';
    } else if (reason === 'app_backgrounded') {
      return 'Your session was locked when the app was minimized';
    } else if (reason) {
      return `Session locked: ${reason}`;
    }
    return 'Your session is locked for security';
  };

  if (!isLocked || !user || !profile) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-blue to-warm-cream z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 backdrop-blur-md bg-white/30" />

      <div className="relative max-w-2xl w-full space-y-6 animate-fade-in">
        <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-2xl border-2 border-sky-blue/30">
          <CardHeader className="text-center pb-3">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-sky-blue/20 flex items-center justify-center">
                <Lock className="w-12 h-12 text-sky-blue" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle className="text-3xl md:text-4xl text-deep-navy mb-2">
              Session Locked
            </CardTitle>
            <CardDescription className="text-xl text-deep-navy/70">
              {getLockReason()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {lockTime && lockDuration && (
              <div className="flex items-center justify-center gap-2 text-deep-navy/60">
                <Clock className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-lg">Locked {lockDuration}</span>
              </div>
            )}

            <div className="bg-sky-blue/10 rounded-[20px] p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Unlock className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-deep-navy mb-1">
                Welcome back, {profile.name}!
              </h3>
              <p className="text-lg text-deep-navy/70">
                Please verify your identity to continue
              </p>
            </div>
          </CardContent>
        </Card>

        {showBiometric && (
          <BiometricLogin
            userId={user.id}
            email={user.email || ''}
            onSuccess={onUnlock}
            mode="reauth"
            actionContext="unlock_session"
          />
        )}

        <Alert className="bg-mint-green/10 border-mint-green/30 rounded-[16px]">
          <AlertCircle className="h-5 w-5 text-mint-green" strokeWidth={1.5} />
          <AlertDescription className="text-mint-green text-base ml-2">
            Your session is automatically locked for your security and privacy.
            This helps protect your personal information.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
