import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, LockKeyhole, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { authenticate, loading, error: connectionError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const input = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    input.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try { await authenticate(mode, input); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="auth-page">
    <section className="auth-story">
      <a className="brand" href="/"><span className="brand-mark"><Check /></span>daymark<span className="brand-dot">.</span></a>
      <div className="story-content"><span className="eyebrow">SMALL STEPS. REAL CHANGE.</span><h1>Make room for<br />a little progress.</h1><p>A calm space for the things you want to do more often. Show up, check in, and watch your days add up.</p>
        <div className="sample-card" aria-hidden="true"><div className="sample-heading"><span className="activity-icon green"><Sprout size={22} /></span><div><strong>A little better, every day</strong><span>Build a rhythm that feels like you.</span></div></div><div className="sample-checks">{Array.from({ length: 21 }, (_, i) => <span key={i} className={i % 6 !== 4 ? 'filled' : ''}>{i % 6 !== 4 && <Check size={19} />}</span>)}</div><small>Consistency starts with one small check.</small></div>
      </div><p className="story-footer">Your days. Your pace. Your progress.</p>
    </section>
    <section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">YOUR PERSONAL SPACE</span><h2>{mode === 'login' ? 'Welcome back.' : 'A fresh start.'}</h2><p>{mode === 'login' ? 'Pick up where you left off.' : 'Create your private Daymark account.'}</p>
      {mode === 'register' && <label>Your name<input name="name" autoComplete="name" required maxLength={60} placeholder="What should we call you?" /></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required placeholder={mode === 'register' ? 'Choose a password' : 'Enter your password'} /></label>
      {mode === 'register' && <><label>Private setup key<input name="registrationKey" type="password" autoComplete="off" required maxLength={256} placeholder="Your registration key" /></label><p className="field-hint">Your calendar will use {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></>}
      {loading && <p className="field-hint" role="status">Checking your existing session… You can sign in below.</p>}
      {(error || connectionError) && <div className="error-banner" role="alert">{error || 'The server is temporarily unavailable. Please try signing in again shortly.'}</div>}
      <button className="button primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={18} /></button>
      <button type="button" className="text-button auth-switch" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'First time here? Set up your account' : 'Already have an account? Sign in'}</button>
      <div className="private-note"><LockKeyhole size={14} /> A private place for your everyday progress.</div>
    </form></section>
  </div>;
}
