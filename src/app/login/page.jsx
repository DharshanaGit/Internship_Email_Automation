'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import {
  MailIcon,
  UserIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
} from '@/components/Icons.jsx';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaNonce, setCaptchaNonce] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Initialize nonce on mount
  useEffect(() => {
    setCaptchaNonce(Date.now());
  }, []);

  const refreshCaptcha = () => {
    setCaptchaNonce(Date.now());
    setCaptchaAnswer('');
  };

  const checkCapsLock = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    let cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please provide your company email address.');
      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError('Please provide your account password.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setError('Please enter the security verification code shown in the image.');
      return;
    }

    // Handle user typing username without domain (e.g. "Campus" or "campus")
    if (!cleanEmail.includes('@')) {
      if (cleanEmail.toLowerCase() === 'campus') {
        cleanEmail = 'campus@shortfundly.com';
      } else {
        setError(`Please enter a complete company email address (e.g. ${cleanEmail.toLowerCase()}@shortfundly.com).`);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail.toLowerCase(),
          password: cleanPassword,
          captcha_answer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        let msg = data.error || 'Authentication rejected. Verify your company credentials.';
        if (capsLockActive) {
          msg += ' (Notice: Caps Lock is currently ON. Ensure password case is correct.)';
        }
        setError(msg);
        // Refresh CAPTCHA challenge after each failed attempt
        refreshCaptcha();
      }
    } catch {
      setError('Network communication failed. Please check server connection.');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img
            src="/sf_logo.png"
            alt="Shortfundly"
            className={styles.logo}
          />
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Shortfundly Campus Outreach Portal</h1>
            <div className={styles.taglineLead}>
              Connecting Campuses. Empowering Creators.
            </div>
            <p className={styles.taglineSub}>
              Manage college contacts, automate outreach, and build meaningful campus partnerships — all in one place.
            </p>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircleIcon size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {capsLockActive && (
          <div className={styles.capsLockWarning}>
            <LockIcon size={14} style={{ flexShrink: 0 }} />
            <span>
              <strong>Caps Lock is ON</strong> — Passwords are case-sensitive. Check letter casing.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Company Email */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">
              Company Email
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}><MailIcon size={16} /></span>
              <input
                id="email"
                type="text"
                className={styles.input}
                placeholder="name@shortfundly.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={checkCapsLock}
                onKeyUp={checkCapsLock}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0 0 4px 0',
                }}
              >
                {showPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}><UserIcon size={16} /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${styles.inputWithToggle}`}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={checkCapsLock}
                onKeyUp={checkCapsLock}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.togglePasswordBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          {/* Security CAPTCHA Challenge */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="captcha">
              Security Verification (CAPTCHA)
            </label>

            <div className={styles.captchaRow}>
              <img
                src={`/api/auth/captcha?format=image&v=${captchaNonce}`}
                alt="Security Verification Code"
                className={styles.captchaImg}
                width={160}
                height={44}
                onClick={refreshCaptcha}
                title="Click image to generate new code"
              />

              <button
                type="button"
                className={styles.captchaRefreshBtn}
                onClick={refreshCaptcha}
                title="Generate a new security code"
              >
                <RefreshCwIcon size={13} />
                <span>Refresh</span>
              </button>
            </div>

            <div className={styles.inputWrapper} style={{ marginTop: '6px' }}>
              <span className={styles.inputIcon}><ShieldCheckIcon size={16} /></span>
              <input
                id="captcha"
                type="text"
                className={styles.input}
                placeholder="Enter characters from image above"
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={8}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCwIcon size={16} className="spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Outreach Portal</span>
            )}
          </button>
        </form>

        <div className={styles.securityNote}>
          <ShieldCheckIcon size={16} />
          <div>
            <strong>Enterprise Cybersecurity Active:</strong> Access is restricted to authorized Shortfundly personnel. Sessions are protected via cryptographic CAPTCHA, HTTP-only JWT tokens, bcrypt credential hashing, and brute-force lockout defense.
          </div>
        </div>
      </div>
    </div>
  );
}
