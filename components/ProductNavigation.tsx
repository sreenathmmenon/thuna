import type { ProductArea } from '../lib/client-api';

interface ProductNavigationProps {
  active: ProductArea;
  onNavigate: (area: ProductArea) => void;
}

const items: Array<{ id: ProductArea; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'talk', label: 'Talk', icon: '●' },
  { id: 'help', label: 'Digital help', icon: '✦' },
  { id: 'routines', label: 'My routines', icon: '◷' },
  { id: 'history', label: 'History', icon: '✓' },
  { id: 'family', label: 'Trusted family', icon: '♢' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export function ProductNavigation({ active, onNavigate }: ProductNavigationProps) {
  return (
    <nav className="product-nav" aria-label="Main navigation">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">ത</span>
        <span><strong>Thuna</strong><small>Your patient digital companion</small></span>
      </div>
      <div className="product-nav__items">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={active === item.id ? 'is-active' : ''}
            onClick={() => onNavigate(item.id)}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      <div className="privacy-note">
        <span aria-hidden="true">◇</span>
        <p><strong>Private by design</strong><br />Thuna never stores secret banking numbers.</p>
      </div>
    </nav>
  );
}
