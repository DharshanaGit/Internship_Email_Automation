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
      setError('Please enter the security verification code displayed below.');
      return;
    }

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
          msg += ' (Notice: Caps Lock is ON. Passwords are case-sensitive.)';
        }
        setError(msg);
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
    <div className={styles.loginWorkspace}>
      {/* Floating Dual-Panel Container */}
      <div className={styles.splitShell}>
        {/* Left Side: Brand Story, Telemetry & Operations Panel */}
        <div className={styles.brandPanel}>
          <div className={styles.brandPanelInner}>
            {/* Logo Badge */}
            <div className={styles.logoRow}>
              <div className={styles.symbolWrap}>
                <ShortfundlyLogoSymbol size={42} />
              </div>
              <div className={styles.brandNames}>
                <span className={styles.mainBrand}>Shortfundly</span>
                <span className={styles.subBrand}>Campus Outreach Workspace</span>
              </div>
            </div>

            {/* Introduction Statement */}
            <div className={styles.statementBox}>
              <div className={styles.pillLabel}>INTERNAL OPERATIONS</div>
              <h1 className={styles.statementTitle}>
                Academic Partnership &amp; Outreach Command Console
              </h1>
              <p className={styles.statementDesc}>
                Connect directly with Principals, Directors, Deans, HODs, and Placement Heads across 5,189+ verified institutions statewide.
              </p>
            </div>

            {/* Nested Status Card */}
            <div className={styles.telemetryCard}>
              <div className={styles.telemetryTop}>
                <div className={styles.statusPill}>
                  <span className={styles.statusDot} />
                  <span>Google SMTP Engine &bull; 250 OK Protocol</span>
                </div>
                <span className={styles.versionTag}>v2.5 Workspace</span>
              </div>

              <div className={styles.metricsGrid}>
                <div className={styles.metricItem}>
                  <span className={styles.metricValue}>5,189</span>
                  <span className={styles.metricLabel}>Active Campuses</span>
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
                  <span className={styles.metricLabel}>RFC 5322 Delivery</span>
                </div>
              </div>

              <div className={styles.rolePillsRow}>
                <span className={styles.rolePill}><BuildingIcon size={12} /> 3,238 Principals</span>
                <span className={styles.rolePill}><CheckCircleIcon size={12} /> 1,170 TPOs</span>
                <span className={styles.rolePill}><UserIcon size={12} /> 3,211 Faculties &amp; HODs</span>
              </div>
            </div>

            {/* Feature Guarantees */}
            <div className={styles.highlightsRow}>
              <div className={styles.highlightItem}>
                <ServerIcon size={15} className={styles.highlightIcon} />
                <span>SSL/TLS Encrypted Dispatch</span>
              </div>
              <div className={styles.highlightItem}>
                <ShieldCheckIcon size={15} className={styles.highlightIcon} />
                <span>Zero Recipient Harassment</span>
              </div>
            </div>
          </div>

          <div className={styles.panelFooter}>
            <span>&copy; {new Date().getFullYear()} Shortfundly Outreach Platform &bull; Authorized Corporate Access Only</span>
          </div>
        </div>

        {/* Right Side: Authentication Console */}
        <div className={styles.formPanel}>
          <div className={styles.formPanelHeader}>
            <Link href="/" className={styles.backPill}>
              <span>&larr;</span> Return to Overview
            </Link>
          </div>

          <div className={styles.formCard}>
            <div className={styles.formTitleGroup}>
              <span className={styles.eyebrowChip}>ACCESS AUTHENTICATION</span>
              <h2 className={styles.formTitle}>Sign In to Workspace</h2>
              <p className={styles.formSubtitle}>
                Enter your company credentials to manage contacts, compose proposals, and run campaigns.
              </p>
            </div>

            {error && (
              <div className={styles.errorBanner} role="alert">
                <AlertCircleIcon size={16} className={styles.bannerIcon} />
                <span>{error}</span>
              </div>
            )}

            {capsLockActive && (
              <div className={styles.capsLockBanner}>
                <LockIcon size={14} />
                <span>
                  <strong>Caps Lock is Active:</strong> Passwords are case-sensitive.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
              {/* Company Email */}
              <div className={styles.fieldContainer}>
                <label className={styles.inputLabel} htmlFor="email">
                  Company Email
                </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon size={16} /></span>
                  <input
                    id="email"
                    type="email"
                    className={styles.styledInput}
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
              <div className={styles.fieldContainer}>
                <div className={styles.labelWithAction}>
                  <label className={styles.inputLabel} htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className={styles.visibilityToggleBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon size={16} /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.styledInput} ${styles.inputWithToggle}`}
                    placeholder="Enter account password"
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
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              {/* Security CAPTCHA Challenge */}
              <div className={styles.captchaBlock}>
                <div className={styles.labelWithAction}>
                  <label className={styles.inputLabel} htmlFor="captcha">
                    Security Verification
                  </label>
                  <span className={styles.captchaHelp}>Click image to refresh</span>
                </div>

                <div className={styles.captchaGraphicRow}>
                  <img
                    src={`/api/auth/captcha?format=image&v=${captchaNonce}`}
                    alt="Security verification code"
                    className={styles.captchaImage}
                    width={160}
                    height={44}
                    onClick={refreshCaptcha}
                    title="Click image to generate new verification challenge"
                  />

                  <button
                    type="button"
                    className={styles.refreshPill}
                    onClick={refreshCaptcha}
                    title="Generate new verification code"
                  >
                    <RefreshCwIcon size={13} />
                    <span>New Code</span>
                  </button>
                </div>

                <div className={styles.inputWrap} style={{ marginTop: '6px' }}>
                  <span className={styles.inputIcon}><ShieldCheckIcon size={16} /></span>
                  <input
                    id="captcha"
                    type="text"
                    className={styles.styledInput}
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

              {/* Submit CTA */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCwIcon size={16} className={styles.spinner} />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Outreach Workspace</span>
                    <ArrowRightIcon size={15} />
                  </>
                )}
              </button>
            </form>

            <div className={styles.securityFooterNote}>
              <ShieldCheckIcon size={14} className={styles.secIcon} />
              <span>
                Protected with bcrypt credential hashing, HTTP-only JWT cookies, and rate-limited brute-force lockout defense.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
