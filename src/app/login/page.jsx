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
} from '@/components/Icons.jsx';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Load CAPTCHA challenge
  const fetchCaptcha = async () => {
    try {
      setLoadingCaptcha(true);
      const res = await fetch('/api/auth/captcha?ts=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.token);
        setCaptchaAnswer('');
      }
    } catch {
      // In case of error
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

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

    if (!password) {
      setError('Please provide your account password.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setError('Please enter the CAPTCHA security verification code.');
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
          password,
          captcha_token: captchaToken,
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
        fetchCaptcha();
      }
    } catch {
      setError('Network communication failed. Please check server connection.');
      fetchCaptcha();
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
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}><UserIcon size={16} /></span>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
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
            </div>
          </div>

          {/* Security CAPTCHA Challenge */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="captcha">
              Security Verification (CAPTCHA)
            </label>

            <div className={styles.captchaRow}>
              {captchaSvg ? (
                <div
                  className={styles.captchaSvgWrapper}
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  title="Security Verification Code"
                />
              ) : (
                <div style={{ height: '44px', width: '160px', background: '#f1f5f9', borderRadius: '4px' }} />
              )}

              <button
                type="button"
                className={styles.captchaRefreshBtn}
                onClick={fetchCaptcha}
                disabled={loadingCaptcha}
                title="Generate a new security code"
              >
                <RefreshCwIcon size={13} className={loadingCaptcha ? 'spin' : ''} />
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
