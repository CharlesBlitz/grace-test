'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
} from '@/lib/pushNotifications';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void;
  onDismiss?: () => void;
  autoShow?: boolean;
}

export default function NotificationPermissionPrompt({
  onPermissionGranted,
  onDismiss,
  autoShow = false,
}: NotificationPermissionPromptProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const supported = isPushNotificationSupported();
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Check if we should show the prompt
    const hasAsked = localStorage.getItem('notification-permission-asked');
    const shouldShow =
      supported &&
      currentPermission === 'default' &&
      !hasAsked &&
      autoShow;

    setShowPrompt(shouldShow);
  }, [user, autoShow]);

  const handleRequestPermission = async () => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to enable notifications',
        variant: 'destructive',
      });
      return;
    }

    setIsRequesting(true);

    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === 'granted') {
        // Subscribe to push notifications
        await subscribeToPushNotifications(user.id);

        toast({
          title: 'Notifications enabled!',
          description: "You'll now receive reminders and alerts",
        });

        localStorage.setItem('notification-permission-asked', 'true');
        setShowPrompt(false);

        if (onPermissionGranted) {
          onPermissionGranted();
        }
      } else if (result === 'denied') {
        toast({
          title: 'Notifications blocked',
          description: 'You can enable them later in your browser settings',
          variant: 'destructive',
        });

        localStorage.setItem('notification-permission-asked', 'true');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-permission-asked', 'true');
    setShowPrompt(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-md w-full bg-white rounded-[24px] shadow-xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute top-4 right-4 rounded-full"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-blue/20 flex items-center justify-center">
            <Bell className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
          </div>

          <CardTitle className="text-2xl text-center text-deep-navy">
            Stay Connected with Reminders
          </CardTitle>
          <CardDescription className="text-center text-lg">
            Enable notifications to receive:
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-sky-blue/10">
              <div className="w-8 h-8 rounded-full bg-sky-blue/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💊</span>
              </div>
              <div>
                <p className="font-semibold text-deep-navy">Medication Reminders</p>
                <p className="text-sm text-deep-navy/70">
                  Never miss your medications with timely alerts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-mint-green/10">
              <div className="w-8 h-8 rounded-full bg-mint-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">❤️</span>
              </div>
              <div>
                <p className="font-semibold text-deep-navy">Wellness Check-Ins</p>
                <p className="text-sm text-deep-navy/70">
                  Daily reminders to share how you're feeling
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-warm-cream/50">
              <div className="w-8 h-8 rounded-full bg-warm-cream flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <p className="font-semibold text-deep-navy">Family Messages</p>
                <p className="text-sm text-deep-navy/70">
                  Get notified when family members reach out
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full h-14 text-lg rounded-[16px] bg-sky-blue hover:bg-sky-blue/90 text-white font-semibold"
            >
              <Bell className="w-5 h-5 mr-2" strokeWidth={1.5} />
              {isRequesting ? 'Enabling...' : 'Enable Notifications'}
            </Button>

            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="w-full h-12 rounded-[16px] text-deep-navy/70 hover:text-deep-navy"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-deep-navy/50">
            You can change notification settings anytime in your profile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple status indicator component
export function NotificationStatusIndicator() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(getNotificationPermission());
    }
  }, []);

  if (!isPushNotificationSupported()) {
    return null;
  }

  const getStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-mint-green';
      case 'denied':
        return 'text-coral-red';
      default:
        return 'text-soft-gray';
    }
  };

  const getStatusIcon = () => {
    if (permission === 'granted') {
      return <Bell className={`w-5 h-5 ${getStatusColor()}`} strokeWidth={1.5} />;
    }
    return <BellOff className={`w-5 h-5 ${getStatusColor()}`} strokeWidth={1.5} />;
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon()}
      <span className={`text-sm ${getStatusColor()}`}>
        {permission === 'granted'
          ? 'Notifications On'
          : permission === 'denied'
          ? 'Notifications Off'
          : 'Notifications Disabled'}
      </span>
    </div>
  );
}
