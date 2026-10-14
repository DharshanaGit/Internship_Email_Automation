'use client';

import React, { useState } from 'react';
import styles from './SmtpDiagnosticsModal.module.css';
import {
  ServerIcon,
  CloseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon
} from './Icons.jsx';

export default function SmtpDiagnosticsModal({ isOpen, onClose }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/system/smtp-verify');
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to contact diagnostics service.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <ServerIcon size={18} />
            <span>Google SMTP Diagnostics &amp; Health Engine</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.configCard}>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>SMTP Server:</span>
              <span className={styles.configVal}>smtp.gmail.com</span>
            </div>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>Port / Security:</span>
              <span className={styles.configVal}>465 (SSL / TLS Explicit)</span>
            </div>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>Protocol:</span>
              <span className={styles.configVal}>Nodemailer Engine</span>
            </div>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>Delivery Guarantee:</span>
              <span className={styles.configVal}>250 OK (SMTP Handshake Acceptance)</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.testBtn}
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <>
                <RefreshCwIcon size={16} className="spin" />
                <span>Performing SMTP Handshake...</span>
              </>
            ) : (
              <>
                <ServerIcon size={16} />
                <span>Run Google SMTP Handshake Verification</span>
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`${styles.resultBox} ${
                testResult.success ? styles.resultBoxSuccess : styles.resultBoxError
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                {testResult.success ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
                <span>
                  {testResult.success
                    ? 'Google SMTP Connected & Verified'
                    : testResult.configured
                    ? 'Google SMTP Authentication Error'
                    : 'Google SMTP Unconfigured'}
                </span>
              </div>
              <p>{testResult.message}</p>
              {!testResult.configured && (
                <p style={{ fontSize: '11px', marginTop: '4px' }}>
                  Provide your company Gmail or Google Workspace credentials and 16-character App Password in <code>.env.local</code> to activate live dispatching.
                </p>
              )}
            </div>
          )}

          <div className={styles.docSection}>
            <div className={styles.docTitle}>
              <ShieldCheckIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Enterprise Deliverability &amp; Google SMTP Guide
            </div>
            <ul>
              <li>
                <strong>Google App Password:</strong> Standard Gmail passwords are not permitted. Generate a 16-character App Password at{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                  myaccount.google.com/apppasswords
                </a>.
              </li>
              <li>
                <strong>Daily Quota:</strong> Standard Gmail accounts permit 500 dispatches/day; Google Workspace accounts permit 2,000 dispatches/day.
              </li>
              <li>
                <strong>Domain Authentication:</strong> For institutional delivery, ensure your domain DNS includes valid <strong>SPF</strong> (include:_spf.google.com), <strong>DKIM</strong>, and <strong>DMARC</strong> records to avoid spam filtering.
              </li>
              <li>
                <strong>Duplicate Protection:</strong> System automatically enforces a 30-day cooldown per institutional recipient address.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
