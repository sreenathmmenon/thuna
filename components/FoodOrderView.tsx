'use client';

export type FoodOrderStage = 'review' | 'corrected' | 'complete';

interface FoodOrderViewProps {
  stage: FoodOrderStage;
  onExplainFee: () => void;
  onCorrect: () => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function FoodOrderView({
  stage,
  onExplainFee,
  onCorrect,
  onConfirm,
  onBack,
}: FoodOrderViewProps) {
  const isComplete = stage === 'complete';
  const item = stage === 'review' ? 'Masala Dosa' : 'Plain Dosa';
  const itemPrice = stage === 'review' ? 120 : 100;
  const total = itemPrice + 25;

  if (isComplete) {
    return (
      <section className="receipt-card" aria-labelledby="order-success-title">
        <span className="receipt-card__check" aria-hidden="true">✓</span>
        <p className="eyebrow">Practice receipt</p>
        <h2 id="order-success-title">SIMULATED ORDER SUCCESS</h2>
        <p className="receipt-card__summary">Plain Dosa, no chutney · Udupi Cafe · Home</p>
        <strong className="receipt-card__total">Rs 125</strong>
        <p className="disclaimer">This was a safe practice. No real order was placed and no money moved.</p>
        <button className="secondary-button" type="button" onClick={onBack}>Back to digital help</button>
      </section>
    );
  }

  return (
    <section className="task-card" aria-labelledby="food-review-title">
      <div className="task-card__header">
        <span className="task-icon task-icon--food" aria-hidden="true">◒</span>
        <div>
          <p className="eyebrow">Restored from your previous order</p>
          <h2 id="food-review-title">Please check your food order</h2>
        </div>
      </div>
      <dl className="review-list">
        <div><dt>Restaurant</dt><dd>Udupi Cafe</dd></div>
        <div><dt>Item</dt><dd>{item}</dd></div>
        <div><dt>Preference</dt><dd>No chutney</dd></div>
        <div><dt>Delivery to</dt><dd>Home</dd></div>
      </dl>
      <div className="price-box">
        <div><span>Food</span><strong>Rs {itemPrice}</strong></div>
        <div><span>Delivery fee</span><strong>Rs 25</strong></div>
        <div className="price-box__total"><span>Total</span><strong>Rs {total}</strong></div>
      </div>
      <button className="text-button" type="button" onClick={onExplainFee}>
        Why is the total higher?
      </button>
      {stage === 'review' ? (
        <button className="secondary-button" type="button" onClick={onCorrect}>
          Change to plain dosa
        </button>
      ) : (
        <p className="change-notice" role="status">Changed only the item. Restaurant, address and “no chutney” are unchanged.</p>
      )}
      <button className="primary-button" type="button" onClick={onConfirm}>
        Yes, confirm this simulated order
      </button>
      <p className="disclaimer">Thuna will never ask for an OTP, PIN, CVV or payment password.</p>
    </section>
  );
}

