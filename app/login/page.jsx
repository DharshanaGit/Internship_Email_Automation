'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './login.module.css';
import { Mail, Lock, Shield, RotateCw, ArrowRight, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('ADMIN');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaData, setCaptchaData] = useState({ token: '', svg: '' });
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Authorized credentials mapping
  const expectedCredentials = {
    ADMIN: { email: 'admin@gmail.com', pass: 'Shortfundly@Pass2026!' },
    HR: { email: 'hr@gmail.com', pass: 'Shortfundly@Pass2026!' },
    CEO: { email: 'ceo@gmail.com', pass: 'Shortfundly@Pass2026!' },
  };

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

  // Real-time email validation error as user types
  const emailValidationError = useMemo(() => {
    if (!email) return null;

    if (/[A-Z]/.test(email)) {
      return 'Email must not contain capital letters (lowercase only).';
    }
    if (/[0-9]/.test(email)) {
      return 'Email must not contain numbers (letters only).';
    }
    if (!email.endsWith('@gmail.com')) {
      return 'Email must end with @gmail.com';
    }

    const expected = expectedCredentials[role]?.email;
    if (expected && email !== expected) {
      return `Typed email does not match configured ${role} account (${expected}).`;
    }

    return null;
  }, [email, role]);

  const isEmailValid = email.length > 0 && emailValidationError === null;

  // Real-time password validation error as user types
  const passwordValidationError = useMemo(() => {
    if (!password) return null;

    const expectedPass = expectedCredentials[role]?.pass;
    if (password !== expectedPass) {
      return 'Typed password does not match system credentials for this account.';
    }

    return null;
  }, [password, role]);

  const isPasswordValid = password.length > 0 && passwordValidationError === null;

  const isFormValid = isEmailValid && isPasswordValid && captchaAnswer.length >= 4;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (emailValidationError) {
      setSubmitError(emailValidationError);
      return;
    }

    if (passwordValidationError) {
      setSubmitError(passwordValidationError);
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
          email,
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

  const handleSelectRole = (newRole) => {
    setRole(newRole);
    setSubmitError('');
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.brandIcon}>
            <Shield size={22} />
          </div>
          <h1 className={styles.brandTitle}>Operations Portal</h1>
          <p className={styles.brandSubtitle}>Shortfundly &bull; Internship Email Automation System</p>
        </div>

        {submitError && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form} autoComplete="off">
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Assigned Operational Role <span style={{ color: '#ec4899' }}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <UserCheck className={styles.inputIcon} size={18} />
              <select
                className={styles.input}
                value={role}
                onChange={(e) => handleSelectRole(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="ADMIN">System Administrator (Full Access & Customization)</option>
                <option value="HR">HR Director (Offer Letters, Google Forms, Batches & Reviews)</option>
                <option value="CEO">Chief Executive Officer (Performance-Based Certificate Approvals)</option>
              </select>
            </div>
            <div className={styles.roleHint}>
              Expected authorized email for {role}: <code>{expectedCredentials[role]?.email}</code>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Email Address <span style={{ color: '#ec4899' }}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                type="text"
                required
                className={`${styles.input} ${emailValidationError ? styles.inputError : ''} ${isEmailValid ? styles.inputSuccess : ''}`}
                placeholder="lowercase@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSubmitError('');
                }}
                autoComplete="off"
              />
            </div>
            {emailValidationError && (
              <div className={styles.realtimeError}>
                <AlertCircle size={13} />
                <span>{emailValidationError}</span>
              </div>
            )}
            {isEmailValid && (
              <div className={styles.realtimeSuccess}>
                <CheckCircle2 size={13} />
                <span>Authorized email format & credentials matched</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Password <span style={{ color: '#ec4899' }}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className={`${styles.input} ${passwordValidationError ? styles.inputError : ''} ${isPasswordValid ? styles.inputSuccess : ''}`}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSubmitError('');
                }}
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
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
            {passwordValidationError && (
              <div className={styles.realtimeError}>
                <AlertCircle size={13} />
                <span>{passwordValidationError}</span>
              </div>
            )}
            {isPasswordValid && (
              <div className={styles.realtimeSuccess}>
                <CheckCircle2 size={13} />
                <span>Password credentials matched</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Security Verification <span style={{ color: '#ec4899' }}>*</span>
            </label>
            <div className={styles.captchaBlock}>
              {captchaData.svg ? (
                <img
                  src={captchaData.svg}
                  alt="Security Challenge"
                  className={styles.captchaImage}
                />
              ) : (
                <div style={{ color: '#a855f7', fontSize: '13px' }}>Generating security challenge...</div>
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
                placeholder="Type the 5 characters shown above"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                maxLength={5}
                autoComplete="off"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`${styles.submitButton} ${!isFormValid ? styles.submitButtonDisabled : ''}`}
          >
            <span>{loading ? 'Authenticating...' : `Sign In as ${role}`}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className={styles.securityNote}>
          <Shield size={14} color="#a855f7" />
          <span>Role changes are restricted. You must sign out to change your operational persona.</span>
        </div>

        <div className={styles.backLink}>
          <Link href="/">&larr; Return to Landing Page</Link>
        </div>
      </div>
    </div>
  );
}
