'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import { Mail, Lock, Shield, RotateCw, ArrowRight, AlertCircle, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@shortfundly.com');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('ADMIN');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaData, setCaptchaData] = useState({ token: '', svg: '' });
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const res = await fetch('/api/auth/captcha');
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
    fetchCaptcha(); router.prefetch('/dashboard');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password || !captchaAnswer) {
      setErrorMessage('Please complete all required fields and verify the CAPTCHA code.');
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
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        fetchCaptcha(); router.prefetch('/dashboard');
        return;
      }

      // Successful login -> Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
      fetchCaptcha(); router.prefetch('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillRole = (selectedRole, selectedEmail) => {
    setEmail(selectedEmail || 'admin@shortfundly.com');
    setPassword('admin123');
    setRole(selectedRole);
    setErrorMessage('');
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.brandIcon}>
            <Shield size={24} />
          </div>
          <h1 className={styles.brandTitle}>Admin Operations Portal</h1>
          <p className={styles.brandSubtitle}>Shortfundly &bull; Internship Email Automation System</p>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Operational Persona / Role</label>
            <div className={styles.inputWrapper}>
              <UserCheck className={styles.inputIcon} size={18} />
              <select
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="ADMIN">System Administrator (Full Operational Scope)</option>
                <option value="HR">HR Director (Candidate Intake & Review Scheduling)</option>
                <option value="CEO">Chief Executive Officer (Approvals & Certifications)</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Admin Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                type="email"
                required
                className={styles.input}
                placeholder="admin@shortfundly.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                required
                className={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Security Verification (CAPTCHA)</label>
            <div className={styles.captchaBlock}>
              {captchaData.svg ? (
                <img
                  src={captchaData.svg}
                  alt="Security Verification Challenge"
                  className={styles.captchaImage}
                />
              ) : (
                <div style={{ color: '#64748b', fontSize: '13px' }}>Generating challenge...</div>
              )}
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={captchaLoading}
                className={styles.refreshButton}
                title="Generate New CAPTCHA"
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
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            <span>{loading ? 'Authenticating Session...' : `Sign In as ${role}`}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        <div className={styles.quickFillBox}>
          <div className={styles.quickFillText}>Multiple Roles Available:</div>
          <div className={styles.quickFillGrid}>
            <button
              type="button"
              onClick={() => handleQuickFillRole('ADMIN', 'admin@shortfundly.com')}
              className={styles.quickFillButton}
              title="admin@shortfundly.com / admin123"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFillRole('HR', 'hr@shortfundly.com')}
              className={styles.quickFillButton}
              title="hr@shortfundly.com / admin123"
            >
              HR Director
            </button>
            <button
              type="button"
              onClick={() => handleQuickFillRole('CEO', 'ceo@shortfundly.com')}
              className={styles.quickFillButton}
              title="ceo@shortfundly.com / admin123"
            >
              CEO
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
            Credentials configured in .env (admin@shortfundly.com / admin123)
          </div>
        </div>

        <div className={styles.backLink}>
          <Link href="/">&larr; Return to Landing Page</Link>
        </div>
      </div>
    </div>
  );
}
