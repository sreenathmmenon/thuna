'use client';

import { TalkButton } from './TalkButton';
import type { TalkVisualState } from './TalkButton';

export interface HomeContextItem {
  id: string;
  slot: 'due' | 'soon' | 'continue';
  label: string;
  title: string;
  detail: string;
}

interface HomeScreenProps {
  greeting: string;
  subtitle?: string;
  talkState: TalkVisualState;
  onTalk: () => void;
  items: HomeContextItem[];
  onItem: (item: HomeContextItem) => void;
  familyHelpLabel?: string;
  onFamilyHelp?: () => void;
}

const MAX_ITEMS = 3;

const DOT_MODIFIER: Record<HomeContextItem['slot'], string> = {
  due: 'dot--due',
  soon: 'dot--soon',
  continue: 'dot--open',
};

export function HomeScreen({
  greeting,
  subtitle,
  talkState,
  onTalk,
  items,
  onItem,
  familyHelpLabel,
  onFamilyHelp,
}: HomeScreenProps): JSX.Element {
  const visibleItems = items.slice(0, MAX_ITEMS);

  return (
    <div className="stack-lg">
      <div>
        <h1 className="greeting">{greeting}</h1>
        {subtitle ? <p className="greeting-sub">{subtitle}</p> : null}
      </div>

      <div className="center">
        <TalkButton state={talkState} onPress={onTalk} hint="Press once, then speak" />
      </div>

      <div>
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`context-card context-card--${item.slot}`}
              onClick={() => onItem(item)}
              aria-label={`${item.label}: ${item.title}. ${item.detail}`}
            >
              <span className="context-card__label">
                <span className={`dot ${DOT_MODIFIER[item.slot]}`} aria-hidden="true" />
                {item.label}
              </span>
              <span className="context-card__title">{item.title}</span>
              <span className="context-card__detail">{item.detail}</span>
            </button>
          ))
        ) : (
          <div className="card">
            <p className="body-text">Nothing needs you right now.</p>
            <p className="caption mt-4">I&rsquo;ll let you know when something comes up.</p>
          </div>
        )}
      </div>

      {familyHelpLabel && onFamilyHelp ? (
        <button type="button" className="btn btn--quiet" onClick={onFamilyHelp}>
          {familyHelpLabel}
        </button>
      ) : null}
    </div>
  );
}

export default HomeScreen;
