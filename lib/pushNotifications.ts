// Push Notification Management Library
// Handles Web Push API, service worker registration, and notification subscriptions

import { supabase } from './supabaseClient';

// VAPID public key - this should be generated and stored securely
// For now, using a placeholder. In production, generate using web-push library
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Vibration patterns for different notification types
export const VIBRATION_PATTERNS = {
  gentle: [100], // Single short pulse
  medium: [200, 100, 200], // Double pulse
  strong: [300, 100, 300, 100, 300], // Triple pulse with pauses
  urgent: [100, 50, 100, 50, 100, 50, 100, 50, 100], // Rapid repeating
  emergency: [500, 200, 500, 200, 500], // Long intense pulses
};

// Notification icons for different types
export const NOTIFICATION_ICONS = {
  medication: '/icon-pill.png',
  wellness: '/icon-heart.png',
  message: '/icon-message.png',
  emergency: '/icon-alert.png',
  incident: '/icon-warning.png',
  conversation: '/icon-mic.png',
  default: '/icon-192.png',
};

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Check current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

// Request notification permission from user
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/custom-sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  userId: string
): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      console.error('Push notifications not supported');
      return null;
    }

    // Check permission
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      console.error('Notification permission not granted');
      return null;
    }

    // Get or register service worker
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription && VAPID_PUBLIC_KEY) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    if (subscription) {
      // Save subscription to database
      await savePushSubscription(userId, subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Save push subscription to database
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  try {
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys || {};

    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscriptionJson.endpoint || '',
        p256dh_key: keys.p256dh || '',
        auth_key: keys.auth || '',
        device_info: deviceInfo,
        is_active: true,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }

    console.log('Push subscription saved successfully');
  } catch (error) {
    console.error('Error in savePushSubscription:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(
  userId: string
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();

      // Mark subscription as inactive in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('Error updating subscription status:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Show local notification (doesn't require push)
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.error('Notifications not supported');
    return;
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.error('Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    });
  }
}

// Create medication reminder notification
export function createMedicationNotification(
  medicationName: string,
  dosage: string,
  reminderId: string,
  vibrationIntensity: 'gentle' | 'medium' | 'strong' = 'medium'
): {
  title: string;
  options: NotificationOptions;
} {
  return {
    title: 'Medication Reminder',
    options: {
      body: `Time to take ${medicationName} (${dosage})`,
      icon: NOTIFICATION_ICONS.medication,
      badge: NOTIFICATION_ICONS.medication,
      tag: `medication-${reminderId}`,
      requireInteraction: true,
      vibrate: VIBRATION_PATTERNS[vibrationIntensity],
      actions: [
        {
          action: 'medication_taken',
          title: 'Taken',
          icon: '/icon-check.png',
        },
        {
          action: 'snooze',
          title: 'Snooze 15 min',
          icon: '/icon-snooze.png',
        },
      ],
      data: {
        type: 'medication',
        reminderId,
        url: '/medications',
      },
    },
  };
}

// Create wellness check-in notification
export function createWellnessNotification(
  vibrationIntensity: 'gentle' | 'medium' | 'strong' = 'gentle'
): {
  title: string;
  options: NotificationOptions;
} {
  return {
    title: 'Daily Wellness Check-In',
    options: {
      body: 'How are you feeling today? Take a moment to check in.',
      icon: NOTIFICATION_ICONS.wellness,
      badge: NOTIFICATION_ICONS.wellness,
      tag: 'wellness-checkin',
      vibrate: VIBRATION_PATTERNS[vibrationIntensity],
      data: {
        type: 'wellness',
        url: '/wellness',
      },
    },
  };
}

// Create emergency alert notification
export function createEmergencyNotification(
  residentName: string,
  incidentType: string,
  severity: string,
  phoneNumber?: string
): {
  title: string;
  options: NotificationOptions;
} {
  return {
    title: '🚨 EMERGENCY ALERT',
    options: {
      body: `${residentName} - ${incidentType} (${severity})`,
      icon: NOTIFICATION_ICONS.emergency,
      badge: NOTIFICATION_ICONS.emergency,
      tag: 'emergency-alert',
      requireInteraction: true,
      vibrate: VIBRATION_PATTERNS.emergency,
      actions: phoneNumber
        ? [
            {
              action: 'call_now',
              title: 'Call Now',
              icon: '/icon-phone.png',
            },
            {
              action: 'view_details',
              title: 'View Details',
              icon: '/icon-info.png',
            },
          ]
        : [
            {
              action: 'view_details',
              title: 'View Details',
              icon: '/icon-info.png',
            },
          ],
      data: {
        type: 'emergency',
        phoneNumber,
        url: '/organization/incidents',
      },
    },
  };
}

// Create persistent conversation notification
export function createConversationNotification(): {
  title: string;
  options: NotificationOptions;
} {
  return {
    title: 'Active Conversation',
    options: {
      body: 'Grace is listening...',
      icon: NOTIFICATION_ICONS.conversation,
      badge: NOTIFICATION_ICONS.conversation,
      tag: 'active-conversation',
      requireInteraction: true,
      silent: true, // Don't make sound for persistent notification
      data: {
        type: 'conversation',
        url: '/chat',
        persistent: true,
      },
    },
  };
}

// Get notification preferences for user
export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }

  return data;
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<any>
) {
  const { error } = await supabase
    .from('notification_preferences')
    .update(preferences)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

// Check if currently in quiet hours
export function isInQuietHours(
  quietHoursStart: string,
  quietHoursEnd: string
): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle quiet hours that span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

// Log notification delivery
export async function logNotificationDelivery(
  userId: string,
  notificationType: string,
  title: string,
  body: string,
  metadata: any = {}
) {
  const { error } = await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    body,
    metadata,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error logging notification:', error);
  }
}
