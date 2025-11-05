'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import BiometricLogin from './BiometricLogin';
import { useAuth } from '@/lib/authContext';
import { BiometricAuthService } from '@/lib/biometricAuth';

interface BiometricProtectedProps {
  children: ReactNode;
  actionContext: string;
  title?: string;
  description?: string;
  requireAuth?: boolean;
}

export default function BiometricProtected({
  children,
  actionContext,
  title = 'Authentication Required',
  description = 'This action requires verification for your security',
  requireAuth = true,
}: BiometricProtectedProps) {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresBiometric, setRequiresBiometric] = useState(false);

  useEffect(() => {
    checkAuthRequirement();
  }, [user, requireAuth]);

  const checkAuthRequirement = async () => {
    if (!user || !requireAuth) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    try {
      const settings = await BiometricAuthService.getBiometricSettings(user.id);

      if (settings?.require_biometric_for_sensitive && settings?.biometric_enabled) {
        setRequiresBiometric(true);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth requirement:', error);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-sky-blue/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
          </div>
          <p className="text-xl text-deep-navy/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && requiresBiometric && user) {
    return (
      <div className="space-y-6 p-6">
        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle className="text-3xl text-deep-navy mb-2">{title}</CardTitle>
            <CardDescription className="text-xl text-deep-navy/70">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-sky-blue/10 rounded-[16px] p-4 mb-6">
              <p className="text-deep-navy/80 text-center text-lg">
                <strong>Action:</strong> {actionContext}
              </p>
            </div>
          </CardContent>
        </Card>

        <BiometricLogin
          userId={user.id}
          email={user.email || ''}
          onSuccess={handleAuthSuccess}
          mode="reauth"
          actionContext={actionContext}
        />
      </div>
    );
  }

  return <>{children}</>;
}
