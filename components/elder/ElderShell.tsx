'use client';

import type { ReactNode } from 'react';

import { OfflineBanner } from './Notices';

export type ElderArea = 'home' | 'talk' | 'reminders';

interface NavDestination {
  area: ElderArea;
  glyph: string;
  label: string;
}

const NAV_DESTINATIONS: readonly NavDestination[] = [
  { area: 'home', glyph: '⌂', label: 'Home' },
  { area: 'talk', glyph: '◉', label: 'Talk' },
  { area: 'reminders', glyph: '◔', label: 'Reminders' },
];

interface BottomNavigationProps {
  area: ElderArea;
  onNavigate: (area: ElderArea) => void;
}

export function BottomNavigation({ area, onNavigate }: BottomNavigationProps): JSX.Element {
  return (
    <nav className="nav" aria-label="Main">
      {NAV_DESTINATIONS.map((destination) => {
        const isActive = destination.area === area;
        const className =
          destination.area === 'talk' ? 'nav__item nav__item--talk' : 'nav__item';

        return (
          <button
            key={destination.area}
            type="button"
            className={className}
            onClick={() => onNavigate(destination.area)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${destination.label}${isActive ? ', current page' : ''}`}
          >
            <span className="nav__glyph" aria-hidden="true">
              {destination.glyph}
            </span>
            <span>{destination.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface ElderShellProps {
  area: ElderArea;
  onNavigate: (area: ElderArea) => void;
  title?: string;
  onBack?: () => void;
  offline?: boolean;
  hideNav?: boolean;
  children: ReactNode;
}

export function ElderShell({
  area,
  onNavigate,
  title,
  onBack,
  offline = false,
  hideNav = false,
  children,
}: ElderShellProps): JSX.Element {
  const showHeader = Boolean(title) || Boolean(onBack);

  return (
    <div className="shell">
      <main className="shell__main">
        {/* Sits inside main: .offline-banner uses negative margins tuned to
            .shell__main padding so it bleeds to the full shell width. */}
        {offline ? <OfflineBanner /> : null}

        {showHeader ? (
          <header className="header">
            {onBack ? (
              <button
                type="button"
                className="header__back"
                onClick={onBack}
                aria-label="Go back"
              >
                <span aria-hidden="true">←</span>
                <span>Back</span>
              </button>
            ) : null}
            {title ? <h1 className="header__title">{title}</h1> : null}
          </header>
        ) : null}

        {children}
      </main>

      {hideNav ? null : <BottomNavigation area={area} onNavigate={onNavigate} />}
    </div>
  );
}

export default ElderShell;
