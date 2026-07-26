'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DemoInspector } from '../components/DemoInspector';
import { DigitalHelpView } from '../components/DigitalHelpView';
import { GuidancePanel } from '../components/GuidancePanel';
import { ProductNavigation } from '../components/ProductNavigation';
import { ReminderCallView } from '../components/ReminderCallView';
import { RoutineHistory } from '../components/RoutineHistory';
import { SafetyPanel } from '../components/SafetyPanel';
import { VoiceButton } from '../components/VoiceButton';
import {
  clientApi,
  type HistoryItem,
  type HomeSnapshot,
  type InspectorSnapshot,
  type ProductArea,
  type RoutineKind,
  type RoutineStatus,
  type TaskKind,
  type VoicePhase,
} from '../lib/client-api';

const emptyInspector: InspectorSnapshot = {
  transcript: '',
  intent: 'NONE',
  parsedCommand: { kind: 'idle' },
  entities: {},
  skillOrRoutine: 'None',
  step: 'idle',
  sessionState: 'ready',
  safetyDecision: 'No decision yet',
  events: [],
  latencyMs: 0,
  fallback: 'No fallback used yet',
};

const quickActions: Array<{ task: TaskKind; icon: string; label: string; hint: string }> = [
  { task: 'ORDER_FOOD', icon: '◒', label: 'Order food', hint: 'Restore your usual' },
  { task: 'SEND_PAYMENT', icon: '₹', label: 'Payment help', hint: 'Check the right person' },
  { task: 'PHONE_HELP', icon: '▣', label: 'Phone help', hint: 'One step at a time' },
  { task: 'TRACK_ORDER', icon: '⌖', label: 'Track order', hint: 'See the latest update' },
  { task: 'GENERAL_HELP', icon: '?', label: 'Ask a question', hint: 'Simple explanations' },
];

const taskDemoPrompts: Record<TaskKind, string> = {
  ORDER_FOOD: 'Order my usual dosa without chutney',
  SEND_PAYMENT: 'Send Rs 500 to my daughter Priya Stores',
  PHONE_HELP: 'Help me increase the text size on my phone',
  TRACK_ORDER: 'Track order THUNA-1003',
  GENERAL_HELP: 'What is a QR code?',
  UNSUPPORTED: 'Book a flight to Mars',
};

const routineOptions: Array<{ kind: RoutineKind; title: string; copy: string }> = [
  { kind: 'MEDICINE_REMINDER', title: 'Medicine', copy: 'Reminder only' },
  { kind: 'WATER_REMINDER', title: 'Drink water', copy: 'Gentle check-in' },
  { kind: 'BILL_REMINDER', title: 'Pay a bill', copy: 'Never pays automatically' },
  { kind: 'FAMILY_CALL_REMINDER', title: 'Call family', copy: 'A prompt to connect' },
  { kind: 'DELIVERY_FOLLOW_UP', title: 'Delivery follow-up', copy: 'Check status later' },
  { kind: 'GENERAL_CHECK_IN', title: 'General check-in', copy: 'A simple hello' },
];

function iconForHistory(icon: HistoryItem['icon']) {
  return { food: '◒', payment: '₹', routine: '◷', safety: '◇', help: '?' }[icon];
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [area, setArea] = useState<ProductArea>('home');
  const [selectedTask, setSelectedTask] = useState<TaskKind | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [typedText, setTypedText] = useState('Order my usual dosa without chutney');
  const [transcript, setTranscript] = useState('');
  const [guidance, setGuidance] = useState('Take your time. Press the large button when you are ready to speak.');
  const [micNote, setMicNote] = useState('');
  const [inspector, setInspector] = useState<InspectorSnapshot>(emptyInspector);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [routineStatus, setRoutineStatus] = useState<RoutineStatus>('SCHEDULED');
  const [countdown, setCountdown] = useState(10);
  const [timerStarted, setTimerStarted] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineKind>('MEDICINE_REMINDER');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [familyConsent, setFamilyConsent] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Malayalam'>('Malayalam');
  const [pace, setPace] = useState<'Normal' | 'Slow'>('Slow');

  useEffect(() => {
    clientApi.loadHome().then((value) => {
      setSnapshot(value);
      setLanguage(value.language);
      setPace(value.pace);
      setFamilyConsent(value.contacts.find((contact) => contact.id === 'sree')?.canNotify ?? false);
    });
  }, []);

  useEffect(() => {
    if (!timerStarted || (routineStatus !== 'SCHEDULED' && routineStatus !== 'SNOOZED')) return;
    if (countdown <= 0) {
      void clientApi.triggerDueRoutines().catch(() => {
        setInspector((current) => ({
          ...current,
          fallback: `${current.fallback} → routine API unavailable; in-app check-in preserved`,
        }));
      });
      setRoutineStatus('ACTIVE');
      setGuidance(snoozed
        ? 'Hello again, Appa. This is your second medicine check-in.'
        : 'Good morning, Appa. This is your medicine reminder.');
      setInspector((current) => ({
        ...current,
        intent: 'MEDICINE_REMINDER',
        skillOrRoutine: 'MEDICINE_REMINDER',
        step: snoozed ? 'second_check_in' : 'first_check_in',
        sessionState: 'ACTIVE',
        events: [...current.events, snoozed ? 'routine_second_trigger' : 'routine_due', 'routine_active'],
      }));
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, routineStatus, snoozed, timerStarted]);

  const addHistory = useCallback((item: HistoryItem) => {
    setSnapshot((current) => current ? { ...current, history: [item, ...current.history] } : current);
  }, []);

  const navigate = (next: ProductArea) => {
    setArea(next);
    if (next !== 'help') setSelectedTask(null);
  };

  const chooseTask = (task: TaskKind | null) => {
    setSelectedTask(task);
    setArea('help');
    if (task) {
      setInspector((current) => ({
        ...current,
        intent: task,
        parsedCommand: { kind: 'start', skillId: task },
        skillOrRoutine: task,
        step: 'start',
        sessionState: 'active',
        safetyDecision: task === 'UNSUPPORTED' ? 'Paused — human help offered' : 'Allowed',
        events: [...current.events, `open_${task.toLowerCase()}`],
      }));
      void clientApi.interpretDemoText(taskDemoPrompts[task]).then((turn) => {
        setTranscript(turn.transcript);
        setGuidance(turn.guidance);
        setInspector(turn.inspector);
      });
    }
  };

  const updateGuidance = (message: string, event: string) => {
    setGuidance(message);
    setInspector((current) => ({
      ...current,
      step: event,
      events: [...current.events, event],
    }));
  };

  const applyVoiceTurn = (turn: Awaited<ReturnType<typeof clientApi.interpretDemoText>>) => {
    setTranscript(turn.transcript);
    setGuidance(turn.guidance);
    setInspector(turn.inspector);
    setSelectedTask(turn.task);
    setVoicePhase('speaking');
    window.setTimeout(() => setVoicePhase('idle'), 900);
  };

  const runVoiceTurn = async () => {
    setVoicePhase('understanding');
    const turn = await clientApi.interpretDemoText(typedText);
    applyVoiceTurn(turn);
  };

  const handleVoicePress = async () => {
    if (voicePhase === 'listening') {
      setVoicePhase('understanding');
      setMicNote('Sending this recording securely to Saaras. The audio is not retained.');
      try {
        applyVoiceTurn(await clientApi.finishMicrophoneTurn());
      } catch {
        setVoicePhase('error');
        setMicNote('Voice services are unavailable. Use the typed Demo Mode below to continue safely.');
      }
      return;
    }
    setVoicePhase('requesting_permission');
    const permission = await clientApi.requestMicrophone();
    setMicNote(permission === 'granted'
      ? 'Microphone is ready. Speak, then press the button once more.'
      : 'Microphone is unavailable. The typed Demo Mode below is ready.');
    setVoicePhase(permission === 'granted' ? 'listening' : 'idle');
  };

  const completeRoutine = () => {
    if (routineId) {
      void clientApi.updateRoutine(routineId, 'COMPLETE', { response: 'Yes' })
        .catch(() => updateGuidance('The in-app completion is saved for this demo; the routine API needs a retry.', 'routine_api_fallback'));
    }
    setRoutineStatus('COMPLETED');
    setTimerStarted(false);
    updateGuidance('Done. I have marked this reminder complete.', 'routine_complete');
    addHistory({
      id: `routine-completed-${snoozed ? 'second' : 'first'}`,
      icon: 'routine',
      title: 'Morning medicine reminder completed',
      detail: snoozed ? 'Completed at the second check-in' : 'Completed at the first check-in',
      time: 'Just now',
    });
  };

  const snoozeRoutine = () => {
    if (snoozed) {
      updateGuidance('This demo reminder was already snoozed once. You can complete, cancel, or ask family for help.', 'second_snooze_blocked');
      return;
    }
    setSnoozed(true);
    setRoutineStatus('SNOOZED');
    setCountdown(5);
    if (routineId) {
      void clientApi.updateRoutine(routineId, 'SNOOZE', { minutes: 5 })
        .catch(() => updateGuidance('The in-app snooze is active; the routine API needs a retry.', 'routine_api_fallback'));
    }
    updateGuidance('All right. I will remind you once more in a few seconds.', 'routine_snoozed');
  };

  const resolveRoutine = (status: RoutineStatus, event: string, message: string) => {
    if (routineId) {
      const action = status === 'MISSED' ? 'NO_RESPONSE' : status === 'CANCELLED' ? 'CANCEL' : null;
      if (action) {
        void clientApi.updateRoutine(
          routineId,
          action,
          action === 'NO_RESPONSE' ? { retryAfterMinutes: 1 } : {},
        ).catch(() => updateGuidance('The in-app state is preserved; the routine API needs a retry.', 'routine_api_fallback'));
      }
    }
    setRoutineStatus(status);
    setTimerStarted(false);
    updateGuidance(message, event);
    addHistory({
      id: `routine-${status.toLowerCase()}-${Date.now()}`,
      icon: 'routine',
      title: `Morning medicine reminder ${status.toLowerCase()}`,
      detail: status === 'MISSED'
        ? 'No response was not counted as completion'
        : status === 'ESCALATED'
          ? 'Family help explicitly requested'
          : 'Reminder cancelled by Appa',
      time: 'Just now',
    });
  };

  const startRoutine = () => {
    setSelectedRoutine('MEDICINE_REMINDER');
    setRoutineStatus('SCHEDULED');
    setCountdown(10);
    setSnoozed(false);
    setTimerStarted(true);
    setRoutineId(null);
    setGuidance('Your 10-second medicine reminder is set. I will check in here.');
    setInspector({
      ...emptyInspector,
      intent: 'MEDICINE_REMINDER',
      parsedCommand: { kind: 'start', skillId: 'MEDICINE_REMINDER' },
      skillOrRoutine: 'MEDICINE_REMINDER',
      step: 'scheduled',
      sessionState: 'SCHEDULED',
      safetyDecision: 'Reminder only — no dosage advice',
      events: ['routine_created', 'routine_scheduled'],
    });
    void clientApi.createMedicineReminder(10)
      .then((id) => setRoutineId(id))
      .catch(() => setInspector((current) => ({
        ...current,
        fallback: 'Routine API unavailable → in-app demo scheduler',
      })));
  };

  const requestFamily = () => {
    if (!familyConsent) {
      updateGuidance('Family notification is off. I will not contact anyone unless you give consent in Trusted family.', 'family_notification_blocked');
      setArea('family');
      return;
    }
    void clientApi.requestFamilyHelp(routineId ?? undefined)
      .catch(() => updateGuidance('I kept the request in this demo, but no family notification was sent. Please retry.', 'family_api_fallback'));
    resolveRoutine('ESCALATED', 'family_help_requested', 'You asked for Sree. Your consent is on, so the demo notification may be sent.');
  };

  const reset = async () => {
    const fresh = await clientApi.resetDemo();
    setSnapshot(fresh);
    setArea('home');
    setSelectedTask(null);
    setVoicePhase('idle');
    setTypedText('Order my usual dosa without chutney');
    setTranscript('');
    setGuidance('Take your time. Press the large button when you are ready to speak.');
    setMicNote('');
    setInspector(emptyInspector);
    setInspectorOpen(false);
    setRoutineStatus('SCHEDULED');
    setCountdown(10);
    setTimerStarted(false);
    setSnoozed(false);
    setRoutineId(null);
    setFamilyConsent(fresh.contacts.find((contact) => contact.id === 'sree')?.canNotify ?? false);
    setLanguage(fresh.language);
    setPace(fresh.pace);
  };

  const visibleRoutines = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.routines.map((routine, index) =>
      index === 0 ? { ...routine, status: routineStatus } : routine,
    );
  }, [routineStatus, snapshot]);

  if (!snapshot) {
    return <main className="loading-screen" aria-live="polite"><span className="brand__mark">ത</span><p>Preparing Thuna…</p></main>;
  }

  return (
    <div className="app-shell">
      <ProductNavigation active={area} onNavigate={navigate} />
      <main className="content">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('home')} aria-label="Go to Thuna home">
            <span className="brand__mark" aria-hidden="true">ത</span><strong>Thuna</strong>
          </button>
          <div className="language-chip" aria-label={`Language ${language}`}>
            <span aria-hidden="true">അ</span>
            <span>{language}</span>
          </div>
          <button className="profile-chip" type="button" onClick={() => navigate('settings')}>
            <span className="avatar" aria-hidden="true">A</span>
            <span><strong>Appa</strong><small>{pace} pace</small></span>
          </button>
        </header>

        <div className="content__inner">
          {area === 'home' ? (
            <div className="home-view">
              <section className="welcome" aria-labelledby="home-title">
                <div>
                  <p className="eyebrow">Good morning, {snapshot.elderName}</p>
                  <h1 id="home-title">How can I help?</h1>
                  <p>You can speak naturally. I will go one clear step at a time.</p>
                </div>
                <div className="malayalam-greeting" lang="ml">എങ്ങനെ സഹായിക്കാം?</div>
              </section>

              <button className="home-talk" type="button" onClick={() => navigate('talk')}>
                <span className="home-talk__orb" aria-hidden="true">●</span>
                <span><strong>Talk to Thuna</strong><small>Press here, then speak</small></span>
                <span aria-hidden="true">→</span>
              </button>

              <div className="home-summary">
                <button className="summary-card" type="button" onClick={() => navigate('routines')}>
                  <span className="summary-card__icon" aria-hidden="true">◷</span>
                  <span><small>Next check-in</small><strong>{snapshot.nextRoutine.title}</strong><span>{snapshot.nextRoutine.dueLabel}</span></span>
                  <span aria-hidden="true">→</span>
                </button>
                <button className="summary-card" type="button" onClick={() => navigate('history')}>
                  <span className="summary-card__icon summary-card__icon--done" aria-hidden="true">✓</span>
                  <span><small>Recently completed</small><strong>{snapshot.recentActivity.title}</strong><span>{snapshot.recentActivity.time}</span></span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <section aria-labelledby="quick-actions-title">
                <div className="section-heading">
                  <div><p className="eyebrow">Common tasks</p><h2 id="quick-actions-title">Quick actions</h2></div>
                  <button className="text-button" type="button" onClick={() => navigate('help')}>See all</button>
                </div>
                <div className="quick-actions">
                  {quickActions.map((action) => (
                    <button type="button" key={action.task} onClick={() => chooseTask(action.task)}>
                      <span className="quick-actions__icon" aria-hidden="true">{action.icon}</span>
                      <strong>{action.label}</strong>
                      <small>{action.hint}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {area === 'talk' ? (
            <section className="talk-view" aria-labelledby="talk-title">
              <div className="page-heading page-heading--center">
                <p className="eyebrow">I am listening only when you choose</p>
                <h1 id="talk-title">Talk to Thuna</h1>
                <p>Speak in English or Malayalam. Nothing happens without your confirmation.</p>
              </div>
              <VoiceButton phase={voicePhase} onPress={handleVoicePress} />
              {micNote ? <p className="mic-note" role="status">{micNote}</p> : null}
              <GuidancePanel
                guidance={guidance}
                transcript={transcript}
                onRepeat={() => { setGuidance(`${guidance} I will say that more slowly.`); setInspector((current) => ({ ...current, parsedCommand: { kind: 'recovery', recoveryType: 'repeat_slowly' }, events: [...current.events, 'repeat_slowly'] })); }}
                onWait={() => updateGuidance('Of course. I will wait here until you are ready.', 'wait')}
                onBack={() => updateGuidance('We went back one step. Tell me what you would like to change.', 'go_back')}
                onStop={() => { updateGuidance('Stopped. Nothing further will happen.', 'stop'); setVoicePhase('idle'); }}
                onRetry={() => { setVoicePhase('idle'); setMicNote('Ready to try again.'); }}
              />
              <form className="typed-demo" onSubmit={(event) => { event.preventDefault(); void runVoiceTurn(); }}>
                <label htmlFor="typed-demo-input">Demo Mode · type instead of speaking</label>
                <div>
                  <input id="typed-demo-input" value={typedText} onChange={(event) => setTypedText(event.target.value)} />
                  <button className="secondary-button" type="submit">Use this text</button>
                </div>
                <small>Fallback is shown here for the demo. The elder-facing guidance stays the same.</small>
              </form>
              {inspector.safetyDecision === 'Blocked before model invocation' ? <SafetyPanel onRequestFamily={requestFamily} /> : null}
            </section>
          ) : null}

          {area === 'help' ? (
            <DigitalHelpView
              selectedTask={selectedTask}
              onSelectTask={chooseTask}
              onGuidance={updateGuidance}
              onFamily={requestFamily}
            />
          ) : null}

          {area === 'routines' ? (
            <section className="routines-view" aria-labelledby="routines-title">
              <div className="page-heading">
                <p className="eyebrow">Agreed check-ins, always under your control</p>
                <h1 id="routines-title">My routines</h1>
                <p>Thuna can remind you, wait, snooze once, or ask family only with permission.</p>
              </div>

              {!timerStarted && ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED', 'ESCALATED'].includes(routineStatus) ? (
                <>
                  <section className="create-routine" aria-labelledby="create-routine-title">
                    <div className="section-heading">
                      <div><p className="eyebrow">Create a reminder</p><h2 id="create-routine-title">What should I check in about?</h2></div>
                    </div>
                    <div className="routine-options">
                      {routineOptions.map((option) => (
                        <button
                          type="button"
                          key={option.kind}
                          className={selectedRoutine === option.kind ? 'is-selected' : ''}
                          onClick={() => setSelectedRoutine(option.kind)}
                        >
                          <span aria-hidden="true">◷</span><strong>{option.title}</strong><small>{option.copy}</small>
                        </button>
                      ))}
                    </div>
                    {selectedRoutine === 'MEDICINE_REMINDER' ? (
                      <button className="primary-button" type="button" onClick={startRoutine}>Start 10-second demo timer</button>
                    ) : (
                      <div className="info-box">This routine is ready as a product view. The accelerated live demo focuses on the medicine reminder.</div>
                    )}
                  </section>
                  {routineStatus !== 'SCHEDULED' ? (
                    <ReminderCallView
                      status={routineStatus}
                      countdown={countdown}
                      onComplete={completeRoutine}
                      onSnooze={snoozeRoutine}
                      onCancel={() => resolveRoutine('CANCELLED', 'routine_cancelled', 'The reminder is cancelled.')}
                      onMissed={() => resolveRoutine('MISSED', 'routine_missed', 'I marked this check-in missed, not complete.')}
                      onFamily={requestFamily}
                    />
                  ) : null}
                </>
              ) : (
                <ReminderCallView
                  status={routineStatus}
                  countdown={countdown}
                  onComplete={completeRoutine}
                  onSnooze={snoozeRoutine}
                  onCancel={() => resolveRoutine('CANCELLED', 'routine_cancelled', 'The reminder is cancelled.')}
                  onMissed={() => resolveRoutine('MISSED', 'routine_missed', 'I marked this check-in missed, not complete.')}
                  onFamily={requestFamily}
                />
              )}
              <RoutineHistory routines={visibleRoutines} history={snapshot.history} />
            </section>
          ) : null}

          {area === 'history' ? (
            <section aria-labelledby="history-title">
              <div className="page-heading">
                <p className="eyebrow">A clear record of every outcome</p>
                <h1 id="history-title">History</h1>
                <p>Simulated tasks are always labelled. Routine results show exactly what you chose.</p>
              </div>
              <div className="history-feed">
                {snapshot.history.map((item) => (
                  <article key={item.id}>
                    <span className="history-feed__icon" aria-hidden="true">{iconForHistory(item.icon)}</span>
                    <div><h2>{item.title}</h2><p>{item.detail}</p><small>{item.time}</small></div>
                    {item.simulated ? <span className="simulated-badge">SIMULATED</span> : <span className="status-pill status-pill--completed">Completed</span>}
                  </article>
                ))}
              </div>
              <div className="info-box">No real food order or payment is created by this demo.</div>
            </section>
          ) : null}

          {area === 'family' ? (
            <section aria-labelledby="family-title">
              <div className="page-heading">
                <p className="eyebrow">You decide when someone is contacted</p>
                <h1 id="family-title">Trusted family</h1>
                <p>Thuna never watches you or notifies family automatically.</p>
              </div>
              <div className="family-card">
                <span className="avatar avatar--large" aria-hidden="true">S</span>
                <div><h2>Sree</h2><p>Family · Trusted contact</p></div>
                <label className="switch">
                  <input type="checkbox" checked={familyConsent} onChange={(event) => {
                    const enabled = event.target.checked;
                    setFamilyConsent(enabled);
                    void clientApi.setFamilyConsent(enabled).catch(() => {
                      setFamilyConsent(!enabled);
                      updateGuidance('I could not save that permission change. Your previous choice remains active.', 'family_consent_api_fallback');
                    });
                    updateGuidance(enabled ? 'You gave permission for requested family notifications.' : 'Family notifications are now off.', 'family_consent_changed');
                  }} />
                  <span aria-hidden="true" />
                  <strong>{familyConsent ? 'Permission on' : 'Permission off'}</strong>
                </label>
              </div>
              <div className="consent-explainer">
                <span aria-hidden="true">◇</span>
                <div>
                  <h2>Your choice, every time</h2>
                  <p>Even when permission is on, Thuna contacts Sree only after you explicitly ask for family help.</p>
                </div>
              </div>
              <button className="secondary-button" type="button" onClick={requestFamily}>Request help from Sree now</button>
            </section>
          ) : null}

          {area === 'settings' ? (
            <section aria-labelledby="settings-title">
              <div className="page-heading">
                <p className="eyebrow">Make Thuna comfortable for you</p>
                <h1 id="settings-title">Settings</h1>
              </div>
              <div className="settings-list">
                <fieldset>
                  <legend>Language</legend>
                  <p>Choose the language for guidance and spoken responses.</p>
                  <div className="segmented">
                    {(['Malayalam', 'English'] as const).map((value) => (
                      <button
                        className={language === value ? 'is-selected' : ''}
                        type="button"
                        key={value}
                        onClick={() => {
                          setLanguage(value);
                          void clientApi.updatePreferences(value, pace);
                        }}
                      >
                        {value === 'Malayalam' ? 'മലയാളം' : 'English'}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Speaking pace</legend>
                  <p>Slow pace leaves more time between instructions.</p>
                  <div className="segmented">
                    {(['Slow', 'Normal'] as const).map((value) => (
                      <button
                        className={pace === value ? 'is-selected' : ''}
                        type="button"
                        key={value}
                        onClick={() => {
                          setPace(value);
                          void clientApi.updatePreferences(language, value);
                        }}
                      >{value}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="settings-row">
                  <span><strong>Large text</strong><small>Always on for clear reading</small></span><span className="quiet-badge">On</span>
                </div>
                <div className="settings-row">
                  <span><strong>Demo Mode</strong><small>Shows typed fallback and simulated external actions</small></span><span className="quiet-badge">On</span>
                </div>
                <div className="settings-row">
                  <span><strong>Privacy</strong><small>OTP, PIN, CVV and banking passwords are never accepted or stored</small></span><span className="status-pill status-pill--completed">Protected</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <DemoInspector
        open={inspectorOpen}
        snapshot={inspector}
        onToggle={() => setInspectorOpen((value) => !value)}
        onReset={() => void reset()}
      />
    </div>
  );
}
