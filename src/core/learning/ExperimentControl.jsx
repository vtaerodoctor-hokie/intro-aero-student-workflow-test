import { useEffect, useId, useState } from 'react';
import { validateInput } from './experimentContract.js';
export default function ExperimentControl({ definition, value, onChange }) {
  const { key, label, unit = '', min, max, step = .01, help, options } = definition;
  const [draft, setDraft] = useState(String(value ?? ''));
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => { setDraft(String(value ?? '')); setError(''); }, [value]);
  function change(text) {
    setDraft(text);
    const checked = validateInput(text, definition);
    setError(checked.error || '');
    if (!checked.error) onChange(key, checked.value);
  }
  return <div className="lab-control">
    <label htmlFor={id}>{label} <span>{unit}</span></label>
    {options ? <select id={id} value={value} onChange={(e) => onChange(key, Number(e.target.value))}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <>
      <input id={id} type="number" inputMode="decimal" value={draft} min={min} max={max} step={step} onChange={(e) => change(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} />
      {min != null && max != null && <input type="range" aria-label={`${label} slider`} min={min} max={max} step={step} value={value} onChange={(e) => change(e.target.value)} />}
    </>}
    <p id={`${id}-help`} className={error ? 'lab-input-error' : ''}>{error || help}</p>
  </div>;
}
