'use client';

import type { InspectorSnapshot } from '../lib/client-api';

interface DemoInspectorProps {
  open: boolean;
  snapshot: InspectorSnapshot;
  onToggle: () => void;
  onReset: () => void;
}

export function DemoInspector({ open, snapshot, onToggle, onReset }: DemoInspectorProps) {
  return (
    <aside className={`inspector ${open ? 'inspector--open' : ''}`} aria-label="Demo Inspector">
      <button
        className="inspector__toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="demo-inspector-panel"
      >
        <span aria-hidden="true">⌁</span> Demo Inspector
      </button>
      {open ? (
        <div id="demo-inspector-panel" className="inspector__panel">
          <div className="inspector__heading">
            <div>
              <p className="eyebrow">Judge view · hidden from elder screens</p>
              <h2>Deterministic session details</h2>
            </div>
            <button className="icon-button" type="button" onClick={onToggle} aria-label="Close Demo Inspector">×</button>
          </div>
          <dl className="inspector-grid">
            <div><dt>Transcript</dt><dd>{snapshot.transcript || 'No turn yet'}</dd></div>
            <div><dt>Intent</dt><dd>{snapshot.intent}</dd></div>
            <div><dt>ParsedCommand</dt><dd><code>{JSON.stringify(snapshot.parsedCommand)}</code></dd></div>
            <div><dt>Entities</dt><dd><code>{JSON.stringify(snapshot.entities)}</code></dd></div>
            <div><dt>Skill / routine</dt><dd>{snapshot.skillOrRoutine}</dd></div>
            <div><dt>Step</dt><dd>{snapshot.step}</dd></div>
            <div><dt>Session state</dt><dd>{snapshot.sessionState}</dd></div>
            <div><dt>Safety decision</dt><dd>{snapshot.safetyDecision}</dd></div>
            <div><dt>API latency</dt><dd>{snapshot.latencyMs} ms</dd></div>
            <div><dt>Fallback</dt><dd>{snapshot.fallback}</dd></div>
            <div className="inspector-grid__wide">
              <dt>Event history</dt>
              <dd>{snapshot.events.length ? snapshot.events.join(' → ') : 'No events yet'}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onReset}>Reset Demo</button>
        </div>
      ) : null}
    </aside>
  );
}
