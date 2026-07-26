'use client';

import { useEffect, useState } from 'react';
import type {
  FoodAddress,
  FoodCartSnapshot,
  FoodConfirmationToken,
  FoodMenuItem,
  FoodRestaurant,
} from '../lib/adapters/food-commerce';

export interface SwiggyProviderStatus {
  mode: 'mock' | 'swiggy';
  state: string;
  connected: boolean;
  message: string;
  realOrderEnabled: boolean;
}

interface Props {
  status: SwiggyProviderStatus;
  onBack: () => void;
}

async function providerRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/integrations/swiggy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(value.error ?? 'Swiggy is unavailable.');
  return value;
}

export function SwiggyFoodOrderView({ status: initialStatus, onBack }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [addresses, setAddresses] = useState<FoodAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [query, setQuery] = useState('dosa');
  const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
  const [restaurant, setRestaurant] = useState<FoodRestaurant>();
  const [items, setItems] = useState<FoodMenuItem[]>([]);
  const [item, setItem] = useState<FoodMenuItem>();
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<FoodCartSnapshot>();
  const [confirmation, setConfirmation] = useState<FoodConfirmationToken>();
  const [message, setMessage] = useState(status.message);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Swiggy is unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const loadAddresses = () => run(async () => {
    const result = await providerRequest<{ ok: boolean; value?: FoodAddress[]; error?: { message: string } }>({
      action: 'GET_ADDRESSES',
    });
    if (!result.ok) throw new Error(result.error?.message);
    setAddresses(result.value ?? []);
    setAddressId(result.value?.[0]?.id ?? '');
    setMessage(result.value?.length ? 'Choose where you want the food delivered.' : 'No saved address was returned.');
  });

  useEffect(() => {
    if (status.connected && addresses.length === 0) void loadAddresses();
    // This is intentionally keyed only to the authenticated connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.connected]);

  if (!status.connected) {
    return (
      <section className="task-card" aria-labelledby="swiggy-connect-title">
        <p className="eyebrow">Food provider</p>
        <h2 id="swiggy-connect-title">
          {status.state === 'EXPIRED' || status.state === 'RECONNECT_REQUIRED'
            ? 'Please reconnect Swiggy'
            : status.state === 'PROVIDER_UNAVAILABLE'
              ? 'Swiggy is unavailable'
              : 'Connect Swiggy'}
        </h2>
        <p role="status">{message}</p>
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={() => void run(async () => {
            setMessage('Opening Swiggy’s secure connection page…');
            const result = await providerRequest<{ connectUrl?: string; status?: SwiggyProviderStatus }>({ action: 'CONNECT' });
            if (!result.connectUrl) throw new Error('Swiggy did not provide a secure connection page.');
            window.location.assign(result.connectUrl);
          })}
        >
          {busy ? 'Connecting…' : 'Connect Swiggy'}
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>Back</button>
        <p className="disclaimer">Enter your phone details only on Swiggy’s page. Thuna never sees your OTP.</p>
      </section>
    );
  }

  const selectedAddress = addresses.find((address) => address.id === addressId);

  return (
    <section className="task-card" aria-labelledby="swiggy-food-title">
      <p className="eyebrow">Swiggy is connected</p>
      <h2 id="swiggy-food-title">{cart ? 'Your real Swiggy cart is ready' : 'Choose your food'}</h2>
      <p role="status">{message}</p>

      {!cart && (
        <>
          <label>
            Delivery address
            <select value={addressId} onChange={(event) => setAddressId(event.target.value)} disabled={busy}>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>{address.label}</option>
              ))}
            </select>
          </label>
          <label>
            What would you like?
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !addressId || !query.trim()}
            onClick={() => void run(async () => {
              const result = await providerRequest<{ ok: boolean; value?: FoodRestaurant[]; error?: { message: string } }>({
                action: 'SEARCH_RESTAURANTS',
                addressId,
                query,
              });
              if (!result.ok) throw new Error(result.error?.message);
              setRestaurants(result.value?.filter((entry) => entry.available) ?? []);
              setRestaurant(undefined);
              setItems([]);
              setMessage('Choose an open restaurant.');
            })}
          >
            Find restaurants
          </button>
          {restaurants.map((entry) => (
            <button
              key={entry.id}
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void run(async () => {
                setRestaurant(entry);
                const result = await providerRequest<{ ok: boolean; value?: FoodMenuItem[]; error?: { message: string } }>({
                  action: 'GET_MENU',
                  addressId,
                  restaurantId: entry.id,
                });
                if (!result.ok) throw new Error(result.error?.message);
                setItems(result.value?.filter((menuItem) => menuItem.available) ?? []);
                setMessage(`Choose an item from ${entry.name}.`);
              })}
            >
              {entry.name}{entry.deliveryMinutes ? ` · about ${entry.deliveryMinutes} min` : ''}
            </button>
          ))}
          {items.map((entry, index) => (
            <button
              key={`${entry.id}-${index}`}
              className="secondary-button"
              type="button"
              disabled={busy || entry.hasVariants === true || entry.hasAddons === true}
              onClick={() => {
                setItem(entry);
                setMessage(`${entry.name} selected. You can change the quantity before preparing the cart.`);
              }}
            >
              {entry.name} · Rs {entry.priceRupees}
            </button>
          ))}
          {item && restaurant && selectedAddress && (
            <>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(Math.max(1, Number(event.target.value)));
                    setConfirmation(undefined);
                  }}
                />
              </label>
              <button
                className="primary-button"
                type="button"
                disabled={busy}
                onClick={() => void run(async () => {
                  const result = await providerRequest<{ ok: boolean; value?: FoodCartSnapshot; error?: { message: string } }>({
                    action: 'PREPARE_CART',
                    addressId,
                    addressLabel: selectedAddress.label,
                    restaurantId: restaurant.id,
                    restaurant: restaurant.name,
                    itemId: item.id,
                    itemName: item.name,
                    quantity,
                  });
                  if (!result.ok || !result.value) throw new Error(result.error?.message);
                  setCart(result.value);
                  setConfirmation(undefined);
                  setMessage('Please check the authoritative Swiggy cart and exact total.');
                })}
              >
                Prepare real Swiggy cart
              </button>
            </>
          )}
        </>
      )}

      {cart && (
        <>
          <dl className="review-list">
            <div><dt>Restaurant</dt><dd>{cart.restaurant}</dd></div>
            {cart.lines.map((line, index) => (
              <div key={`${line.name}-${index}`}><dt>Item</dt><dd>{line.quantity} × {line.name}</dd></div>
            ))}
            <div><dt>Delivery to</dt><dd>{cart.addressLabel}</dd></div>
          </dl>
          <div className="price-box">
            <div><span>Food</span><strong>Rs {cart.itemTotalRupees}</strong></div>
            <div><span>Fees</span><strong>Rs {cart.deliveryFeeRupees}</strong></div>
            <div className="price-box__total"><span>Authoritative total</span><strong>Rs {cart.grandTotalRupees}</strong></div>
          </div>
          {!confirmation ? (
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void run(async () => {
                const result = await providerRequest<{ ok: boolean; value?: FoodConfirmationToken; error?: { message: string } }>({
                  action: 'CONFIRM_CART',
                  snapshot: cart,
                });
                if (!result.ok || !result.value) throw new Error(result.error?.message);
                setConfirmation(result.value);
                setMessage(status.realOrderEnabled
                  ? 'The cart is confirmed. A second deliberate confirmation is required to place the real order.'
                  : 'Real Swiggy cart prepared. Order placement is disabled for this test.');
              })}
            >
              Yes, confirm this exact cart
            </button>
          ) : status.realOrderEnabled ? (
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void run(async () => {
                const result = await providerRequest<{ status: string; error?: { message: string } }>({
                  action: 'EXECUTE',
                  confirmation,
                  deliberateConfirmation: true,
                });
                setMessage(result.error?.message ?? 'The real order request was sent.');
              })}
            >
              Place this real Swiggy order now
            </button>
          ) : (
            <p className="change-notice">Real Swiggy cart prepared. Order placement is disabled for this test.</p>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setCart(undefined);
              setConfirmation(undefined);
              setMessage('Change the selection, then prepare the cart again.');
            }}
          >
            Correct item or quantity
          </button>
        </>
      )}
      <button className="text-button" type="button" onClick={onBack}>Back to digital help</button>
      <p className="disclaimer">Thuna will never ask for an OTP, PIN, CVV or payment password.</p>
    </section>
  );
}
