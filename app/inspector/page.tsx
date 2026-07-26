'use client';

/**
 * Demo Inspector — development / presentation route ONLY.
 *
 * This is deliberately NOT reachable from the elder interface: it is not a
 * navigation destination, nothing links to it, and no elder-facing component
 * renders inspector data. It exists so a presenter can show engine internals
 * on a second screen beside the phone.
 */

import { useEffect, useState } from 'react';
import { clientApi, type InspectorSnapshot } from '../../lib/client-api';

const INSPECTOR_KEY = 'thuna.inspector.lastTurn';

const empty: InspectorSnapshot = {
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

export default function InspectorPage(): JSX.Element {
  const [snapshot, setSnapshot] = useState<InspectorSnapshot>(empty);
  const [text, setText] = useState('Order my usual dosa, without chutney');

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(INSPECTOR_KEY);
      if (stored) setSnapshot(JSON.parse(stored) as InspectorSnapshot);
    } catch {
      /* the inspector is best-effort; never block on storage */
    }
  }, []);

  async function run(): Promise<void> {
    const turn = await clientApi.interpretDemoText(text);
    setSnapshot(turn.inspector);
  }

  const rows: Array<[string, string]> = [
    ['transcript', snapshot.transcript || '—'],
    ['intent', String(snapshot.intent)],
    ['parsedCommand', JSON.stringify(snapshot.parsedCommand)],
    ['entities', JSON.stringify(snapshot.entities)],
    ['skill / routine', snapshot.skillOrRoutine],
    ['step', snapshot.step],
    ['session state', snapshot.sessionState],
    ['safety decision', snapshot.safetyDecision],
    ['events', snapshot.events.join(' → ') || '—'],
    ['latency (ms)', String(snapshot.latencyMs)],
    ['fallback chain', snapshot.fallback],
  ];

  return (
    <main className="inspector">
      <h1>Thuna — Demo Inspector</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Development view. Not part of the elder interface.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Transcript to interpret"
        />
        <button type="button" className="btn btn--primary" style={{ width: 'auto' }} onClick={run}>
          Run
        </button>
      </div>

      {rows.map(([key, value]) => (
        <div className="inspector__row" key={key}>
          <span className="inspector__key">{key}</span>
          <span style={{ wordBreak: 'break-word' }}>{value}</span>
        </div>
      ))}
    </main>
  );
}
