'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ShortfundlyLogoSymbol,
  CheckCircleIcon,
  ServerIcon,
  BuildingIcon,
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
      setError('Please enter your company email address.');
      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError('Please enter your account password.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setError('Please enter the security verification code displayed below.');
      return;
    }

    // Auto-complete default company handle if user entered only "campus"
    if (!cleanEmail.includes('@')) {
      if (cleanEmail.toLowerCase() === 'campus') {
        cleanEmail = 'campus@shortfundly.com';
      } else {
        setError(`Please enter a full company email address (e.g. ${cleanEmail.toLowerCase()}@shortfundly.com).`);
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
        let msg = data.error || 'Authentication failed. Please verify your company credentials.';
        if (capsLockActive) {
          msg += ' (Notice: Caps Lock is active. Passwords are case-sensitive.)';
        }
        setError(msg);
        refreshCaptcha();
      }
    } catch {
      setError('Network communication failed. Please check your connection and retry.');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      {/* LEFT EXECUTIVE DECK: Brand, Telemetry & Institutional Metrics */}
      <div className={styles.intelDeck}>
        <div className={styles.deckContent}>
          {/* Brand Seal */}
          <div className={styles.brandSeal}>
            <ShortfundlyLogoSymbol size={44} />
            <div className={styles.brandTextGroup}>
              <span className={styles.brandTitle}>Shortfundly</span>
              <span className={styles.brandBadge}>Campus Outreach Portal</span>
            </div>
          </div>

          {/* Core Mission & Editorial Statement */}
          <div className={styles.intelStatement}>
            <h1 className={styles.intelHeading}>
              Enterprise College Outreach &amp; Academic Partnership Intelligence
            </h1>
            <p className={styles.intelSummary}>
              Unified communication console designed for company outreach to Principals, Directors,
              Deans, HODs, and Training &amp; Placement Officers across higher-education institutions.
            </p>
          </div>

          {/* Real-time System Telemetry Panel */}
          <div className={styles.telemetryCard}>
            <div className={styles.telemetryHeader}>
              <div className={styles.telemetryIndicator}>
                <span className={styles.pulseDot} />
                <span className={styles.telemetryStatus}>Live Outreach Engine Active</span>
              </div>
              <span className={styles.telemetryTag}>v2.4 Enterprise</span>
            </div>

            <div className={styles.metricGrid}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>5,189</span>
                <span className={styles.metricLabel}>Indexed Campuses</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>13,647</span>
                <span className={styles.metricLabel}>Verified Contacts</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>30 Days</span>
                <span className={styles.metricLabel}>Anti-Spam Cooldown</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>100%</span>
                <span className={styles.metricLabel}>RFC 5322 Compliant</span>
              </div>
            </div>

            <div className={styles.targetRolesList}>
              <div className={styles.roleChip}>
                <BuildingIcon size={12} />
                <span>3,238 Principals &amp; Directors</span>
              </div>
              <div className={styles.roleChip}>
                <CheckCircleIcon size={12} />
                <span>1,170 Placement Officers</span>
              </div>
              <div className={styles.roleChip}>
                <UserIcon size={12} />
                <span>3,211 Faculties &amp; HODs</span>
              </div>
            </div>
          </div>

          {/* Security & Infrastructure Highlights */}
          <div className={styles.securityPillars}>
            <div className={styles.pillarItem}>
              <ServerIcon size={15} className={styles.pillarIcon} />
              <div>
                <strong className={styles.pillarTitle}>Google Enterprise SMTP</strong>
                <p className={styles.pillarDesc}>SSL 465 / STARTTLS 587 secure transport protocol.</p>
              </div>
            </div>
            <div className={styles.pillarItem}>
              <ShieldCheckIcon size={15} className={styles.pillarIcon} />
              <div>
                <strong className={styles.pillarTitle}>Cooldownguard Defense</strong>
                <p className={styles.pillarDesc}>Prevents duplicate recipient contact within 30-day cycle.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.deckFooter}>
          <span>&copy; {new Date().getFullYear()} Shortfundly Outreach Platform &bull; Authorized Personnel Only</span>
        </div>
      </div>

      {/* RIGHT AUTH CONSOLE: Login Form & Security Verification */}
      <div className={styles.authConsole}>
        <div className={styles.consoleHeader}>
          <Link href="/" className={styles.backHomeBtn}>
            <span>&larr;</span> Back to Portal Overview
          </Link>
        </div>

        <div className={styles.consoleCard}>
          <div className={styles.formIntro}>
            <span className={styles.eyebrowTag}>SECURE GATEWAY</span>
            <h2 className={styles.consoleTitle}>Sign In to Outreach Console</h2>
            <p className={styles.consoleSubtitle}>
              Authenticate with your company email credentials to manage contacts and campaigns.
            </p>
          </div>

          {error && (
            <div className={styles.errorAlert} role="alert">
              <AlertCircleIcon size={18} className={styles.alertIcon} />
              <div className={styles.alertText}>{error}</div>
            </div>
          )}

          {capsLockActive && (
            <div className={styles.capsLockAlert}>
              <LockIcon size={14} />
              <span>
                <strong>Caps Lock is ON</strong> — Passwords are case-sensitive. Check keyboard casing.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
            {/* Company Email */}
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel} htmlFor="email">
                Company Email Address
              </label>
              <div className={styles.fieldBox}>
                <span className={styles.fieldIcon}><MailIcon size={16} /></span>
                <input
                  id="email"
                  type="email"
                  className={styles.textInput}
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
            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label className={styles.fieldLabel} htmlFor="password">
                  Account Password
                </label>
                <button
                  type="button"
                  className={styles.textActionBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide Password' : 'Show Password'}
                </button>
              </div>
              <div className={styles.fieldBox}>
                <span className={styles.fieldIcon}><LockIcon size={16} /></span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.textInput} ${styles.inputWithToggle}`}
                  placeholder="Enter your security password"
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
                  className={styles.toggleVisibilityBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {/* Security CAPTCHA Challenge */}
            <div className={styles.captchaSection}>
              <div className={styles.labelRow}>
                <label className={styles.fieldLabel} htmlFor="captcha">
                  Security Verification Challenge
                </label>
                <span className={styles.captchaHelper}>Click image or refresh if unclear</span>
              </div>

              <div className={styles.captchaControls}>
                <img
                  src={`/api/auth/captcha?format=image&v=${captchaNonce}`}
                  alt="Security verification code"
                  className={styles.captchaGraphic}
                  width={160}
                  height={44}
                  onClick={refreshCaptcha}
                  title="Click image to generate new verification challenge"
                />

                <button
                  type="button"
                  className={styles.refreshCaptchaBtn}
                  onClick={refreshCaptcha}
                  title="Generate new verification code"
                >
                  <RefreshCwIcon size={13} />
                  <span>New Code</span>
                </button>
              </div>

              <div className={styles.fieldBox} style={{ marginTop: '8px' }}>
                <span className={styles.fieldIcon}><ShieldCheckIcon size={16} /></span>
                <input
                  id="captcha"
                  type="text"
                  className={styles.textInput}
                  placeholder="Enter the security code shown above"
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

            {/* Submit Action */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCwIcon size={16} className={styles.spinningIcon} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Outreach Console &rarr;</span>
              )}
            </button>
          </form>

          {/* Enterprise Protection Notice */}
          <div className={styles.complianceNote}>
            <ShieldCheckIcon size={15} className={styles.complianceIcon} />
            <p>
              <strong>Corporate Security Policy:</strong> All access attempts are recorded in the security audit ledger. Sessions are secured with bcrypt credential hashing, HTTP-only JWT cookies, and cryptographic CAPTCHA defense.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
