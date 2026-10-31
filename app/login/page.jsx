'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './login.module.css';
import { Mail, Lock, Shield, RotateCw, ArrowRight, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff, UserPlus, LogIn, Check } from 'lucide-react';

// Validation helpers
const validateName = (val) => {
  if (!val) return null;
  if (/\d/.test(val)) {
    return 'Full name cannot contain numbers (letters only).';
  }
  return null;
};

const validateEmail = (val) => {
  if (!val) return null;
  if (/[A-Z]/.test(val)) {
    return 'Email address cannot contain capital letters (lowercase only).';
  }
  if (!val.includes('@')) {
    return "Email must contain an '@' symbol.";
  }
  if (!/\.(com|in)$/.test(val.trim())) {
    return "Email must end with '.com' or '.in' (e.g. name@gmail.com).";
  }
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|in)$/;
  if (!emailRegex.test(val.trim())) {
    return "Please enter a valid lowercase email ending with '.com' or '.in'.";
  }
  return null;
};

const getPasswordCriteria = (val) => ({
  length: (val || '').length >= 8,
  lower: /[a-z]/.test(val || ''),
  upper: /[A-Z]/.test(val || ''),
  number: /[0-9]/.test(val || ''),
  symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val || ''),
});

const validateStrongPassword = (val) => {
  if (!val) return null;
  const crit = getPasswordCriteria(val);
  const missing = [];
  if (!crit.length) missing.push('min 8 characters');
  if (!crit.lower) missing.push('small letter (a-z)');
  if (!crit.upper) missing.push('caps letter (A-Z)');
  if (!crit.number) missing.push('number (0-9)');
  if (!crit.symbol) missing.push('special symbol (!@#$...)');

  if (missing.length > 0) {
    return `Password must include: ${missing.join(', ')}.`;
  }
  return null;
};

export default function LoginPage() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('ADMIN');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaData, setCaptchaData] = useState({ token: '', svg: '' });
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('HR');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [supportNotice, setSupportNotice] = useState('');

  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const res = await fetch('/api/auth/captcha', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setCaptchaData({ token: data.token, svg: data.svg });
        setCaptchaAnswer('');
      }
    } catch (err) {
      console.error('Error fetching captcha:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // Real-time validations for Sign In
  const loginEmailError = useMemo(() => validateEmail(email), [email]);

  // Real-time validations for Create Account
  const regNameError = useMemo(() => validateName(regName), [regName]);
  const regEmailError = useMemo(() => validateEmail(regEmail), [regEmail]);
  const regPasswordError = useMemo(() => validateStrongPassword(regPassword), [regPassword]);
  const regPasswordCriteria = useMemo(() => getPasswordCriteria(regPassword), [regPassword]);
  const regConfirmError = useMemo(() => {
    if (!regConfirmPassword) return null;
    if (regConfirmPassword !== regPassword) {
      return 'Confirm password does not match password.';
    }
    return null;
  }, [regConfirmPassword, regPassword]);

  const renderPasswordCriteria = (criteria, currentPassword) => {
    if (!currentPassword) return null;
    return (
      <div className={styles.passwordRulesGrid}>
        <span className={`${styles.passwordRuleItem} ${criteria.length ? styles.passwordRuleMet : ''}`}>
          {criteria.length ? '✓' : '○'} 8+ characters
        </span>
        <span className={`${styles.passwordRuleItem} ${criteria.lower ? styles.passwordRuleMet : ''}`}>
          {criteria.lower ? '✓' : '○'} Small letter (a-z)
        </span>
        <span className={`${styles.passwordRuleItem} ${criteria.upper ? styles.passwordRuleMet : ''}`}>
          {criteria.upper ? '✓' : '○'} Caps letter (A-Z)
        </span>
        <span className={`${styles.passwordRuleItem} ${criteria.number ? styles.passwordRuleMet : ''}`}>
          {criteria.number ? '✓' : '○'} Number (0-9)
        </span>
        <span className={`${styles.passwordRuleItem} ${criteria.symbol ? styles.passwordRuleMet : ''}`}>
          {criteria.symbol ? '✓' : '○'} Special symbol (!@#$)
        </span>
      </div>
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setSupportNotice('');

    if (loginEmailError) {
      setSubmitError(loginEmailError);
      return;
    }

    if (!password) {
      setSubmitError('Please enter your password.');
      return;
    }

    if (!captchaAnswer) {
      setSubmitError('Please enter the security verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role,
          captchaAnswer,
          captchaToken: captchaData.token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Authentication failed. Please check credentials or captcha.');
        fetchCaptcha();
        return;
      }

      setSuccessMessage('Authentication successful! Loading dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 600);
    } catch (err) {
      setSubmitError(err.message || 'An unexpected connection error occurred.');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setSupportNotice('');

    if (regNameError) {
      setSubmitError(regNameError);
      return;
    }

    if (regEmailError) {
      setSubmitError(regEmailError);
      return;
    }

    if (regPasswordError) {
      setSubmitError(regPasswordError);
      return;
    }

    if (regConfirmError) {
      setSubmitError(regConfirmError);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: regRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Account creation failed. Please try again.');
        return;
      }

      setSuccessMessage('Account created successfully! Redirecting to operations portal...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      setSubmitError(err.message || 'An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      {/* ------------------------------------------------------------------ */}
      {/* LEFT BRAND & NARRATIVE PANEL (50% Desktop)                         */}
      {/* ------------------------------------------------------------------ */}
      <div className={styles.leftBrandPanel}>
        <div className={styles.gridOverlay} />

        {/* Floating Digital Workflow Visual Artwork */}
        <div className={styles.workflowArtLayer}>
          <svg className={styles.pipelineSvg} viewBox="0 0 700 800" fill="none">
            {/* Connecting pipeline lines */}
            <path
              d="M 60 550 L 120 550 L 120 420 L 280 420 L 280 300 L 460 300"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            <path
              d="M 120 420 L 120 620 L 320 620"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="2"
            />
            {/* Pipeline circular nodes */}
            <circle cx="60" cy="550" r="14" fill="#4338CA" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
            <circle cx="120" cy="420" r="11" fill="#6D28D9" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <circle cx="280" cy="420" r="8" fill="#7C3AED" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
            <circle cx="280" cy="300" r="9" fill="#9333EA" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
            <circle cx="320" cy="620" r="12" fill="#5B21B6" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
          </svg>

          {/* Top floating glassmorphic node card */}
          <div className={styles.glassCardTop}>
            <div className={styles.glassLineShort} />
            <div className={styles.glassLineMed} />
            <div className={styles.glassLineLong} />
          </div>

          {/* Bottom floating glassmorphic document card */}
          <div className={styles.glassCardBottom}>
            <div className={styles.glassLineShort} />
            <div className={styles.glassLineLong} />
            <div className={styles.glassLineMed} />
            <div className={styles.glassCheckBadge}>
              <Check size={16} strokeWidth={3} />
            </div>
          </div>
          <div className={styles.glassCheckBadgeSmall}>
            <Check size={14} strokeWidth={3} />
          </div>
        </div>

        {/* Top brand header */}
        <div className={styles.brandLogoHeader}>
          <div className={styles.brandLogoBox}>
            <Shield size={20} />
          </div>
          <span className={styles.brandLogoText}>Shortfundly</span>
        </div>

        {/* Central typographic narrative */}
        <div className={styles.brandNarrative}>
          <h1 className={styles.brandHeading}>
            Streamlining Internship Operations &amp; Automation
          </h1>
          <p className={styles.brandParagraph}>
            Manage applicants, automate offer letters, and handle approvals in one secure dashboard.
          </p>
        </div>

        {/* Bottom meta */}
        <div className={styles.brandFooterMeta}>
          <span>Shortfundly Media Technologies Pvt. Ltd.</span>
          <span>&bull;</span>
          <span>Enterprise Secure Portal</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT AUTHENTICATION FORM PANEL (50% Desktop)                      */}
      {/* ------------------------------------------------------------------ */}
      <div className={styles.rightAuthPanel}>
        <div className={styles.authCard}>
          {/* Header */}
          <div className={styles.cardTopHeader}>
            <div className={styles.shieldBadge}>
              <Shield size={22} />
            </div>
            <h2 className={styles.portalTitle}>Operations Portal</h2>
            <p className={styles.portalSubtitle}>
              Shortfundly &bull; Internship Email Automation System
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className={styles.segmentedTabBox}>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setSubmitError('');
                setSuccessMessage('');
                setSupportNotice('');
              }}
              className={`${styles.tabBtn} ${authMode === 'login' ? styles.tabBtnActive : ''}`}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setSubmitError('');
                setSuccessMessage('');
                setSupportNotice('');
              }}
              className={`${styles.tabBtn} ${authMode === 'register' ? styles.tabBtnActive : ''}`}
            >
              <UserPlus size={15} />
              <span>Create New Account</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {submitError && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              <span>{submitError}</span>
            </div>
          )}

          {successMessage && (
            <div className={styles.successBanner}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {supportNotice && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '16px', lineHeight: 1.5 }}>
              {supportNotice}
            </div>
          )}

          {/* --- SIGN IN FORM --- */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className={styles.form} autoComplete="off">
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Assigned Operational Role <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <UserCheck className={styles.inputIcon} size={18} />
                  <select
                    className={`${styles.input} ${styles.selectInput}`}
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setSubmitError('');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="ADMIN">System Administrator (Full Access &amp; Customization)</option>
                    <option value="HR">HR Director (Offer Letters, Tasks, Batches &amp; Reviews)</option>
                    <option value="CEO">Chief Executive Officer (Performance-Based Certificate Approvals)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Email Address <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} size={18} />
                  <input
                    type="email"
                    name="shortfundly_access_id"
                    id="shortfundly_access_id"
                    required
                    className={`${styles.input} ${loginEmailError ? styles.inputError : ''}`}
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="email"
                  />
                </div>
                {loginEmailError && (
                  <div className={styles.fieldError}>
                    <AlertCircle size={12} />
                    <span>{loginEmailError}</span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Password <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="shortfundly_auth_secret"
                    id="shortfundly_auth_secret"
                    required
                    className={styles.input}
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="current-password"
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Security Verification <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.captchaContainer}>
                  <div className={styles.captchaImageContainer}>
                    {captchaData.svg ? (
                      <img
                        src={captchaData.svg}
                        alt="Security Verification Captcha"
                        className={styles.captchaImage}
                      />
                    ) : (
                      <span style={{ color: '#A855F7', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '4px' }}>
                        NCEJH
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    disabled={captchaLoading}
                    className={styles.captchaRefreshBtn}
                    title="Generate New Challenge"
                  >
                    <RotateCw size={15} />
                  </button>
                </div>
                <div className={styles.inputWrapper} style={{ marginTop: '8px' }}>
                  <Shield className={styles.inputIcon} size={18} />
                  <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Enter 5-character captcha code shown above"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                    maxLength={5}
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password || !!loginEmailError || captchaAnswer.length < 4}
                className={`${styles.submitBtn} ${(loading || !email || !password || !!loginEmailError || captchaAnswer.length < 4) ? styles.submitBtnDisabled : ''}`}
              >
                <span>{loading ? 'Authenticating...' : `Sign In as ${role}`}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* --- CREATE NEW ACCOUNT FORM --- */
            <form onSubmit={handleRegister} className={styles.form} autoComplete="off">
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Full Name <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <UserCheck className={styles.inputIcon} size={18} />
                  <input
                    type="text"
                    required
                    className={`${styles.input} ${regNameError ? styles.inputError : ''}`}
                    placeholder="Enter full name (letters only, e.g. John Doe)"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="name"
                  />
                </div>
                {regNameError && (
                  <div className={styles.fieldError}>
                    <AlertCircle size={12} />
                    <span>{regNameError}</span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Email Address <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} size={18} />
                  <input
                    type="email"
                    name="shortfundly_reg_email"
                    id="shortfundly_reg_email"
                    required
                    className={`${styles.input} ${regEmailError ? styles.inputError : ''}`}
                    placeholder="Enter email address (ending with .com or .in)"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="email"
                  />
                </div>
                {regEmailError && (
                  <div className={styles.fieldError}>
                    <AlertCircle size={12} />
                    <span>{regEmailError}</span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Assigned Operational Role <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Shield className={styles.inputIcon} size={18} />
                  <select
                    className={`${styles.input} ${styles.selectInput}`}
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="HR">HR Director (Offer Letters, Tasks, Batches &amp; Reviews)</option>
                    <option value="ADMIN">System Administrator (Full Operational Control)</option>
                    <option value="CEO">Chief Executive Officer (Approvals &amp; Final Certificates)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Password <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={18} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    name="shortfundly_reg_secret"
                    id="shortfundly_reg_secret"
                    required
                    className={`${styles.input} ${regPasswordError ? styles.inputError : ''}`}
                    placeholder="Create strong password"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="new-password"
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordBtn}
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regPasswordError && (
                  <div className={styles.fieldError}>
                    <AlertCircle size={12} />
                    <span>{regPasswordError}</span>
                  </div>
                )}
                {renderPasswordCriteria(regPasswordCriteria, regPassword)}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Confirm Password <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={18} />
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    name="shortfundly_reg_confirm_secret"
                    id="shortfundly_reg_confirm_secret"
                    required
                    className={`${styles.input} ${regConfirmError ? styles.inputError : ''}`}
                    placeholder="Re-enter password to confirm"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="new-password"
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordBtn}
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regConfirmError && (
                  <div className={styles.fieldError}>
                    <AlertCircle size={12} />
                    <span>{regConfirmError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !regName || !regEmail || !regPassword || !regConfirmPassword || !!regNameError || !!regEmailError || !!regPasswordError || !!regConfirmError}
                className={`${styles.submitBtn} ${(loading || !regName || !regEmail || !regPassword || !regConfirmPassword || !!regNameError || !!regEmailError || !!regPasswordError || !!regConfirmError) ? styles.submitBtnDisabled : ''}`}
              >
                <span>{loading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Action Links */}
          <div className={styles.actionLinksRow}>
            <button
              type="button"
              className={styles.actionLink}
              onClick={() => setSupportNotice('Password reset requests are processed by the System Administrator. Please email admin@shortfundly.com with your registered account email.')}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className={styles.actionLink}
              onClick={() => setSupportNotice('Need assistance? Contact Shortfundly Technical Operations at talent@shortfundly.com or ping HR on the internal portal.')}
            >
              Need help?
            </button>
          </div>

          <div className={styles.landingReturnRow}>
            <Link href="/" className={styles.landingReturnLink}>
              &larr; Return to Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
