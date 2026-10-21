'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import {
  MailIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CampaignPulseLogoSymbol,
  ArrowRightIcon,
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

  useEffect(() => {
    setCaptchaNonce(Date.now());
    // Clear any residual session on the client so the user is always asked to enter credentials
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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
      setError('Please provide your email address.');
      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setError('Please enter the security verification code displayed below.');
      return;
    }

    // Default corporate handle resolution if user enters shorthand
    if (!cleanEmail.includes('@')) {
      if (cleanEmail.toLowerCase() === 'admin' || cleanEmail.toLowerCase() === 'campus') {
        cleanEmail = 'admin@campusoutreach.org';
      } else {
        setError(`Please enter a complete email address (e.g. ${cleanEmail.toLowerCase()}@organization.com).`);
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
        let msg = data.error || 'Invalid email or password. Please try again.';
        if (capsLockActive) {
          msg += ' (Notice: Caps Lock is on. Passwords are case-sensitive.)';
        }
        setError(msg);
        refreshCaptcha();
      }
    } catch {
      setError('Network communication failed. Please check server connectivity.');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authViewport}>
      <div className={styles.loginCard}>
        {/* Top Navigation */}
        <div className={styles.cardTopNav}>
          <Link href="/" className={styles.returnLink}>
            <span>&larr;</span> Back to Home
          </Link>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Secure Login</span>
        </div>

        {/* Brand Area */}
        <div className={styles.brandArea}>
          <div className={styles.logoIcon}>
            <CampaignPulseLogoSymbol size={44} />
          </div>
          <div className={styles.titleArea}>
            <h1 className={styles.brandTitle}>
              Campus <span className={styles.brandTeal}>Automation</span>
            </h1>
            <p className={styles.brandSubtitle}>
              Sign in to manage your campus email campaigns
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircleIcon size={16} className={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        {capsLockActive && (
          <div className={styles.capsLockAlert}>
            <LockIcon size={14} />
            <span>
              <strong>Caps Lock is Active:</strong> Passwords are case-sensitive.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.formElement} noValidate>
          {/* Email */}
          <div className={styles.fieldUnit}>
            <label className={styles.fieldLabel} htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputShell}>
              <span className={styles.inputPrefix}><MailIcon size={16} /></span>
              <input
                id="email"
                type="email"
                className={styles.textInput}
                placeholder="name@company.com"
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
          <div className={styles.fieldUnit}>
            <div className={styles.labelBar}>
              <label className={styles.fieldLabel} htmlFor="password">
                Password
              </label>
              <button
                type="button"
                className={styles.toggleTextBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={styles.inputShell}>
              <span className={styles.inputPrefix}><LockIcon size={16} /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.textInput} ${styles.inputWithToggle}`}
                placeholder="Enter your password"
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
                className={styles.eyeToggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          {/* Security Challenge (CAPTCHA) */}
          <div className={styles.captchaPanel}>
            <div className={styles.labelBar}>
              <label className={styles.fieldLabel} htmlFor="captcha">
                Security Verification
              </label>
              <span className={styles.captchaMeta}>Click image to refresh</span>
            </div>

            <div className={styles.captchaRow}>
              <img
                src={`/api/auth/captcha?format=image&v=${captchaNonce}`}
                alt="Security verification challenge"
                className={styles.captchaImage}
                width={160}
                height={44}
                onClick={refreshCaptcha}
                title="Click image to generate new verification challenge"
              />

              <button
                type="button"
                className={styles.refreshBtn}
                onClick={refreshCaptcha}
                title="Generate new verification code"
              >
                <RefreshCwIcon size={13} />
                <span>Refresh</span>
              </button>
            </div>

            <div className={styles.inputShell} style={{ marginTop: '4px' }}>
              <span className={styles.inputPrefix}><ShieldCheckIcon size={16} /></span>
              <input
                id="captcha"
                type="text"
                className={styles.textInput}
                placeholder="Enter characters from image"
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

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitAction}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCwIcon size={16} className={styles.iconSpinner} />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRightIcon size={15} />
              </>
            )}
          </button>
        </form>

        {/* Security Footnote */}
        <div className={styles.cardFooter}>
          <ShieldCheckIcon size={14} className={styles.noteIcon} />
          <span>Encrypted session with secure password protection</span>
        </div>
      </div>
    </div>
  );
}
