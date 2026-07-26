'use client';

import type { ReactNode } from 'react';

export type NoticeTone = 'neutral' | 'attention' | 'success' | 'danger';

interface NoticeProps {
  tone?: NoticeTone;
  children: ReactNode;
}

const TONE_MODIFIER: Record<NoticeTone, string> = {
  neutral: '',
  attention: ' notice--attention',
  success: ' notice--success',
  danger: ' notice--danger',
};

/** Shape prefix so meaning is never carried by colour alone. */
const TONE_MARK: Record<NoticeTone, string> = {
  neutral: '•',
  attention: '▲',
  success: '✓',
  danger: '■',
};

export function PracticeRunBadge(): JSX.Element {
  return (
    <p className="practice" role="note">
      This is a practice run.
    </p>
  );
}

export function OfflineBanner(): JSX.Element {
  return (
    <p className="offline-banner" role="status">
      No internet connection. I&rsquo;ll keep what I can on this phone.
    </p>
  );
}

export function Notice({ tone = 'neutral', children }: NoticeProps): JSX.Element {
  return (
    <div className={`notice${TONE_MODIFIER[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span aria-hidden="true">{TONE_MARK[tone]}</span>
      <span>{children}</span>
    </div>
  );
}
