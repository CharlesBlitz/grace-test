'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Fingerprint,
  Lock,
  Clock,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { BiometricAuthService, WebAuthnCredential } from '@/lib/biometricAuth';
import BiometricLogin from '@/components/BiometricLogin';

export default function BiometricSettingsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [autoLockTimeout, setAutoLockTimeout] = useState(300);
  const [requireBiometricForSensitive, setRequireBiometricForSensitive] = useState(true);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadSettings();
      checkBiometricSupport();
    }
  }, [user]);

  const checkBiometricSupport = async () => {
    const supported = BiometricAuthService.isWebAuthnSupported();
    setIsSupported(supported);

    if (supported) {
      const type = await BiometricAuthService.getBiometricType();
      if (type === 'face') setBiometricType('Face ID');
      else if (type === 'fingerprint') setBiometricType('Touch ID');
      else if (type === 'pin') setBiometricType('Device PIN');
      else setBiometricType('Biometric Authentication');
    }
  };

  const loadSettings = async () => {
    if (!user) return;

    try {
      const settings = await BiometricAuthService.getBiometricSettings(user.id);
      if (settings) {
        setBiometricEnabled(settings.biometric_enabled);
        setAutoLockEnabled(settings.auto_lock_enabled);
        setAutoLockTimeout(settings.auto_lock_timeout_seconds);
        setRequireBiometricForSensitive(settings.require_biometric_for_sensitive);
      }

      const userCredentials = await BiometricAuthService.getUserCredentials(user.id);
      setCredentials(userCredentials);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = () => {
    setShowRegistration(true);
  };

  const handleRegistrationSuccess = async () => {
    setShowRegistration(false);
    setBiometricEnabled(true);
    await loadSettings();

    toast({
      title: 'Biometric Authentication Enabled',
      description: `${biometricType} has been successfully set up`,
    });
  };

  const handleDisableBiometric = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const success = await BiometricAuthService.disableBiometric(user.id);

      if (success) {
        setBiometricEnabled(false);
        setCredentials([]);

        toast({
          title: 'Biometric Authentication Disabled',
          description: 'All biometric credentials have been removed',
        });
      } else {
        throw new Error('Failed to disable biometric authentication');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable biometric authentication',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string, deviceName: string) => {
    setSaving(true);
    try {
      const success = await BiometricAuthService.revokeCredential(credentialId);

      if (success) {
        await loadSettings();

        toast({
          title: 'Device Removed',
          description: `${deviceName} has been removed from your account`,
        });
      } else {
        throw new Error('Failed to revoke credential');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove device',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const success = await BiometricAuthService.updateBiometricSettings(user.id, {
        auto_lock_enabled: autoLockEnabled,
        auto_lock_timeout_seconds: autoLockTimeout,
        require_biometric_for_sensitive: requireBiometricForSensitive,
      });

      if (success) {
        toast({
          title: 'Settings Saved',
          description: 'Your biometric settings have been updated',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatTimeout = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-2xl text-deep-navy animate-pulse">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/settings">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Fingerprint className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              <CardTitle className="text-3xl">Biometric Security</CardTitle>
            </div>
            <CardDescription className="text-xl">
              Manage fingerprint, face recognition, and security settings
            </CardDescription>
          </CardHeader>
        </Card>

        {!isSupported && (
          <Alert className="bg-amber-500/10 border-amber-500/30 rounded-[16px]">
            <AlertCircle className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
            <AlertDescription className="text-amber-700 text-lg ml-2">
              Biometric authentication is not supported on this device or browser.
            </AlertDescription>
          </Alert>
        )}

        {showRegistration && user && (
          <BiometricLogin
            userId={user.id}
            email={user.email || ''}
            onSuccess={handleRegistrationSuccess}
            onError={() => setShowRegistration(false)}
            mode="register"
          />
        )}

        {isSupported && !showRegistration && (
          <>
            <Card className="bg-white rounded-[20px] shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Fingerprint className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                  {biometricType}
                </CardTitle>
                <CardDescription className="text-lg">
                  Use your device biometrics to sign in quickly and securely
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-xl font-semibold block mb-1">Enable Biometric Login</Label>
                    <p className="text-base text-deep-navy/60">
                      Sign in with {biometricType.toLowerCase()} instead of password
                    </p>
                  </div>
                  <Switch
                    checked={biometricEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleEnableBiometric();
                      } else {
                        handleDisableBiometric();
                      }
                    }}
                    disabled={saving}
                    className="scale-125"
                  />
                </div>

                {biometricEnabled && credentials.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold">Registered Devices</Label>
                    {credentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between p-4 bg-sky-blue/10 rounded-[16px]"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                          <div>
                            <p className="font-semibold text-deep-navy">{cred.device_name}</p>
                            <p className="text-sm text-deep-navy/60">
                              Added {new Date(cred.created_at).toLocaleDateString()}
                              {cred.last_used_at && (
                                <> • Last used {new Date(cred.last_used_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeCredential(cred.credential_id, cred.device_name)}
                          disabled={saving}
                          className="text-coral-red hover:text-coral-red/80"
                        >
                          <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white rounded-[20px] shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Lock className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                  Auto-Lock Settings
                </CardTitle>
                <CardDescription className="text-lg">
                  Automatically lock the app after inactivity for your security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-xl font-semibold block mb-1">Enable Auto-Lock</Label>
                    <p className="text-base text-deep-navy/60">
                      Lock the app when you're not using it
                    </p>
                  </div>
                  <Switch
                    checked={autoLockEnabled}
                    onCheckedChange={setAutoLockEnabled}
                    disabled={saving}
                    className="scale-125"
                  />
                </div>

                {autoLockEnabled && (
                  <div>
                    <Label className="text-lg font-semibold mb-3 block flex items-center gap-2">
                      <Clock className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                      Lock After: {formatTimeout(autoLockTimeout)}
                    </Label>
                    <Slider
                      value={[autoLockTimeout]}
                      onValueChange={(value) => setAutoLockTimeout(value[0])}
                      min={60}
                      max={1800}
                      step={60}
                      className="py-4"
                    />
                    <div className="flex justify-between text-sm text-deep-navy/60 mt-2">
                      <span>1 minute</span>
                      <span>30 minutes</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white rounded-[20px] shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Shield className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
                  Sensitive Actions
                </CardTitle>
                <CardDescription className="text-lg">
                  Require extra verification for important actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-xl font-semibold block mb-1">
                      Require Biometric for Sensitive Actions
                    </Label>
                    <p className="text-base text-deep-navy/60">
                      Verify your identity before viewing medications, documents, or changing settings
                    </p>
                  </div>
                  <Switch
                    checked={requireBiometricForSensitive}
                    onCheckedChange={setRequireBiometricForSensitive}
                    disabled={saving || !biometricEnabled}
                    className="scale-125"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              size="lg"
              className="w-full h-16 text-xl rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" strokeWidth={1.5} />
                  Save Settings
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
