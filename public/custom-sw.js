// Custom service worker for push notifications
// This extends the next-pwa generated service worker

// Import workbox if available
if (typeof importScripts === 'function') {
  try {
    importScripts('/workbox-4754cb34.js');
  } catch (e) {
    console.log('Workbox not loaded, continuing without it');
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Handle notification actions
  if (action === 'medication_taken') {
    // Log medication taken
    event.waitUntil(
      fetch('/api/notifications/medication-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          reminderId: data.reminderId,
          action: 'taken',
          timestamp: new Date().toISOString()
        })
      }).then(() => {
        // Show confirmation notification
        self.registration.showNotification('Medication Confirmed', {
          body: 'Thank you for confirming your medication',
          icon: '/icon-check.png',
          badge: '/icon-check.png',
          tag: 'medication-confirmation',
          requireInteraction: false,
          vibrate: [100, 50, 100]
        });
      }).catch(err => console.error('Failed to log medication:', err))
    );
  } else if (action === 'snooze') {
    // Snooze reminder
    event.waitUntil(
      fetch('/api/notifications/medication-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          reminderId: data.reminderId,
          action: 'snooze',
          timestamp: new Date().toISOString()
        })
      }).then(() => {
        // Show snooze confirmation
        self.registration.showNotification('Reminder Snoozed', {
          body: 'We\'ll remind you again in 15 minutes',
          icon: '/icon-snooze.png',
          badge: '/icon-snooze.png',
          tag: 'medication-snooze',
          requireInteraction: false,
          vibrate: [100]
        });
      }).catch(err => console.error('Failed to snooze medication:', err))
    );
  } else if (action === 'call_now') {
    // Open phone dialer
    const phoneNumber = data.phoneNumber || '';
    event.waitUntil(
      clients.openWindow(`tel:${phoneNumber}`)
    );
  } else if (action === 'view_details') {
    // Open app to specific page
    const url = data.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if open
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus().then(() => client.navigate(url));
            }
          }
          // Open new window if not open
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  } else {
    // Default: open or focus app
    const url = data.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus().then(() => {
                if (url !== '/') {
                  return client.navigate(url);
                }
              });
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Error parsing push data:', e);
    data = { title: 'Grace Companion', body: event.data.text() };
  }

  const {
    title = 'Grace Companion',
    body = 'You have a new notification',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag = 'grace-notification',
    requireInteraction = false,
    vibrate = [200],
    actions = [],
    data: notificationData = {}
  } = data;

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction,
    vibrate,
    actions,
    data: notificationData
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        // Log notification delivery
        return fetch('/api/notifications/log-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notificationData.notificationId,
            delivered: true,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error('Failed to log delivery:', err));
      })
  );
});

// Background sync for failed notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Retry failed notification deliveries
      fetch('/api/notifications/sync-pending')
        .then(response => response.json())
        .then(data => {
          console.log('Synced pending notifications:', data);
        })
        .catch(err => {
          console.error('Failed to sync notifications:', err);
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);

  // Log notification dismissal
  const data = event.notification.data || {};
  if (data.notificationId) {
    fetch('/api/notifications/log-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: data.notificationId,
        dismissed: true,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to log dismissal:', err));
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

console.log('Custom service worker loaded with push notification support');
