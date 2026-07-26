'use client';

import { useState } from 'react';
import type { TaskKind } from '../lib/client-api';
import { FoodOrderView, type FoodOrderStage } from './FoodOrderView';
import { SafetyPanel } from './SafetyPanel';

interface DigitalHelpViewProps {
  selectedTask: TaskKind | null;
  onSelectTask: (task: TaskKind | null) => void;
  onGuidance: (message: string, event: string) => void;
  onFamily: () => void;
}

const taskCards: Array<{ id: TaskKind; icon: string; title: string; copy: string }> = [
  { id: 'ORDER_FOOD', icon: '◒', title: 'Order food', copy: 'Restore and safely review a previous order' },
  { id: 'SEND_PAYMENT', icon: '₹', title: 'Payment help', copy: 'Check the right person and practise a payment' },
  { id: 'PHONE_HELP', icon: '▣', title: 'Phone help', copy: 'Change settings one simple step at a time' },
  { id: 'TRACK_ORDER', icon: '⌖', title: 'Track order', copy: 'Understand the latest delivery status' },
  { id: 'GENERAL_HELP', icon: '?', title: 'Ask a question', copy: 'Get a plain-language digital explanation' },
  { id: 'UNSUPPORTED', icon: '◇', title: 'Something else', copy: 'Pause safely and ask trusted family' },
];

export function DigitalHelpView({
  selectedTask,
  onSelectTask,
  onGuidance,
  onFamily,
}: DigitalHelpViewProps) {
  const [foodStage, setFoodStage] = useState<FoodOrderStage>('review');
  const [paymentStage, setPaymentStage] = useState<'warning' | 'review' | 'complete'>('warning');
  const [phoneTopic, setPhoneTopic] = useState<'text' | 'wifi' | 'photo'>('text');
  const [phoneStep, setPhoneStep] = useState(0);

  if (!selectedTask) {
    return (
      <section aria-labelledby="digital-help-title">
        <div className="page-heading">
          <p className="eyebrow">Patient, step-by-step support</p>
          <h1 id="digital-help-title">What would you like help with?</h1>
          <p>Choose one. Thuna will explain each action before anything changes.</p>
        </div>
        <div className="task-grid">
          {taskCards.map((task) => (
            <button className="task-choice" type="button" key={task.id} onClick={() => onSelectTask(task.id)}>
              <span className="task-choice__icon" aria-hidden="true">{task.icon}</span>
              <span>
                <strong>{task.title}</strong>
                <small>{task.copy}</small>
              </span>
              <span className="task-choice__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const back = () => onSelectTask(null);

  if (selectedTask === 'ORDER_FOOD') {
    return (
      <FoodOrderView
        stage={foodStage}
        onExplainFee={() => onGuidance(
          'The food price is the same. Rs 25 is a delivery fee because the restaurant is farther away.',
          'contextual_delivery_fee_answer',
        )}
        onCorrect={() => {
          setFoodStage('corrected');
          onGuidance('I changed Masala Dosa to Plain Dosa. Everything else stayed the same. Please confirm again.', 'correction_invalidated_confirmation');
        }}
        onConfirm={() => {
          setFoodStage('complete');
          onGuidance('Your simulated order is complete. No real order was placed.', 'simulated_order_complete');
        }}
        onBack={back}
      />
    );
  }

  if (selectedTask === 'SEND_PAYMENT') {
    if (paymentStage === 'complete') {
      return (
        <section className="receipt-card" aria-labelledby="payment-success">
          <span className="receipt-card__check" aria-hidden="true">✓</span>
          <p className="eyebrow">Practice receipt</p>
          <h2 id="payment-success">SIMULATED PAYMENT SUCCESS</h2>
          <p className="receipt-card__summary">Rs 500 to Priya Menon · Daughter</p>
          <p className="disclaimer">No real money moved. No OTP, PIN, CVV or banking credential was requested.</p>
          <button className="secondary-button" type="button" onClick={back}>Back to digital help</button>
        </section>
      );
    }

    return (
      <section className="task-card" aria-labelledby="payment-title">
        <div className="task-card__header">
          <span className="task-icon task-icon--payment" aria-hidden="true">₹</span>
          <div><p className="eyebrow">Payment practice</p><h2 id="payment-title">Choose the correct Priya</h2></div>
        </div>
        {paymentStage === 'warning' ? (
          <>
            <div className="warning-box" role="alert">
              <strong>I found three people named Priya.</strong>
              <p>You said “my daughter”, so I will not choose Priya Stores.</p>
            </div>
            <div className="recipient-list" role="list">
              <button type="button" onClick={() => {
                setPaymentStage('review');
                onGuidance('You chose Priya Menon, your daughter. I will now read back the amount.', 'recipient_disambiguated');
              }}>
                <span className="avatar" aria-hidden="true">PM</span>
                <span><strong>Priya Menon</strong><small>Daughter</small></span>
                <span aria-hidden="true">→</span>
              </button>
              <button type="button" aria-describedby="store-warning">
                <span className="avatar avatar--store" aria-hidden="true">PS</span>
                <span><strong>Priya Stores</strong><small id="store-warning">Shop · Does not match “daughter”</small></span>
                <span aria-hidden="true">!</span>
              </button>
              <button type="button">
                <span className="avatar" aria-hidden="true">PN</span>
                <span><strong>Priya Nair</strong><small>Neighbour</small></span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <dl className="review-list">
              <div><dt>Recipient</dt><dd>Priya Menon · Daughter</dd></div>
              <div><dt>Amount</dt><dd>Rs 500</dd></div>
            </dl>
            <button className="primary-button" type="button" onClick={() => {
              setPaymentStage('complete');
              onGuidance('The simulated payment is complete. No real money moved.', 'simulated_payment_complete');
            }}>Yes, confirm simulated payment</button>
            <button className="secondary-button" type="button" onClick={() => setPaymentStage('warning')}>Change person or amount</button>
          </>
        )}
        <p className="disclaimer">This is a guided simulation. Never share an OTP, PIN or CVV.</p>
      </section>
    );
  }

  if (selectedTask === 'PHONE_HELP') {
    const steps = {
      text: ['Open Settings on your phone.', 'Tap “Display” or “Display & brightness”.', 'Tap “Text size”, then move the slider to the right.'],
      wifi: ['Open Settings on your phone.', 'Tap “Wi-Fi”.', 'Choose your home network. Ask family before entering an unfamiliar password.'],
      photo: ['Open the chat where you want to send the photo.', 'Tap the paperclip or photo symbol.', 'Choose the photo, check it, then tap Send.'],
    };
    const labels = { text: 'Increase text size', wifi: 'Connect to Wi-Fi', photo: 'Send a photo' };
    const activeSteps = steps[phoneTopic];
    return (
      <section className="task-card" aria-labelledby="phone-help-title">
        <div className="task-card__header">
          <span className="task-icon" aria-hidden="true">▣</span>
          <div><p className="eyebrow">One instruction at a time</p><h2 id="phone-help-title">Phone help</h2></div>
        </div>
        <div className="choice-chips" aria-label="Phone help topics">
          {(Object.keys(labels) as Array<keyof typeof labels>).map((topic) => (
            <button
              className={phoneTopic === topic ? 'is-selected' : ''}
              type="button"
              key={topic}
              onClick={() => { setPhoneTopic(topic); setPhoneStep(0); }}
            >{labels[topic]}</button>
          ))}
        </div>
        <div className="step-card" aria-live="polite">
          <span>Step {phoneStep + 1} of {activeSteps.length}</span>
          <h3>{activeSteps[phoneStep]}</h3>
          <p>Tell me when you are ready. Nothing is changed by Thuna directly.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            const next = Math.min(phoneStep + 1, activeSteps.length - 1);
            setPhoneStep(next);
            onGuidance(next === activeSteps.length - 1 ? 'This is the final simulated guidance step. Check the screen before continuing.' : activeSteps[next], 'phone_guidance_next');
          }}
        >{phoneStep === activeSteps.length - 1 ? 'Repeat final step' : 'I am ready for the next step'}</button>
        <button className="secondary-button" type="button" onClick={() => setPhoneStep(Math.max(0, phoneStep - 1))}>Go back one step</button>
        <p className="disclaimer">Guidance is simulated. Thuna does not control your phone.</p>
      </section>
    );
  }

  if (selectedTask === 'TRACK_ORDER') {
    return (
      <section className="task-card" aria-labelledby="track-title">
        <div className="task-card__header">
          <span className="task-icon task-icon--track" aria-hidden="true">⌖</span>
          <div><p className="eyebrow">Practice order #TH-204</p><h2 id="track-title">Out for delivery</h2></div>
        </div>
        <ol className="delivery-timeline">
          <li className="is-complete"><strong>Processing</strong><span>Restaurant accepted the order</span></li>
          <li className="is-complete"><strong>Shipped</strong><span>Picked up by the delivery partner</span></li>
          <li className="is-current"><strong>Out for delivery</strong><span>Latest available update</span></li>
          <li><strong>Delivered</strong><span>Not yet confirmed</span></li>
        </ol>
        <div className="info-box">The service has not provided a guaranteed delivery time, so I will not invent one.</div>
        <button className="secondary-button" type="button" onClick={back}>Back to digital help</button>
      </section>
    );
  }

  if (selectedTask === 'GENERAL_HELP') {
    const questions = [
      ['What is UPI?', 'UPI is a way to send money between bank accounts using an app. Always check the name and amount before confirming.'],
      ['What is a CVV?', 'A CVV is the short security number on a bank card. Keep it private and never tell it to Thuna.'],
      ['What is airplane mode?', 'Airplane mode turns off the phone’s mobile, Wi-Fi and Bluetooth connections. You can turn Wi-Fi back on separately.'],
      ['Why is my payment pending?', 'Pending means the bank has not given a final result yet. Do not pay again until you check the transaction history.'],
      ['What is location permission?', 'It lets an app use your approximate or precise location. Allow it only when the app truly needs it.'],
      ['What is a QR code?', 'A QR code is a square pattern a camera can read. Check who will receive money before approving a payment.'],
    ];
    return (
      <section className="task-card" aria-labelledby="question-title">
        <div className="task-card__header">
          <span className="task-icon" aria-hidden="true">?</span>
          <div><p className="eyebrow">Plain-language answers</p><h2 id="question-title">Digital questions</h2></div>
        </div>
        <div className="explanation-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <p className="disclaimer">Thuna explains only. It does not control an external app.</p>
      </section>
    );
  }

  return <SafetyPanel onRequestFamily={onFamily} />;
}
