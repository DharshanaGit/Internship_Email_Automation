'use client';

import React from 'react';
import Image from 'next/image';
import styles from './Header.module.css';
import { ServerIcon, UserIcon, LogOutIcon, CampaignPulseLogoSymbol } from './Icons.jsx';

export default function Header({ user, onOpenSmtpDiagnostics, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandGroup}>
          <div className={styles.logoWrapper}>
            <CampaignPulseLogoSymbol size={38} />
          </div>
          <div className={styles.titleArea}>
            <div className={styles.portalTitle}>
              Campus <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>Email Automation</span>
            </div>
            <div className={styles.tagline}>
              Campus Outreach &amp; Email Platform
            </div>
          </div>
        </div>

        <div className={styles.rightGroup}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            <span>Connected</span>
          </div>

          <button
            type="button"
            className={styles.smtpBtn}
            onClick={onOpenSmtpDiagnostics}
            title="Check Google SMTP email settings"
          >
            <ServerIcon size={14} />
            <span>Google SMTP</span>
          </button>

          {user && (
            <div className={styles.userBadge}>
              <UserIcon size={14} />
              <span>{user.email}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.logoutBtn}
            onClick={onLogout}
            title="Sign out"
          >
            <LogOutIcon size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
