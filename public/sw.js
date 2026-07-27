self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'THUNA_REMINDER' || typeof data.routineId !== 'string') return;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Thuna reminder', {
      body: data.body || 'It is time for your reminder.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `thuna-reminder-${data.routineId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 900],
      data: { routineId: data.routineId, url: '/?area=reminders' },
      actions: [
        { action: 'done', title: 'Done' },
        { action: 'snooze', title: 'Remind me later' },
        { action: 'family', title: 'Ask family' },
      ],
    }),
  );
});

async function updateReminder(routineId, body) {
  const response = await fetch(`/api/routines/${encodeURIComponent(routineId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Reminder update failed.');
}

async function askFamily(routineId) {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routineId, explicitConsent: true }),
  });
  if (!response.ok) throw new Error('Family request failed.');
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const routineId = event.notification.data?.routineId;
  const openReminders = () => self.clients.openWindow('/?area=reminders');
  if (!routineId) {
    event.waitUntil(openReminders());
    return;
  }

  if (event.action === 'done') {
    event.waitUntil(
      updateReminder(routineId, { action: 'COMPLETE', response: 'done' })
        .catch(() => undefined)
        .then(openReminders),
    );
    return;
  }
  if (event.action === 'snooze') {
    event.waitUntil(
      updateReminder(routineId, { action: 'SNOOZE', minutes: 10 })
        .catch(() => undefined)
        .then(openReminders),
    );
    return;
  }
  if (event.action === 'family') {
    event.waitUntil(askFamily(routineId).catch(() => undefined).then(openReminders));
    return;
  }
  event.waitUntil(openReminders());
});
