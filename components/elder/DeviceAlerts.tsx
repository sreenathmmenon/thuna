'use client';

import { useEffect, useState } from 'react';

export function DeviceAlerts(): JSX.Element | null {
  const [permission, setPermission] =
    useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    void navigator.serviceWorker.register('/sw.js');
    setPermission(Notification.permission);
  }, []);

  if (permission === 'granted' || permission === 'unsupported') return null;

  return (
    <section className="device-alert-card" aria-label="Turn on reminder alerts">
      <div>
        <strong>Turn on reminder alerts</strong>
        <p>Thuna can keep a reminder visible until you respond.</p>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={async () => {
          const next = await Notification.requestPermission();
          setPermission(next);
        }}
      >
        Turn on
      </button>
    </section>
  );
}

export async function showDeviceReminder(input: {
  routineId: string;
  title: string;
  body: string;
}): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof Notification === 'undefined' ||
    Notification.permission !== 'granted'
  ) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'THUNA_REMINDER', ...input });
}
