import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { accents, useTheme } from '../context/ThemeContext';

export function Settings() {
  const { preferences, update } = useTheme();
  return <div className="settings-page"><section className="page-heading"><div><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Your space, your style.</h1><p>A few thoughtful touches to make Daymark feel like you.</p></div></section>
    <section className="panel appearance-panel"><fieldset><legend>Appearance</legend><p>Choose a theme, or let your device decide.</p><div className="theme-options">{([{ value: 'system', label: 'Device', icon: Monitor }, { value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} aria-pressed={preferences.theme === value} onClick={() => update({ theme: value })}><Icon size={22} /><span>{label}</span>{preferences.theme === value && <Check size={15} />}</button>)}</div></fieldset>
    <fieldset><legend>Accent color</legend><p>A personal touch for navigation, buttons, and progress.</p><div className="accent-options">{(Object.keys(accents) as (keyof typeof accents)[]).map(accent => <button type="button" key={accent} data-accent={accent} aria-pressed={preferences.accent === accent} onClick={() => update({ accent })}><span className="accent-swatch">{preferences.accent === accent && <Check size={17} />}</span>{accents[accent]}</button>)}</div></fieldset>
    <div className="motion-setting"><div><h2>Reduce motion</h2><p>Keep things still. Your device’s reduced-motion preference is always respected.</p></div><button type="button" className="motion-switch" role="switch" aria-label="Reduce motion" aria-checked={preferences.reducedMotion} onClick={() => update({ reducedMotion: !preferences.reducedMotion })}><span /></button></div>
    <p className="settings-note">Changes apply instantly. Preferences are saved in this browser when storage is available.</p></section></div>;
}
