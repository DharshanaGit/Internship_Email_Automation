'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './login.module.css';
import { Mail, Lock, Shield, RotateCw, ArrowRight, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

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
  const loginEmailError = useMemo(() => {
    if (!email) return null;
    if (/[A-Z]/.test(email)) {
      return 'Email address cannot contain capital letters (lowercase only).';
    }
    return null;
  }, [email]);

  const loginPasswordError = useMemo(() => {
    if (!password) return null;
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    return null;
  }, [password]);

  // Real-time validations for Create Account
  const regEmailError = useMemo(() => {
    if (!regEmail) return null;
    if (/[A-Z]/.test(regEmail)) {
      return 'Email address cannot contain capital letters (lowercase only).';
    }
    return null;
  }, [regEmail]);

  const regPasswordError = useMemo(() => {
    if (!regPassword) return null;
    if (regPassword.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    return null;
  }, [regPassword]);

  const regConfirmError = useMemo(() => {
    if (!regConfirmPassword) return null;
    if (regConfirmPassword !== regPassword) {
      return 'Confirm password does not match password.';
    }
    return null;
  }, [regConfirmPassword, regPassword]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    if (loginEmailError) {
      setSubmitError(loginEmailError);
      return;
    }

    if (loginPasswordError) {
      setSubmitError(loginPasswordError);
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
        setSubmitError(data.error || 'Authentication failed. Please check credentials.');
        fetchCaptcha();
        return;
      }

      setSuccessMessage('Authentication successful! Loading dashboard...');
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo');
      const targetUrl = (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) ? returnTo : '/dashboard';
      window.location.href = targetUrl;
    } catch (err) {
      setSubmitError(err.message || 'An unexpected authentication error occurred.');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setSubmitError('Please enter your full name.');
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

    if (regPassword !== regConfirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
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
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.brandIcon}>
            <Shield size={24} />
          </div>
          <h1 className={styles.brandTitle}>Operations Portal</h1>
          <p className={styles.brandSubtitle}>Shortfundly &bull; Internship Email Automation System</p>
        </div>

        {/* Auth Mode Tabs: Sign In vs Create New Account */}
        <div className={styles.tabContainer}>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setSubmitError('');
              setSuccessMessage('');
            }}
            className={`${styles.tabButton} ${authMode === 'login' ? styles.tabButtonActive : ''}`}
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
            }}
            className={`${styles.tabButton} ${authMode === 'register' ? styles.tabButtonActive : ''}`}
          >
            <UserPlus size={15} />
            <span>Create New Account</span>
          </button>
        </div>

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

        {/* --- SIGN IN FORM --- */}
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className={styles.form} autoComplete="off">
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Assigned Operational Role <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <UserCheck className={styles.inputIcon} size={18} />
                <select
                  className={styles.input}
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setSubmitError('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="ADMIN">System Administrator (Full Access & Customization)</option>
                  <option value="HR">HR Director (Offer Letters, Tasks, Batches & Reviews)</option>
                  <option value="CEO">Chief Executive Officer (Performance-Based Certificate Approvals)</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email Address <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  type="email"
                  required
                  className={`${styles.input} ${loginEmailError ? styles.inputError : ''}`}
                  placeholder="Enter email address (e.g. admin@gmail.com)"
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
              <label className={styles.label}>
                Password <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`${styles.input} ${loginPasswordError ? styles.inputError : ''}`}
                  placeholder="Enter password (min 8 characters)"
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
                  className={styles.togglePasswordButton}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginPasswordError && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{loginPasswordError}</span>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Security Verification <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.captchaBlock}>
                {captchaData.svg ? (
                  <img
                    src={captchaData.svg}
                    alt="Security Challenge"
                    className={styles.captchaImage}
                  />
                ) : (
                  <div style={{ color: '#c084fc', fontSize: '13px' }}>Generating security challenge...</div>
                )}
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className={styles.refreshButton}
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
              disabled={loading || !email || !password || !!loginEmailError || !!loginPasswordError || captchaAnswer.length < 4}
              className={`${styles.submitButton} ${(loading || !email || !password || !!loginEmailError || !!loginPasswordError || captchaAnswer.length < 4) ? styles.submitButtonDisabled : ''}`}
            >
              <span>{loading ? 'Authenticating...' : `Sign In as ${role}`}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* --- CREATE NEW ACCOUNT FORM --- */
          <form onSubmit={handleRegister} className={styles.form} autoComplete="off">
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Full Name <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <UserCheck className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Enter full name (e.g. John Doe)"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    setSubmitError('');
                  }}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email Address <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  type="email"
                  required
                  className={`${styles.input} ${regEmailError ? styles.inputError : ''}`}
                  placeholder="Enter email address (lowercase only)"
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
              <label className={styles.label}>
                Assigned Role <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Shield className={styles.inputIcon} size={18} />
                <select
                  className={styles.input}
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="HR">HR Director (Offer Letters, Tasks, Batches & Reviews)</option>
                  <option value="ADMIN">System Administrator (Full Operational Control)</option>
                  <option value="CEO">Chief Executive Officer (Approvals & Final Certificates)</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Password <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  className={`${styles.input} ${regPasswordError ? styles.inputError : ''}`}
                  placeholder="Create password (min 8 characters)"
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
                  className={styles.togglePasswordButton}
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
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Confirm Password <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
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
                  className={styles.togglePasswordButton}
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
              disabled={loading || !regName || !regEmail || !regPassword || !regConfirmPassword || !!regEmailError || !!regPasswordError || !!regConfirmError}
              className={`${styles.submitButton} ${(loading || !regName || !regEmail || !regPassword || !regConfirmPassword || !!regEmailError || !!regPasswordError || !!regConfirmError) ? styles.submitButtonDisabled : ''}`}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div className={styles.backLink}>
          <Link href="/">&larr; Return to Landing Page</Link>
        </div>
      </div>
    </div>
  );
}
