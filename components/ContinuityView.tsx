'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  clientApi,
} from '../lib/client-api';
import type {
  ContinuitySnapshot,
  DailyBrief,
  FamilyAttentionRequest,
  InboxCandidate,
} from '../lib/continuity/types';

type ContinuityTab = 'remember' | 'events' | 'promises' | 'brief' | 'family';

const tabs: Array<{ id: ContinuityTab; label: string }> = [
  { id: 'remember', label: 'Remember this' },
  { id: 'events', label: 'Upcoming events' },
  { id: 'promises', label: 'Pending promises' },
  { id: 'brief', label: 'Daily brief' },
  { id: 'family', label: 'Ask family' },
];

function dateLabel(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Date not set';
  return new Date(value).toLocaleString();
}

function eventDate(fields: ContinuitySnapshot['lifeEvents'][number]['fields']): string {
  return dateLabel(fields.find((field) => field.key === 'date')?.value);
}

export function ContinuityView() {
  const [tab, setTab] = useState<ContinuityTab>('remember');
  const [snapshot, setSnapshot] = useState<ContinuitySnapshot | null>(null);
  const [candidate, setCandidate] = useState<InboxCandidate | null>(null);
  const [rememberText, setRememberText] = useState(
    'Meera and Arun wedding at Guruvayur on 2026-08-09',
  );
  const [correctedDate, setCorrectedDate] = useState('2026-08-10');
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [familyPurpose, setFamilyPurpose] = useState('Please ask Sree to call me about the wedding.');
  const [familyRequest, setFamilyRequest] = useState<FamilyAttentionRequest | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Nothing is saved until you confirm the read-back.');

  const refresh = async () => {
    const value = await clientApi.loadContinuity();
    setSnapshot(value);
    const latestRequest = value.familyRequests.at(-1);
    if (latestRequest) setFamilyRequest(latestRequest);
  };

  useEffect(() => {
    void refresh().catch(() => setNotice('Continuity information is temporarily unavailable.'));
  }, []);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That step could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const intake = (text = rememberText, source: 'VOICE' | 'TYPED' = 'TYPED') => run(async () => {
    const next = await clientApi.intakeContinuity(text, source);
    setCandidate(next);
    setNotice('Please check the read-back. You can correct one field before saving.');
  });

  const confirmCandidate = () => run(async () => {
    if (!candidate) return;
    await clientApi.confirmContinuityCandidate(candidate.id);
    setNotice('Saved after your explicit confirmation.');
    setCandidate(null);
    await refresh();
  });

  const correctCandidateDate = () => run(async () => {
    if (!candidate) return;
    const next = await clientApi.correctContinuityCandidate(
      candidate.id,
      'date',
      correctedDate,
    );
    setCandidate(next);
    setNotice('Only the date changed. Please confirm the new read-back.');
  });

  const handleVoice = () => run(async () => {
    if (!voiceListening) {
      const permission = await clientApi.requestMicrophone();
      if (permission !== 'granted') {
        setNotice('Microphone is unavailable. Type the same request below.');
        return;
      }
      setVoiceListening(true);
      setNotice('Listening now. Press again when you finish speaking.');
      return;
    }
    setVoiceListening(false);
    const transcript = await clientApi.finishMicrophoneTranscript();
    setRememberText(transcript);
    await intake(transcript, 'VOICE');
  });

  const familyConsent = useMemo(
    () => snapshot?.familyContentConsent.some(
      (consent) => consent.contactId === 'sree' && consent.granted,
    ) ?? false,
    [snapshot],
  );

  if (!snapshot) {
    return <section aria-live="polite"><p>Preparing your saved events and promises…</p></section>;
  }

  return (
    <section className="continuity-view" aria-labelledby="continuity-title">
      <div className="page-heading">
        <p className="eyebrow">Your plans, promises and follow-ups</p>
        <h1 id="continuity-title">My life with Thuna</h1>
        <p>Thuna reads everything back and saves it only after you clearly say yes.</p>
      </div>

      <div className="continuity-tabs" role="tablist" aria-label="Continuity companion">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-selected' : ''}
            key={item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="continuity-notice" role="status">{notice}</p>

      {tab === 'remember' ? (
        <div className="continuity-panel">
          <h2>Remember this</h2>
          <p>Tell Thuna about a task, event, routine, bill, promise, family request or question.</p>
          <label htmlFor="remember-text">What should I remember?</label>
          <textarea
            id="remember-text"
            rows={3}
            value={rememberText}
            onChange={(event) => setRememberText(event.target.value)}
          />
          <div className="continuity-actions">
            <button className="primary-button" type="button" disabled={busy} onClick={() => void intake()}>
              Read this back
            </button>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => void handleVoice()}>
              {voiceListening ? 'Finish speaking' : 'Use voice'}
            </button>
          </div>
          <div className="choice-chips" aria-label="Example remember requests">
            <button type="button" onClick={() => setRememberText('Electricity bill Rs 840 due 2026-08-01')}>Bill reminder</button>
            <button type="button" onClick={() => setRememberText('Remind me after dinner')}>After dinner</button>
            <button type="button" onClick={() => setRememberText('Continue Wi-Fi tomorrow')}>Wi-Fi tomorrow</button>
          </div>

          {candidate ? (
            <article className="candidate-readback">
              <span className="status-pill">CANDIDATE · NOT SAVED</span>
              <h3>Thuna understood: {candidate.classification.replaceAll('_', ' ').toLowerCase()}</h3>
              <p>{candidate.readback}</p>
              {(candidate.classification === 'LIFE_EVENT' || candidate.classification === 'BILL') ? (
                <div className="field-correction">
                  <label htmlFor="candidate-date">Correct only the date</label>
                  <input
                    id="candidate-date"
                    type="date"
                    value={correctedDate}
                    onChange={(event) => setCorrectedDate(event.target.value)}
                  />
                  <button className="secondary-button" type="button" onClick={() => void correctCandidateDate()}>
                    Correct date
                  </button>
                </div>
              ) : null}
              <button className="primary-button" type="button" onClick={() => void confirmCandidate()}>
                Yes, save this
              </button>
            </article>
          ) : null}
        </div>
      ) : null}

      {tab === 'events' ? (
        <div className="continuity-panel">
          <h2>Upcoming events and bills</h2>
          {snapshot.lifeEvents.filter((event) => !event.memory.supersededBy).length ? (
            <div className="continuity-list">
              {snapshot.lifeEvents.filter((event) => !event.memory.supersededBy).map((event) => (
                <article key={event.id}>
                  <div>
                    <span className="status-pill">{event.state}</span>
                    <h3>{event.title}</h3>
                    <p>{eventDate(event.fields)} · {event.reminders.length} reminder{event.reminders.length === 1 ? '' : 's'}</p>
                    <small>Source: {event.memory.source.source.toLowerCase()} · elder confirmed</small>
                  </div>
                  {!['COMPLETED', 'CANCELLED'].includes(event.state) ? (
                    <div className="continuity-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void run(async () => {
                          await clientApi.updateLifeEvent(event.id, 'CORRECT_EVENT', {
                            key: 'date',
                            value: correctedDate,
                            response: 'Yes',
                          });
                          setNotice('The corrected record replaced the previous event; other fields stayed the same.');
                          await refresh();
                        })}
                      >
                        Correct event
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => void run(async () => {
                          await clientApi.updateLifeEvent(event.id, 'COMPLETE_EVENT', {
                            response: event.type === 'BILL' ? 'Yes, I paid it' : 'Yes',
                          });
                          setNotice(event.type === 'BILL'
                            ? 'Marked paid only after your explicit confirmation.'
                            : 'Marked complete after your explicit confirmation.');
                          await refresh();
                        })}
                      >
                        {event.type === 'BILL' ? 'Yes, I paid it' : 'Yes, completed'}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <div className="info-box">No confirmed events yet. Use Remember this to add one.</div>}
        </div>
      ) : null}

      {tab === 'promises' ? (
        <div className="continuity-panel">
          <h2>Pending promises</h2>
          {snapshot.pendingLoops.length ? (
            <div className="continuity-list">
              {snapshot.pendingLoops.map((loop) => (
                <article key={loop.id}>
                  <div>
                    <span className="status-pill">{loop.state}</span>
                    <h3>{loop.description}</h3>
                    <p>{loop.originalUtterance}</p>
                    <small>Follow up {loop.trigger.stated} · snoozed {loop.snoozeCount} time{loop.snoozeCount === 1 ? '' : 's'}</small>
                  </div>
                  {!['COMPLETED', 'CANCELLED'].includes(loop.state) ? (
                    <div className="continuity-actions">
                      <button className="secondary-button" type="button" onClick={() => void run(async () => {
                        await clientApi.updatePendingLoop(loop.id, 'SNOOZE_LOOP', { minutes: 10 });
                        setNotice('Pending promise snoozed for 10 minutes.');
                        await refresh();
                      })}>Snooze 10 minutes</button>
                      <button className="primary-button" type="button" onClick={() => void run(async () => {
                        await clientApi.updatePendingLoop(loop.id, 'COMPLETE_LOOP', { response: 'Yes' });
                        setNotice('Pending promise completed after your explicit confirmation.');
                        await refresh();
                      })}>Yes, completed</button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <div className="info-box">No confirmed pending promises yet.</div>}
        </div>
      ) : null}

      {tab === 'brief' ? (
        <div className="continuity-panel">
          <h2>Daily brief</h2>
          <p>An on-demand brief can be read during quiet hours because you asked for it. Scheduled briefs wait.</p>
          <button className="primary-button" type="button" onClick={() => void run(async () => {
            setBrief(await clientApi.loadDailyBrief());
            setNotice('Your on-demand brief is ready.');
          })}>Prepare my brief</button>
          {brief ? (
            <div className="brief-list">
              {brief.items.map((item) => (
                <article key={`${item.category}:${item.id}`}>
                  <span className="status-pill">{item.category.replaceAll('_', ' ')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  {item.dueAt ? <small>{dateLabel(item.dueAt)}</small> : null}
                </article>
              ))}
              {!brief.items.length ? <div className="info-box">No confirmed upcoming items to read out.</div> : null}
              {brief.omittedCount ? <p>{brief.omittedCount} lower-priority item{brief.omittedCount === 1 ? '' : 's'} available.</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'family' ? (
        <div className="continuity-panel">
          <h2>Ask family</h2>
          <p>Thuna shares only the short message you approve, with a contact you have allowed.</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={familyConsent}
              onChange={(event) => {
                const granted = event.target.checked;
                void run(async () => {
                  await clientApi.setFamilyContentConsent(granted);
                  setNotice(granted
                    ? 'You explicitly approved family-content messages for Sree.'
                    : 'Family-content messages for Sree are off.');
                  await refresh();
                });
              }}
            />
            <span aria-hidden="true" />
            <strong>{familyConsent ? 'Family-content permission on' : 'Family-content permission off'}</strong>
          </label>
          <label htmlFor="family-purpose">What should Sree help with?</label>
          <textarea
            id="family-purpose"
            rows={2}
            value={familyPurpose}
            onChange={(event) => setFamilyPurpose(event.target.value)}
          />
          <button className="primary-button" type="button" onClick={() => void run(async () => {
            const created = await clientApi.createContinuityFamilyRequest(familyPurpose);
            setFamilyRequest(created);
            setNotice('Request recorded. Nothing has been sent yet.');
            await refresh();
          })}>Request family attention</button>

          {familyRequest ? (
            <article className="family-progress">
              <span className="status-pill">{familyRequest.state.replaceAll('_', ' ')}</span>
              <h3>{familyRequest.purpose}</h3>
              <p>Approved disclosure: “{familyRequest.disclosure}”</p>
              <div className="continuity-actions">
                {familyRequest.state === 'REQUESTED' ? (
                  <button className="secondary-button" type="button" onClick={() => void run(async () => {
                    setFamilyRequest(await clientApi.advanceContinuityFamilyRequest(familyRequest.id, 'OFFERED'));
                    setNotice('A simulated minimum-disclosure message was offered to Sree.');
                    await refresh();
                  })}>Offer to Sree</button>
                ) : null}
                {familyRequest.state === 'OFFERED' ? (
                  <button className="secondary-button" type="button" onClick={() => void run(async () => {
                    setFamilyRequest(await clientApi.advanceContinuityFamilyRequest(familyRequest.id, 'ACCEPTED'));
                    await refresh();
                  })}>Mark accepted</button>
                ) : null}
                {familyRequest.state === 'ACCEPTED' ? (
                  <button className="secondary-button" type="button" onClick={() => void run(async () => {
                    setFamilyRequest(await clientApi.advanceContinuityFamilyRequest(familyRequest.id, 'SCHEDULED'));
                    await refresh();
                  })}>Schedule follow-up</button>
                ) : null}
                {familyRequest.state === 'SCHEDULED' ? (
                  <button className="secondary-button" type="button" onClick={() => void run(async () => {
                    setFamilyRequest(await clientApi.advanceContinuityFamilyRequest(familyRequest.id, 'COMPLETED'));
                    await refresh();
                  })}>Family says completed</button>
                ) : null}
                {familyRequest.state === 'COMPLETED' ? (
                  <button className="primary-button" type="button" onClick={() => void run(async () => {
                    setFamilyRequest(await clientApi.advanceContinuityFamilyRequest(familyRequest.id, 'ELDER_CONFIRMED'));
                    setNotice('You confirmed the family follow-up was completed.');
                    await refresh();
                  })}>Yes, Sree helped</button>
                ) : null}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
