'use client';

import { useState, useEffect } from 'react';
import { Fingerprint, Scan, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BiometricAuthService } from '@/lib/biometricAuth';

interface BiometricLoginProps {
  userId: string;
  email: string;
  onSuccess: () => void;
  onError?: (error: string) => void;
  mode?: 'login' | 'register' | 'reauth';
  actionContext?: string;
}

export default function BiometricLogin({
  userId,
  email,
  onSuccess,
  onError,
  mode = 'login',
  actionContext,
}: BiometricLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'pin' | 'unknown'>('unknown');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const supported = BiometricAuthService.isWebAuthnSupported();
    setIsSupported(supported);

    if (supported) {
      const type = await BiometricAuthService.getBiometricType();
      setBiometricType(type);
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (mode === 'register') {
        result = await BiometricAuthService.enableBiometric(userId, email);
      } else if (mode === 'reauth' && actionContext) {
        result = await BiometricAuthService.reauthenticateForSensitiveAction(userId, actionContext);
      } else {
        result = await BiometricAuthService.authenticateWithBiometric(userId);
      }

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setError(result.error || 'Authentication failed');
        if (onError) onError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'face') {
      return <Scan className="w-16 h-16 text-sky-blue" strokeWidth={1.5} />;
    } else if (biometricType === 'fingerprint') {
      return <Fingerprint className="w-16 h-16 text-sky-blue" strokeWidth={1.5} />;
    }
    return <Lock className="w-16 h-16 text-sky-blue" strokeWidth={1.5} />;
  };

  const getBiometricLabel = () => {
    if (biometricType === 'face') return 'Face ID';
    if (biometricType === 'fingerprint') return 'Touch ID';
    if (biometricType === 'pin') return 'Device PIN';
    return 'Biometric Authentication';
  };

  const getInstructionText = () => {
    if (mode === 'register') {
      if (biometricType === 'face') {
        return 'Position your face in front of the camera to register Face ID';
      } else if (biometricType === 'fingerprint') {
        return 'Place your finger on the sensor to register your fingerprint';
      }
      return 'Follow the prompts to register your biometric authentication';
    } else if (mode === 'reauth') {
      if (biometricType === 'face') {
        return 'Look at your device to verify your identity';
      } else if (biometricType === 'fingerprint') {
        return 'Place your finger on the sensor to verify your identity';
      }
      return 'Verify your identity to continue';
    } else {
      if (biometricType === 'face') {
        return 'Look at your device to sign in';
      } else if (biometricType === 'fingerprint') {
        return 'Place your finger on the sensor to sign in';
      }
      return 'Use your device authentication to sign in';
    }
  };

  const getButtonText = () => {
    if (mode === 'register') return `Set Up ${getBiometricLabel()}`;
    if (mode === 'reauth') return `Verify with ${getBiometricLabel()}`;
    return `Sign In with ${getBiometricLabel()}`;
  };

  if (!isSupported) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
            Biometric Authentication Not Available
          </CardTitle>
          <CardDescription className="text-center text-lg mt-2">
            Your device or browser doesn't support biometric authentication.
            Please use your password to sign in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg">
      <CardHeader>
        <div className="flex flex-col items-center mb-4">
          <div className={`w-24 h-24 rounded-full ${
            success ? 'bg-mint-green/20' : 'bg-sky-blue/20'
          } flex items-center justify-center mb-4 transition-all duration-300`}>
            {success ? (
              <CheckCircle2 className="w-16 h-16 text-mint-green animate-scale-in" strokeWidth={1.5} />
            ) : isLoading ? (
              <Loader2 className="w-16 h-16 text-sky-blue animate-spin" strokeWidth={1.5} />
            ) : (
              getBiometricIcon()
            )}
          </div>
          <CardTitle className="text-3xl text-center text-deep-navy">
            {success ? 'Authentication Successful!' : getBiometricLabel()}
          </CardTitle>
          <CardDescription className="text-center text-xl mt-3 text-deep-navy/70">
            {success ? 'You may now proceed' : getInstructionText()}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert className="bg-coral-red/10 border-coral-red/30 rounded-[16px]">
            <AlertCircle className="h-5 w-5 text-coral-red" strokeWidth={1.5} />
            <AlertDescription className="text-coral-red text-lg ml-2">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!success && (
          <>
            <Button
              onClick={handleBiometricAuth}
              disabled={isLoading}
              size="lg"
              className="w-full h-20 text-2xl rounded-[20px] bg-sky-blue hover:bg-sky-blue/90 text-white font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-8 h-8 mr-3 animate-spin" strokeWidth={1.5} />
                  Authenticating...
                </>
              ) : (
                <>
                  {getBiometricIcon()}
                  <span className="ml-3">{getButtonText()}</span>
                </>
              )}
            </Button>

            {mode !== 'register' && (
              <div className="text-center">
                <p className="text-deep-navy/60 text-lg">
                  Having trouble? You can also use your password to sign in.
                </p>
              </div>
            )}

            {mode === 'register' && (
              <div className="bg-mint-green/10 rounded-[16px] p-4 space-y-2">
                <h4 className="font-semibold text-lg text-deep-navy flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                  Why use {getBiometricLabel()}?
                </h4>
                <ul className="space-y-2 text-deep-navy/80">
                  <li className="flex items-start gap-2">
                    <span className="text-mint-green mt-1">•</span>
                    <span>No need to remember or type passwords</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-mint-green mt-1">•</span>
                    <span>Sign in with just a touch or glance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-mint-green mt-1">•</span>
                    <span>More secure than traditional passwords</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-mint-green mt-1">•</span>
                    <span>Your biometric data never leaves your device</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
