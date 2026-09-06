import { useId, useState } from 'react';
import ExperimentControl from '../learning/ExperimentControl.jsx';
import { settingSections, settingGroups, settingIsActive, inactiveSettingHelp, editorDefinition } from './settingCatalog.js';

export default function FlightSettingEditor({ aircraft, options, onAircraftChange, onOptionChange }) {
  const [section, setSection] = useState('next');
  const [selections, setSelections] = useState({});
  const id = useId();
  const groups = settingGroups(section, options);
  const settings = groups.flatMap(group => group.settings);
  const selected = settings.find(d => d.key === selections[section]) || settings[0];
  const active = selected && settingIsActive(selected, options);
  const value = selected?.source === 'options' ? options[selected.key] : aircraft[selected?.key];
  const category = groups.find(group => group.settings.some(d => d.key === selected?.key))?.label;

  return <div className="flight-setting-editor">
    <h4>Flight settings</h4>
    <label htmlFor={`${id}-section`}>Settings section</label>
    <select id={`${id}-section`} value={section} onChange={e => setSection(e.target.value)}>
      {settingSections.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select>
    <label htmlFor={`${id}-setting`}>Setting</label>
    <select id={`${id}-setting`} value={selected?.key || ''} onChange={e => setSelections(old => ({ ...old, [section]: e.target.value }))}>
      {groups.map(group => <optgroup key={group.label} label={group.label}>
        {group.settings.map(d => <option key={d.key} value={d.key}>{d.label}{settingIsActive(d, options) ? '' : ' — not used'}</option>)}
      </optgroup>)}
    </select>
    {selected && <div className="flight-selected-setting" aria-label="Selected setting editor">
      <p className="flight-setting-category">{category}</p>
      <span className={`flight-setting-badge${active ? '' : ' inactive'}`}>{active ? selected.role === 'criterion' ? 'Comparison only' : 'Used on next launch' : 'Not used in this flight'}</span>
      {active ? <ExperimentControl key={`${section}-${selected.key}`} definition={editorDefinition(selected)} value={value} onChange={selected.source === 'options' ? onOptionChange : onAircraftChange} /> : <>
        <h5>{selected.label}</h5>
        <p className="flight-setting-value">{Number.isFinite(value) ? Number(value.toFixed(4)) : '—'} <small>{selected.unit}</small></p>
        <p>{selected.help}</p>
        <p className="flight-inactive">{inactiveSettingHelp(selected, options)}</p>
      </>}
    </div>}
    <p className="flight-editor-note">Selecting a setting does not change its value. Edits pause the flight and apply on the next launch.</p>
  </div>;
}
