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
  CampaignPulseLogoSymbol,
  CheckCircleIcon,
  ServerIcon,
  BuildingIcon,
  ArrowRightIcon,
  SparklesIcon,
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
      setError('Please provide your corporate email address.');
      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError('Please enter your account security password.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setError('Please enter the security verification code displayed below.');
      return;
    }

    // Default corporate handle resolution if user enters shorthand
    if (!cleanEmail.includes('@')) {
      if (cleanEmail.toLowerCase() === 'campus') {
        cleanEmail = 'campus@shortfundly.com';
      } else {
        setError(`Please enter a complete corporate email address (e.g. ${cleanEmail.toLowerCase()}@shortfundly.com).`);
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
        let msg = data.error || 'Authentication rejected. Verify your corporate credentials.';
        if (capsLockActive) {
          msg += ' (Notice: Caps Lock is active. Passwords are case-sensitive.)';
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
      {/* LEFT DECK: Modern SaaS Campaign Telemetry & Network Overview */}
      <div className={styles.telemetryDeck}>
        <div className={styles.deckGlowOverlay} />

        <div className={styles.deckContent}>
          {/* Brand Seal */}
          <div className={styles.brandRow}>
            <CampaignPulseLogoSymbol size={40} />
            <div className={styles.brandMeta}>
              <div className={styles.brandTitle}>ReachOut <span className={styles.brandTeal}>OS</span></div>
              <span className={styles.brandSub}>Campaign Operations &amp; Academic Outreach</span>
            </div>
          </div>

          {/* Statement */}
          <div className={styles.statementGroup}>
            <div className={styles.limeChip}>
              <SparklesIcon size={12} />
              <span>ENTERPRISE OUTREACH INFRASTRUCTURE</span>
            </div>
            <h1 className={styles.statementHeading}>
              Next-Generation Campus Email Marketing &amp; Engagement Platform
            </h1>
            <p className={styles.statementText}>
              Execute rate-controlled, personalized email campaigns to verified Principals, Department Heads, Deans, and Placement Directors with real-time SMTP deliverability tracking.
            </p>
          </div>

          {/* Operations Telemetry Card */}
          <div className={styles.opsCard}>
            <div className={styles.opsCardHeader}>
              <div className={styles.statusIndicator}>
                <span className={styles.pulseDot} />
                <span className={styles.statusText}>Google SMTP Protocol &bull; TLS 1.3 Active</span>
              </div>
              <span className={styles.badgeVersion}>v3.2 SaaS</span>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricCell}>
                <span className={styles.metricVal}>5,189</span>
                <span className={styles.metricLbl}>Indexed Campuses</span>
              </div>
              <div className={styles.metricCell}>
                <span className={styles.metricVal}>13,647</span>
                <span className={styles.metricLbl}>Verified Stakeholders</span>
              </div>
              <div className={styles.metricCell}>
                <span className={styles.metricValLime}>30 Days</span>
                <span className={styles.metricLbl}>Anti-Spam Cooldown</span>
              </div>
              <div className={styles.metricCell}>
                <span className={styles.metricValTeal}>99.4%</span>
                <span className={styles.metricLbl}>250 OK Deliverability</span>
              </div>
            </div>

            <div className={styles.roleChipsRow}>
              <span className={styles.roleChip}><BuildingIcon size={12} /> 3,238 Principals</span>
              <span className={styles.roleChip}><CheckCircleIcon size={12} /> 1,170 TPOs</span>
              <span className={styles.roleChip}><UserIcon size={12} /> 3,211 Faculties &amp; HODs</span>
            </div>
          </div>

          {/* Infrastructure Guarantees */}
          <div className={styles.infraList}>
            <div className={styles.infraItem}>
              <ServerIcon size={15} className={styles.infraIcon} />
              <span>TLS 1.3 Secure Socket Transport</span>
            </div>
            <div className={styles.infraItem}>
              <ShieldCheckIcon size={15} className={styles.infraIcon} />
              <span>Zero Recipient Collision Guarantee</span>
            </div>
          </div>
        </div>

        <div className={styles.deckFooter}>
          <span>&copy; {new Date().getFullYear()} ReachOut OS Platform &bull; Authorized Personnel Only</span>
        </div>
      </div>

      {/* RIGHT DECK: Clean Modern SaaS Authentication Terminal */}
      <div className={styles.authTerminal}>
        <div className={styles.terminalTopBar}>
          <Link href="/" className={styles.returnLink}>
            <span>&larr;</span> Back to Platform Overview
          </Link>
        </div>

        <div className={styles.terminalFormWrap}>
          <div className={styles.formHeader}>
            <span className={styles.eyebrowTag}>SECURE GATEWAY</span>
            <h2 className={styles.terminalTitle}>Sign In to Workspace</h2>
            <p className={styles.terminalSubtitle}>
              Authenticate with your corporate credentials to manage campaigns and outreach ledgers.
            </p>
          </div>

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

          <form onSubmit={handleSubmit} className={styles.formElement} noValidate>
            {/* Corporate Email */}
            <div className={styles.fieldUnit}>
              <label className={styles.fieldLabel} htmlFor="email">
                Corporate Email Address
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
                  Security Password
                </label>
                <button
                  type="button"
                  className={styles.toggleTextBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide Password' : 'Show Password'}
                </button>
              </div>
              <div className={styles.inputShell}>
                <span className={styles.inputPrefix}><LockIcon size={16} /></span>
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
                  className={styles.eyeToggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {/* CAPTCHA Challenge */}
            <div className={styles.captchaPanel}>
              <div className={styles.labelBar}>
                <label className={styles.fieldLabel} htmlFor="captcha">
                  Security Challenge Verification
                </label>
                <span className={styles.captchaMeta}>Click image to regenerate</span>
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
                  <span>Regenerate</span>
                </button>
              </div>

              <div className={styles.inputShell} style={{ marginTop: '6px' }}>
                <span className={styles.inputPrefix}><ShieldCheckIcon size={16} /></span>
                <input
                  id="captcha"
                  type="text"
                  className={styles.textInput}
                  placeholder="Enter characters from the image above"
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
              className={styles.submitAction}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCwIcon size={16} className={styles.iconSpinner} />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Outreach Console</span>
                  <ArrowRightIcon size={15} />
                </>
              )}
            </button>
          </form>

          <div className={styles.terminalSecurityNote}>
            <ShieldCheckIcon size={14} className={styles.noteIcon} />
            <span>
              End-to-end encrypted session. Protected with SHA-256 CAPTCHA challenges, bcrypt password hashing, and brute-force lockout safeguards.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
