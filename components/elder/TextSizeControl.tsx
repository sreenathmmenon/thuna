'use client';

export type TextSizeStep = 'normal' | 'large' | 'xl';

interface TextSizeControlProps {
  value: TextSizeStep;
  onChange: (next: TextSizeStep) => void;
}

const STEPS: ReadonlyArray<{
  step: TextSizeStep;
  glyphClass: string;
  name: string;
  announce: string;
}> = [
  { step: 'normal', glyphClass: 'aa__glyph--1', name: 'Normal', announce: 'Normal text' },
  { step: 'large', glyphClass: 'aa__glyph--2', name: 'Large', announce: 'Large text' },
  { step: 'xl', glyphClass: 'aa__glyph--3', name: 'Largest', announce: 'Largest text' },
];

/**
 * Three-step text size picker. Each option previews its own size (fixed px
 * glyphs, so the previews never scale away from each other). The chosen step
 * scales the whole app through html[data-text].
 */
export function TextSizeControl({ value, onChange }: TextSizeControlProps): JSX.Element {
  return (
    <div className="aa" role="group" aria-label="Text size">
      {STEPS.map((option) => (
        <button
          key={option.step}
          type="button"
          className="aa__btn"
          aria-pressed={value === option.step}
          aria-label={option.announce}
          onClick={() => onChange(option.step)}
        >
          <span className={option.glyphClass} aria-hidden="true">
            A
          </span>
          <span className="aa__name">{option.name}</span>
        </button>
      ))}
    </div>
  );
}

export default TextSizeControl;
